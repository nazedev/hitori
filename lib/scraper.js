const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const { exec, spawn, execSync } = require('child_process');

async function bytesToSize(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "n/a";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	if (i === 0) resolve(`${bytes} ${sizes[i]}`);
	return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

async function ytMp4(url, options) {
    return new Promise(async(resolve, reject) => {
        ytdl.getInfo(url, options).then(async(getUrl) => {
            const audioPath = path.join('./database/temp', `audio_${Date.now()}.mp4`);
            const videoPath = path.join('./database/temp', `video_${Date.now()}.mp4`);
            const outputPath = path.join('./database/temp', `output_${Date.now()}.mp4`);
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

module.exports = {
	ytMp4,
	ytMp3
}