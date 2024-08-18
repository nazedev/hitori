const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const cheerio = require('cheerio');
const FormData = require('form-data');

async function bytesToSize(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "n/a";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	if (i === 0) resolve(`${bytes} ${sizes[i]}`);
	return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

async function chatGpt(query) {
	return new Promise(async (resolve, reject) => {
		try {
			const anu = await axios.post('https://www.basedgpt.chat/api/chat', JSON.stringify({
				messages: [{ role: 'user', content: 'Gunakan bahasa Indonesia : ' + query }],
			}), {
				headers: {
					'Content-Type': 'application/json',
				}
			});
			resolve(anu.data);
		} catch (e) {
			reject(e);
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

async function instaDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const results = [];
			const input = new URLSearchParams({ action: 'ajax_insta_url', input: url });
			const { data } = await axios.post('https://igram.bar/wp-admin/admin-ajax.php', input, {
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
					'upgrade-insecure-requests': '1',
					'referer': 'https://igram.bar',
					'referrer-policy': 'strict-origin-when-cross-origin'
				}
			});
			const $ = cheerio.load(data);
			$('script').each((i, e) => {
				const text = $(e).html();
				const matchedUrl = text?.match(/location.href = "(.*?)"/)?.[1];
				if (matchedUrl) {
					results.push({ url: matchedUrl });
				}
			});
			const uniqueData = Array.from(new Set(results.map(item => item.url))).map(_hurl => {
				return results.find(item => item.url === _hurl);
			});
			resolve(uniqueData);
		} catch (e) {
			reject(e);
		}
	});
}

async function instaDownload(url) {
	return new Promise (async (resolve, reject) => {
		try {
			const result = [];
			const { data } = await axios.post('https://v3.igdownloader.app/api/ajaxSearch', new URLSearchParams({ recaptchaToken: '', q: url, t: 'media', lang: 'en' }), {
				headers: {
					'Accept': '*/*',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				}
			});
			const $ = cheerio.load(data.data);
			$('ul.download-box li').each((a, b) => {
				const media = [];
				$(b).find('.photo-option select option').each((c, d) => {
					media.push({
						resolution: $(d).text(),
						url: $(d).attr('value'),
					});
				});
				const thumb = $(b).find('.download-items__thumb img').attr('src');
				const download = $(b).find('.download-items__btn a').attr('href');
				result.push({ thumb, media, download })
			});
			resolve(result)
		} catch (e) {
			reject(e)
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

async function ytMp4(url) {
    return new Promise(async(resolve, reject) => {
        ytdl.getInfo(url).then(async(getUrl) => {
            let result = [];
            for(let i = 0; i < getUrl.formats.length; i++) {
                let item = getUrl.formats[i];
                if (item.container == 'mp4' && item.hasVideo == true && item.hasAudio == true) {
                    let { qualityLabel, contentLength } = item;
                    let bytes = await bytesToSize(contentLength);
                    result[i] = {
                        video: item.url,
                        quality: qualityLabel,
                        size: bytes
                    };
                };
            };
            let resultFix = result.filter(x => x.video != undefined && x.size != undefined && x.quality != undefined)
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
                result: resultFix[0].video,
                quality: resultFix[0].quality,
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
};

async function ytMp3(url) {
    return new Promise((resolve, reject) => {
        ytdl.getInfo(url).then(async(getUrl) => {
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

async function allDl(url, options ={}) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://api.cobalt.tools/api/json', { url, ...options }, {
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
					'Referer': 'https://cobalt.tools/'
				}
			});
			resolve(data)
		} catch(e) {
			reject(e)
		}
	})
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

class Ytdl {
    constructor() {
        this.baseUrl = 'https://id-y2mate.com';
    }

    async search(url) {
        const requestData = new URLSearchParams({
            k_query: url,
            k_page: 'home',
            hl: '',
            q_auto: '0'
        });

        const requestHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest'
        };

        try {
            const response = await axios.post(`${this.baseUrl}/mates/analyzeV2/ajax`, requestData, {
                headers: requestHeaders
            });

            const responseData = response.data;
            return responseData;
        } catch (error) {
            if (error.response) {
                console.error(`HTTP error! status: ${error.response.status}`);
            } else {
                console.error('Axios error: ', error.message);
            }
        }
    }

    async convert(videoId, key) {
        const requestData = new URLSearchParams({
            vid: videoId,
            k: key
        });

        const requestHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
            'Referer': `${this.baseUrl}/youtube/${videoId}`
        };

        try {
            const response = await axios.post(`${this.baseUrl}/mates/convertV2/index`, requestData, {
                headers: requestHeaders
            });

            const responseData = response.data;
            return responseData;
        } catch (error) {
            if (error.response) {
                console.error(`HTTP error! status: ${error.response.status}`);
            } else {
                console.error('Axios error: ', error.message);
            }
        }
    }

    async play(url) {
        let { links, vid, title } = await this.search(url);
        let video = {}, audio = {};

        for (let i in links.mp4) {
            let input = links.mp4[i];
            let { fquality, dlink } = await this.convert(vid, input.k);
            video[fquality] = {
                size: input.q,
                url: dlink
            };
        }

        for (let i in links.mp3) {
            let input = links.mp3[i];
            let { fquality, dlink } = await this.convert(vid, input.k);
            audio[fquality] = {
                size: input.q,
                url: dlink
            };
        }

        return { title, video, audio };
    }
}

async function cekKhodam(name) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get('https://khodam.vercel.app/v2?nama=' + encodeURIComponent(name))
			const $ = cheerio.load(data)
			const res = $('.__className_cad559.text-3xl.font-bold.text-rose-600').text();
			resolve(res)
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

async function mediafireDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const hasil = [];
			const res = await axios.get(url);
			const $ = cheerio.load(res.data);
			const link = $('a#downloadButton').attr('href');
			const size = $('a#downloadButton').text().replace('Download', '').replace('(', '').replace(')', '').trim();
			const name = link.split('/')[5];
			const type = name.split('.')[1] || '';
			hasil.push({ name, type, size, link });
			resolve(hasil)
		} catch (e) {
			reject(e)
		}
	})
}

module.exports = { chatGpt, tiktokDl, facebookDl, instaDl, instaDownload, instaStory, ytMp4, ytMp3, allDl, quotedLyo, Ytdl, cekKhodam, simi, mediafireDl }