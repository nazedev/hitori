const { sleep, clockString } = require('./function')

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

const gameSlot = async (conn, m, db) => {
	const botNumber = conn.decodeJid(conn.user.id)
	if (db[m.sender].limit < 1) return m.reply(global.mess.endLimit)
	const sotoy = ['🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍐','🍑','🍒','🍓','🫐','🥝','🥥','🥑']
	const slot1 = pickRandom(sotoy)
	const slot2 = pickRandom(sotoy)
	const slot3 = pickRandom(sotoy)
	const listSlot1 = `${pickRandom(sotoy)} : ${pickRandom(sotoy)} : ${pickRandom(sotoy)}`
	const listSlot2 = `${slot1} : ${slot2} : ${slot3}`
	const listSlot3 = `${pickRandom(sotoy)} : ${pickRandom(sotoy)} : ${pickRandom(sotoy)}`
	const randomLimit = Math.floor(Math.random() * 8)
	try {
		if (slot1 === slot2 && slot2 === slot3) {
			db[m.sender].limit -= 1
			db[botNumber].limit += 1
			let sloth =`[  🎰VIRTUAL SLOT 🎰  ]\n------------------------\n\n${listSlot1}\n${listSlot2} <=====\n${listSlot3}\n\n------------------------\n[  🎰 VIRTUAL SLOT 🎰  ]\n\n*Keterangan* :\n_You Win🎉_ <=====Limit + ${randomLimit}`
			conn.sendMessage(m.chat, { text: sloth }, { quoted: m })
			db[m.sender].limit += randomLimit
		} else {
			db[m.sender].limit -= 1
			db[botNumber].limit += 1
			let sloth =`[  🎰VIRTUAL SLOT 🎰  ]\n------------------------\n\n${listSlot1}\n${listSlot2}<=====\n${listSlot3}\n\n------------------------\n[  🎰 VIRTUAL SLOT 🎰  ]\n\n*Keterangan* :\n_You Lose_ <=====\nLimit - 1`
			conn.sendMessage(m.chat, { text: sloth }, { quoted: m })
		}
	} catch (e) {
		m.reply('Error!')
	}
}

const gameCasinoSolo = async (conn, m, prefix, db) => {
   try {
      const botNumber = conn.decodeJid(conn.user.id)
      let buatall = 1
      let randomaku = `${Math.floor(Math.random() * 101)}`.trim()
      let randomkamu = `${Math.floor(Math.random() * 81)}`.trim() //hehe Biar Susah Menang :v
      let Aku = (randomaku * 1)
      let Kamu = (randomkamu * 1)
      let count = m.args[0]
      if (isNaN(count)) return m.reply('Harus berupa angka!')
      count = count ? /all/i.test(count) ? Math.floor(db[m.sender].uang / buatall) : parseInt(count) : m.args[0] ? parseInt(m.args[0]) : 1
      count = Math.max(1, count)
      if (m.args.length < 1) return m.reply(prefix + 'casino <jumlah>\n' + prefix + 'casino 1000')
      if (db[m.sender].uang >= count * 1) {
         db[m.sender].uang -= count * 1
         db[botNumber].uang += count * 1
         if (Aku > Kamu) {
            m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*You LOSE*\nKamu kehilangan ${count} Uang`.trim())
         } else if (Aku < Kamu) {
            db[m.sender].uang += count * 2
            m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*You Win*\nKamu mendapatkan ${count * 2} Uang`.trim())
         } else {
            db[m.sender].uang += count * 1
            m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*SERI*\nKamu mendapatkan ${count * 1} Uang`.trim())
         }
      } else { 
          m.reply(`Uang kamu tidak mencukupi untuk Casino silahkan *kumpulkan* terlebih dahulu!`)
     }
   } catch (e) {
      m.reply('Error!!')
   }
}

const gameMerampok = async (m, db) => {
   let dapat = (Math.floor(Math.random() * 10000))
   let who
   if (m.isGroup) who = m.mentionedJid ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : m.mentionedJid[0]
   else who = m.chat
   if (!who) return m.reply('Tag salah satu')
   let __timers = (new Date - db[m.sender].lastrampok)
   let _timers = (3600000 - __timers)
   let timers = clockString(_timers)
   if (new Date - db[m.sender].lastrampok > 3600000) {
      if (10000 > db[who].uang) return m.reply('Targetnya Kismin ngab🗿')
      db[who].uang -= dapat
      db[m.sender].uang += dapat
      db[m.sender].lastrampok = new Date * 1
      m.reply(`Berhasil Merampok Money Target Sebesar ${dapat}`)
   } else {
      m.reply(`Anda Sudah merampok dan berhasil sembunyi, tunggu ${timers} untuk merampok lagi`)
   }
}

const gameTangkapOr = async (conn, m, db) => {
	let user = db[m.sender]
    let __timers = (new Date - user.lasttkpor)
    let _timers = (3600000 - __timers)
    let timers = clockString(_timers)
	const randomUang = Math.floor(Math.random() * 10001)
	let random = [{teks: 'Pemain Berhasil Kabur!', no: 0},{teks: 'Pemain Melarikan Diri!', no: 0},{teks: 'Pemain Bersembunyi', no: 0},{teks: 'Pemain Bunuh Diri', no: 0},{teks: 'Pemain Berhasil Tertangkap', no: 2},{teks: 'Pemain Tidak Di Temukan!', no: 0},{teks: 'Pemain Lebih Kuat Dari Kamu!', no: 1},{teks: 'Pemain Menggunakan Cheat', no: 1},{teks: 'Pemain Tertangkap!', no: 2},{teks: 'Pemain Menyerahkan Diri', no: 2}]
	let teksnya = await pickRandom(random);
	if (new Date - user.lasttkpor > 3600000) {
		let { key } = await conn.sendMessage(m.chat, { text: 'Sedang Mencari Pemain...' })
		await sleep(2000)
		if (teksnya.no === 0) {
			await conn.sendMessage(m.chat, { text: teksnya.teks, edit: key })
			await conn.sendMessage(m.chat, { text: 'Gagal Mencari Pemain, Silahkan Coba lagi' }, { quoted: m })
		} else if (teksnya.no === 1) {
			await conn.sendMessage(m.chat, { text: teksnya.teks, edit: key })
			await conn.sendMessage(m.chat, { text: `Kamu Di Bunuh Oleh Pemain\nUang Kamu Di Rampas Sebesar *${randomUang}*` }, { quoted: m })
			db[m.sender].uang -= randomUang
		} else {
			await conn.sendMessage(m.chat, { text: teksnya.teks, edit: key })
			await conn.sendMessage(m.chat, { text: `Berhasil Mendapatkan Uang Sebesar : *${randomUang}*` }, { quoted: m })
			db[m.sender].uang += randomUang
			db[m.sender].lasttkpor = new Date * 1
		}
	} else {
		conn.sendMessage(m.chat, { text: `Silahkan tunggu *⏱️${timers}* lagi untuk bisa bermain lagi` }, { quoted: m })
	}
}

const daily = async (conn, m, db) => {
   let user = db[m.sender]
   let __timers = (new Date - user.lastclaim)
   let _timers = (86400000 - __timers)
   let timers = clockString(_timers)
   if (new Date - user.lastclaim > 86400000) {
   	conn.sendMessage(m.chat, { text: `*Daily Claim*\n_Berhasil Claim_\n- limit : 100\n- uang : 10000\n\n_Claim Di Reset_` }, { quoted: m })
   	db[m.sender].limit += 10
   	db[m.sender].uang += 10000
   	db[m.sender].lastclaim = new Date * 1
   } else {
   	conn.sendMessage(m.chat, { text: `Silahkan tunggu *⏱️${timers}* lagi untuk bisa mengclaim lagi` }, { quoted: m })
   }
}

const transferLimit = async (conn, m, args, db) => {
	if (isNaN(args[0])) {
		return m.reply('Harus Berupa Angka!')
	} else {
	  let count = args[0] && args[0].length > 0 ? Math.min(9999999, Math.max(parseInt(args[0]), 1)) : Math.min(1)
	  let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : args[1] ? (args[1] + '@s.whatsapp.net') : false
	  if (!who) return m.reply('Siapa yg mau di transfer?')
	  if (db[m.sender].limit >= count * 1) {
		  try {
            db[m.sender].limit -= count * 1
            db[who].limit += count * 1
            conn.sendMessage(m.chat, { text: `Berhasil mentransfer limit sebesar ${count}, kepada @${who.split('@')[0]}`, mentions: [who] }, { quoted : m }) 
          } catch (e) {
            db[m.sender].limit += count * 1
            m.reply('Gagal Menstransfer')
          }
      } else {
    	  m.reply(`Limit tidak mencukupi!!\nLimit mu tersisa : *${db[m.sender].limit}*`)
      }
   }
}

const transferUang = async (conn, m, args, db) => {
	if (isNaN(args[0])) {
		return m.reply('Harus Berupa Angka!')
	} else {
	  let count = args[0] && args[0].length > 0 ? Math.min(9999999, Math.max(parseInt(args[0]), 1)) : Math.min(1)
	  let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : args[1] ? (args[1] + '@s.whatsapp.net') : false
	  if (!who) return m.reply('Siapa yg mau di transfer?')
	  if (db[m.sender].uang >= count * 1) {
		  try {
            db[m.sender].uang -= count * 1
            db[who].uang += count * 1
            conn.sendMessage(m.chat, { text: `Berhasil mentransfer uang sebesar ${count}, kepada @${who.split('@')[0]}`, mentions: [who] }, { quoted : m }) 
          } catch (e) {
            db[m.sender].uang += count * 1
            m.reply('Gagal Menstransfer')
          }
      } else {
    	  m.reply(`Uang tidak mencukupi!!\nUang mu tersisa : *${db[m.sender].uang}*`)
      }
   }
}

module.exports = { gameSlot, gameCasinoSolo, gameMerampok, gameTangkapOr, daily, transferLimit, transferUang }