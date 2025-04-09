const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const https = require('https');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const crypto = require('crypto');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { exec, spawn, execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function bytesToSize(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "n/a";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	if (i === 0) resolve(`${bytes} ${sizes[i]}`);
	return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

const agent = new https.Agent({
	rejectUnauthorized: true,
	maxVersion: 'TLSv1.3',
	minVersion: 'TLSv1.2'
});

const yousearch = axios.create({
	baseURL: 'https://app.yoursearch.ai',
	headers: {
		'content-type': 'application/json'
	}
});

async function mediafireDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const res = await fetch('https://r.jina.ai/' + url, {
				headers: {
					'x-return-format': 'html'
				}
			});
			const data = await res.text()
			const $ = cheerio.load(data);
			const link = $('a#downloadButton').attr('href');
			const size = $('a#downloadButton').text().replace('Download', '').replace('(', '').replace(')', '').trim();
			const upload_date = $('.dl-info .details li').last().find('span').text().trim();
			const name = $('div.dl-btn-label').attr('title') || link.split('/')[5];
			const type = name.split('.')[1] || '';
			resolve({ name, type, upload_date, size, link })
		} catch (e) {
			reject(e)
		}
	})
}

async function pinterest(query) {
	return new Promise(async (resolve, reject) => {
		const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
		const params = {
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
		const headers = {
			'accept': 'application/json, text/javascript, */*, q=0.01',
			'accept-encoding': 'gzip, deflate',
			'accept-language': 'en-US,en;q=0.9',
			'dnt': '1',
			'referer': 'https://www.pinterest.com/',
			'sec-ch-ua': '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
			'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Microsoft Edge";v="133.0.3065.92", "Chromium";v="133.0.6943.142"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-model': '""',
			'sec-ch-ua-platform': '"Windows"',
			'sec-ch-ua-platform-version': '"10.0.0"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
			'x-app-version': 'c056fb7',
			'x-pinterest-appstate': 'active',
			'x-pinterest-pws-handler': 'www/[username]/[slug].js',
			'x-pinterest-source-url': '/hargr003/cat-pictures/',
			'x-requested-with': 'XMLHttpRequest'
		};
		try {
			const { data } = await axios.get(baseUrl, { httpsAgent: agent, headers, params });
			const results = data.resource_response?.data?.results?? [];
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

async function remini(buffer, method = 'recolor') {
	return new Promise(async (resolve, reject) => {
		try {
			const form = new FormData();
			const input = Buffer.from(buffer);
			form.append('model_version', 1);
			form.append('image', input, { filename: 'enhance_image_body.jpg', contentType: 'image/jpeg'  });
			const { data } = await axios.post('https://inferenceengine.vyro.ai/' + method, form, {
				headers: {
					...form.getHeaders(),
					'accept-encoding': 'gzip',
					'user-agent': 'Postify/1.0.0',
				},
				responseType: 'arraybuffer',
			});
			resolve(data)
		} catch (e) {
			reject(e)
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

async function hitamkan(buffer, filter = 'coklat') {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://negro.consulting/api/process-image', JSON.stringify({
				imageData: Buffer.from(buffer).toString('base64'),
				filter
			}), {
				headers: {
					'content-type': 'application/json'
				}
			});
			if(data && data.status === 'success') {
				resolve(Buffer.from(data.processedImageUrl.split(',')[1], 'base64'))
			}
		} catch (e) {
			reject(e)
		}
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

async function instagramDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://yt1s.io/api/ajaxSearch', new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' }), {
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'Origin': 'https://yt1s.io',
					'Referer': 'https://yt1s.io/',
					'User-Agent': 'Postify/1.0.0',
				}
			});
			const $ = cheerio.load(data.data);
			let anu = $('a.abutton.is-success.is-fullwidth.btn-premium').map((_, b) => ({
				title: $(b).attr('title'),
				url: $(b).attr('href')
			})).get()
			resolve(anu)
		} catch (e) {
			reject(e)
		}
	})
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
					hd: 1
				}
			})).data.data
			if (res && !res.size && !res.wm_size && !res.hd_size) {
				res.images.map(v => {
					data.push({ type: 'photo', url: v })
				})
			} else {
				if (res && res.wmplay) {
					data.push({ type: 'watermark', url: res.wmplay })
				}
				if (res && res.play) {
					data.push({ type: 'nowatermark', url: res.play })
				}
				if (res && res.hdplay) {
					data.push({ type: 'nowatermark_hd', url: res.hdplay })
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
				cover: res.cover,
				size_wm: res.wm_size,
				size_nowm: res.size,
				size_nowm_hd: res.hd_size,
				data: data,
				music_info: {
					id: res.music_info.id,
					title: res.music_info.title,
					author: res.music_info.author,
					album: res.music_info.album ? res.music_info.album : null,
					url: res.music || res.music_info.play
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
					avatar: res.author.avatar
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

async function instaStalk(username) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get('https://greatfon.com/v/' + username.toLowerCase(), {
				headers: {
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.9',
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache',
					'Connection': 'keep-alive',
					'Upgrade-Insecure-Requests': '1',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Sec-Fetch-Dest': 'document',
					'Sec-Fetch-Mode': 'navigate',
					'Sec-Fetch-Site': 'none',
					'Sec-Fetch-User': '?1'
				}
			});
			const $ = cheerio.load(data);
			let list_post = [];
			$('.card').each((a, b) => {
				const imageUrl = $(b).find('img').attr('src');
				const description = $(b).find('img').attr('alt').replace(/.*Instagram post:\s*/, '');
				const detailUrl = 'https://greatfon.io' + $(b).find('a').attr('href');
				list_post.push({ imageUrl, description, detailUrl });
			});
			resolve({
				avatar: $('.avatar img').attr('src') || '',
				username: $('h1.text-4xl').text().trim() || '',
				nickname: $('h2.text-2xl').text().trim() || '',
				description: $('.text-sm.font-serif').text().trim() || '',
				posts: $('.stat').eq(0).find('.stat-value').text().trim() || 0,
				followers: $('.stat').eq(1).find('.stat-value').text().trim() || 0,
				following: $('.stat').eq(2).find('.stat-value').text().trim() || 0,
				list_post
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function telegramStalk(username) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get('https://t.me/' + username, {
				headers: {
					'x-return-format': 'html'
				}
			});
			const $ = cheerio.load(data);
			resolve({
				url: 'https://t.me/' + username,
				title: $('meta[property="og:title"]').attr('content'),
				description: $('meta[property="og:description"]').attr('content'),
				image_url: $('meta[property="og:image"]').attr('content')
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function tiktokStalk(username) {
	return new Promise(async (resolve, reject) => {
		try {
			const headers = { 'referer': 'https://countik.com/user/@' + username, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' }
			const { data } = await axios.get('https://www.tiktok.com/oembed?url=https://www.tiktok.com/@' + username);
			const { data: res } = await axios.get('https://countik.com/api/exist/' + username, { headers });
			const { data: wet } = await axios.get('https://countik.com/api/userinfo?sec_user_id=' + res.sec_uid, { headers });
			resolve({
				...res,
				...wet,
				nickname: data.author_name
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function genshinStalk(id) {
	return new Promise(async (resolve, reject) => {
		try {
			const headers = {
				'content-type': 'application/json; charset=UTF-8',
				'origin': 'https://enka.network',
				'referer': 'https://enka.network/',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.89 Safari/537.36',
			}
			const { data } = await axios.get('https://enka.network/api/uid/' + id, { headers });
			const p = data.playerInfo;
			resolve({
				uid: data.uid,
				ttl: data.ttl,
				nickname: p.nickname,
				level: p.level,
				card_id: p.nameCardId,
				signature: p.signature,
				world_level: p.worldLevel,
				achivement: p.finishAchievementNum,
				spiral_abyss: p.towerFloorIndex + ' - ' + p.towerLevelIndex,
				image: 'https://mini.s-shot.ru/990x810/PNG/975/Z100/?https://enka.network/u/' + data.uid
			})
		} catch (e) {
			reject(e)
		}
	})
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

async function spotifyDl(url) {
	return new Promise(async(resolve, reject) => {
		try {
			const { data } = await axios.get('https://api.fabdl.com/spotify/get?url=' + url, {
				headers: {
					'content-type': 'application/json'
				}
			});
			const { data: res } = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${data.result.gid}/${data.result.id}`);
			resolve({
				title: data.result.name,
				duration: data.result.duration_ms,
				cover: data.result.image,
				download: "https://api.fabdl.com" + res.result.download_url,
			})
		} catch (e) {
			reject(e)
		}
	})
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

class NvlGroup {
	constructor() {
		this.signature = null;
		this.timestamp = null;
	}
	
	async updateSignature() {
		const res = await axios.get('https://ytdownloader.nvlgroup.my.id/generate-signature');
		this.signature = res.data.signature;
		this.timestamp = res.data.timestamp;
	}
	async ensureSignature() {
		if (!this.signature || !this.timestamp || Date.now() - this.timestamp > 4 * 60 * 1000) {
			await this.updateSignature();
		}
	}
	
	async search(query) {
		await this.ensureSignature();
		const { data } = await axios.get(`https://ytdownloader.nvlgroup.my.id/web/search?q=${encodeURIComponent(query)}`, {
			headers: {
				'x-server-signature': this.signature,
				'x-signature-timestamp': this.timestamp
			}
		});
		return data;
	}
	
	async info(url) {
		await this.ensureSignature();
		const { data } = await axios.get(`https://ytdownloader.nvlgroup.my.id/web/info?url=${encodeURIComponent(url)}`, {
			headers: {
				'x-server-signature': this.signature,
				'x-signature-timestamp': this.timestamp
			}
		});
		return data;
	}
	
	async download(url) {
		await this.ensureSignature();
		const info = await this.info(url);
		const video = info.resolutions.map(res => ({
			...res,
			url: `https://ytdownloader.nvlgroup.my.id/web/download?url=${url}&resolution=${res.height}&signature=${this.signature}&timestamp=${this.timestamp}`
		}));
		const audio = info.audioBitrates.map(res => ({
			...res,
			url: `https://ytdownloader.nvlgroup.my.id/web/audio?url=${url}&bitrate=${res.bitrate}&signature=${this.signature}&timestamp=${this.timestamp}`
		}));
		return { video, audio };
	}
}

async function quotedLyo(teks, name, profile, replynya, color = '#FFFFFF') {
	return new Promise(async (resolve, reject) => {
		const { url, options, reply } = replynya || {}
		const payload = {
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
				replyMessage: reply ? {
					name: reply.name || '',
					text: reply.text || '',
					chatId: Math.floor(Math.random() * 9999999)
				} : {},
			}]
		};
		try {
			const urls = ['https://quotly.netorare.codes/generate', 'https://btzqc.betabotz.eu.org/generate', 'https://qc.botcahx.eu.org/generate', 'https://bot.lyo.su/quote/generate'];
			for (let url of urls) {
				try {
					const { data } = await axios.post(url, JSON.stringify(payload, null, 2), {
						headers: {
							'Content-Type': 'application/json'
						}
					});
					resolve(data)
				} catch (e) {}
			}
		} catch (e) {
			reject(e)
		}
	});
}

async function yanzGpt(messages = [], model = 'yanzgpt-revolution-25b-v3.0') {
	return new Promise(async (resolve, reject) => {
		try { // Ai by Yanz-Gpt > https://whatsapp.com/channel/0029Vai7FxK5Ui2TkgHi1P0I
			const models = {
				default: 'yanzgpt-revolution-25b-v3.5',
				pro: 'yanzgpt-legacy-72b-v3.5',
				reasoning: 'yanzgpt-r1-70b-v3.5'
			};
			const { data } = await axios.post('https://api.yanzgpt.my.id/v1/chat', {
				messages,
				model: model || models.default
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

async function youSearch(query) {
	return new Promise(async (resolve, reject) => {
		try {
			const res = await yousearch.post('/api', {
				searchTerm: query,
				promptTemplate: `Search term: '{searchTerm}'`,
				searchParameters: '{}',
				searchResultTemplate: `[{order}] '{snippet}'\nURL: {link}`,
			});
			resolve(res.data.response)
		} catch (e) {
			reject(e)
		}
	})
}

async function gptLogic(messages = [], prompt) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://chateverywhere.app/api/chat', {
				model: {
					id: 'gpt-3.5-turbo-0613',
					name: 'GPT-3.5',
					maxLength: 12000,
					tokenLimit: 4000,
				},
				prompt, messages
			}, {
				headers: {
					'content-type': 'application/json',
					'cookie': '_ga=GA1.1.34196701.1707462626; _ga_ZYMW9SZKVK=GS1.1.1707462625.1.0.1707462625.60.0.0; ph_phc_9n85Ky3ZOEwVZlg68f8bI3jnOJkaV8oVGGJcoKfXyn1_posthog=%7B%22distinct_id%22%3A%225aa4878d-a9b6-40fb-8345-3d686d655483%22%2C%22%24sesid%22%3A%5B1707462733662%2C%22018d8cb4-0217-79f9-99ac-b77f18f82ac8%22%2C1707462623766%5D%7D',
					'origin': 'https://chateverywhere.app',
					'referer': 'https://chateverywhere.app/id',
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
					'x-forwarded-for': Array(4).fill().map(() => Math.floor(Math.random() * 256)).join('.'),
				}
			})
			resolve(data)
		} catch (e) {
			reject(e)
		}
	})
}

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    cdn: "/random-cdn",
    info: "/v2/info", 
    download: "/download"
  },
  headers: {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://yt.savetube.me',
    'referer': 'https://yt.savetube.me/',
    'user-agent': 'Postify/1.0.0'
  },
  formatVideo: ['144', '240', '360', '480', '720', '1080', '1440', '2k', '3k', '4k', '5k', '8k'],
  formatAudio: ['mp3', 'm4a', 'webm', 'aac', 'flac', 'opus', 'ogg', 'wav' ],

  crypto: {
    hexToBuffer: (hexString) => {
      const matches = hexString.match(/.{1,2}/g);
      return Buffer.from(matches.join(''), 'hex');
    },

    decrypt: async (enc) => {
      try {
        const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        const data = Buffer.from(enc, 'base64');
        const iv = data.slice(0, 16);
        const content = data.slice(16);
        const key = savetube.crypto.hexToBuffer(secretKey);
        
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(content);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return JSON.parse(decrypted.toString());
      } catch (error) {
        throw new Error(`${error.message}`);
      }
    }
  },

  isUrl: str => { 
    try { 
      new URL(str); 
      return true; 
    } catch (_) { 
      return false; 
    } 
  },

  youtube: url => {
    if (!url) return null;
    const a = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (let b of a) {
      if (b.test(url)) return url.match(b)[1];
    }
    return null;
  },

  request: async (endpoint, data = {}, method = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : savetube.api.base}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: savetube.headers
      });
      return {
        status: true,
        code: 200,
        data: response
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: error.message
      };
    }
  },

  getCDN: async () => {
    const response = await savetube.request(savetube.api.cdn, {}, 'get');
    if (!response.status) return response;
    return {
      status: true,
      code: 200,
      data: response.data.cdn
    };
  },

  download: async (link, format) => {
    if (!link) {
      return {
        status: false,
        code: 400,
        error: "Infokan linknya cik"
      };
    }

    if (!savetube.isUrl(link)) {
      return {
        status: false,
        code: 400,
        error: "Itu bukan link youtube kocak"
      };
    }

    const allFormats = [...savetube.formatVideo, ...savetube.formatAudio];
    if (!format || !allFormats.includes(format)) {
      return {
        status: false,
        code: 400,
        error: "Itu bukan formats yang ada cik, liat dibawah ini",
        available_fmt: allFormats
      };
    }

    const id = savetube.youtube(link);
    if (!id) {
      return {
        status: false,
        code: 400,
        error: "Yaelah link youtubenya ada yang salah cik"
      };
    }

    try {
      const cdnx = await savetube.getCDN();
      if (!cdnx.status) return cdnx;
      const cdn = cdnx.data;

      const result = await savetube.request(`https://${cdn}${savetube.api.info}`, {
        url: `https://www.youtube.com/watch?v=${id}`
      });
      if (!result.status) return result;
      const decrypted = await savetube.crypto.decrypt(result.data.data);

      const dl = await savetube.request(`https://${cdn}${savetube.api.download}`, {
        id: id,
        downloadType: savetube.formatAudio.includes(format) ? 'audio' : 'video',
        quality: savetube.formatAudio.includes(format) ? '128' : format,
        key: decrypted.key
      });

      return {
        status: true,
        code: 200,
        result: {
          title: decrypted.title || "Gak tau 🤷🏻",
          type: savetube.formatAudio.includes(format) ? 'audio' : 'video',
          format: format,
          thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          download: dl.data.data.downloadUrl,
          id: id,
          key: decrypted.key,
          duration: decrypted.duration,
          quality: savetube.formatAudio.includes(format) ? '128' : format,
          downloaded: dl.data.data.downloaded || false
        }
      };

    } catch (error) {
      return {
        status: false,
        code: 500,
        error: error.message
      };
    }
  }
};

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

async function geminiAi(query, apikey, options = {}) {
	return new Promise(async (resolve, reject) => {
		try {
			if (!apikey) reject({ status: 401, error: 'Unauthorized' });
			const gemini = new GoogleGenerativeAI(apikey);
			const model = gemini.getGenerativeModel({
				...(options.prompt ? { systemInstruction: options.prompt } : {}),
				model: 'gemini-2.0-flash-exp-image-generation',
				generationConfig: {
					responseModalities: ['Text', 'Image']
				}
			});
			const { response } = await model.generateContent([{ text: query }, ...(options.media ? [{
				inlineData: {
					mimeType: options.mime,
					data: Buffer.from(options.media).toString('base64')
				}
			}] : [])]);
			const hasil = {}
			hasil.token = response.usageMetadata;
			if (response?.promptFeedback?.blockReason === 'OTHER' || response?.candidates?.[0]?.finishReason === 'IMAGE_SAFETY') resolve(hasil)
			for (const part of response.candidates[0].content.parts) {
				if (part.text) {
					hasil.text = part.text;
				}
				if (part.inlineData) {
					hasil.media = Buffer.from(part.inlineData.data, 'base64');
				}
			}
			resolve(hasil)
		} catch (e) {
			reject(e)
		}
	})
}

module.exports = { pinterest, wallpaper, remini, hitamkan, wikimedia, yanzGpt, mediafireDl, ringtone, styletext, instagramDl, tiktokDl, facebookDl, instaStalk, telegramStalk, tiktokStalk, genshinStalk, instaStory, bk9Ai, spotifyDl, ytMp4, ytMp3, NvlGroup, quotedLyo, youSearch, gptLogic, savetube, simi, geminiAi }

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});