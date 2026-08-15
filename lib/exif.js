import '../settings.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import ff from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import webp from 'node-webpmux';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getRandomFile = (ext) => `${crypto.randomBytes(6).toString('hex')}.${ext}`;

async function gifToWebp(inputStream) {
	const tmpFileOut = path.join(__dirname, '../database/temp', getRandomFile('webp'));
	try {
		await new Promise((resolve, reject) => {
			ff()
				.input(inputStream)
				.on('error', reject)
				.on('end', () => resolve(true))
				.addOutputOptions([
					'-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
					'-loop', '0',
					'-preset', 'default',
					'-an', '-fps_mode', 'vfr'
				])
				.toFormat('webp')
				.save(tmpFileOut);
		});
		return tmpFileOut;
	} catch (e) {
		if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
		throw new Error(`Error convert gifToWebp: ${e.message}`);
	}
}

async function imageToWebp(inputStream) {
	const tmpFileOut = path.join(__dirname, '../database/temp', getRandomFile('webp'));
	try {
		await new Promise((resolve, reject) => {
			ff()
				.input(inputStream)
				.on('error', reject)
				.on('end', () => resolve(true))
				.addOutputOptions([
					'-vcodec', 'libwebp', '-vf',
					'scale=500:500:force_original_aspect_ratio=decrease,setsar=1, pad=500:500:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse',
					'-loop', '0', '-preset', 'default'
				])
				.toFormat('webp')
				.save(tmpFileOut);
		});
		return tmpFileOut;
	} catch (e) {
		if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
		throw new Error(`Error convert imageToWebp: ${e.message}`);
	}
}

async function videoToWebp(inputStream) {
	const tmpFileOut = path.join(__dirname, '../database/temp', getRandomFile('webp'));
	try {
		await new Promise((resolve, reject) => {
			ff()
				.input(inputStream)
				.on('error', reject)
				.on('end', () => resolve(true))
				.addOutputOptions([
					'-vcodec', 'libwebp',
					'-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
					'-loop', '0',
					'-ss', '00:00:00',
					'-t', '00:00:05',
					'-preset', 'default',
					'-an', '-fps_mode', 'vfr'
				])
				.toFormat('webp')
				.save(tmpFileOut);
		});
		return tmpFileOut;
	} catch (e) {
		if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
		throw new Error(`Error convert videoToWebp: ${e.message}`);
	}
}

async function writeExif(inputStream, data, mimeType) {
	const tmpFileOut = path.join(__dirname, '../database/temp', getRandomFile('webp'));
	let wMediaTmp;
	try {
		if (/webp/.test(mimeType)) {
			wMediaTmp = path.join(__dirname, '../database/temp', getRandomFile('webp'));
			const writeStream = fs.createWriteStream(wMediaTmp);
			await new Promise((resolve, reject) => {
				inputStream.pipe(writeStream);
				inputStream.on('error', reject);
				writeStream.on('finish', resolve);
			});
		} else if (/image\/gif/.test(mimeType)) {
			wMediaTmp = await gifToWebp(inputStream);
		} else if (/jpeg|jpg|png/.test(mimeType)) {
			wMediaTmp = await imageToWebp(inputStream);
		} else if (/video/.test(mimeType)) {
			wMediaTmp = await videoToWebp(inputStream);
		} else {
			throw new Error('Format tidak didukung');
		}

		if (data) {
			const img = new webp.Image();
			const { wra = data.pack_id ? data.pack_id : global.author ? global.author : 'naze-dev', wrb = data.packname ? data.packname : global.packname ? global.packname : 'Bot WhatsApp', wrc = data.author ? data.author : global.author ? global.author : 'Nazedev', wrd = data.categories ? data.categories : [''], wre = data.isAvatar ? data.isAvatar : 0, ...wrf } = data;
			const json = { 'sticker-pack-id': wra, 'sticker-pack-name': wrb, 'sticker-pack-publisher': wrc, 'emojis': wrd, 'is-avatar-sticker': wre, wrf };
			const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
			const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
			const exif = Buffer.concat([exifAttr, jsonBuff]);
			exif.writeUIntLE(jsonBuff.length, 14, 4);
			await img.load(wMediaTmp);
			img.exif = exif;
			await img.save(tmpFileOut);
			
			if (fs.existsSync(wMediaTmp)) fs.unlinkSync(wMediaTmp);
			
			const finalStream = fs.createReadStream(tmpFileOut);
			finalStream.on('close', () => {
				if (fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
			});
			return finalStream;
		}
		
		const finalStream = fs.createReadStream(wMediaTmp);
		finalStream.on('close', () => {
			if (fs.existsSync(wMediaTmp)) fs.unlinkSync(wMediaTmp);
		});
		return finalStream;
	} catch (e) {
		if (wMediaTmp && fs.existsSync(wMediaTmp)) fs.unlinkSync(wMediaTmp);
		if (tmpFileOut && fs.existsSync(tmpFileOut)) fs.unlinkSync(tmpFileOut);
		throw new Error(`Error writeExif: ${e.message}`);
	}
}

export { imageToWebp, videoToWebp, writeExif, gifToWebp };