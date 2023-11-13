const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

async function tiktokdl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://api.tikmate.app/api/lookup', `url=${url}`, {
				headers: {
					'Accept': '*/*',
					'Accept-Language': 'en-US,en;q=0.9',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'Origin': 'https://tikmate.app',
					'Referer': 'https://tikmate.app/',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
				}
			});
			const res = {
				author: {
					unique_id: data.author_id,
					nickname: data.author_name,
					avatar: data.author_avatar
				},
				video: {
					create_time: data.create_time,
					like_count: data.like_count,
					share_count: data.share_count,
					comment_count: data.comment_count,
					no_watermark: `https://tikmate.app/download/${data.token}/${data.id}.mp4`,
					no_watermark_hd: `https://tikmate.app/download/${data.token}/${data.id}.mp4?hd=1`
				}
			}
			resolve(res)
		} catch (e) {
			reject(e)
		}
	})
}

async function igdown(url) {
	return new Promise(async (resolve, reject) => {
		try {
			let result = [];
			const res = await axios('https://indown.io/');
			const _$ = cheerio.load(res.data);
			const referer = _$('input[name=referer]').val();
			const locale = _$('input[name=locale]').val();
			const _token = _$('input[name=_token]').val();
			const { data } = await axios.post('https://indown.io/download', new URLSearchParams({
				link: url,
				referer,
				locale,
				_token,
			}), {
				headers: {
					cookie: res.headers['set-cookie'].join('; '),
				},
			});
			const $ = cheerio.load(data);
			let __$ = cheerio.load($("#result").html());
			__$("video").each(function () {
				let $$ = $(this);
				result.push({
					type: "video",
					thumbnail: $$.attr("poster"),
					url: $$.find("source").attr("src"),
				})
			});
			__$("img").each(function () {
				let $$ = $(this);
				result.push({
					type: "image",
					url: $$.attr("src"),
				})
			});
			resolve(result)
		} catch (e) {
			reject(e)
		}
	})
}

module.exports = { tiktokdl, igdown }