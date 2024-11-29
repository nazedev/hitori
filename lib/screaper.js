const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { exec, spawn, execSync } = require('child_process');

async function bytesToSize(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "n/a";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	if (i === 0) resolve(`${bytes} ${sizes[i]}`);
	return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

const axioss = axios.create({
	httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

async function mediafireDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const res = await axioss.get(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows; Windows NT 6.0; WOW64; en-US) Gecko/20130401 Firefox/51.2'
				}
			});
			const $ = cheerio.load(res.data);
			const link = $('a#downloadButton').attr('href');
			const size = $('a#downloadButton').text().replace('Download', '').replace('(', '').replace(')', '').trim();
			const upload_date = $('.dl-info .details li').last().find('span').text().trim();
			const name = link.split('/')[5];
			const type = name.split('.')[1] || '';
			resolve({ name, type, upload_date, size, link })
		} catch (e) {
			reject(e)
		}
	})
}

async function pinterest(query) {
	return new Promise(async(resolve,reject) => {
		axios.get('https://id.pinterest.com/search/pins/?autologin=true&q=' + query, {
			headers: {
				'cookie': '_auth=1; _b=\"AVna7S1p7l1C5I9u0+nR3YzijpvXOPc6d09SyCzO+DcwpersQH36SmGiYfymBKhZcGg=\"; _pinterest_sess=TWc9PSZHamJOZ0JobUFiSEpSN3Z4a2NsMk9wZ3gxL1NSc2k2NkFLaUw5bVY5cXR5alZHR0gxY2h2MVZDZlNQalNpUUJFRVR5L3NlYy9JZkthekp3bHo5bXFuaFZzVHJFMnkrR3lTbm56U3YvQXBBTW96VUgzVUhuK1Z4VURGKzczUi9hNHdDeTJ5Y2pBTmxhc2owZ2hkSGlDemtUSnYvVXh5dDNkaDN3TjZCTk8ycTdHRHVsOFg2b2NQWCtpOWxqeDNjNkk3cS85MkhhSklSb0hwTnZvZVFyZmJEUllwbG9UVnpCYVNTRzZxOXNJcmduOVc4aURtM3NtRFo3STlmWjJvSjlWTU5ITzg0VUg1NGhOTEZzME9SNFNhVWJRWjRJK3pGMFA4Q3UvcHBnWHdaYXZpa2FUNkx6Z3RNQjEzTFJEOHZoaHRvazc1c1UrYlRuUmdKcDg3ZEY4cjNtZlBLRTRBZjNYK0lPTXZJTzQ5dU8ybDdVS015bWJKT0tjTWYyRlBzclpiamdsNmtpeUZnRjlwVGJXUmdOMXdTUkFHRWloVjBMR0JlTE5YcmhxVHdoNzFHbDZ0YmFHZ1VLQXU1QnpkM1FqUTNMTnhYb3VKeDVGbnhNSkdkNXFSMXQybjRGL3pyZXRLR0ZTc0xHZ0JvbTJCNnAzQzE0cW1WTndIK0trY05HV1gxS09NRktadnFCSDR2YzBoWmRiUGZiWXFQNjcwWmZhaDZQRm1UbzNxc21pV1p5WDlabm1UWGQzanc1SGlrZXB1bDVDWXQvUis3elN2SVFDbm1DSVE5Z0d4YW1sa2hsSkZJb1h0MTFpck5BdDR0d0lZOW1Pa2RDVzNySWpXWmUwOUFhQmFSVUpaOFQ3WlhOQldNMkExeDIvMjZHeXdnNjdMYWdiQUhUSEFBUlhUVTdBMThRRmh1ekJMYWZ2YTJkNlg0cmFCdnU2WEpwcXlPOVZYcGNhNkZDd051S3lGZmo0eHV0ZE42NW8xRm5aRWpoQnNKNnNlSGFad1MzOHNkdWtER0xQTFN5Z3lmRERsZnZWWE5CZEJneVRlMDd2VmNPMjloK0g5eCswZUVJTS9CRkFweHc5RUh6K1JocGN6clc1JmZtL3JhRE1sc0NMTFlpMVErRGtPcllvTGdldz0=; _ir=0'
			}
		}).then(({ data }) => {
			const $ = cheerio.load(data)
			const result = [];
			const hasil = [];
			$('div > a').get().map(b => {
				const link = $(b).find('img').attr('src')
				result.push(link)
			});
			result.forEach(v => {
				if(v == undefined) return
				hasil.push(v.replace(/236/g,'736'))
			})
			hasil.shift();
			resolve(hasil)
		})
	});
}

async function pinterest2(query) {
	return new Promise(async (resolve, reject) => {
		const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
		const queryParams = {
			source_url: '/search/pins/?q=' + encodeURIComponent(query),
			data: JSON.stringify({
				options: {
					isPrefetch: false,
					query,
					scope: 'pins',
					no_fetch_context_on_resource: false
				},
				context: {}
			}),
			_: Date.now()
		};
		const url = new URL(baseUrl);
		Object.entries(queryParams).forEach(entry => url.searchParams.set(entry[0], entry[1]));
		try {
			const json = await (await fetch(url.toString())).json();
			const results = json.resource_response?.data?.results?? [];
			const result = results.map(item => ({
				pin: 'https://www.pinterest.com/pin/' + item.id?? '',
				link: item.link?? '',
				created_at: (new Date(item.created_at)).toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				}) ?? '',
				id: item.id?? '',
				images_url: item.images?.['736x']?.url?? '',
				grid_title: item.grid_title?? ''
			}));
			resolve(result);
		} catch (e) {
			reject([])
		}
	});
}

async function remini(input, method) {
  return new Promise(async (resolve, reject) => {
    let Methods = ["enhance", "recolor", "dehaze"];
    method = Methods.includes(method) ? method : Methods[0];
    try {
      let buffer;
    if (typeof input === 'string') {
      try {
        const response = await axios.get(input, { responseType: 'arraybuffer' });
        buffer = Buffer.from(response.data, 'binary');
      } catch (error) {
        reject(error);
      }
    } else if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      reject(new Error('Input tidak valid. Harap berikan URL atau buffer gambar.'));
    }
      let Form = new FormData();
      let scheme = "https://inferenceengine.vyro.ai/" + method;
      Form.append("model_version", 1);
      Form.append("image", buffer, {
        filename: "enhance_image_body.jpg",
        contentType: "image/jpeg",
      });
      Form.submit(
        {
          host: "inferenceengine.vyro.ai",
          path: "/" + method,
          protocol: "https:",
          headers: {
            "User-Agent": "okhttp/4.9.3",
            Connection: "Keep-Alive",
            "Accept-Encoding": "gzip",
          },
        },
        function (err, res) {
          if (err) reject(err);
          let data = [];
          res
            .on("data", function (chunk) {
              data.push(chunk);
            })
            .on("end", () => {
              resolve(Buffer.concat(data));
            });
          res.on("error", (e) => {
            reject(e);
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

async function styletext(teks) {
	return new Promise(async (resolve, reject) => {
		axios.get('http://qaz.wtf/u/convert.cgi?text=' + teks).then(({ data }) => {
			let $ = cheerio.load(data)
			let hasil = []
			$('table > tbody > tr').each(function (a, b) {
				hasil.push({ name: $(b).find('td:nth-child(1) > span').text(), result: $(b).find('td:nth-child(2)').text().trim() })
			});
			resolve(hasil)
		});
	});
}

async function ringtone(title) {
	return new Promise(async (resolve, reject) => {
		axios.get('https://meloboom.com/en/search/' + title).then(({ data }) => {
			let $ = cheerio.load(data)
			let hasil = []
			$('#__next > main > section > div.jsx-2244708474.container > div > div > div > div:nth-child(4) > div > div > div > ul > li').each(function (a, b) {
				hasil.push({ title: $(b).find('h4').text(), source: 'https://meloboom.com/'+$(b).find('a').attr('href'), audio: $(b).find('audio').attr('src') })
			});
			resolve(hasil)
		});
	});
}

async function multiDownload(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const timeout = 60000;
			const startTime = Date.now();
			const headers = {
				'Content-Type': 'application/json',
				'Origin': 'https://publer.io',
				'Referer': 'https://publer.io/',
				'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
			}
			const { data } = await axios.post('https://app.publer.io/hooks/media', { url, iphone: false }, { headers });
			while (true) {
				if (Date.now() - startTime >= timeout) {
					reject(new Error('Loop Undefined'))
					break
				}
				const { data: res } = await axios.get('https://app.publer.io/api/v1/job_status/' + data.job_id, { headers });
				if (res.status == 'complete') {
					resolve(res.payload)
					break
				}
			}
		} catch (e) {
			reject(e)
		}
	});
}

async function wallpaper(title, page = '1') {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${title}`);
			const $ = cheerio.load(data);
			const hasil = [];
			$('div.grid-item').each(function (a, b) {
				hasil.push({
					title: $(b).find('div.info > p').attr('title'),
					type: $(b).find('div.info > a:nth-child(2)').text(),
					source: 'https://www.besthdwallpaper.com' + $(b).find('a').attr('href'),
					image: [
						$(b).find('picture > img').attr('data-src') || $(b).find('picture > img').attr('src'), 
						$(b).find('picture > source:nth-child(1)').attr('srcset'), 
						$(b).find('picture > source:nth-child(2)').attr('srcset')
					]
				});
			});
			resolve(hasil)
		} catch (e) {
			reject(e)
		}
	});
}

async function wikimedia(title) {
	return new Promise(async (resolve, reject) => {
		axios.get(`https://commons.wikimedia.org/w/index.php?search=${title}&title=Special:MediaSearch&go=Go&type=image`).then(({ data }) => {
			let $ = cheerio.load(data)
			let hasil = []
			$('.sdms-search-results__list-wrapper > div > a').each(function (a, b) {
				hasil.push({ title: $(b).find('img').attr('alt'), source: $(b).attr('href'), image: $(b).find('img').attr('data-src') || $(b).find('img').attr('src') })
			});
			resolve(hasil)
		});
	});
}

async function quotesAnime() {
    try {
        const page = Math.floor(Math.random() * 184);
        const { data } = await axios.get('https://otakotaku.com/quote/feed/' + page);
        const $ = cheerio.load(data);
        const hasil = [];
        $('div.kotodama-list').each((l, h) => {
            hasil.push({
                link: $(h).find('a').attr('href'),
                gambar: $(h).find('img').attr('data-src'),
                karakter: $(h).find('div.char-name').text().trim(),
                anime: $(h).find('div.anime-title').text().trim(),
                episode: $(h).find('div.meta').text(),
                up_at: $(h).find('small.meta').text(),
                quotes: $(h).find('div.quote').text().trim()
            });
        });
        return hasil;
    } catch (error) {
        throw error;
    }
}

async function happymod(query) {
    try {
        const baseUrl = 'https://www.happymod.com/';
        const res = await axios.get(baseUrl + 'search.html?q=' + query);
        const $ = cheerio.load(res.data);
        const hasil = [];
        $("div.pdt-app-box").each((c, d) => {
            const title = $(d).find("a").text().trim();
            const icon = $(d).find("img.lazy").attr('data-original');
            const rating = $(d).find("span").text();
            const link = baseUrl + $(d).find("a").attr('href');
            hasil.push({
                title,
                icon,
                link,
                rating
            });
        });
        return hasil;
    } catch (error) {
        throw error;
    }
}

async function umma(url) {
    try {
        const res = await axios.get(url);
        const $ = cheerio.load(res.data);
        const image = [];
        $('#article-content > div').find('img').each((a, b) => {
            image.push($(b).attr('src'));
        });
        const hasil = {
            title: $('#wrap > div.content-container.font-6-16 > h1').text().trim(),
            author: {
                name: $('#wrap > div.content-container.font-6-16 > div.content-top > div > div.user-ame.font-6-16.fw').text().trim(),
                profilePic: $('#wrap > div.content-container.font-6-16 > div.content-top > div > div.profile-photo > img.photo').attr('src')
            },
            caption: $('#article-content > div > p').text().trim(),
            media: $('#article-content > div > iframe').attr('src') ? [$('#article-content > div > iframe').attr('src')] : image,
            type: $('#article-content > div > iframe').attr('src') ? 'video' : 'image',
            like: $('#wrap > div.bottom-btns > div > button:nth-child(1) > div.text.font-6-12').text()
        };
        return hasil;
    } catch (error) {
        throw error;
    }
}

async function jadwalsholat(query) {
    try {
        const { data } = await axios.get(`https://umrotix.com/jadwal-sholat/${query}`);
        const $ = cheerio.load(data);
        let result;
        $('body > div > div.main-wrapper.scrollspy-action > div:nth-child(3)').each((a, b) => {
            result = {
                tanggal: $(b).find('> div:nth-child(2)').text(),
                imsyak: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(1) > p:nth-child(2)').text(),
                subuh: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(2) > p:nth-child(2)').text(),
                dzuhur: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(3) > p:nth-child(2)').text(),
                ashar: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(4) > p:nth-child(2)').text(),
                maghrib: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(5) > p:nth-child(2)').text(),
                isya: $(b).find('> div.panel.daily > div > div > div > div > div:nth-child(6) > p:nth-child(2)').text()
            };
        });
        return result;
    } catch (error) {
        throw error;
    }
}

async function tiktokDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			let data = []
			function formatNumber(integer) {
				let numb = parseInt(integer)
				return Number(numb).toLocaleString().replace(/,/g, '.')
			}
			
			function formatDate(n, locale = 'en') {
				let d = new Date(n)
				return d.toLocaleDateString(locale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					second: 'numeric'
				})
			}
			
			let domain = 'https://www.tikwm.com/api/';
			let res = await (await axios.post(domain, {}, {
				headers: {
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'Origin': 'https://www.tikwm.com',
					'Referer': 'https://www.tikwm.com/',
					'Sec-Ch-Ua': '"Not)A;Brand" ;v="24" , "Chromium" ;v="116"',
					'Sec-Ch-Ua-Mobile': '?1',
					'Sec-Ch-Ua-Platform': 'Android',
					'Sec-Fetch-Dest': 'empty',
					'Sec-Fetch-Mode': 'cors',
					'Sec-Fetch-Site': 'same-origin',
					'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
					'X-Requested-With': 'XMLHttpRequest'
				},
				params: {
					url: url,
					count: 12,
					cursor: 0,
					web: 1,
					hd: 1
				}
			})).data.data
			if (res && !res.size && !res.wm_size && !res.hd_size) {
				res.images.map(v => {
					data.push({ type: 'photo', url: v })
				})
			} else {
				if (res && res.wmplay) {
					data.push({ type: 'watermark', url: 'https://www.tikwm.com' + res.wmplay })
				}
				if (res && res.play) {
					data.push({ type: 'nowatermark', url: 'https://www.tikwm.com' + res.play })
				}
				if (res && res.hdplay) {
					data.push({ type: 'nowatermark_hd', url: 'https://www.tikwm.com' + res.hdplay })
				}
			}
			let json = {
				status: true,
				title: res.title,
				taken_at: formatDate(res.create_time).replace('1970', ''),
				region: res.region,
				id: res.id,
				durations: res.duration,
				duration: res.duration + ' Seconds',
				cover: 'https://www.tikwm.com' + res.cover,
				size_wm: res.wm_size,
				size_nowm: res.size,
				size_nowm_hd: res.hd_size,
				data: data,
				music_info: {
					id: res.music_info.id,
					title: res.music_info.title,
					author: res.music_info.author,
					album: res.music_info.album ? res.music_info.album : null,
					url: 'https://www.tikwm.com' + res.music || res.music_info.play
				},
				stats: {
					views: formatNumber(res.play_count),
					likes: formatNumber(res.digg_count),
					comment: formatNumber(res.comment_count),
					share: formatNumber(res.share_count),
					download: formatNumber(res.download_count)
				},
				author: {
					id: res.author.id,
					fullname: res.author.unique_id,
					nickname: res.author.nickname,
					avatar: 'https://www.tikwm.com' + res.author.avatar
				}
			}
			resolve(json)
		} catch (e) {
			reject(e)
		}
	});
}

async function facebookDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://getmyfb.com/process', new URLSearchParams({
				id: decodeURIComponent(url),
				locale: 'en',
			}), {
				headers: {
					'hx-current-url': 'https://getmyfb.com/',
					'hx-request': 'true',
					'hx-target': url.includes('share') ? '#private-video-downloader' : '#target',
					'hx-trigger': 'form',
					'hx-post': '/process',
					'hx-swap': 'innerHTML',
				}
			});
			const $ = cheerio.load(data);
			resolve({
				caption: $('.results-item-text').length > 0 ? $('.results-item-text').text().trim() : '',
				preview: $('.results-item-image').attr('src') || '',
				results: $('.results-list-item').get().map(el => ({
					quality: parseInt($(el).text().trim()) || '',
					type: $(el).text().includes('HD') ? 'HD' : 'SD',
					url: $(el).find('a').attr('href') || '',
				}))
			});
		} catch (e) {
			reject(e);
		}
	});
}

async function instaStory(name) {
	return new Promise(async (resolve, reject) => {
		try {
			const results = [];
			const formData = new FormData();
			const key = await axios.get('https://storydownloader.app/en');
			const $$ = cheerio.load(key.data);
			const cookie = key.headers['set-cookie']
			const token = $$('input[name="_token"]').attr('value');
			const headers = {
				accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
				cookie: cookie,
				origin: 'https://storydownloader.app',
				referer: 'https://storydownloader.app/en',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
				'X-CSRF-TOKEN': token
			};
			formData.append('username', name);
			formData.append('_token', token);
			const res = await axios.post('https://storydownloader.app/request', formData, {
				headers: {
					...headers,
					...formData.getHeaders()
				}
			});
			const $ = cheerio.load(res.data.html);
			const username = $('h3.card-title').text();
			const profile_url = $('img.card-avatar').attr('src');
			$('div.row > div').each(function () {
				const _ = $(this);
				const url = _.find('a').attr('href');
				const thumbnail = _.find('img').attr('src');
				const type = /video_dashinit\.mp4/i.test(url) ? 'video' : 'image';
				if (thumbnail && url) {
					results.push({
						thumbnail,
						url,
						type,
					})
				}
			});
			const data = {
				username,
				profile_url,
				results
			};
			resolve(data)
		} catch (e) {
			reject(e)
		}
	})
}

async function bk9Ai(query) {
	const teks = encodeURIComponent(query);
	const urls = ['https://bk9.fun/ai/gemini?q=','https://bk9.fun/ai/jeeves-chat?q=','https://bk9.fun/ai/jeeves-chat2?q=','https://bk9.fun/ai/mendable?q=','https://bk9.fun/ai/Aoyo?q='];
	for (let url of urls) {
		try {
			const { data } = await axios.get(url + teks);
			return data
		} catch (e) {
		}
	}
}

async function ytMp4(url, options) {
    return new Promise(async(resolve, reject) => {
        ytdl.getInfo(url, options).then(async(getUrl) => {
            const audioPath = path.join('./database/sampah', `audio_${Date.now()}.mp4`);
            const videoPath = path.join('./database/sampah', `video_${Date.now()}.mp4`);
            const outputPath = path.join('./database/sampah', `output_${Date.now()}.mp4`);
            await new Promise((resolv, rejectt) => {
            	ytdl(url, { format: ytdl.chooseFormat(getUrl.formats, { quality: 'highestaudio', filter: 'audioonly' })}).pipe(fs.createWriteStream(audioPath)).on('finish', resolv).on('error', rejectt);
            })
            await new Promise((resolv, rejectt) => {
            	ytdl(url, { format: ytdl.chooseFormat(getUrl.formats, { quality: 'highestvideo', filter: 'videoonly' })}).pipe(fs.createWriteStream(videoPath)).on('finish', resolv).on('error', rejectt);
            })
            await new Promise((resolv, rejectt) => {
		        exec(`ffmpeg -i ${videoPath} -i ${audioPath} -c:v copy -c:a aac ${outputPath}`, (error, stdout, stderr) => {
		            if (error) {
		                rejectt(new Error(`ffmpeg error: ${error.message}`));
		                return;
		            }
		            resolv();
		        });
		    });
            let title = getUrl.videoDetails.title;
            let desc = getUrl.videoDetails.description;
            let views = getUrl.videoDetails.viewCount;
            let likes = getUrl.videoDetails.likes;
            let dislike = getUrl.videoDetails.dislikes;
            let channel = getUrl.videoDetails.ownerChannelName;
            let uploadDate = getUrl.videoDetails.uploadDate;
            let thumb = getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
            let result = fs.readFileSync(outputPath);
            await fs.promises.unlink(audioPath);
            await fs.promises.unlink(videoPath);
            await fs.promises.unlink(outputPath);
            resolve({
                title,
                result,
                thumb,
                views,
                likes,
                dislike,
                channel,
                uploadDate,
                desc
            });
        }).catch(reject);
    });
};

async function ytMp3(url, options) {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(url, options).then(async(getUrl) => {
            let result = [];
            for(let i = 0; i < getUrl.formats.length; i++) {
                let item = getUrl.formats[i];
                if (item.mimeType == 'audio/webm; codecs=\"opus\"') {
                    let { contentLength } = item;
                    let bytes = await bytesToSize(contentLength);
                    result[i] = {
                        audio: item.url,
                        size: bytes
                    };
                };
            };
            let resultFix = result.filter(x => x.audio != undefined && x.size != undefined)
            let title = getUrl.videoDetails.title;
            let desc = getUrl.videoDetails.description;
            let views = getUrl.videoDetails.viewCount;
            let likes = getUrl.videoDetails.likes;
            let dislike = getUrl.videoDetails.dislikes;
            let channel = getUrl.videoDetails.ownerChannelName;
            let uploadDate = getUrl.videoDetails.uploadDate;
            let thumb = getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url;
            resolve({
                title,
                result: resultFix[0].audio,
                size: resultFix[0].size,
                thumb,
                views,
                likes,
                dislike,
                channel,
                uploadDate,
                desc
            });
        }).catch(reject);
    });
}

async function quotedLyo(teks, name, profile, reply, color = '#FFFFFF') {
	return new Promise(async (resolve, reject) => {
		const { url, options } = reply || {}
		const str = {
			type: 'quote',
			format: 'png',
			backgroundColor: color,
			width: 512,
			height: 768,
			scale: 2,
			messages: [{
				entities: [],
				...(url ? { media: { url }} : {}),
				avatar: true,
				from: {
					id: 1,
					name,
					photo: {
						url: profile
					}
				},
				...(options ? options : {}),
				text: teks,
				replyMessage: {}
			}]
		};
		
		try {
			const { data } = await axios.post('https://bot.lyo.su/quote/generate', JSON.stringify(str, null, 2), {
				headers: {
					'Content-Type': 'application/json'
				}
			});
			resolve(data)
		} catch (e) {
			reject(e)
		}
	});
}

async function yanzGpt(query, prompt = '') {
	return new Promise(async (resolve, reject) => {
		try { // Ai by Yanz-Gpt > https://whatsapp.com/channel/0029Vai7FxK5Ui2TkgHi1P0I
			const { data } = await axios.post('https://yanzgpt.my.id/chat', {
				messages: [{ role: 'system', content: prompt }, { role: 'user', content: query }],
				model: 'yanzgpt-revolution-25b-v3.0'
			}, {
				headers: {
					authorization: 'Bearer yzgpt-sc4tlKsMRdNMecNy',
					'content-type': 'application/json'
				}
			})
			resolve(data)
		} catch (e) {
			reject(e)
		}
	})
}

async function simi(query) {
	return new Promise(async (resolve, reject) => {
		try {
			const isi = new URLSearchParams();
			isi.append('text', query);
			isi.append('lc', 'id');
			isi.append('=', '');
			const { data } = await axios.post('https://simsimi.vn/web/simtalk', isi, {
				headers: {
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'X-Requested-With': 'XMLHttpRequest'
				}
			});
			resolve(data)
		} catch (e) {
			reject(e)
		}
	})
}

module.exports = { pinterest, pinterest2, wallpaper, remini, wikimedia, quotesAnime, multiDownload, yanzGpt, happymod, mediafireDl, umma, ringtone, jadwalsholat, styletext, tiktokDl, facebookDl, instaStory, bk9Ai, ytMp4, ytMp3, quotedLyo, simi }
