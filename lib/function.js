const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const axios = require('axios');
const https = require('https');
const chalk = require('chalk');
const fetch = require('node-fetch');
const { sizeFormatter } = require('human-readable');
const { exec, spawn, execSync } = require('child_process');
const { proto, areJidsSameUser, extractMessageContent, downloadContentFromMessage, getContentType, getDevice } = require('baileys');
const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');

const errorCache = {};

const unsafeAgent = new https.Agent({
	rejectUnauthorized: false
});

const axiosss = axios.create({
	httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: false }),
});

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

const getBuffer = async (url, options = {}) => {
	try {
		const { data } = await axios.get(url, {
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			responseType: 'arraybuffer',
			httpsAgent: unsafeAgent,
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url, { agent: unsafeAgent });
			const anu = await res.buffer()
			return anu
		} catch (e) {
			return e
		}
	}
}

const fetchJson = async (url, options = {}) => {
	try {
		const { data } = await axios.get(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
			},
			httpsAgent: unsafeAgent,
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url, { agent: unsafeAgent });
			const anu = await res.json()
			return anu
		} catch (e) {
			return e
		}
	}
}

const runtime = function(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor(seconds % (3600 * 24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
	var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
	var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
	var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

const formatDate = (n, locale = 'id') => {
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

const formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
});

const generateProfilePicture = async (buffer, size) => {
	let cropped;
	const jimp = await Jimp.read(buffer)
	const w = jimp.getWidth()
	const h = jimp.getHeight()
	if (size) {
		const min = Math.min(w, h)
		const x = (w - min) / 2
		const y = (h - min) / 2
		cropped = jimp.crop(x, y, min, min).resize(size, size)
	} else cropped = jimp.crop(0, 0, w, h)
	return {
		img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
		preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
	}
}

const bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const normalize = s => s.replace(/\s+/g, '').split('').sort().join('');

const getSizeMedia = async (path) => {
    return new Promise((resolve, reject) => {
        if (typeof path === 'string' && /http/.test(path)) {
            axios.get(path).then((res) => {
                let length = parseInt(res.headers['content-length'])
                if(!isNaN(length)) resolve(bytesToSize(length, 3))
            })
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path)
            if(!isNaN(length)) resolve(bytesToSize(length, 3))
        } else {
            reject(0)
        }
    })
}

async function updateSettings({ filePath, owner, author, apikey, botname, packname }) {
  return new Promise((resolve, reject) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (owner) content = content.replace(/global\.owner\s*=\s*\[[^\]]*\]/, `global.owner = ${JSON.stringify(owner)}`);
      if (author) content = content.replace(/global\.author\s*=\s*['"`].*?['"`]/, `global.author = '${author}'`);
      if (apikey) content = content.replace(/(global\.APIKeys\s*=\s*\{[\s\S]*?'\https:\/\/api\.naze\.biz\.id'\s*:\s*')[^']*(')/, `$1${apikey}$2`);
      if (botname) content = content.replace(/global\.botname\s*=\s*['"`].*?['"`]/, `global.botname = '${botname}'`);
      if (packname) content = content.replace(/global\.packname\s*=\s*['"`].*?['"`]/, `global.packname = '${packname}'`);
      fs.writeFileSync(filePath, content);
      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
}

const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

function fixBytes(obj) {
	if (obj instanceof Uint8Array || Buffer.isBuffer(obj)) return obj
	if (typeof obj !== 'object') return obj
	return Uint8Array.from(Object.values(obj))
}

function assertInstalled(cmd, name, code) {
	try {
		execSync(cmd, { stdio: 'ignore' });
	} catch (e) {
		console.error(chalk.redBright(`❌  ${name} is not installed or not in PATH.`) +`\nPlease install it first and run the script again.\n`);
		process.exit(code);
	}
}

function pickRandom(list) {
	return list[Math.floor(list.length * Math.random())]
}

function tarBackup(source, output) {
	return new Promise((resolve, reject) => {
		exec(`tar -czf ${output} --exclude=${output} --exclude='./node_modules' ${source}`, (err, stdout, stderr) => {
			if (err) return reject(err);
			resolve(output);
		})
	})
}

module.exports = {
	getSizeMedia,
	axiosss,
	assertInstalled,
	getRandom,
	getBuffer,
	fetchJson,
	runtime,
	clockString,
	sleep,
	isUrl,
	formatDate,
	formatp,
	generateProfilePicture,
	errorCache,
	normalize,
	updateSettings,
	parseMention,
	fixBytes,
	pickRandom,
	unsafeAgent,
	tarBackup
};