process.on('uncaughtException', console.error)

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : wa.me/6282113821188
*/

require('./settings');
const fs = require('fs');
const os = require('os');
const util = require('util');
const jimp = require('jimp');
const path = require('path');
const https = require('https');
const fse = require('fs-extra');
const axios = require('axios');
const chalk = require('chalk');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const cron = require('node-cron');
const cheerio = require('cheerio');
const request = require('request');
const maker = require('mumaker');
const fetch = require('node-fetch');
const FileType = require('file-type');
const { JSDOM } = require('jsdom');
const agent = require('superagent');
const similarity = require('similarity');
const webp = require('node-webpmux');
const ffmpeg = require('fluent-ffmpeg');
const nodemailer = require('nodemailer');
const speed = require('performance-now');
const didYouMean = require('didyoumean');
const { performance } = require('perf_hooks');
const moment = require('moment-timezone');
const Carbon = require('unofficial-carbon-now');
const imageToBase64 = require('image-to-base64');
const { exec, spawn, execSync } = require('child_process');
const smtpTransport = require('nodemailer-smtp-transport');
const { Primbon } = require('scrape-primbon');
const primbon = new Primbon();
const { EmojiAPI } = require('emoji-api');
const emoji = new EmojiAPI();
const PDFDocument = require('pdfkit');
const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, getBinaryNodeChildren, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require('@whiskeysockets/baileys');

const prem = require('./src/premium');
const { LoadDataBase } = require('./src/message');
const { TelegraPh, UguuSe } = require('./lib/uploader');
const { toAudio, toPTT, toVideo } = require('./lib/converter');
const { imageToWebp, videoToWebp, writeExif } = require('./lib/exif');
const { chatGpt, tiktokDl, facebookDl, instaDl, instaStory, ytMp4, ytMp3 } = require('./lib/screaper');
const { gameSlot, gameCasinoSolo, gameMerampok, gameTangkapOr, daily, transferLimit, transferUang } = require('./lib/game');
const { pinterest, wallpaper, wikimedia, quotesAnime, happymod, umma, ringtone, jadwalsholat, styletext } = require('./lib/scraper');
const { formatp, tanggal, formatDate, getTime, isUrl, sleep, clockString, runtime, fetchJson, getBuffer, jsonformat, format, webApi, parseMention, generateProfilePicture, getRandom, getGroupAdmins, readFileTxt, readFileJson, getHashedPassword, generateAuthToken, generateToken, batasiTeks, randomText, isEmoji, getAllHTML } = require('./lib/function');

// Read Database
const kuismath = [];
const sewa = JSON.parse(fs.readFileSync('./database/sewa.json'));
const premium = JSON.parse(fs.readFileSync('./database/premium.json'));

module.exports = naze = async (naze, m, chatUpdate, store) => {
	try {
		const body = (m.type === 'conversation') ? m.message.conversation : (m.type == 'imageMessage') ? m.message.imageMessage.caption : (m.type == 'videoMessage') ? m.message.videoMessage.caption : (m.type == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.type === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
		const budy = (typeof m.text == 'string' ? m.text : '')
		const prefix = /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(body) ? body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\><$%^&.©^]/gi.test(body) ? body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\><$%^&.©^]/gi)[0] : ''
		const isCmd = body.startsWith(prefix)
		const args = body.trim().split(/ +/).slice(1)
		const getQuoted = (m.quoted || m)
		const quoted = (getQuoted.type == 'buttonsMessage') ? getQuoted[Object.keys(getQuoted)[1]] : (getQuoted.type == 'templateMessage') ? getQuoted.hydratedTemplate[Object.keys(getQuoted.hydratedTemplate)[1]] : (getQuoted.type == 'product') ? getQuoted[Object.keys(getQuoted)[0]] : m.quoted ? m.quoted : m
		const command = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase()
		const text = q = args.join(' ')
		const mime = (quoted.msg || quoted).mimetype || ''
		const qmsg = (quoted.msg || quoted)
		const botNumber = await naze.decodeJid(naze.user.id)
		const isCreator = isOwner = [botNumber, ...global.owner].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
		const isVip = global.db.users[m.sender] ? global.db.users[m.sender].vip : false
		const isPremium = isCreator || prem.checkPremiumUser(m.sender, premium) || false
		
		const hari = moment.tz('Asia/Jakarta').locale('id').format('dddd');
		const tanggal = moment.tz('Asia/Jakarta').locale('id').format('DD/MM/YYYY');
		const jam = moment().tz('Asia/Jakarta').locale('id').format('HH:mm:ss');
		const ucapanWaktu = jam < '05:00:00' ? 'Selamat Pagi 🌉' : jam < '11:00:00' ? 'Selamat Pagi 🌄' : jam < '15:00:00' ? 'Selamat Siang 🏙' : jam < '18:00:00' ? 'Selamat Sore 🌅' : jam < '19:00:00' ? 'Selamat Sore 🌃' : jam < '23:59:00' ? 'Selamat Malam 🌌' : 'Selamat Malam 🌌';
		
		function pickRandom(list) {
			return list[Math.floor(list.length * Math.random())]
		}
		
		const fkontak = {
			key: {
				remoteJid: '0@s.whatsapp.net',
				participant: '0@s.whatsapp.net',
				fromMe: false,
				id: 'Naze'
			},
			message: {
				contactMessage: {
					displayName: (m.pushName || global.author),
					vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;${m.pushName || global.author},;;;\nFN:${m.pushName || global.author}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
					sendEphemeral: true
				}
			}
		}
		
		await LoadDataBase(naze, m);
		
		cron.schedule('00 00 * * *', () => {
			let user = Object.keys(global.db.users)
			for (let jid of user) {
				const limitUser = global.db.users[jid].vip ? global.limit.vip : prem.checkPremiumUser(jid, premium) ? global.limit.premium : global.limit.free
				global.db.users[jid].limit = limitUser
				console.log('Reseted Limit')
			}
		}, {
			scheduled: true,
			timezone: 'Asia/Jakarta'
		})
		
		if (global.settings.autobio) {
			if (new Date() * 1 - 0 > 1000) {
				await naze.updateProfileStatus(`${naze.user.name} | 🎯 Runtime : ${runtime(process.uptime())}`)
			}
		}
		
		if (!naze.public) {
			if (!m.key.fromMe) return
		}
		
		if (m.message) {
			naze.readMessages([m.key]);
			console.log(chalk.black.bgWhite('[ PESAN ]:'),chalk.black.bgGreen(new Date), chalk.black.bgHex('#00EAD3')(budy || m.type) + '\n' + chalk.black(chalk.bgCyanBright('[ DARI ] :'),chalk.bgYellow(m.pushName),chalk.bgHex('#FF449F')(m.sender),chalk.bgBlue('(' + (m.isGroup ? m.pushName : 'Private Chat', m.chat) + ')')));
		}
		
		if (m.isGroup) {
			if (global.db.groups[m.chat].mute && !isCreator) {
				return
			}
		}
		
		if (/^a(s|ss)alamu('|)alaikum(| )(wr|)( |)(wb|)$/.test(budy?.toLowerCase())) {
			const jwb_salam = ['Wa\'alaikumusalam','Wa\'alaikumusalam wb','Wa\'alaikumusalam Warohmatulahi Wabarokatuh']
			return m.reply(pickRandom(jwb_salam))
		}
		
		prem.expiredCheck(naze, premium);
		
		// TicTacToe
		this.tictactoe = this.tictactoe ? this.tictactoe : {}
		let room = Object.values(this.tictactoe).find(room => room.id && room.game && room.state && room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender) && room.state == 'PLAYING')
		if (room) {
			let ok
			let isWin = !1
			let isTie = !1
			let isSurrender = !1
			if (!/^([1-9]|(me)?nyerah|surr?ender|off|skip)$/i.test(m.text)) return
			isSurrender = !/^[1-9]$/.test(m.text)
			if (m.sender !== room.game.currentTurn) {
				if (!isSurrender) return !0
			}
			if (!isSurrender && 1 > (ok = room.game.turn(m.sender === room.game.playerO, parseInt(m.text) - 1))) {
				m.reply({
					'-3': 'Game telah berakhir',
					'-2': 'Invalid',
					'-1': 'Posisi Invalid',
					0: 'Posisi Invalid',
				}[ok])
				return !0
			}
			if (m.sender === room.game.winner) isWin = true
			else if (room.game.board === 511) isTie = true
			let arr = room.game.render().map(v => {
				return {
					X: '❌',
					O: '⭕',
					1: '1️⃣',
					2: '2️⃣',
					3: '3️⃣',
					4: '4️⃣',
					5: '5️⃣',
					6: '6️⃣',
					7: '7️⃣',
					8: '8️⃣',
					9: '9️⃣',
				}[v]
			})
			if (isSurrender) {
				room.game._currentTurn = m.sender === room.game.playerX
				isWin = true
			}
			let winner = isSurrender ? room.game.currentTurn : room.game.winner
			if (isWin) {
				global.db.users[m.sender].limit += 3
				global.db.users[m.sender].uang += 3000
			}
			let str = `Room ID: ${room.id}\n\n${arr.slice(0, 3).join('')}\n${arr.slice(3, 6).join('')}\n${arr.slice(6).join('')}\n\n${isWin ? `@${winner.split('@')[0]} Menang!` : isTie ? `Game berakhir` : `Giliran ${['❌', '⭕'][1 * room.game._currentTurn]} (@${room.game.currentTurn.split('@')[0]})`}\n❌: @${room.game.playerX.split('@')[0]}\n⭕: @${room.game.playerO.split('@')[0]}\n\nKetik *nyerah* untuk menyerah dan mengakui kekalahan`
			if ((room.game._currentTurn ^ isSurrender ? room.x : room.o) !== m.chat)
			room[room.game._currentTurn ^ isSurrender ? 'x' : 'o'] = m.chat
			if (room.x !== room.o) await naze.sendMessage(room.x, { text: str, mentions: parseMention(str) }, { quoted: m })
			await naze.sendMessage(room.o, { text: str, mentions: parseMention(str) }, { quoted: m })
			if (isTie || isWin) {
				delete this.tictactoe[room.id]
			}
		}
		
		// Suit PvP
		this.suit = this.suit ? this.suit : {}
		let roof = Object.values(this.suit).find(roof => roof.id && roof.status && [roof.p, roof.p2].includes(m.sender))
		if (roof) {
			let win = ''
			let tie = false
			if (m.sender == roof.p2 && /^(acc(ept)?|terima|gas|oke?|tolak|gamau|nanti|ga(k.)?bisa|y)/i.test(m.text) && m.isGroup && roof.status == 'wait') {
				if (/^(tolak|gamau|nanti|n|ga(k.)?bisa)/i.test(m.text)) {
					m.reply(`@${roof.p2.split`@`[0]} menolak suit,\nsuit dibatalkan`)
					delete this.suit[roof.id]
					return !0
				}
				roof.status = 'play';
				roof.asal = m.chat;
				clearTimeout(roof.waktu);
				m.reply(`Suit telah dikirimkan ke chat\n\n@${roof.p.split`@`[0]} dan @${roof.p2.split`@`[0]}\n\nSilahkan pilih suit di chat masing-masing klik https://wa.me/${botNumber.split`@`[0]}`)
				if (!roof.pilih) naze.sendMessage(roof.p, { text: `Silahkan pilih \n\nBatu🗿\nKertas📄\nGunting✂️` }, { quoted: m })
				if (!roof.pilih2) naze.sendMessage(roof.p2, { text: `Silahkan pilih \n\nBatu🗿\nKertas📄\nGunting✂️` }, { quoted: m })
				roof.waktu_milih = setTimeout(() => {
					if (!roof.pilih && !roof.pilih2) m.reply(`Kedua pemain tidak niat main,\nSuit dibatalkan`)
					else if (!roof.pilih || !roof.pilih2) {
						win = !roof.pilih ? roof.p2 : roof.p
						m.reply(`@${(roof.pilih ? roof.p2 : roof.p).split`@`[0]} tidak memilih suit, game berakhir`)
					}
					delete this.suit[roof.id]
					return !0
				}, roof.timeout)
			}
			let jwb = m.sender == roof.p
			let jwb2 = m.sender == roof.p2
			let g = /gunting/i
			let b = /batu/i
			let k = /kertas/i
			let reg = /^(gunting|batu|kertas)/i;
			
			if (jwb && reg.test(m.text) && !roof.pilih && !m.isGroup) {
				roof.pilih = reg.exec(m.text.toLowerCase())[0];
				roof.text = m.text;
				m.reply(`Kamu telah memilih ${m.text} ${!roof.pilih2 ? `\n\nMenunggu lawan memilih` : ''}`);
				if (!roof.pilih2) naze.sendMessage(roof.p2, { text: '_Lawan sudah memilih_\nSekarang giliran kamu' })
			}
			if (jwb2 && reg.test(m.text) && !roof.pilih2 && !m.isGroup) {
				roof.pilih2 = reg.exec(m.text.toLowerCase())[0]
				roof.text2 = m.text
				m.reply(`Kamu telah memilih ${m.text} ${!roof.pilih ? `\n\nMenunggu lawan memilih` : ''}`)
				if (!roof.pilih) naze.sendMessage(roof.p, { text: '_Lawan sudah memilih_\nSekarang giliran kamu' })
			}
			let stage = roof.pilih
			let stage2 = roof.pilih2
			if (roof.pilih && roof.pilih2) {
				clearTimeout(roof.waktu_milih)
				if (b.test(stage) && g.test(stage2)) win = roof.p
				else if (b.test(stage) && k.test(stage2)) win = roof.p2
				else if (g.test(stage) && k.test(stage2)) win = roof.p
				else if (g.test(stage) && b.test(stage2)) win = roof.p2
				else if (k.test(stage) && b.test(stage2)) win = roof.p
				else if (k.test(stage) && g.test(stage2)) win = roof.p2
				else if (stage == stage2) tie = true
				naze.sendMessage(roof.asal, { text: `_*Hasil Suit*_${tie ? '\nSERI' : ''}\n\n@${roof.p.split`@`[0]} (${roof.text}) ${tie ? '' : roof.p == win ? ` Menang \n` : ` Kalah \n`}\n@${roof.p2.split`@`[0]} (${roof.text2}) ${tie ? '' : roof.p2 == win ? ` Menang \n` : ` Kalah \n`}\n`.trim(), mentions: [roof.p, roof.p2] }, { quoted: m })
				delete this.suit[roof.id]
			}
		}
		
		// Math
		if (kuismath.hasOwnProperty(m.sender.split('@')[0]) && isCmd) {
			kuis = true
			jawaban = kuismath[m.sender.split('@')[0]].jawaban
			const difficultyMap = { 'noob': 1, 'easy': 2, 'medium': 3, 'hard': 4, 'extreme': 5, 'impossible': 6, 'impossible2': 7 };
			let hasilLimit = difficultyMap[kuismath[m.sender.split('@')[0]].mode]
			if (budy.toLowerCase() == jawaban) {
				global.db.users[m.sender].limit += hasilLimit
				global.db.users[m.sender].uang += hasilLimit * 1000
				await m.reply(`🎮 Kuis Matematika  🎮\n\nJawaban Benar 🎉\nKamu Mendapat Limit *${hasilLimit}*\n\nIngin bermain lagi? kirim ${prefix}math mode`)
				delete kuismath[m.sender.split('@')[0]]
			} else m.reply('*Jawaban Salah!*')
		}
		
		// Afk
		let mentionUser = [...new Set([...(m.mentionedJid || []), ...(m.quoted ? [m.quoted.sender] : [])])]
		for (let jid of mentionUser) {
			let user = global.db.users[jid]
			if (!user) continue
			let afkTime = user.afkTime
			if (!afkTime || afkTime < 0) continue
			let reason = user.afkReason || ''
			m.reply(`Jangan tag dia!\nDia sedang AFK ${reason ? 'dengan alasan ' + reason : 'tanpa alasan'}\nSelama ${clockString(new Date - afkTime)}`.trim())
		}
		if (global.db.users[m.sender].afkTime > -1) {
			let user = global.db.users[m.sender]
			m.reply(`@${m.sender.split('@')[0]} berhenti AFK${user.afkReason ? ' setelah ' + user.afkReason : ''}\nSelama ${clockString(new Date - user.afkTime)}`)
			user.afkTime = -1
			user.afkReason = ''
		}
		
		
		switch(command) {
			// Owner Menu
			case 'public': {
				if (!isCreator) return m.reply(mess.owner)
				naze.public = true
				m.reply('*Sukse Change To Public Usage*')
			}
			break
			case 'self': {
				if (!isCreator) return m.reply(mess.owner)
				naze.public = false
				m.reply('*Sukse Change To Self Usage*')
			}
			break
			case 'setbio': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text) return m.reply('Mana text nya?')
				naze.setStatus(q)
				m.reply(`*Bio telah di ganti menjadi ${q}*`)
			}
			break
			case 'setppbot': {
				if (!isCreator) return m.reply(mess.owner)
				if (!/image/.test(mime)) return m.reply(`Reply Image Dengan Caption ${prefix + command}`)
				let media = await naze.downloadAndSaveMediaMessage(quoted, 'ppbot.jpeg')
				if (text.length > 0) {
					let { img } = await generateProfilePicture(media)
					await naze.query({
						tag: 'iq',
						attrs: {
							to: botNumber,
							type: 'set',
							xmlns: 'w:profile:picture'
						},
						content: [{
							tag: 'picture',
							attrs: { type: 'image' },
							content: img
						}]
					})
					await fs.unlinkSync(media)
					m.reply('Sukses')
				} else {
					await naze.updateProfilePicture(botNumber, { url: media })
					await fs.unlinkSync(media)
					m.reply('Sukses')
				}
			}
			break
			case 'join': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text) return m.reply('Masukkan Link Group!')
				if (!isUrl(args[0]) && !args[0].includes('whatsapp.com')) return m.reply('Link Invalid!')
				const result = args[0].split('https://chat.whatsapp.com/')[1]
				m.reply(mess.wait)
				await naze.groupAcceptInvite(result).catch((res) => {
					if (res.data == 400) return m.reply('Grup Tidak Di Temukan❗');
					if (res.data == 401) return m.reply('Bot Di Kick Dari Grup Tersebut❗');
					if (res.data == 409) return m.reply('Bot Sudah Join Di Grup Tersebut❗');
					if (res.data == 410) return m.reply('Url Grup Telah Di Setel Ulang❗');
					if (res.data == 500) return m.reply('Grup Penuh❗');
				})
			}
			break
			case 'leave': {
				if (!isCreator) return m.reply(mess.owner)
				await naze.groupLeave(m.chat).then((res) => m.reply(jsonformat(res))).catch((err) => m.reply(jsonformat(err)))
			}
			break
			case 'blokir': case 'block': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} 62xxx`)
				} else {
					const numbersOnly = m.isGroup ? (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender) : m.chat
					await naze.updateBlockStatus(numbersOnly, 'block').then((a) => m.reply(mess.done)).catch((err) => m.reply('Gagal!'))
				}
			}
			break
			case 'openblokir': case 'unblokir': case 'openblock': case 'unblock': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} 62xxx`)
				} else {
					const numbersOnly = m.isGroup ? (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender) : m.chat
					await naze.updateBlockStatus(numbersOnly, 'unblock').then((a) => m.reply(mess.done)).catch((err) => m.reply('Gagal!'))
				}
			}
			break
			case 'listpc': {
				if (!isCreator) return m.reply(mess.owner)
				let anu = await store.chats.all().filter(v => v.id.endsWith('.net')).map(v => v.id)
				let teks = `⬣ *LIST PERSONAL CHAT*\n\nTotal Chat : ${anu.length} Chat\n\n`
				for (let i of anu) {
					let nama = store.messages[i].array[0].pushName
					teks += `⬡ *Nama :* ${nama}\n⬡ *User :* @${i.split('@')[0]}\n⬡ *Chat :* https://wa.me/${i.split('@')[0]}\n\n=====================\n\n`
				}
				naze.sendTextMentions(m.chat, teks, m)
			}
			break
			case 'listgc': {
				if (!isCreator) return m.reply(mess.owner)
				let anu = await store.chats.all().filter(v => v.id.endsWith('@g.us')).map(v => v.id)
				let teks = `⬣ *LIST GROUP CHAT*\n\nTotal Group : ${anu.length} Group\n\n`
				for (let i of anu) {
					let metadata = await naze.groupMetadata(i)
					teks += `⬡ *Nama :* ${metadata.subject}\n⬡ *Admin :* ${metadata.owner ? `@${metadata.owner.split('@')[0]}` : '-' }\n⬡ *ID :* ${metadata.id}\n⬡ *Dibuat :* ${moment(metadata.creation * 1000).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}\n⬡ *Member :* ${metadata.participants.length}\n\n=====================\n\n`
				}
				naze.sendTextMentions(m.chat, teks, m)
			}
			break
			case 'creategc': case 'buatgc': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text) return m.reply(`Example:\n${prefix + command} *Nama Gc*`)
				let group = await naze.groupCreate(q, [m.sender])
				let res = await naze.groupInviteCode(group.id)
				await naze.sendMessage(m.chat, { text: `*Link Group :* *https://chat.whatsapp.com/${res}*\n\n*Nama Group :* *${q}*`, detectLink: true }, { quoted: m });
				await naze.groupParticipantsUpdate(group.id, [m.sender], 'promote')
				await naze.sendMessage(group.id, { text: 'Done' })
			}
			break
			case 'addpr': case 'addprem': case 'addpremium': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text) return m.reply(`Example:\n${prefix + command} @tag|waktu`)
				let [teks1, teks2] = text.split`|`
				const nmrnya = teks1.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
				const onWa = await naze.onWhatsApp(nmrnya)
				if (!onWa.length > 0) return m.reply('Nomer Tersebut Tidak Terdaftar Di Whatsapp!')
				if (teks2) {
					prem.addPremiumUser(nmrnya, teks2, premium);
					m.reply(`Sukses ${command} @${nmrnya.split('@')[0]} Selama ${teks2}`)
					global.db.users[nmrnya].limit = global.db.users[nmrnya].vip ? global.limit.vip : global.limit.premium
					global.db.users[nmrnya].uang = global.db.users[nmrnya].vip ? global.uang.vip : global.uang.premium
				} else {
					m.reply(`Masukkan waktunya!\nExample: ${prefix + command} @tag|waktu`)
				}
			}
			break
			case 'delpr': case 'delprem': case 'delpremium': {
				if (!isCreator) return m.reply(mess.owner)
				if (!text) return m.reply(`Example:\n${prefix + command} @tag`)
				const nmrnya = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
				if (prem.checkPremiumUser(nmrnya, premium)) {
					premium.splice(prem.getPremiumPosition(nmrnya, premium), 1);
					fs.writeFileSync('./database/premium.json', JSON.stringify(premium));
					m.reply(`Sukses ${command} @${nmrnya.split('@')[0]}`)
					global.db.users[nmrnya].limit = global.db.users[nmrnya].vip ? global.limit.vip : global.limit.free
					global.db.users[nmrnya].uang = global.db.users[nmrnya].vip ? global.uang.vip : global.uang.free
				} else {
					m.reply(`User @${nmrnya.split('@')[0]} Bukan Premium❗`)
				}
			}
			break
			case 'listpr': case 'listprem': case 'listpremium': {
				if (!isCreator) return m.reply(mess.owner)
				let txt = `*------「 LIST PREMIUM 」------*\n\n`
				for (let userprem of premium) {
					txt += `➸ *Nomer*: @${userprem.id.split('@')[0]}\n➸ *Limit*: ${global.db.users[userprem.id].limit}\n➸ *Uang*: ${global.db.users[userprem.id].uang.toLocaleString('id-ID')}\n➸ *Expired*: ${formatDate(userprem.expired)}\n\n`
				}
				m.reply(txt)
			}
			break
			
			// Group Menu
			case 'add': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} 62xxx`)
				} else {
					const numbersOnly = text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender
					try {
						await naze.groupParticipantsUpdate(m.chat, [numbersOnly], 'add').then(async (res) =>{
							for (let i of res) {
								let invv = await naze.groupInviteCode(m.chat)
								if (i.status == 408) return m.reply('Dia Baru-Baru Saja Keluar Dari Grub Ini!')
								if (i.status == 401) return m.reply('Dia Memblokir Bot!')
								if (i.status == 409) return m.reply('Dia Sudah Join!')
								if (i.status == 500) return m.reply('Grub Penuh!')
								if (i.status == 403) {
									await naze.sendMessage(m.chat, { text: `@${numbersOnly.split('@')[0]} Tidak Dapat Ditambahkan\n\nKarena Target Private\n\nUndangan Akan Dikirimkan Ke\n-> wa.me/${numbersOnly.replace(/\D/g, '')}\nMelalui Jalur Pribadi`, mentions: [numbersOnly] }, { quoted : m })
									await naze.sendMessage(`${numbersOnly ? numbersOnly : '6282113821188@s.whatsapp.net'}`, { text: `${'https://chat.whatsapp.com/' + invv}\n------------------------------------------------------\n\nAdmin: wa.me/${m.sender}\nMengundang anda ke group ini\nSilahkan masuk jika berkehendak🙇`, detectLink: true, mentions: [numbersOnly] }, { quoted : floc2 }).catch((err) => m.reply('Gagal Mengirim Undangan!'))
								} else {
									m.reply('Gagal Add User')
								}
							}
						})
					} catch (e) {
						m.reply('Gagal Add User')
					}
				}
			}
			break
			case 'kick': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} 62xxx`)
				} else {
					const numbersOnly = text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender
					await naze.groupParticipantsUpdate(m.chat, [numbersOnly], 'remove').catch((err) => m.reply('Gagal Kick User!'))
				}
			}
			break
			case 'promote': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} 62xxx`)
				} else {
					const numbersOnly = text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender
					await naze.groupParticipantsUpdate(m.chat, [numbersOnly], 'promote').catch((err) => m.reply('Gagal!'))
				}
			}
			break
			case 'demote': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} 62xxx`)
				} else {
					const numbersOnly = text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender
					await naze.groupParticipantsUpdate(m.chat, [numbersOnly], 'demote').catch((err) => m.reply('Gagal!'))
				}
			}
			break
			case 'setname': case 'setnamegc': case 'setsubject': case 'setsubjectgc': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} textnya`)
				} else {
					const teksnya = text ? text : m.quoted.text
					await naze.groupUpdateSubject(m.chat, teksnya).catch((err) => m.reply('Gagal!'))
				}
			}
			break
			case 'setdesc': case 'setdescgc': case 'setdesk': case 'setdeskgc': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!text && !m.quoted) {
					m.reply(`Contoh: ${prefix + command} textnya`)
				} else {
					const teksnya = text ? text : m.quoted.text
					await naze.groupUpdateDescription(m.chat, teksnya).catch((err) => m.reply('Gagal!'))
				}
			}
			break
			case 'setppgroups': case 'setppgrup': case 'setppgc': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!m.quoted) return m.reply('Reply Gambar yang mau dipasang di Profile Bot')
				if (!/image/.test(mime) && /webp/.test(mime)) return m.reply(`Reply Image Dengan Caption ${prefix + command}`)
				let media = await naze.downloadAndSaveMediaMessage(quoted, 'ppgc.jpeg')
				if (text.length > 0) {
					let { img } = await generateProfilePicture(media)
					await naze.query({
						tag: 'iq',
						attrs: {
							to: m.chat,
							type: 'set',
							xmlns: 'w:profile:picture'
						},
						content: [{
							tag: 'picture',
							attrs: { type: 'image' },
							content: img
						}]
					})
					await fs.unlinkSync(media)
					m.reply('Sukses')
				} else {
					await naze.updateProfilePicture(m.chat, { url: media })
					await fs.unlinkSync(media)
					m.reply('Sukses')
				}
			}
			break
			case 'delete': case 'del': case 'd': {
				if (!m.quoted) return m.reply('Reply pesan yang mau di delete')
				await naze.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: m.isBotAdmin ? false : true, id: m.quoted.id, participant: m.quoted.sender }})
			}
			break
			case 'linkgroup': case 'linkgrup': case 'linkgc': case 'urlgroup': case 'urlgrup': case 'urlgc': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				let response = await naze.groupInviteCode(m.chat)
				await naze.sendMessage(m.chat, { text: `https://chat.whatsapp.com/${response}\n\nLink Group : ${(await naze.groupMetadata(m.chat)).subject}`, detectLink: true }, { quoted: m });
			}
			break
			case 'revoke': case 'newlink': case 'newurl': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				await naze.groupRevokeInvite(m.chat).then((a) => {
					m.reply(`Sukses Menyetel Ulang, Tautan Undangan Grup ${m.metadata.subject}`)
				}).catch((err) => m.reply('Gagal!'))
			}
			break
			case 'tagall': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				let teks = `*Tag All*\n\n*Pesan :* ${q ? q : ''}\n\n`
				for (let mem of m.metadata.participants) {
					teks += `⭔ @${mem.id.split('@')[0]}\n`
				}
				await naze.sendMessage(m.chat, { text: teks, mentions: m.metadata.participants.map(a => a.id) }, { quoted: m })
			}
			break
			case 'hidetag': case 'h': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				naze.sendMessage(m.chat, { text : q ? q : '' , mentions: m.metadata.participants.map(a => a.id)}, { quoted: m })
			}
			break
			case 'totag': {
				if (!m.isGroup) return m.reply(mess.group)
				if (!m.isAdmin) return m.reply(mess.admin)
				if (!m.isBotAdmin) return m.reply(mess.botAdmin)
				if (!m.quoted) return m.reply(`Reply pesan dengan caption ${prefix + command}`)
				delete m.quoted.chat
				await naze.sendMessage(m.chat, { forward: m.quoted.fakeObj, mentions: m.metadata.participants.map(a => a.id) })
			}
			break
			case 'listonline': case 'liston': {
				if (!m.isGroup) return m.reply(mess.group)
				let id = args && /\d+\-\d+@g.us/.test(args[0]) ? args[0] : m.chat
				let online = [...Object.keys(store.presences[id]), botNumber]
				await naze.sendMessage(m.chat, { text: 'List Online:\n\n' + online.map(v => '⭔ @' + v.replace(/@.+/, '')).join`\n`, mentions: online }, { quoted: m }).catch((e) => m.reply('Gagal'))
			}
			break
			
			// Bot Menu
			case 'profile': case 'cekme': case 'cek': {
				const user = Object.keys(global.db.users)
				const infoUser = global.db.users[m.sender]
				const teks = `*Profile @${m.sender.split('@')[0]}* :\nUser Bot : ${user.includes(m.sender) ? 'True' : 'False'}\nUser : ${isVip ? 'VIP' : isPremium ? 'PREMIUM' : 'FREE'}\nLimit : ${infoUser.limit}\nUang : ${infoUser ? infoUser.uang.toLocaleString('id-ID') : '0'}`
				await m.reply(teks)
			}
			break
			case 'req': case 'request': {
				if (!text) return m.reply('Mau Request apa ke Owner?')
				await naze.sendMessage(m.chat, { text: `*Request Telah Terkirim Ke Owner*\n_Terima Kasih🙏_` }, { quoted: m })
				await naze.sendFromOwner(global.owner, `Pesan Dari : @${m.sender.split('@')[0]}\nUntuk Owner\n\nRequest ${text}`, m, { contextInfo: { mentionedJid: [m.sender], isForwarded: true }})
			}
			break
			case 'daily': case 'claim': {
				daily(naze, m, global.db.users)
			}
			break
			case 'transferlimit': case 'tflimit': {
				transferLimit(naze, m, args, global.db.users)
			}
			break
			case 'transferuang': case 'tfuang': {
				transferUang(naze, m, args, global.db.users)
			}
			break
			case 'react': {
				naze.sendMessage(m.chat, { react: { text: args[0], key: m.quoted ? m.quoted.key : m.key }})
			}
			break
			case 'tagme': {
				naze.sendMessage(m.chat, { text: `@${m.sender.split('@')[0]}`, mentions: [m.sender] }, { quoted: m })
			}
			break
			case 'runtime': case 'tes': case 'bot': {
				naze.sendMessage(m.chat, { text: `*Bot Telah Online Selama*\n*${runtime(process.uptime())}*` }, { quoted: m })
			}
			break
			case 'ping': case 'botstatus': case 'statusbot': {
				const used = process.memoryUsage()
				const cpus = os.cpus().map(cpu => {
					cpu.total = Object.keys(cpu.times).reduce((last, type) => last + cpu.times[type], 0)
					return cpu
				})
				const cpu = cpus.reduce((last, cpu, _, { length }) => {
					last.total += cpu.total
					last.speed += cpu.speed / length
					last.times.user += cpu.times.user
					last.times.nice += cpu.times.nice
					last.times.sys += cpu.times.sys
					last.times.idle += cpu.times.idle
					last.times.irq += cpu.times.irq
					return last
				}, {
					speed: 0,
					total: 0,
					times: {
						user: 0,
						nice: 0,
						sys: 0,
						idle: 0,
						irq: 0
					}
				})
				let timestamp = speed()
				let latensi = speed() - timestamp
				neww = performance.now()
				oldd = performance.now()
				respon = `Kecepatan Respon ${latensi.toFixed(4)} _Second_ \n ${oldd - neww} _miliseconds_\n\nRuntime : ${runtime(process.uptime())}\n\n💻 Info Server\nRAM: ${formatp(os.totalmem() - os.freemem())} / ${formatp(os.totalmem())}\n\n_NodeJS Memory Usaage_\n${Object.keys(used).map((key, _, arr) => `${key.padEnd(Math.max(...arr.map(v=>v.length)),' ')}: ${formatp(used[key])}`).join('\n')}\n\n${cpus[0] ? `_Total CPU Usage_\n${cpus[0].model.trim()} (${cpu.speed} MHZ)\n${Object.keys(cpu.times).map(type => `- *${(type + '*').padEnd(6)}: ${(100 * cpu.times[type] / cpu.total).toFixed(2)}%`).join('\n')}\n_CPU Core(s) Usage (${cpus.length} Core CPU)_\n${cpus.map((cpu, i) => `${i + 1}. ${cpu.model.trim()} (${cpu.speed} MHZ)\n${Object.keys(cpu.times).map(type => `- *${(type + '*').padEnd(6)}: ${(100 * cpu.times[type] / cpu.total).toFixed(2)}%`).join('\n')}`).join('\n\n')}` : ''}`.trim()
				m.reply(respon)
			}
			break
			case 'speedtest': case 'speed': {
				m.reply('Testing Speed...')
				let cp = require('child_process')
				let { promisify } = require('util')
				let exec = promisify(cp.exec).bind(cp)
				let o
				try {
					o = await exec('python3 speed.py')
				} catch (e) {
					o = e
				} finally {
					let { stdout, stderr } = o
					if (stdout.trim()) m.reply(stdout)
					if (stderr.trim()) m.reply(stderr)
				}
			}
			break
			case 'afk': {
				let user = global.db.users[m.sender]
				user.afkTime = + new Date
				user.afkReason = text
				m.reply(`@${m.sender.split('@')[0]} Telah Afk${text ? ': ' + text : ''}`)
			}
			break
			case 'readviewonce': case 'readviewone': case 'rvo': {
				if (!m.quoted) return m.reply(`Reply view once message\nExample: ${prefix + command}`)
				if (m.quoted.msg.viewOnce) {
					m.quoted.msg.viewOnce = false
					await naze.sendMessage(m.chat, { forward: m.quoted }, { quoted: m })
				} else if (m.quoted.msg.message && m.quoted.msg.message.audioMessage && m.quoted.msg.message.audioMessage.viewOnce) {
					m.quoted.msg.message.audioMessage.viewOnce = false
					m.quoted.msg.message.audioMessage.contextInfo = { forwardingScore: 1, isForwarded: true, mentionedJid: [m.sender] }
					await naze.relayMessage(m.chat, m.quoted.msg.message, {})
				} else {
					m.reply(`Reply view once message\nExample: ${prefix + command}`)
				}
			}
			break
			case 'inspect': {
				if (!text) return m.reply('Masukkan Link Group!')
				let code = q.match(/chat.whatsapp.com\/([\w\d]*)/g);
				if (code === null) return m.reply('No invite url detected.');
				code = code[0].replace('chat.whatsapp.com/', '');
				await naze.groupGetInviteInfo(code).then(anu => {
					let { id, subject, owner, subjectOwner, creation, desc, descId, participants, size, descOwner } = anu
					let par = `*Nama Gc* : ${subject}\n*ID* : ${id}\n${owner ? `*Creator* : @${owner.split('@')[0]}` : '*Creator* : -'}\n*Jumlah Member* : ${size}\n*Gc Dibuat Tanggal* : ${new Date(creation * 1000).toLocaleString()}\n*DescID* : ${descId ? descId : '-'}\n${subjectOwner ? `*Nama GC Diubah Oleh* : @${subjectOwner.split('@')[0]}` : '*Nama GC Diubah Oleh* : -'}\n${descOwner ? `*Desc diubah oleh* : @${descOwner.split('@')[0]}` : '*Desc diubah oleh* : -'}\n\n*Desc* : ${desc ? desc : '-'}\n\n*Kontak Tersimpan* :\n`;
					naze.sendTextMentions(m.chat, par, m);
				}).catch((res) => {
					if (res.data == 406) return reply('Grup Tidak Di Temukan❗');
					if (res.data == 410) return reply('Url Grup Telah Di Setel Ulang❗');
				});
			}
			break
			case 'addmsg': {
				if (!m.quoted) return m.reply('Reply Pesan Yang Ingin Disave Di Database')
				if (!text) return m.reply(`Example : ${prefix + command} file name`)
				let msgs = global.db.database
				if (text.toLowerCase() in msgs) return m.reply(`'${text}' telah terdaftar di list pesan`)
				msgs[text.toLowerCase()] = m.quoted
				delete msgs[text.toLowerCase()].chat
				m.reply(`Berhasil menambahkan pesan di list pesan sebagai '${text}'\nAkses dengan ${prefix}getmsg ${text}\nLihat list Pesan Dengan ${prefix}listmsg`)
			}
			break
			case 'delmsg': case 'deletemsg': {
				if (!text) return m.reply('Nama msg yg mau di delete?')
				let msgs = global.db.database
				if (text == 'allmsg') {
					global.db.database = {}
					m.reply('Berhasil menghapus seluruh msg dari list pesan')
				} else {
					if (!(text.toLowerCase() in msgs)) return m.reply(`'${text}' tidak terdaftar didalam list pesan`)
					delete msgs[text.toLowerCase()]
					m.reply(`Berhasil menghapus '${text}' dari list pesan`)
				}
			}
			break
			case 'getmsg': {
				if (!text) return m.reply(`Example : ${prefix + command} file name\n\nLihat list pesan dengan ${prefix}listmsg`)
				let msgs = global.db.database
				if (!(text.toLowerCase() in msgs)) return m.reply(`'${text}' tidak terdaftar di list pesan`)
				await naze.relayMessage(m.chat, msgs[text.toLowerCase()], {})
			}
			break
			case 'listmsg': {
				let seplit = Object.entries(global.db.database).map(([nama, isi]) => { return { nama, ...isi } })
				let teks = '「 LIST DATABASE 」\n\n'
				for (let i of seplit) {
					teks += `⬡ *Name :* ${i.nama}\n⬡ *Type :* ${getContentType(i.message)?.replace(/Message/i, '')}\n────────────────────────\n\n`
				}
				m.reply(teks)
			}
			break
			case 'q': case 'quoted': {
				if (!m.quoted) return m.reply('Reply Pesannya!')
				const anu = await m.getQuotedObj()
				if (!anu) return m.reply('Format Tidak Tersedia!')
				if (!anu.quoted) return m.reply('Pesan Yang Anda Reply Tidak Mengandung Reply')
				await naze.relayMessage(m.chat, { [anu.quoted.type]: anu.quoted.msg }, {})
			}
			break
			
			// Tools Menu
			case 'fetch': case 'get': {
				if (!text.startsWith('http')) return m.reply(`No Query?\n\nExample : ${prefix + command} https://google.com`)
				try {
					const res = await axios.get(isUrl(text) ? isUrl(text)[0] : text)
					if (!/json|html|plain/.test(res.headers['content-type'])) {
						await m.reply(text)
					} else {
						m.reply(util.format(res.data))
					}
				} catch (e) {
					m.reply(util.format(e))
				}
			}
			break
			case 'toaud': case 'toaudio': {
				if (!/video/.test(mime) && !/audio/.test(mime)) return m.reply(`Kirim/Reply Video/Audio Yang Ingin Dijadikan Audio Dengan Caption ${prefix + command}`)
				m.reply(mess.wait)
				let media = await (m.quoted ? m.quoted.download() : m.download())
				let audio = await toAudio(media, 'mp4')
				await naze.sendMessage(m.chat, { audio: audio, mimetype: 'audio/mpeg'}, { quoted : m })
			}
			break
			case 'tomp3': {
				if (!/video/.test(mime) && !/audio/.test(mime)) return m.reply(`Kirim/Reply Video/Audio Yang Ingin Dijadikan Audio Dengan Caption ${prefix + command}`)
				m.reply(mess.wait)
				let media = await (m.quoted ? m.quoted.download() : m.download())
				let audio = await toAudio(media, 'mp4')
				await naze.sendMessage(m.chat, { document: audio, mimetype: 'audio/mpeg', fileName: `Convert By Naze Bot.mp3`}, { quoted : m })
			}
			break
			case 'tovn': case 'toptt': case 'tovoice': {
				if (!/video/.test(mime) && !/audio/.test(mime)) return m.reply(`Kirim/Reply Video/Audio Yang Ingin Dijadikan Audio Dengan Caption ${prefix + command}`)
				m.reply(mess.wait)
				let media = await (m.quoted ? m.quoted.download() : m.download())
				let audio = await toPTT(media, 'mp4')
				await naze.sendMessage(m.chat, { audio: audio, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
			}
			break
			case 'togif': {
				if (!/webp/.test(mime) && !/video/.test(mime)) return m.reply(`Reply Video/Stiker dengan caption *${prefix + command}*`)
				m.reply(mess.wait)
				let { webp2mp4File } = require('./lib/uploader')
				let media = await naze.downloadAndSaveMediaMessage(qmsg)
				let webpToMp4 = await webp2mp4File(media)
				await naze.sendMessage(m.chat, { video: { url: webpToMp4.result, caption: 'Convert Webp To Video' }, gifPlayback: true }, { quoted: m })
				await fs.unlinkSync(media)
			}
			break
			case 'tovideo': case 'tomp4': {
				if (!/webp/.test(mime) && !/video/.test(mime)) return m.reply(`Reply Video/Stiker dengan caption *${prefix + command}*`)
				m.reply(mess.wait)
				let { webp2mp4File } = require('./lib/uploader')
				let media = await naze.downloadAndSaveMediaMessage(qmsg)
				let webpToMp4 = await webp2mp4File(media)
				await naze.sendMessage(m.chat, { video: { url: webpToMp4.result }, caption: 'Convert Webp To Video' }, { quoted: m })
				await fs.unlinkSync(media)
			}
			break
			case 'toimage': case 'toimg': {
				if (!/webp/.test(mime)) return m.reply(`Reply Video/Stiker dengan caption *${prefix + command}*`)
				m.reply(mess.wait)
				let media = await naze.downloadAndSaveMediaMessage(qmsg)
				let ran = await getRandom('.png')
				exec(`ffmpeg -i ${media} ${ran}`, (err) => {
					fs.unlinkSync(media)
					if (err) return m.reply('Gagal❗')
					let buffer = fs.readFileSync(ran)
					naze.sendMessage(m.chat, { image: buffer }, { quoted: m })
					fs.unlinkSync(ran)
				})
			}
			break
			case 'toptv': {
				if (!/video/.test(mime)) return m.reply(`Kirim/Reply Video Yang Ingin Dijadikan PTV Message Dengan Caption ${prefix + command}`)
				if ((m.quoted ? m.quoted.type : m.type) === 'videoMessage') {
					const anu = await (m.quoted ? m.quoted.download() : m.download())
					const msg = await generateWAMessageContent({ video: anu }, { upload: naze.waUploadToServer })
					await naze.relayMessage(m.chat, { ptvMessage: msg.videoMessage }, {})
				} else {
					m.reply('Reply Video Yang Mau Di Ubah Ke PTV Message!')
				}
			}
			break
			case 'tourl': {
				let { fileIO, TelegraPh } = require('./lib/uploader')
				if (/jpg|jpeg|png/.test(mime)) {
					m.reply(mess.wait)
					let media = await (m.quoted ? m.quoted.download() : m.download())
					let anu = await TelegraPh(media)
					m.reply('Url : ' + anu)
				} else if (/webp|video|sticker|audio/.test(mime)) {
					m.reply(mess.wait)
					let media = await (m.quoted ? m.quoted.download() : m.download())
					let anu = await UguuSe(media)
					m.reply('Url : ' + anu.url)
				} else {
					m.reply('Send Media yg ingin di Upload!')
				}
			}
			break
			case 'texttospech': case 'tts': case 'tospech': {
				if (!text) return m.reply('Mana text yg mau diubah menjadi audio?')
				let { tts } = require('./lib/tts')
				let anu = await tts(text)
				naze.sendMessage(m.chat, { audio: anu, ptt: true, mimetype: 'audio/mpeg' }, { quoted: m })
			}
			break
			case 'toqr': case 'qr': {
				if (!text) return m.reply(`Ubah Text ke Qr dengan *${prefix + command}* textnya`)
				m.reply(mess.wait)
				await naze.sendMessage(m.chat, { image: { url: 'https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=' + text }, caption: 'Nih Bro' }, { quoted: m })
			}
			break
			case 'ssweb': {
				if (!text) return m.reply(`Example: ${prefix + command} https://github.com/nazedev/naze-md`)
				if (!text.startsWith('http')) {
					let buf = 'https://image.thum.io/get/width/1900/crop/1000/fullpage/https://' + q;
					await naze.sendMessage(m.chat, { image: { url: buf }, caption: 'Done' }, { quoted: m })
				} else {
					let buf = 'https://image.thum.io/get/width/1900/crop/1000/fullpage/' + q;
					await naze.sendMessage(m.chat, { image: { url: buf }, caption: 'Done' }, { quoted: m })
				}
			}
			break
			case 'sticker': case 'stiker': case 's': case 'stickergif': case 'stikergif': case 'sgif': {
				if (!/image|video|sticker/.test(quoted.type)) return m.reply(`Kirim/reply gambar/video/gif dengan caption ${prefix + command}\nDurasi Image/Video/Gif 1-9 Detik`)
				let media = await (m.quoted ? m.quoted.download() : m.download())
				if (/image|webp/.test(mime)) {
					m.reply(mess.wait)
					if (text == 'meta') {
						await naze.sendAsSticker(m.chat, media, m, 'image', { packname: global.packname, author: global.author, isAvatar: 1 })
					} else {
						await naze.sendAsSticker(m.chat, media, m, 'image', { packname: global.packname, author: global.author })
					}
				} else if (/video/.test(mime)) {
					if ((quoted.msg || quoted).seconds > 11) return m.reply('Maksimal 10 detik!')
					m.reply(mess.wait)
					await naze.sendAsSticker(m.chat, media, m, 'video', { packname: global.packname, author: global.author })
				} else {
					m.reply(`Kirim/reply gambar/video/gif dengan caption ${prefix + command}\nDurasi Image/Video/Gif 1-9 Detik`)
				}
			}
			break
			case 'stickerwm': case 'swm': case 'curi': case 'colong': case 'take': case 'stickergifwm': case 'sgifwm': {
				if (!/image|video|sticker/.test(quoted.type)) return m.reply(`Kirim/reply gambar/video/gif dengan caption ${prefix + command}\nDurasi Image/Video/Gif 1-9 Detik`)
				let media = await (m.quoted ? m.quoted.download() : m.download())
				let teks1 = text.split`|`[0] ? text.split`|`[0] : ' '
				let teks2 = text.split`|`[1] ? text.split`|`[1] : ' '
				if (/image|webp/.test(mime)) {
					m.reply(mess.wait)
					if (text == 'meta') {
						await naze.sendAsSticker(m.chat, media, m, 'image', { packname: teks1, author: teks2, isAvatar: 1 })
					} else {
						await naze.sendAsSticker(m.chat, media, m, 'image', { packname: teks1, author: teks2 })
					}
				} else if (/video/.test(mime)) {
					if ((quoted.msg || quoted).seconds > 11) return m.reply('Maksimal 10 detik!')
					m.reply(mess.wait)
					await naze.sendAsSticker(m.chat, media, m, 'video', { packname: teks1, author: teks2 })
				} else {
					m.reply(`Kirim/reply gambar/video/gif dengan caption ${prefix + command}\nDurasi Video/Gif 1-9 Detik`)
				}
			}
			break
			case 'smeme': case 'stickmeme': case 'stikmeme': case 'stickermeme': case 'stikermeme': {
				try {
					if (!isPremium) return m.reply(global.mess.prem)
					if (!/image|webp/.test(mime)) return m.reply(`Kirim/reply image/sticker\nDengan caption ${prefix + command} atas|bawah`)
					if (!text) return m.reply(`Kirim/reply image/sticker dengan caption ${prefix + command} atas|bawah`)
					m.reply(mess.wait)
					let atas = text.split`|`[0] ? text.split`|`[0] : '-'
					let bawah = text.split`|`[1] ? text.split`|`[1] : '-'
					let media = await (m.quoted ? m.quoted.download() : m.download())
					let mem = await UguuSe(media)
					console.log(mem)
					let smeme = `https://api.memegen.link/images/custom/${encodeURIComponent(atas)}/${encodeURIComponent(bawah)}.png?background=${mem.url}`
					await naze.sendAsSticker(m.chat, smeme, m, 'image', { packname: global.packname, author: global.author })
				} catch (e) {
					console.log(e)
					m.reply('Gagal!')
				}
			}
			break
			case 'nulis': {
				m.reply(`*Example*\n${prefix}nuliskiri\n${prefix}nuliskanan\n${prefix}foliokiri\n${prefix}foliokanan`)
			}
			break
			case 'nuliskiri': {
				if (!text) return m.reply(`Kirim perintah *${prefix + command}* Teksnya`)
				m.reply(mess.wait)
				const splitText = text.replace(/(\S+\s*){1,9}/g, '$&\n')
				const fixHeight = splitText.split('\n').slice(0, 31).join('\n')
				spawn('convert', [
					'./src/nulis/images/buku/sebelumkiri.jpg',
					'-font',
					'./src/nulis/font/Indie-Flower.ttf',
					'-size',
					'960x1280',
					'-pointsize',
					'23',
					'-interline-spacing',
					'2',
					'-annotate',
					'+140+153',
					fixHeight,
					'./src/nulis/images/buku/setelahkiri.jpg'
				])
				.on('error', () => m.reply(mess.error))
				.on('exit', () => {
					naze.sendMessage(m.chat, { image: fs.readFileSync('./src/nulis/images/buku/setelahkiri.jpg'), caption: 'Jangan Malas Lord. Jadilah siswa yang rajin ರ_ರ' }, { quoted: m })
				})
			}
			break
			case 'nuliskanan': {
				if (!text) return m.reply(`Kirim perintah *${prefix + command}* Teksnya`)
				m.reply(mess.wait)
				const splitText = text.replace(/(\S+\s*){1,9}/g, '$&\n')
				const fixHeight = splitText.split('\n').slice(0, 31).join('\n')
				spawn('convert', [
					'./src/nulis/images/buku/sebelumkanan.jpg',
					'-font',
					'./src/nulis/font/Indie-Flower.ttf',
					'-size',
					'960x1280',
					'-pointsize',
					'23',
					'-interline-spacing',
					'2',
					'-annotate',
					'+128+129',
					fixHeight,
					'./src/nulis/images/buku/setelahkanan.jpg'
				])
				.on('error', () => m.reply(mess.error))
				.on('exit', () => {
					naze.sendMessage(m.chat, { image: fs.readFileSync('./src/nulis/images/buku/setelahkanan.jpg'), caption: 'Jangan Malas Lord. Jadilah siswa yang rajin ರ_ರ' }, { quoted: m })
				})
			}
			break
			case 'foliokiri': {
				if (!text) return m.reply(`Kirim perintah *${prefix + command}* Teksnya`)
				m.reply(mess.wait)
				const splitText = text.replace(/(\S+\s*){1,9}/g, '$&\n')
				const fixHeight = splitText.split('\n').slice(0, 38).join('\n')
				spawn('convert', [
					'./src/nulis/images/folio/sebelumkiri.jpg',
					'-font',
					'./src/nulis/font/Indie-Flower.ttf',
					'-size',
					'1720x1280',
					'-pointsize',
					'23',
					'-interline-spacing',
					'4',
					'-annotate',
					'+48+185',
					fixHeight,
					'./src/nulis/images/folio/setelahkiri.jpg'
				])
				.on('error', () => m.reply(mess.error))
				.on('exit', () => {
					naze.sendMessage(m.chat, { image: fs.readFileSync('./src/nulis/images/folio/setelahkiri.jpg'), caption: 'Jangan Malas Lord. Jadilah siswa yang rajin ರ_ರ' }, { quoted: m })
				})
			}
			break
			case 'foliokanan': {
				if (!text) return m.reply(`Kirim perintah *${prefix + command}* Teksnya`)
				m.reply(mess.wait)
				const splitText = text.replace(/(\S+\s*){1,9}/g, '$&\n')
				const fixHeight = splitText.split('\n').slice(0, 38).join('\n')
				spawn('convert', [
					'./src/nulis/images/folio/sebelumkanan.jpg',
					'-font',
					'./src/nulis/font/Indie-Flower.ttf',
					'-size',
					'1720x1280',
					'-pointsize',
					'23',
					'-interline-spacing',
					'4',
					'-annotate',
					'+89+190',
					fixHeight,
					'./src/nulis/images/folio/setelahkanan.jpg'
				])
				.on('error', () => m.reply(mess.error))
				.on('exit', () => {
					naze.sendMessage(m.chat, { image: fs.readFileSync('./src/nulis/images/folio/setelahkanan.jpg'), caption: 'Jangan Malas Lord. Jadilah siswa yang rajin ರ_ರ' }, { quoted: m })
				})
			}
			break
			
			// Ai Menu
			case 'ai': case 'gpt': case 'openai': {
				if (!text) return m.reply(`Example: ${prefix + command} query`)
				const hasil = await chatGpt(text);
				m.reply(hasil.result)
			}
			break
			
			// Search Menu
			case 'yts': case 'ytsearch': case 'youtubesearch': {
				if (!text) return m.reply(`Example: ${prefix + command} naze`)
				m.reply(mess.wait)
				const res = await yts.search(text);
				const hasil = pickRandom(res.all)
				const teksnya = `*📍Title:* ${hasil.title}\n*✏Description:* ${hasil.description}\n*🌟Channel:* ${hasil.author.name}\n*⏳Duration:* ${hasil.seconds} second (${hasil.timestamp})\n*🔎Source:* ${hasil.url}\n\n_note : jika ingin mendownload silahkan_\n_pilih ${prefix}ytmp3 url_video atau ${prefix}ytmp4 url_video_`;
				await naze.sendMessage(m.chat, { image: { url: hasil.thumbnail }, caption: teksnya }, { quoted: m });
			}
			break
			case 'pixiv': {
				if (!text) return m.reply(`Example: ${prefix + command} hu tao`)
				try {
					let { pixivdl } = require('./lib/pixiv')
					let res = await pixivdl(text)
					m.reply(mess.wait)
					for (let i = 0; i < res.media.length; i++) {
						let caption = i == 0 ? `${res.caption}\n\n*By:* ${res.artist}\n*Tags:* ${res.tags.join(', ')}` : ''
						let mime = (await FileType.fromBuffer(res.media[i])).mime 
						await naze.sendMessage(m.chat, { [mime.split('/')[0]]: res.media[i], caption, mimetype: mime }, { quoted: m })
					}
				} catch (e) {
					m.reply('Pencarian Tidak ditemukan!')
				}
			}
			break
			case 'pinterest': {
				if (!text) return m.reply(`Example: ${prefix + command} hu tao`)
				let anu = await pinterest(text)
				let result = pickRandom(anu)
				await naze.sendMessage(m.chat, { image: { url: result }, caption: '⭔ media url : ' + result }, { quoted: m })
			}
			break
			case 'wallpaper': {
				if (!text) return m.reply(`Example: ${prefix + command} hu tao`)
				let anu = await wallpaper(text)
				let result = pickRandom(anu)
				await naze.sendMessage(m.chat, { image: { url: result.image[0] }, caption: `⭔ title : ${q}\n⭔ category : ${result.type}\n⭔ media url : ${result.image[2] || result.image[1] || result.image[0]}`}, { quoted: m })
			}
			break
			case 'ringtone': {
				if (!text) return m.reply(`Example: ${prefix + command} black rover`)
				let anu = await ringtone(text)
				let result = pickRandom(anu)
				await naze.sendMessage(m.chat, { audio: { url: result.audio }, fileName: result.title + '.mp3', mimetype: 'audio/mpeg' }, { quoted: m })
			}
			break
			
			// Downloader Menu
			case 'ytmp3': case 'ytaudio': case 'ytplayaudio': {
				if (!text) return m.reply(`Example: ${prefix + command} url_youtube`)
				if (!text.includes('youtu')) return m.reply('Url Tidak Mengandung Result Dari Youtube!')
				const hasil = await ytMp3(text);
				m.reply(mess.wait)
				await naze.sendMessage(m.chat, {
					document: { url: hasil.result },
					mimetype: 'audio/mpeg',
					fileName: hasil.title + '.mp3',
					contextInfo: {
						externalAdReply: {
							title: hasil.title,
							body: hasil.channel,
							previewType: 'PHOTO',
							thumbnailUrl: hasil.thumb,
							mediaType: 1,
							renderLargerThumbnail: true,
							sourceUrl: text
						}
					}
				}, { quoted: m });
			}
			break
			case 'ytmp4': case 'ytvideo': case 'ytplayvideo': {
				if (!text) return m.reply(`Example: ${prefix + command} url_youtube`)
				if (!text.includes('youtu')) return m.reply('Url Tidak Mengandung Result Dari Youtube!')
				const hasil = await ytMp4(text);
				m.reply(mess.wait)
				await naze.sendMessage(m.chat, { video: { url: hasil.result }, caption: `*📍Title:* ${hasil.title}\n*✏Description:* ${hasil.desc ? hasil.desc : ''}\n*🚀Channel:* ${hasil.channel}\n*🗓Upload at:* ${hasil.uploadDate}` }, { quoted: m });
			}
			break
			case 'ig': case 'instagram': case 'instadl': case 'igdown': case 'igdl': {
				if (!text) return m.reply(`Example: ${prefix + command} url_instagram`)
				if (!text.includes('instagram.com')) return m.reply('Url Tidak Mengandung Result Dari Instagram!')
				const hasil = await instaDl(text);
				if(hasil.length < 1) return m.reply('Postingan Tidak Tersedia atau Privat!')
				m.reply(mess.wait)
				for (let i = 0; i < hasil.length; i++) {
					await naze.sendFileUrl(m.chat, hasil[i].url, 'Done', m)
				}
			}
			break
			case 'igstory': case 'instagramstory': case 'instastory': case 'storyig': {
				if (!text) return m.reply(`Example: ${prefix + command} usernamenya`)
				try {
					const hasil = await instaStory(text);
					m.reply(mess.wait)
					for (let i = 0; i < hasil.results.length; i++) {
						await naze.sendFileUrl(m.chat, hasil.results[i].url, 'Done', m)
					}
				} catch (e) {
					m.reply('Username tidak ditemukan atau Privat!');
				}
			}
			break
			case 'tiktok': case 'tiktokdown': case 'ttdown': case 'ttdl': case 'tt': case 'ttmp4': case 'ttvideo': case 'tiktokmp4': case 'tiktokvideo': {
				if (!text) return m.reply(`Example: ${prefix + command} url_tiktok`)
				if (!text.includes('tiktok.com')) return m.reply('Url Tidak Mengandung Result Dari Tiktok!')
				const hasil = await tiktokDl(text);
				m.reply(mess.wait)
				if (hasil.size_wm) {
					await naze.sendFileUrl(m.chat, hasil.data[1].url, `*📍Title:* ${hasil.title}\n*⏳Duration:* ${hasil.duration}\n*🎃Author:* ${hasil.author.nickname} (@${hasil.author.fullname})`, m)
				} else {
					for (let i = 0; i < hasil.data.length; i++) {
						await naze.sendFileUrl(m.chat, hasil.data[i].url, `*🚀Image:* ${i+1}`, m)
					}
				}
			}
			break
			case 'fb': case 'fbdl': case 'fbdown': case 'facebook': case 'facebookdl': case 'facebookdown': case 'fbdownload': case 'fbmp4': case 'fbvideo': {
				if (!text) return m.reply(`Example: ${prefix + command} url_facebook`)
				if (!text.includes('facebook.com')) return m.reply('Url Tidak Mengandung Result Dari Facebook!')
				const hasil = await facebookDl(text);
				if (hasil.results.length < 1) {
					m.reply('Video Tidak ditemukan!')
				} else {
					m.reply(mess.wait)
					await naze.sendMessage(m.chat, { video: { url: hasil.results[0].url }, caption: `*🎐Title:* ${hasil.caption}` }, { quoted: m });
				}
			}
			break
			
			// Fun Menu
			case 'dadu': {
				let ddsa = [{ url: 'https://telegra.ph/file/9f60e4cdbeb79fc6aff7a.png', no: 1 },{ url: 'https://telegra.ph/file/797f86e444755282374ef.png', no: 2 },{ url: 'https://telegra.ph/file/970d2a7656ada7c579b69.png', no: 3 },{ url: 'https://telegra.ph/file/0470d295e00ebe789fb4d.png', no: 4 },{ url: 'https://telegra.ph/file/a9d7332e7ba1d1d26a2be.png', no: 5 },{ url: 'https://telegra.ph/file/99dcd999991a79f9ba0c0.png', no: 6 }]
				let media = pickRandom(ddsa)
				await naze.sendAsSticker(m.chat, media.url, m, 'image', { packname: global.packname, author: global.author, isAvatar: 1 })
			}
			break
			case 'halah': case 'hilih': case 'huluh': case 'heleh': case 'holoh': {
				if (!m.quoted && !text) return m.reply(`Kirim/reply text dengan caption ${prefix + command}`)
				ter = command[1].toLowerCase()
				tex = m.quoted ? m.quoted.text ? m.quoted.text : q ? q : m.text : q ? q : m.text
				m.reply(tex.replace(/[aiueo]/g, ter).replace(/[AIUEO]/g, ter.toUpperCase()))
			}
			break
			case 'bisakah': {
				if (!text) return m.reply(`Example : ${prefix + command} saya menang?`)
				let bisa = ['Bisa','Coba Saja','Pasti Bisa','Mungkin Saja','Tidak Bisa','Tidak Mungkin','Coba Ulangi','Ngimpi kah?','yakin bisa?']
				let keh = bisa[Math.floor(Math.random() * bisa.length)]
				m.reply(`*Bisakah ${text}*\nJawab : ${keh}`)
			}
			break
			case 'apakah': {
				if (!text) return m.reply(`Example : ${prefix + command} saya bisa menang?`)
				let apa = ['Iya','Tidak','Bisa Jadi','Coba Ulangi','Mungkin Saja','Mungkin Tidak','Mungkin Iya','Ntahlah']
				let kah = apa[Math.floor(Math.random() * apa.length)]
				m.reply(`*${command} ${text}*\nJawab : ${kah}`)
			}
			break
			case 'kapan': case 'kapankah': {
				if (!text) return m.reply(`Example : ${prefix + command} saya menang?`)
				let kapan = ['Besok','Lusa','Nanti','4 Hari Lagi','5 Hari Lagi','6 Hari Lagi','1 Minggu Lagi','2 Minggu Lagi','3 Minggu Lagi','1 Bulan Lagi','2 Bulan Lagi','3 Bulan Lagi','4 Bulan Lagi','5 Bulan Lagi','6 Bulan Lagi','1 Tahun Lagi','2 Tahun Lagi','3 Tahun Lagi','4 Tahun Lagi','5 Tahun Lagi','6 Tahun Lagi','1 Abad lagi','3 Hari Lagi','Bulan Depan','Ntahlah','Tidak Akan Pernah']
				let koh = kapan[Math.floor(Math.random() * kapan.length)]
				m.reply(`*${command} ${text}*\nJawab : ${koh}`)
			}
			break
			case 'tanyakerang': case 'kerangajaib': case 'kerang': {
				if (!text) return m.reply(`Example : ${prefix + command} boleh pinjam 100?`)
				let krng = ['Mungkin suatu hari', 'Tidak juga', 'Tidak keduanya', 'Kurasa tidak', 'Ya', 'Tidak', 'Coba tanya lagi', 'Tidak ada']
				let jwb = pickRandom(krng)
				m.reply(`*Pertanyaan : ${text}*\n*Jawab : ${jwb}*`)
			}
			break
			case 'cekmati': {
				if (!text) return m.reply(`Example : ${prefix + command} nama lu`)
				let teksnya = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/\d/g, '');
				let { data } = await axios.get('https://api.agify.io/?name=' + teksnya);
				let jawab = (`Nama : ${data.name}\n*Mati Pada Umur :* ${data.age} Tahun.\n\n_Cepet Cepet Tobat Bro_\n_Soalnya Mati ga ada yang tau_`)
				m.reply(jawab)
			}
			break
			case 'rate': case 'nilai': {
				let rate = Math.floor(Math.random() * 100)
				m.reply(`Rate Bot : *${rate}%*`)
			}
			break
			
			// Game Menu
			case 'slot': {
				await gameSlot(naze, m, global.db.users)
			}
			break
			case 'casino': {
				await gameCasinoSolo(naze, m, prefix, global.db.users)
			}
			break
			case 'rampok': case 'merampok': {
				await gameMerampok(m, global.db.users)
			}
			break
			case 'suitpvp': case 'suit': {
				this.suit = this.suit ? this.suit : {}
				let poin = 10
				let poin_lose = 10
				let timeout = 60000
				if (Object.values(this.suit).find(roof => roof.id.startsWith('suit') && [roof.p, roof.p2].includes(m.sender))) m.reply(`Selesaikan suit mu yang sebelumnya`)
				if (m.mentionedJid[0] === m.sender) return m.reply(`Tidak bisa bermain dengan diri sendiri !`)
				if (!m.mentionedJid[0]) return m.reply(`_Siapa yang ingin kamu tantang?_\nTag orangnya..\n\nContoh : ${prefix}suit @${owner[0]}`, m.chat, { mentions: [owner[1] + '@s.whatsapp.net'] })
				if (Object.values(this.suit).find(roof => roof.id.startsWith('suit') && [roof.p, roof.p2].includes(m.mentionedJid[0]))) return m.reply(`Orang yang kamu tantang sedang bermain suit bersama orang lain :(`)
				let id = 'suit_' + new Date() * 1
				let caption = `_*SUIT PvP*_\n\n@${m.sender.split`@`[0]} menantang @${m.mentionedJid[0].split`@`[0]} untuk bermain suit\n\nSilahkan @${m.mentionedJid[0].split`@`[0]} untuk ketik terima/tolak`
				this.suit[id] = {
					chat: m.reply(caption),
					id: id,
					p: m.sender,
					p2: m.mentionedJid[0],
					status: 'wait',
					waktu: setTimeout(() => {
						m.reply(`_Waktu suit habis_`)
						delete this.suit[id]
					}, 60000), poin, poin_lose, timeout
				}
			}
			break
			case 'ttc': case 'ttt': case 'tictactoe': {
				let TicTacToe = require('./lib/tictactoe');
				this.tictactoe = this.tictactoe ? this.tictactoe : {}
				if (Object.values(this.tictactoe).find(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender))) return m.reply('Kamu masih didalam game');
				let room = Object.values(this.tictactoe).find(room => room.state === 'WAITING' && (text ? room.name === text : true))
				if (room) {
					m.reply('Partner ditemukan!')
					room.o = m.chat
					room.game.playerO = m.sender
					room.state = 'PLAYING'
					let arr = room.game.render().map(v => {
						return {X: '❌',O: '⭕',1: '1️⃣',2: '2️⃣',3: '3️⃣',4: '4️⃣',5: '5️⃣',6: '6️⃣',7: '7️⃣',8: '8️⃣',9: '9️⃣'}[v]
					})
					let str = `Room ID: ${room.id}\n\n${arr.slice(0, 3).join('')}\n${arr.slice(3, 6).join('')}\n${arr.slice(6).join('')}\n\nMenunggu @${room.game.currentTurn.split('@')[0]}\n\nKetik *nyerah* untuk menyerah dan mengakui kekalahan`
					if (room.x !== room.o) await naze.sendMessage(room.x, { texr: str, mentions: parseMention(str) }, { quoted: m })
					await naze.sendMessage(room.o, { text: str, mentions: parseMention(str) }, { quoted: m })
				} else {
					room = {
						id: 'tictactoe-' + (+new Date),
						x: m.chat,
						o: '',
						game: new TicTacToe(m.sender, 'o'),
						state: 'WAITING'
					}
					if (text) room.name = text
					naze.sendMessage(m.chat, { text: 'Menunggu partner' + (text ? ` mengetik command dibawah ini ${prefix}${command} ${text}` : ''), mentions: m.mentionedJid }, { quoted: m })
					this.tictactoe[room.id] = room
				}
			}
			break
			case 'delttc': case 'delttt': {
				let roomnya = Object.values(this.tictactoe).find(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender))
				if (!roomnya) return m.reply(`Kamu sedang tidak berada di room tictactoe !`)
				delete this.tictactoe[roomnya.id]
				m.reply(`Berhasil delete session room tictactoe !`)
			}
			break
			case 'kuismath': case 'math': {
				const { genMath, modes } = require('./lib/math');
				const inputMode = ['noob', 'easy', 'medium', 'hard','extreme','impossible','impossible2'];
				if (!text) return m.reply(`Mode: ${Object.keys(modes).join(' | ')}\nContoh penggunaan: ${prefix}math medium`)
				if (!inputMode.includes(text.toLowerCase())) return m.reply('Mode tidak ditemukan!')
				if (kuismath.hasOwnProperty(m.sender.split('@')[0])) return m.reply('Masih Ada Sesi Yang Belum Diselesaikan!')
				let result = await genMath(text.toLowerCase())
				m.reply(`*Berapa hasil dari: ${result.soal.toLowerCase()}*?\n\nWaktu: ${(result.waktu / 1000).toFixed(2)} detik`).then(() => {
					kuismath[m.sender.split('@')[0]] = {
						jawaban: result.jawaban,
						mode: text.toLowerCase()
					}
				})
				await sleep(result.waktu)
				if (kuismath.hasOwnProperty(m.sender.split('@')[0])) {
					console.log('Jawaban: ' + result.jawaban)
					m.reply('Waktu Habis\nJawaban: ' + kuismath[m.sender.split('@')[0]].jawaban)
					delete kuismath[m.sender.split('@')[0]]
				}
			}
			break
			
			// Menu
			case 'allmenu': {
				let profile
				try {
					profile = await naze.profilePictureUrl(m.sender, 'image');
				} catch (e) {
					profile = global.fake.anonim
				}
				const setv = pickRandom(global.listv)
				const menunya = `
╭──❍「 *USER INFO* 」❍
├ *Nama* : ${m.pushName ? m.pushName : 'Tanpa Nama'}
├ *Id* : @${m.sender.split('@')[0]}
├ *User* : ${isVip ? 'VIP' : isPremium ? 'PREMIUM' : 'FREE'}
├ *Limit* : ${isVip ? 'VIP' : global.db.users[m.sender].limit }
├ *Uang* : ${global.db.users[m.sender] ? global.db.users[m.sender].uang.toLocaleString('id-ID') : '0'}
╰─┬────❍
╭─┴─❍「 *BOT INFO* 」❍
├ *Nama Bot* : ${global.botname}
├ *Powered* : @${'0@s.whatsapp.net'.split('@')[0]}
├ *Owner* : @${global.owner[0].split('@')[0]}
├ *Mode* : ${naze.public ? 'Public' : 'Self'}
├ *Prefix* :「 MULTI-PREFIX 」
╰─┬────❍
╭─┴─❍「 *ABOUT* 」❍
├ *Tanggal* : ${tanggal}
├ *Hari* : ${hari}
├ *Jam* : ${jam} WIB
╰──────❍
╭──❍「 *BOT* 」❍
│${setv} ${prefix} profile
│${setv} ${prefix} claim
│${setv} ${prefix} tfuang (nominal) (@tag)
│${setv} ${prefix} tflimit (nominal) (@tag)
│${setv} ${prefix} request (text)
│${setv} ${prefix} react (emoji)
│${setv} ${prefix} tagme
│${setv} ${prefix} runtime
│${setv} ${prefix} ping
│${setv} ${prefix} afk
│${setv} ${prefix} rvo (reply pesan viewone)
│${setv} ${prefix} inspect (url gc)
│${setv} ${prefix} addmsg
│${setv} ${prefix} delmsg
│${setv} ${prefix} getmsg
│${setv} ${prefix} listmsg
│${setv} ${prefix} q (reply pesan)
╰─┬────❍
╭─┴❍「 *GROUP* 」❍
│${setv} ${prefix} add (62xxx)
│${setv} ${prefix} kick (@tag/62xxx)
│${setv} ${prefix} promote (@tag/62xxx)
│${setv} ${prefix} demote (@tag/62xxx)
│${setv} ${prefix} setname (nama baru gc)
│${setv} ${prefix} setdesc (desk)
│${setv} ${prefix} setppgc (reply imgnya)
│${setv} ${prefix} delete (reply pesan)
│${setv} ${prefix} linkgrup
│${setv} ${prefix} revoke
│${setv} ${prefix} tagall
│${setv} ${prefix} hidetag
│${setv} ${prefix} totag (reply pesan)
│${setv} ${prefix} listonline
╰─┬────❍
╭─┴❍「 *SEARCH* 」❍
│${setv} ${prefix} ytsearch (query)
│${setv} ${prefix} pixiv (query)
│${setv} ${prefix} pinterest (query)
│${setv} ${prefix} wallpaper (query)
│${setv} ${prefix} ringtone (query)
╰─┬────❍
╭─┴❍「 *DOWNLOAD* 」❍
│${setv} ${prefix} ytmp3 (url)
│${setv} ${prefix} ytmp4 (url)
│${setv} ${prefix} instagram (url)
│${setv} ${prefix} tiktok (url)
│${setv} ${prefix} facebook (url)
╰─┬────❍
╭─┴❍「 *TOOLS* 」❍
│${setv} ${prefix} get (url)
│${setv} ${prefix} toaudio (reply pesan)
│${setv} ${prefix} tomp3 (reply pesan)
│${setv} ${prefix} tovn (reply pesan)
│${setv} ${prefix} togif (reply pesan)
│${setv} ${prefix} tovideo (reply pesan)
│${setv} ${prefix} toimage (reply pesan)
│${setv} ${prefix} toptv (reply pesan)
│${setv} ${prefix} tourl (reply pesan)
│${setv} ${prefix} tts (textnya)
│${setv} ${prefix} toqr (textnya)
│${setv} ${prefix} ssweb (url)
│${setv} ${prefix} sticker (send/reply img)
│${setv} ${prefix} colong (reply stiker)
│${setv} ${prefix} smeme (send/reply img)
│${setv} ${prefix} nulis
╰─┬────❍
╭─┴❍「 *AI* 」❍
│${setv} ${prefix} ai (query)
│${setv} ${prefix} gpt (query)
╰─┬────❍
╰─┬────❍
╭─┴❍「 *GAME* 」❍
│${setv} ${prefix} tictactoe
│${setv} ${prefix} math (level)
│${setv} ${prefix} suit
│${setv} ${prefix} slot
│${setv} ${prefix} casino (nominal)
│${setv} ${prefix} rampok (@tag)
╰─┬────❍
╭─┴❍「 *FUN* 」❍
│${setv} ${prefix} dadu
│${setv} ${prefix} bisakah (text)
│${setv} ${prefix} apakah (text)
│${setv} ${prefix} kapan (text)
│${setv} ${prefix} kerangajaib (text)
│${setv} ${prefix} cekmati (text)
│${setv} ${prefix} rate (reply pesan)
│${setv} ${prefix} halah (text)
│${setv} ${prefix} hilih (text)
│${setv} ${prefix} huluh (text)
│${setv} ${prefix} heleh (text)
│${setv} ${prefix} holoh (text)
╰─┬────❍
╭─┴❍「 *OWNER* 」❍
│${setv} ${prefix} public
│${setv} ${prefix} self
│${setv} ${prefix} setbio
│${setv} ${prefix} setppbot
│${setv} ${prefix} join
│${setv} ${prefix} leave
│${setv} ${prefix} block
│${setv} ${prefix} openblock
│${setv} ${prefix} listpc
│${setv} ${prefix} listgc
│${setv} ${prefix} creategc
│${setv} ${prefix} addprem
│${setv} ${prefix} delprem
│${setv} ${prefix} listprem
│${setv} $
│${setv} >
│${setv} ×
│${setv} =>
╰──────❍`
				await naze.sendMessage(m.chat, {
					document: global.fake.docs,
					fileName: ucapanWaktu,
					mimetype: pickRandom(global.fake.listfakedocs),
					fileLength: '100000000000000',
					pageCount: '999',
					caption: menunya,
					contextInfo: {
						mentionedJid: [m.sender, '0@s.whatsapp.net', global.owner[0] + '@s.whatsapp.net'],
						externalAdReply: {
							title: global.author,
							body: global.packname,
							showAdAttribution: true,
							thumbnailUrl: profile,
							mediaType: 1,
							previewType: 0,
							renderLargerThumbnail: true,
							mediaUrl: global.my.gh,
							sourceUrl: global.my.gh,
						}
					}
				}, { quoted: m })
			}
			break

			default:
			if (budy.startsWith('>')) {
				if (!isCreator) return
				try {
					let evaled = await eval(budy.slice(2))
					if (typeof evaled !== 'string') evaled = require('util').inspect(evaled)
					await m.reply(evaled)
				} catch (err) {
					await m.reply(String(err))
				}
			}
			if (budy.startsWith('<')) {
				if (!isCreator) return
				try {
					let evaled = await eval(`(async () => { ${budy.slice(2)} })()`)
					if (typeof evaled !== 'string') evaled = require('util').inspect(evaled)
					await m.reply(evaled)
				} catch (err) {
					await m.reply(String(err))
				}
			}
			if (budy.startsWith('$')) {
				if (!isCreator) return
				if (!text) return
				exec(budy.slice(2), (err, stdout) => {
					if (err) return m.reply(`${err}`)
					if (stdout) return m.reply(stdout)
				})
			}
		}
	} catch (err) {
		console.log(util.format(err));
		//m.reply('*❗ Internal server error️*');
		naze.sendFromOwner(global.owner, 'Halo sayang, sepertinya ada yang error nih, jangan lupa diperbaiki ya\n\n*Log error:*\n\n' + util.format(err), m, { contextInfo: { isForwarded: true }})
	}
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});