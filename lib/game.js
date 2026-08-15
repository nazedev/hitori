import '../settings.js';
import { Jimp } from 'jimp';
import { sleep, clockString } from './function.js'

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
			db.users[m.sender].money += randomLimit * 500
		} else {
			db.users[m.sender].limit -= 1
			db.set[botNumber].limit += 1
			let sloth =`[  🎰VIRTUAL SLOT 🎰  ]\n------------------------\n\n${listSlot1}\n${listSlot2} <=====\n${listSlot3}\n\n------------------------\n[  🎰 VIRTUAL SLOT 🎰  ]\n\n*Keterangan* :\n_You Lose_ <=====\nLimit - 1`
			conn.sendMessage(m.chat, { text: sloth }, { quoted: m })
		}
	} catch (e) {
		m.reply('Error!')
	}
}

const gameCasinoSolo = async (conn, m, prefix, db) => {
	try {
		let buatall = 1
		if (db.users[m.sender].limit < 1) return m.reply(global.mess.limit)
		const botNumber = await conn.decodeJid(conn.user.id)
		let randomaku = `${Math.floor(Math.random() * 101)}`.trim()
		let randomkamu = `${Math.floor(Math.random() * 81)}`.trim() //hehe Biar Susah Menang :v
		let Aku = (randomaku * 1)
		let Kamu = (randomkamu * 1)
		let count = m.args[0]
		count = count ? 'all' === count ? Math.floor(db.users[m.sender].money / buatall) : parseInt(count) : m.args[0] ? parseInt(m.args[0]) : 1
		count = Math.max(1, count)
		if (m.args.length < 1) return m.reply(prefix + 'casino <jumlah>\n' + prefix + 'casino 1000')
		if (isNaN(m.args[0])) return m.reply(`Masukkan jumlahnya!\nContoh : ${prefix + m.command} 1000`)
		if (db.users[m.sender].money >= count * 1) {
			db.users[m.sender].limit -= 1
			db.users[m.sender].money -= count * 1
			db.set[botNumber].money += count * 1
			if (Aku > Kamu) {
				m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*You LOSE*\nKamu kehilangan ${count} Uang`.trim())
			} else if (Aku < Kamu) {
				db.users[m.sender].money += count * 2
				m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*You Win*\nKamu mendapatkan ${count * 2} Uang`.trim())
			} else {
				db.users[m.sender].money += count * 1
				m.reply(`💰 Casino 💰\n*Kamu:* ${Kamu} Point\n*Computer:* ${Aku} Point\n\n*SERI*\nKamu mendapatkan ${count * 1} Uang`.trim())
			}
		} else m.reply(`Uang kamu tidak mencukupi untuk Casino silahkan *kumpulkan* terlebih dahulu!`)
	} catch (e) {
		m.reply('Error!')
	}
}

const gameSamgongSolo = async (conn, m, db) => {
	const suits = ['♥️', '♦️', '♣️', '♠️'];
	const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
	if (db.users[m.sender].limit < 1) return m.reply(global.mess.limit)
	const count = parseInt(m.args[0]);
	if (isNaN(count) || count < 5000) return m.reply('Taruhan minimal adalah 5000!');
	if (db.users[m.sender].money < count) return m.reply(`Uang kamu tidak mencukupi untuk Samgong silahkan *kumpulkan* terlebih dahulu!`)
	db.users[m.sender].money -= count;
	db.users[m.sender].limit -= 1
	let { key } = await m.reply('*🃏Permainan dimulai!* Kartu sedang dibagikan...');
	await sleep(5000);
	const deck = ranks.flatMap(rank => suits.map(suit => `${rank} ${suit}`)).sort(() => Math.random() - 0.5);
	const draw = () => [deck.pop(), deck.pop(), deck.pop()];
	const calcScore = hand => hand.reduce((sum, card) => sum + (['J', 'Q', 'K'].includes(card.split(' ')[0]) ? 10 : card.split(' ')[0] === 'A' ? 15 : parseInt(card)), 0);
	
	let playerHand = draw(), botHand = draw();
	let playerScore = calcScore(playerHand), botScore = calcScore(botHand);
	
	await m.reply(`*🃏Kartu Dibagikan:*\n🤓 *Kamu:* ${playerHand.join(', ')}\n🤖 *Bot:* ${botHand.join(', ')}`, { edit: key });
	await sleep(2000);
	while (playerScore < 30 && botScore < 30 && playerHand.length < 4) {
		if (playerScore < 30) playerHand.push(deck.pop());
		if (botScore < 30) botHand.push(deck.pop());
		playerScore = calcScore(playerHand);
		botScore = calcScore(botHand);
	}
	
	let winnings = count * 1.5;
	let result = playerScore > 30 ? '💀 Kamu kalah!' : playerScore === botScore ? '🤝 Hasil Seri! Taruhan dikembalikan' : botScore > 30 || playerScore > botScore ? `🎉 Kamu menang! +${winnings} 💵` : '😞 Bot menang!';
	if (playerScore <= 30 && (botScore > 30 || playerScore > botScore)) db.users[m.sender].money += (playerScore === botScore ? count : winnings);
	await m.reply(`*🃏Hasil Akhir:*\n🤓 *Kamu:* ${playerHand.join(', ')} (${playerScore})\n🤖 *Bot:* ${botHand.join(', ')} (${botScore})\n\n${result}`, { edit: key })
}

const gameMerampok = async (m, db) => {
	if (db.users[m.sender].limit < 1) return m.reply(global.mess.limit)
	db.users[m.sender].limit -= 1
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
		if (10000 > db.users[who].money) return m.reply('Targetnya Kismin ngab🗿')
		db.users[who].money -= dapat
		db.users[m.sender].money += dapat
		db.users[m.sender].lastrampok = new Date * 1
		m.reply(`Berhasil Merampok Money Target Sebesar ${dapat}`)
	} else m.reply(`Anda Sudah merampok dan berhasil sembunyi, tunggu ${timers} untuk merampok lagi`)
}

const gameBegal = async (conn, m, db) => {
	if (db.users[m.sender].limit < 1) return m.reply(global.mess.limit)
	db.users[m.sender].limit -= 1
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
			db.users[m.sender].money -= randomUang
			db.set[botNumber].money += randomUang * 1
		} else {
			await m.reply({ text: teksnya.teks, edit: key })
			await m.reply(`Berhasil Mendapatkan Uang Sebesar : *${randomUang}*`)
			db.users[m.sender].money += randomUang
			db.users[m.sender].lastbegal = new Date * 1
		}
	} else m.reply(`Silahkan tunggu *⏱️${timers}* lagi untuk bisa bermain lagi`)
}

const daily = async (m, db) => {
	let user = db.users[m.sender]
	let __timers = (new Date - user.lastclaim)
	let _timers = (86400000 - __timers)
	let timers = clockString(_timers)
	if (new Date - user.lastclaim > 86400000) {
		m.reply(`*Daily Claim*\n_Berhasil Claim_\n- limit : 10\n- uang : 10000\n\n_Claim Di Reset_`)
		db.users[m.sender].limit += 10
		db.users[m.sender].money += 10000
		db.users[m.sender].lastclaim = new Date * 1
	} else m.reply(`Silahkan tunggu *⏱️${timers}* lagi untuk bisa mengclaim lagi`)
}

const buy = async (m, args, db) => {
	if (args[0] === 'limit') {
		if (!args[1]) return m.reply(`Masukkan Nominalnya!\nExample : ${m.prefix + m.command} limit 10`);
		let count = parseInt(args[1])
		if (db.users[m.sender].money >= count * 500) {
			db.users[m.sender].limit += count * 1
			db.users[m.sender].money -= count * 500
			m.reply(`Berhasil Membeli Limit Sebanyak ${args[1] * 1} dengan harga ${args[1] * 500}`);
		} else m.reply(`Uang Kamu Tidak Cukup Untuk Membeli limit!\nUangmu Tersisa : ${db.users[m.sender].money}\nHarga ${args[1]} Limit : ${args[1] * 500}`);
	} else m.reply(`Harga Limit : Jumlah x 500\n• 1 limit = 500\n• 2 limit = 1000\n\nExample : .buy limit 3`);
}

const setLimit = (m, db) => db.users[m.sender].limit -= 1

const addLimit = (jumlah, no, db) => db.users[no].limit += parseInt(jumlah)

const setMoney = (m, db) => db.users[m.sender].money -= 1000

const addMoney = (jumlah, no, db) => db.users[no].money += parseInt(jumlah)

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
			} else m.reply(`Limit tidak mencukupi!!\nLimit mu tersisa : *${db.users[m.sender].limit}*`)
		} else m.reply(`Nomer ${who.split('@')[0]} Bukan User bot!`)
	} else if (args[0] == 'uang') {
		if (!args[1].length > 7) return m.reply(`Transfer Menu :\nExample : ${m.prefix + m.command} limit @tag 11\n• ${m.prefix + m.command} limit @tag jumlah\n• ${m.prefix + m.command} uang @tag jumlah`);
		let count = parseInt(args[2] && args[2].length > 0 ? Math.min(9999999, Math.max(parseInt(args[2]), 1)) : Math.min(1))
		let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : args[1] ? (args[1].replace(/[^0-9]/g, '') + '@s.whatsapp.net') : false
		if (!who) return m.reply('Siapa yg mau di transfer?')
		if (db.users[who]) {
			if (db.users[m.sender].money >= count * 1) {
				try {
					db.users[m.sender].money -= count * 1
					db.users[who].money += count * 1
					m.reply(`Berhasil mentransfer uang sebesar ${count}, kepada @${who.split('@')[0]}`)
				} catch (e) {
					db.users[m.sender].money += count * 1
					m.reply('Gagal Transfer')
				}
			} else m.reply(`Uang tidak mencukupi!!\Uang mu tersisa : *${db.users[m.sender].money}*`)
		} else m.reply(`Nomer ${who.split('@')[0]} Bukan User bot!`)
	} else m.reply(`Transfer Menu :\nExample : ${m.prefix + m.command} limit @tag 11\n• ${m.prefix + m.command} limit @tag jumlah\n• ${m.prefix + m.command} uang @tag jumlah`);
}

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : https://whatsapp.com/channel/0029VaWOkNm7DAWtkvkJBK43
*/

class Cangkulan {
	constructor(data) {
		this.id = data.id || '';
		this.skip = data.skip || [];
		this.host = data.host || '';
		this.leader = data.leader || '';
		this.winner = data.winner || [];
		this.players = data.players || [];
		this.started = data.started || false;
		this.startCard = data.startCard || {};
		this.submitCard = data.submitCard || [];
		this.secondDeck = data.secondDeck || [];
		this.deck = data.deck || this.generateDeck();
	}

	generateDeck() {
		const suits = ['♥️', '♦️', '♣️', '♠️'];
		const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
		return suits.flatMap(suit => ranks.map(rank => ({ rank, suit })));
	}

	shuffleDeck() {
		for (let i = this.deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
		}
	}

	distributeCards() {
		this.shuffleDeck();
		const perPlayer = {
			2:10, 3:7, 4:7, 5:6, 6:6, 7:5, 8:5, 9:4, 10:4
		}[this.players.length] ?? 4;

		for (const player of this.players) {
			player.cards.push(...this.deck.splice(0, perPlayer));
		}

		this.startCard = this.deck.shift();
		this.secondDeck.push(this.startCard);
		this.leader = this.host;
		this.started = true;
	}

	hasMatching(playerId) {
		if (!this.startCard || !Object.keys(this.startCard).length) return false;
		return (this.players.find(p => p.id === playerId)?.cards ?.some(c => c.suit === this.startCard.suit) ?? false);
	}

	cardValue(rank) {
		return rank === 'A' ? 14 : rank === 'K' ? 13 : rank === 'Q' ? 12 : rank === 'J' ? 11 : (parseInt(rank) || 0);
	}
	
	resolveRound() {
		if (!this.submitCard.length) {
			this.skip = [];
			return null;
		}
		
		const validCards = this.submitCard.filter(c => c.card.suit === this.startCard.suit);
		if (validCards.length === 0) validCards.push(this.submitCard[0]);
		const best = validCards.reduce((hi, c) => this.cardValue(c.card.rank) > this.cardValue(hi.card.rank) ? c : hi);
		this.leader = best.id;
		
		let penaltyMsg = "";
		if (this.skip.length > 0) {
			const skipPlayers = this.skip.map(id => this.players.find(p => p.id === id)).filter(Boolean);
			skipPlayers.sort((a, b) => a.cards.length - b.cards.length);
			
			const penaltyCards = this.submitCard.map(s => s.card);
			const punished = {};
			
			penaltyCards.forEach((card, i) => {
				const targetPlayer = skipPlayers[i % skipPlayers.length];
				targetPlayer.cards.push(card);
				punished[targetPlayer.id] = (punished[targetPlayer.id] || 0) + 1;
			});
			
			const punishedList = Object.entries(punished).map(([id, count]) => `@${id.split('@')[0]} (+${count})`).join(', ');
			penaltyMsg = `\n\n⚠️ Deck kosong! Pemain berikut harus MAKAN kartu meja karena jumlah kartunya paling sedikit: ${punishedList}`;
			
			const currentPlayed = this.submitCard.map(s => s.card);
			this.secondDeck = this.secondDeck.filter(c => !currentPlayed.some(played => played.rank === c.rank && played.suit === c.suit));
		}
		
		this.startCard = {};
		this.submitCard = [];
		this.skip = [];
		return `🏆 @${this.leader.split('@')[0]} memenangkan ronde dan memimpin ronde berikutnya!${penaltyMsg}`;
	}

	isRoundComplete() {
		return (this.submitCard.length + this.skip.length) >= this.players.length;
	}
}

class SnakeLadder {
	constructor(data) {
		this.turn = data.turn || 0;
		this.host = data.host || null;
		this.start = data.start || false;
		this.players = data.players || [];
		this.map = data.map || this.createMap();
	}
	
	rollDice() {
		return Math.floor(Math.random() * 6) + 1;
	}
	
	createMap () {
		const data = [{
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map1.jpg',
			move: { 4: 56, 12: 50, 14: 55, 22: 58, 41: 79, 54: 88, 96: 42, 94: 71, 75: 32, 48: 16, 37: 3, 28: 10 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map2.jpg',
			move: { 7: 36, 21: 58, 31: 51, 34: 84, 54: 89, 63: 82, 96: 72, 78: 59, 66: 12, 56: 20, 43: 24, 33: 5 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map3.jpg',
			move: { 8: 29, 10: 32, 20: 39, 27: 85, 51: 67, 72: 91, 79: 100, 98: 65, 94: 75, 93: 73, 64: 60, 62: 19, 56: 24, 53: 50, 17: 7 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map4.jpg',
			move: { 8: 29, 10: 32, 20: 39, 27: 85, 51: 67, 72: 91, 79: 100, 98: 65, 94: 75, 93: 73, 64: 60, 62: 19, 56: 24, 53: 50, 17: 7 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map5.jpg',
			move: { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91, 80: 99, 98: 79, 94: 75, 93: 73, 87: 36, 64: 60, 62: 19, 54: 34, 17: 7 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map6.jpg',
			move: { 4: 23, 13: 46, 33: 52, 42: 63, 50: 69, 62: 81, 74: 93, 99: 41, 95: 76, 89: 53, 66: 45, 54: 31, 43: 17, 40: 2, 27: 5 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map7.jpg',
			move: { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 71: 91, 80: 100, 98: 79, 95: 75, 93: 73, 87: 24, 64: 60, 62: 19, 54: 34, 17: 7 },
			mode: ''
		}, {
			url: 'https://raw.githubusercontent.com/nazedev/database/master/games/images/map/map8.jpg',
			move: { 2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98, 87: 94, 99: 80, 95: 75, 92: 88, 89: 68, 74: 53, 64: 60, 62: 19, 49: 11, 46: 25, 16: 6 },
			mode: ''
		}];
		return data[Math.floor(Math.random() * data.length)];
	}
	
	nextTurn() {
		this.turn = (this.turn + 1) % this.players.length;
	}
	
	async drawBoard(boardUrl, players = []) {
		try {
			const board = await Jimp.read(boardUrl);
			board.resize({ w: 612, h: 612 });
			const width = board.width;
			const height = board.height;
			const size = Math.min(width, height);
			board.crop({ x: (width - size) / 2, y: (height - size) / 2, w: size, h: size });
			const tileSize = size / 10;
			players.filter(a => a.move !== null);
			for (let i = 0; i < players.length; i++) {
				const position = players[i].move;
				const row = Math.floor((position - 1) / 10);
				const col = (row % 2 === 0) ? (position - 1) % 10 : 9 - (position - 1) % 10;
				const x = col * tileSize;
				const y = (9 - row) * tileSize;
				const player = await Jimp.read(`https://raw.githubusercontent.com/nazedev/database/master/games/images/player${i + 1}.png`);
				const pionSize = tileSize * 0.7;
				player.resize({ w: pionSize, h: pionSize });
				board.composite(player, x + tileSize / 2 - pionSize / 2, y + tileSize / 2 - pionSize / 2);
			}
			const result = await board.getBuffer('image/jpeg');
			return result;
		} catch (e) {
			return null;
		}
	}
}

const getChessAI = async (fen, depth = 10) => {
	try {
		const res = await fetch("https://chess-api.com/v1", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ fen, depth }),
		}).then((r) => r.json());
		if (res && res.from && res.to) {
			let scoreText = "";
			if (res.mate !== null && res.mate !== undefined) {
				scoreText = `Mate in #${res.mate}`;
			} else if (res.eval !== undefined) {
				const val = Number(res.eval);
				scoreText = `${val > 0 ? "+" : ""}${val} (${val > 0 ? "Putih Unggul" : val < 0 ? "Hitam Unggul" : "Seimbang"})`;
			}
			return {
				from: res.from.toLowerCase(),
				to: res.to.toLowerCase(),
				promotion: res.promotion ? res.promotion.toLowerCase() : "q",
				evalText: res.text || scoreText,
				scoreText: scoreText || "Seimbang",
				evalScore: res.eval || 0,
				winChance: res.winChance ? Math.round(res.winChance) : 50,
			};
		}
	} catch (e) {}
	try {
		const { aiMove } = await import("js-chess-engine");
		const moveObj = aiMove(fen, 2);
		if (moveObj && Object.keys(moveObj).length > 0) {
			const from = Object.keys(moveObj)[0].toLowerCase();
			const to = moveObj[from.toUpperCase()].toLowerCase();
			return {
				from,
				to,
				promotion: "q",
				evalText: "AI Move (Local Engine)",
				scoreText: "N/A",
				evalScore: 0,
				winChance: 50,
			};
		}
	} catch (e) {}
	return null;
};

export {
	rdGame,
	iGame,
	tGame,
	gameSlot,
	gameCasinoSolo,
	gameSamgongSolo,
	gameMerampok,
	gameBegal,
	daily,
	buy,
	setLimit,
	addLimit,
	addMoney,
	setMoney,
	transfer,
	Cangkulan,
	SnakeLadder,
	getChessAI
};