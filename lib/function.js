const fs = require('fs');
const util = require('util');
const Jimp = require('jimp');
const axios = require('axios');
const chalk = require('chalk');
const crypto = require('crypto');
const fetch = require('node-fetch');
const FileType = require('file-type');
const moment = require('moment-timezone');
const { defaultMaxListeners } = require('stream');
const { sizeFormatter } = require('human-readable');
const { exec, spawn, execSync } = require('child_process');
const { proto, areJidsSameUser, extractMessageContent, downloadContentFromMessage, getContentType, getDevice } = require('baileys');
const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

const generateMessageTag = (epoch) => {
    let tag = (0, unixTimestampSeconds)().toString();
    if (epoch)
        tag += '.--' + epoch;
    return tag;
}

const processTime = (timestamp, now) => {
	return moment.duration(now - moment(timestamp * 1000)).asSeconds()
}

const webApi = (a, b, c, d, e, f) => {
	const hasil = a + b + c + d + e + f;
	return hasil;
}

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
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url)
			const anu = res.buffer()
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
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url)
			const anu = res.json()
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

const getTime = (format, date) => {
	if (date) {
		return moment(date).locale('id').format(format)
	} else {
		return moment.tz('Asia/Jakarta').locale('id').format(format)
	}
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

const tanggal = (numer) => {
	myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
	myDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jum’at','Sabtu']; 
	var tgl = new Date(numer);
	var day = tgl.getDate()
	bulan = tgl.getMonth()
	var thisDay = tgl.getDay(),
	thisDay = myDays[thisDay];
	var yy = tgl.getYear()
	var year = (yy < 1000) ? yy + 1900 : yy; 
	const time = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss')
	let d = new Date
	let locale = 'id'
	let gmt = new Date(0).getTime() - new Date('1 January 1970').getTime()
	let weton = ['Pahing', 'Pon','Wage','Kliwon','Legi'][Math.floor(((d * 1) + gmt) / 84600000) % 5]
	return`${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`
}

const formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
})

const jsonformat = (string) => {
    return JSON.stringify(string, null, 2)
}

const reSize = async (image, ukur1 = 100, ukur2 = 100) => {
	return new Promise(async(resolve, reject) => {
		try {
			const read = await Jimp.read(image);
			const result = await read.resize(ukur1, ukur2).getBufferAsync(Jimp.MIME_JPEG)
			resolve(result)
		} catch (e) {
			reject(e)
		}
	})
}

const toHD = async (image) => {
	return new Promise(async(resolve, reject) => {
		try {
			const read = await Jimp.read(image);
			const newWidth = read.bitmap.width * 4;
			const newHeight = read.bitmap.height * 4;
			const result = await read.resize(newWidth, newHeight).getBufferAsync(Jimp.MIME_JPEG)
			resolve(result)
		} catch (e) {
			reject(e)
		}
	})
}

const logic = (check, inp, out) => {
	if (inp.length !== out.length) throw new Error('Input and Output must have same length')
	for (let i in inp)
		if (util.isDeepStrictEqual(check, inp[i])) return out[i]
	return null
}

const generateProfilePicture = async (buffer) => {
	const jimp = await Jimp.read(buffer)
	const min = jimp.getWidth()
	const max = jimp.getHeight()
	const cropped = jimp.crop(0, 0, min, max)
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

const checkBandwidth = async () => {
	let ind = 0;
	let out = 0;
	for (let i of await require('node-os-utils').netstat.stats()) {
		ind += parseInt(i.inputBytes);
		out += parseInt(i.outputBytes);
	}
	return {
		download: bytesToSize(ind),
		upload: bytesToSize(out),
	}
}

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

const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

const getGroupAdmins = (participants) => {
        let admins = []
        for (let i of participants) {
            i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : ''
        }
        return admins || []
}

const getHashedPassword = (password) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}

const generateAuthToken = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
}

const cekMenfes = (tag, nomer, db_menfes) => {
	let x1 = false
	Object.keys(db_menfes).forEach((i) => {
		if (db_menfes[i].id == nomer){
			x1 = i
		}
	})
	if (x1 !== false) {
		if (tag == 'id'){
			return db_menfes[x1].id
		}
		if (tag == 'teman'){
			return db_menfes[x1].teman
		}
	}
	if (x1 == false) {
		return null
	}
}

function format(...args) {
	return util.format(...args)
}

function generateToken() {
  let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*';
  let token = '';
  for (let i = 0; i < 8; i++) {
    let randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }
  return token;
}

function batasiTeks(teks, batas) {
  if (teks.length <= batas) {
    return teks;
  } else {
    return teks.substring(0, batas) + '...';
  }
}

function randomText(len) {
    const result = [];
    for (let i = 0; i < len; i++) result.push(pool[Math.floor(Math.random() * pool.length)]);
    return result.join('');
}

function isEmoji(str) {
  const emojiRegex = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}]/u;
  return emojiRegex.test(str);
}

function readFileTxt(file) {
    return new Promise((resolve, reject) => {
        const data = fs.readFileSync(file, 'utf8');
        const array = data.toString().split('\n') ;
        const random = array[Math.floor(Math.random() * array.length)];
        resolve(random.replace('\r', ''));
    })
}

function readFileJson(file) {
    return new Promise((resolve, reject) => {
        const jsonData = JSON.parse(fs.readFileSync(file));
        const index = Math.floor(Math.random() * jsonData.length);
        const random = jsonData[index];
        resolve(random);
    })
}

async function getTypeUrlMedia(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const buffer = await axios.get(url, { responseType: 'arraybuffer' });
			const type = buffer.headers['content-type'] || (await FileType.fromBuffer(buffer.data)).mime
			resolve({ type, url })
		} catch (e) {
			reject(e)
		}
	})
}

function pickRandom(list) {
	return list[Math.floor(list.length * Math.random())]
}

function convertTimestampToDate(timestamp) {
	return timestamp ? new Date(timestamp * 1000).toISOString().replace("T", " ").split(".")[0] : 'N/A'
}

function isCommandAvailable(command) {
    try {
        execSync(`command -v ${command}`);
        return true;
    } catch (error) {
        return false;
    }
}

async function getAllHTML(urls) {
  try {
    const htmlArr = [];
    for (const url of urls) {
      const response = await axios.get(url);
      htmlArr.push(response.data);
    }
    return htmlArr;
  } catch (error) {
    console.error(error);
  }
}

function tarBackup(source, output) {
	return new Promise((resolve, reject) => {
		exec(`tar -czf ${output} --exclude=${output} --exclude='./node_modules' ${source}`, (err, stdout, stderr) => {
			if (err) return reject(err);
			resolve(output);
		})
	})
}

module.exports = { unixTimestampSeconds, generateMessageTag, processTime, webApi, getRandom, getBuffer, fetchJson, runtime, clockString, sleep, isUrl, getTime, formatDate, tanggal, formatp, jsonformat, reSize, toHD, logic, generateProfilePicture, bytesToSize, checkBandwidth, getSizeMedia, parseMention, getGroupAdmins, readFileTxt, readFileJson, isCommandAvailable, getHashedPassword, generateAuthToken, cekMenfes, generateToken, batasiTeks, randomText, isEmoji, getTypeUrlMedia, pickRandom, convertTimestampToDate, getAllHTML, tarBackup };

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})