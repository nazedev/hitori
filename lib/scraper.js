import fs from 'fs';
import path from 'path';
import ytdl from 'ytdl-core';
import { exec } from 'child_process';

async function bytesToSize(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "n/a";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	if (i === 0) return `${bytes} ${sizes[i]}`;
	return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

async function ytMp4(url, options) {
	let audioPath = null;
	let videoPath = null;
	let outputPath = null;
	try {
		const getUrl = await ytdl.getInfo(url, options);
		audioPath = path.join('./database/temp', `audio_${Date.now()}.mp4`);
		videoPath = path.join('./database/temp', `video_${Date.now()}.mp4`);
		outputPath = path.join('./database/temp', `output_${Date.now()}.mp4`);
		await new Promise((resolve, reject) => {
			ytdl(url, { format: ytdl.chooseFormat(getUrl.formats, { quality: 'highestaudio', filter: 'audioonly' }) })
				.pipe(fs.createWriteStream(audioPath))
				.on('finish', resolve)
				.on('error', reject);
		});
		await new Promise((resolve, reject) => {
			ytdl(url, { format: ytdl.chooseFormat(getUrl.formats, { quality: 'highestvideo', filter: 'videoonly' }) })
				.pipe(fs.createWriteStream(videoPath))
				.on('finish', resolve)
				.on('error', reject);
		});
		await new Promise((resolve, reject) => {
			exec(`ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac "${outputPath}"`, (error, stdout, stderr) => {
				if (error) {
					return reject(new Error(`ffmpeg error: ${error.message}`));
				}
				resolve();
			});
		});


		return {
			title: getUrl.videoDetails.title,
			result: outputPath,
			thumb: getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url,
			views: getUrl.videoDetails.viewCount,
			likes: getUrl.videoDetails.likes,
			dislike: getUrl.videoDetails.dislikes,
			channel: getUrl.videoDetails.ownerChannelName,
			uploadDate: getUrl.videoDetails.uploadDate,
			desc: getUrl.videoDetails.description
		};
	} catch (error) {
		throw error;
	} finally {
		if (audioPath) await fs.promises.unlink(audioPath).catch(() => {});
		if (videoPath) await fs.promises.unlink(videoPath).catch(() => {});
	}
}

async function ytMp4Stream(url, options) {
	try {
		const getUrl = await ytdl.getInfo(url, options);
		const format = ytdl.chooseFormat(getUrl.formats, { filter: 'audioandvideo', quality: 'highest' });
		if (!format) throw new Error("Tidak dapat menemukan format video gabungan.");
		const stream = ytdl(url, { format });
		
		return {
			title: getUrl.videoDetails.title,
			stream: stream,
			thumb: getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url,
			views: getUrl.videoDetails.viewCount,
			likes: getUrl.videoDetails.likes,
			dislike: getUrl.videoDetails.dislikes,
			channel: getUrl.videoDetails.ownerChannelName,
			uploadDate: getUrl.videoDetails.uploadDate,
			desc: getUrl.videoDetails.description,
			mimeType: format.mimeType.split(';')[0]
		};
	} catch (error) {
		throw error;
	}
}

async function ytMp3(url, options) {
	try {
		const getUrl = await ytdl.getInfo(url, options);
		let result = [];
		for (let i = 0; i < getUrl.formats.length; i++) {
			let item = getUrl.formats[i];
			if (item.mimeType === 'audio/webm; codecs="opus"') {
				let { contentLength } = item;
				let bytes = await bytesToSize(contentLength);
				result.push({
					audio: item.url,
					size: bytes
				});
			}
		}
		let resultFix = result.filter(x => x.audio !== undefined && x.size !== undefined);
		if (resultFix.length === 0) {
			throw new Error("Format audio tidak ditemukan.");
		}
		return {
			title: getUrl.videoDetails.title,
			result: resultFix[0].audio,
			size: resultFix[0].size,
			thumb: getUrl.player_response.microformat.playerMicroformatRenderer.thumbnail.thumbnails[0].url,
			views: getUrl.videoDetails.viewCount,
			likes: getUrl.videoDetails.likes,
			dislike: getUrl.videoDetails.dislikes,
			channel: getUrl.videoDetails.ownerChannelName,
			uploadDate: getUrl.videoDetails.uploadDate,
			desc: getUrl.videoDetails.description
		};
	} catch (error) {
		throw error;
	}
}

export {
	ytMp4,
	ytMp3,
	ytMp4Stream
};