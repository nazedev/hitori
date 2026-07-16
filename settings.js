import fs from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

/*
	* Create By Algy Dev
	* Follow https://github.com/aligioricardo-lang
	* Whatsapp : https://whatsapp.com/channel/0029VbBlClKGJP8OawXsyX00
*/

//~~~~~~~~~~~~< GLOBAL SETTINGS >~~~~~~~~~~~~\\

global.owner = ["258857575209"] // ['628','628'] 2 owner atau lebih
global.author = 'Algy Dev'
global.botname = 'Algy Xz1'
global.packname = 'Bot WhatsApp'
global.timezone = 'Mozambique/Maputo' // Ganti pakai command .settimezone
global.locale = 'mz' // Ganti pakai command .setlocale
global.listprefix = ["+","!","."]
global.defaultAdminKey = crypto.randomBytes(5).toString("hex");

global.listv = ['•','●','■','✿','▲','➩','➢','➣','➤','✦','✧','△','❀','○','□','♤','♡','◇','♧','々','〆']
global.tempatDB = 'database.json' // Taruh url mongodb di sini jika menggunakan mongodb. Format : 'mongodb+srv://...'
global.tempatStore = 'baileys_store.json' // Taruh url mongodb di sini jika menggunakan mongodb. Format : 'mongodb+srv://...'
global.pairing_code = true
global.number_bot = '' // Kalo pake panel bisa masukin nomer di sini, jika belum ambil session. Format : '628xx'

global.fake = {
	anonim: 'https://telegra.ph/file/95670d63378f7f4210f03.png',
	thumbnailUrl: 'https://telegra.ph/file/fe4843a1261fc414542c4.jpg',
	thumbnail: fs.readFileSync('./src/media/naze.png'),
	docs: fs.readFileSync('./src/media/fake.pdf'),
	listfakedocs: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/pdf'],
}

global.my = {
	yt: "",
	gh: "https://github.com/aligioricardo-lang",
	gc: "https://chat.whatsapp.com/LthgoMAPNn10LTGofKKO6B",
	ch: "https://whatsapp.com/channel/0029VbBlClKGJP8OawXsyX00"
}

global.limit = {
	free: 20,
	premium: 999,
	vip: 900
}

global.money = {
	free: 10000,
	premium: 1000000,
	vip: 10000000
}

global.mess = {
	key: "Apikey limit! Silahkan Upgrade: https://naze.biz.id",
	owner: "Khusus Owner!",
	admin: "Khusus Admin!",
	botAdmin: "Bot harus Admin!",
	onWa: "Nomor tersebut tidak terdaftar di WhatsApp!",
	group: "Khusus Grup!",
	private: "Khusus Private Chat!",
	quoted: "Reply pesannya!",
	limit: "Limit habis!",
	prem: "Khusus Premium!",
	text: "Masukkan teksnya!",
	media: "Kirim medianya!",
	wait: "Proses...",
	fail: "Gagal!",
	error: "Error!",
	done: "Selesai!"
}

global.APIs = {
	naze: 'https://api.naze.biz.id',
	neosantara: 'https://api.neosantara.xyz/v1',
}
global.APIKeys = {
	'https://api.naze.biz.id': 'nz-298327ff62',
	'https://api.neosantara.xyz/v1': 'API_KEY_NEOSANTARA_AI',
}

// Lainnya
global.jadwalSholat = {
	Subuh: '04:30',
	Dzuhur: '12:06',
	Ashar: '15:21',
	Maghrib: '18:08',
	Isya: '19:00'
}

global.badWords = ["dongo","konsol"] // input kata-kata toxic yg lain. ex: ['dongo','dongonya']
global.chatLength = 1000

fs.watchFile(__filename, async () => {
	console.log(chalk.yellowBright(`[UPDATE] ${__filename}`))
});
