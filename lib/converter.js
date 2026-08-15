import { spawn } from 'child_process';
import { PassThrough } from 'stream';

function ffmpeg(inputStream, args = [], outFormat = '') {
	const passThrough = new PassThrough();
	const child = spawn('ffmpeg', ['-y', '-i', 'pipe:0', ...args, '-f', outFormat, 'pipe:1']);
	
	child.on('error', (err) => passThrough.destroy(err));
	child.on('close', (code) => {
		if (code !== 0) {
			passThrough.destroy(new Error(`FFmpeg exited with code ${code}`));
		}
	});

	inputStream.pipe(child.stdin);
	inputStream.on('error', (err) => {
		child.stdin.destroy();
		passThrough.destroy(err);
	});

	child.stdout.pipe(passThrough);

	return passThrough;
}

function toAudio(inputStream) {
	return ffmpeg(inputStream, ['-vn', '-ac', '2', '-b:a', '128k', '-ar', '44100'], 'mp3');
}

function toPTT(inputStream) {
	return ffmpeg(inputStream, ['-vn', '-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on', '-compression_level', '10'], 'opus');
}

function toVideo(inputStream) {
	return ffmpeg(inputStream, ['-c:v', 'libx264', '-c:a', 'aac', '-ab', '128k', '-ar', '44100', '-crf', '32', '-preset', 'slow', '-movflags', 'frag_keyframe+empty_moov'], 'mp4');
}

function toGif(inputStream) {
	return ffmpeg(inputStream, ['-an', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-movflags', 'frag_keyframe+empty_moov'], 'mp4');
}

function toImage(inputStream) {
	return ffmpeg(inputStream, ['-vframes', '1', '-c:v', 'png'], 'image2pipe');
}

export {
	toAudio,
	toPTT,
	toVideo,
	toGif,
	toImage,
	ffmpeg
};