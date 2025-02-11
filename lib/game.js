require('../settings');
const { sleep, clockString } = require('./function')

function pickRandom(list) {
	return list[Math.floor(list.length * Math.random())]
}

const rdGame = (bd, id, tm) => Object.keys(bd).find(a => a.startsWith(id) && a.endsWith(tm));
const iGame = (bd, id) => (a => a && bd[a].id)(Object.keys(bd).find(a => a.startsWith(id)));
const tGame = (bd, id) => (a => a && bd[a].time)(Object.keys(bd).find(a => a.startsWith(id)));

const gameSlot = async (conn, m, db) => {
	if (db.users[m.sender].limit < 1) return m.reply(global.mess.limit)
	const sotoy = ['🍇','🍉','🍋','🍌','🍎','🍑','🍒','🫐','🥥','🥑']
	const slot1 = pickRandom(sotoy)
	const slot2 = pickRandom(sotoy)
	const slot3 = pickRandom(sotoy)
	const listSlot1 = `${pickRandom(sotoy)} : ${pickRandom(sotoy)} : ${pickRandom(sotoy)}`
	const listSlot2 = `${slot1} : ${slot2} : ${slot3}`
	const listSlot3 = `${pickRandom(sotoy)} : ${pickRandom(sotoy)} : ${pickRandom(sotoy)}`
	const randomLimit = Math.floor(Math.random() * 10)
	const botNumber = await conn.decodeJid(conn.user.id)
	try {
		if (slot1 === slot2 && slot2 === slot3) {
			db.users[m.sender].limit -= 1
			db.set[botNumber].limit += 1
			let sloth =`[  🎰VIRTUAL SLOT 🎰  ]\n------------------------\n\n${listSlot1}\n${listSlot2} <=====\n${listSlot3}\n\n------------------------\n[  🎰 VIRTUAL SLOT 🎰  ]\n\n*Keterangan* :\n_You Win🎉_ <=====Limit + ${randomLimit}, Uang + ${randomLimit * 500}`
			conn.sendMessage(m.chat, { text: sloth }, { quoted: m })
			db.users[m.sender].limit += randomLimit
			db.users[m.sender].uang += randomLimit * 500
		} else {
			db.users[m.sender].limit -= 1
			db.set[botNumber].limit += 1
			let sloth =`[  🎰VIRTUAL SLOT 🎰  ]\n------------------------\n\n${listSlot1}\n${listSlot2} <=====\n${listSlot3}\n\n------------------------\n[  🎰 VIRTUAL SLOT 🎰  ]\n\n*Keterangan* :\n_You Lose_ <=====\nLimit - 1`
			conn.sendMessage(m.chat, { text: sloth }, { quoted: m })
		}
	} catch (e) {
		console.log(e)
		m.reply('Error!')
	}
}

const gameCasinoSolo = async (conn, m, prefix, db) => {
	try {
		let buatall = 1
		const botNumber = await conn.decodeJid(conn.user.id)
		let randomaku = `${Math.floor(Math.random() * 101)}`.trim()
		let randomkamu = `${Math.floor(Math.random() * 81)}`.trim() //hehe Biar Susah Menang :v
		let Aku = (randomaku * 1)
		let Kamu = (randomkamu * 1)
		let count = m.args[0]
		count = count ? 'all' === count ? Math.floor(db.users[m.sender].uang / buatall) : parseInt(count) : m.args[0] ? parseInt(m.args[0]) : 1
		count = Math.max(1, count)
		if (m.args.length < 1) return m.reply(prefix + 'casino <jumlah>\n' + prefix + 'casino 1000')
		if (isNaN(m.args[0])) return m.reply(`Masukkan jumlahnya!\nContoh : ${prefix + m.command} 1000`)
		if (db.users[m.sender].uang >= count * 1) {
			db.users[m.sender].uang -= count * 1
			db.set[botNumber].uang += count * 1
			if (Aku > Kamu) {
				m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*You LOSE*\nKamu kehilangan ${count} Uang`.trim())
			} else if (Aku < Kamu) {
				db.users[m.sender].uang += count * 2
				m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*You Win*\nKamu mendapatkan ${count * 2} Uang`.trim())
			} else {
				db.users[m.sender].uang += count * 1
				m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*SERI*\nKamu mendapatkan ${count * 1} Uang`.trim())
			}
		} else {
			m.reply(`Uang kamu tidak mencukupi untuk Casino silahkan *kumpulkan* terlebih dahulu!`)
		}
	} catch (e) {
		console.log(e)
		m.reply('Error!')
	}
}

const gameMerampok = async (m, db) => {
	let __timers = (new Date - db.users[m.sender].lastrampok)
	let _timers = (3600000 - __timers)
	let timers = clockString(_timers)
	if (new Date - db.users[m.sender].lastrampok > 3600000) {
		let dapat = (Math.floor(Math.random() * 10000))
		let who
		if (m.isGroup) who = m.mentionedJid ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.mentionedJid[0]
		else who = m.chat
		if (!who) return m.reply('Tag salah satu')
		if (!db.users[who]) return m.reply('Target tidak terdaftar di database!')
		if (10000 > db.users[who].uang) return m.reply('Targetnya Kismin ngab🗿')
		db.users[who].uang -= dapat
		db.users[m.sender].uang += dapat
		db.users[m.sender].lastrampok = new Date * 1
		m.reply(`Berhasil Merampok Money Target Sebesar ${dapat}`)
	} else {
		m.reply(`Anda Sudah merampok dan berhasil sembunyi, tunggu ${timers} untuk merampok lagi`)
	}
}

const gameBegal = async (conn, m, db) => {
	let user = db.users[m.sender]
    let __timers = (new Date - user.lastbegal)
    let _timers = (3600000 - __timers)
    let timers = clockString(_timers)
    const botNumber = await conn.decodeJid(conn.user.id)
	const randomUang = Math.floor(Math.random() * 10001)
	let random = [{teks: 'Pemain Berhasil Kabur!', no: 0},{teks: 'Pemain Melarikan Diri!', no: 0},{teks: 'Pemain Bersembunyi', no: 0},{teks: 'Pemain Bunuh Diri', no: 2},{teks: 'Pemain Berhasil Tertangkap', no: 2},{teks: 'Pemain Tidak Di Temukan!', no: 0},{teks: 'Pemain Lebih Kuat Dari Kamu!', no: 1},{teks: 'Pemain Menggunakan Cheat', no: 1},{teks: 'Pemain Lapor Polisi', no: 0},{teks: 'Pemain Tertangkap!', no: 2},{teks: 'Pemain Menyerahkan Diri', no: 2}]
	let teksnya = await pickRandom(random);
	if (new Date - user.lastbegal > 3600000) {
		let { key } = await m.reply('Sedang Mencari Pemain...')
		await sleep(2000)
		if (teksnya.no === 0) {
			await m.reply({ text: teksnya.teks, edit: key })
			await m.reply('Gagal Mencari Pemain, Silahkan Coba lagi')
		} else if (teksnya.no === 1) {
			await m.reply({ text: teksnya.teks, edit: key })
			await m.reply(`Kamu Di Bunuh Oleh Pemain\nUang Kamu Di Rampas Sebesar *${randomUang}*`)
			db.users[m.sender].uang -= randomUang
			db.set[botNumber].uang += randomUang * 1
		} else {
			await m.reply({ text: teksnya.teks, edit: key })
			await m.reply(`Berhasil Mendapatkan Uang Sebesar : *${randomUang}*`)
			db.users[m.sender].uang += randomUang
			db.users[m.sender].lastbegal = new Date * 1
		}
	} else {
		m.reply(`Silahkan tunggu *⏱️${timers}* lagi untuk bisa bermain lagi`)
	}
}

const daily = async (m, db) => {
	let user = db.users[m.sender]
	let __timers = (new Date - user.lastclaim)
	let _timers = (86400000 - __timers)
	let timers = clockString(_timers)
	if (new Date - user.lastclaim > 86400000) {
		m.reply(`*Daily Claim*\n_Berhasil Claim_\n- limit : 10\n- uang : 10000\n\n_Claim Di Reset_`)
		db.users[m.sender].limit += 10
		db.users[m.sender].uang += 10000
		db.users[m.sender].lastclaim = new Date * 1
	} else {
		m.reply(`Silahkan tunggu *⏱️${timers}* lagi untuk bisa mengclaim lagi`)
	}
}

const buy = async (m, args, db) => {
	if (args[0] === 'limit') {
		if (!args[1]) return m.reply(`Masukkan Nominalnya!\nExample : ${m.prefix + m.command} limit 10`);
		let count = parseInt(args[1])
		if (db.users[m.sender].uang >= count * 1) {
			db.users[m.sender].limit += count * 1
			db.users[m.sender].uang -= count * 500
			m.reply(`Berhasil Membeli Limit Sebanyak ${args[1] * 1} dengan harga ${args[1] * 500}`);
		} else {
			m.reply(`Uang Kamu Tidak Cukup Untuk Membeli limit!\nUangmu Tersisa : ${db.users[m.sender].uang}\nHarga ${args[1]} Limit : ${args[1] * 500}`);
		}
	} else {
		m.reply(`Harga Limit : Jumlah x 500\n• 1 limit = 500\n• 2 limit = 1000\n\nExample : .buy limit 3`);
	}
}

const setLimit = (m, db) => db.users[m.sender].limit -= 1

const addLimit = (jumlah, no, db) => db.users[no].limit += parseInt(jumlah)

const setUang = (m, db) => db.users[m.sender].uang -= 1000

const addUang = (jumlah, no, db) => db.users[no].uang += parseInt(jumlah)

const transfer = async (m, args, db) => {
	if (args[0] == 'limit') {
		if (!args[1].length > 7) return m.reply(`Transfer Menu :\nExample : ${m.prefix + m.command} limit @tag 11\n• ${m.prefix + m.command} limit @tag jumlah\n• ${m.prefix + m.command} uang @tag jumlah`);
		let count = parseInt(args[2] && args[2].length > 0 ? Math.min(9999999, Math.max(parseInt(args[2]), 1)) : Math.min(1))
		let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : args[1] ? (args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : false
		if (!who) return m.reply('Siapa yg mau di transfer?')
		if (db.users[who]) {
			if (db.users[m.sender].limit >= count * 1) {
				try {
					db.users[m.sender].limit -= count * 1
					db.users[who].limit += count * 1
					m.reply(`Berhasil mentransfer limit sebesar ${count}, kepada @${who.split('@')[0]}`)
				} catch (e) {
					db.users[m.sender].limit += count * 1
					m.reply('Gagal Transfer')
				}
			} else {
				m.reply(`Limit tidak mencukupi!!\nLimit mu tersisa : *${db.users[m.sender].limit}*`)
			}
		} else m.reply(`Nomer ${who.split('@')[0]} Bukan User bot!`)
	} else if (args[0] == 'uang') {
		if (!args[1].length > 7) return m.reply(`Transfer Menu :\nExample : ${m.prefix + m.command} limit @tag 11\n• ${m.prefix + m.command} limit @tag jumlah\n• ${m.prefix + m.command} uang @tag jumlah`);
		let count = parseInt(args[2] && args[2].length > 0 ? Math.min(9999999, Math.max(parseInt(args[2]), 1)) : Math.min(1))
		let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : args[1] ? (args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : false
		if (!who) return m.reply('Siapa yg mau di transfer?')
		if (db.users[who]) {
			if (db.users[m.sender].uang >= count * 1) {
				try {
					db.users[m.sender].uang -= count * 1
					db.users[who].uang += count * 1
					m.reply(`Berhasil mentransfer uang sebesar ${count}, kepada @${who.split('@')[0]}`)
				} catch (e) {
					db.users[m.sender].uang += count * 1
					m.reply('Gagal Transfer')
				}
			} else {
				m.reply(`Uang tidak mencukupi!!\Uang mu tersisa : *${db.users[m.sender].uang}*`)
			}
		} else m.reply(`Nomer ${who.split('@')[0]} Bukan User bot!`)
	} else {
		m.reply(`Transfer Menu :\nExample : ${m.prefix + m.command} limit @tag 11\n• ${m.prefix + m.command} limit @tag jumlah\n• ${m.prefix + m.command} uang @tag jumlah`);
	}
}

module.exports = { rdGame, iGame, tGame, gameSlot, gameCasinoSolo, gameMerampok, gameBegal, daily, buy, setLimit, addLimit, addUang, setUang, transfer }