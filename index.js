require('./settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const { exec, spawn, execSync } = require('child_process');
const { parsePhoneNumber } = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, proto, getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys');

const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || global.pairing_code;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

global.api = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + decodeURIComponent(new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) }))) : '')

const DataBase = require('./src/database');
const database = new DataBase(global.tempatDB);
const msgRetryCounterCache = new NodeCache();
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });


(async () => {
	const loadData = await database.read()
	if (loadData && Object.keys(loadData).length === 0) {
		global.db = {
			set: {},
			users: {},
			game: {},
			groups: {},
			database: {},
			...(loadData || {}),
		}
		await database.write(global.db)
	} else {
		global.db = loadData
	}
	
	setInterval(async () => {
		if (global.db) await database.write(global.db)
	}, 30000)
})();

const { GroupUpdate, GroupParticipantsUpdate, MessagesUpsert, Solving } = require('./src/message');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./lib/function');

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : https://whatsapp.com/channel/0029VaWOkNm7DAWtkvkJBK43
*/

async function startNazeBot() {
	let lastMessageTime = Date.now();
	const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
	const { state, saveCreds } = await useMultiFileAuthState('nazedev');
	const { version, isLatest } = await fetchLatestBaileysVersion();
	const level = pino({ level: 'silent' })
	
	const getMessage = async (key) => {
		if (store) {
			const msg = await store.loadMessage(key.remoteJid, key.id);
			return msg?.message || ''
		}
		return {
			conversation: 'Halo Saya Naze Bot'
		}
	}
	
	const naze = WAConnection({
		logger: level,
		getMessage,
		syncFullHistory: true,
		maxMsgRetryCount: 15,
		msgRetryCounterCache,
		retryRequestDelayMs: 10,
		printQRInTerminal: !pairingCode,
		browser: Browsers.ubuntu('Chrome'),
		generateHighQualityLinkPreview: true,
		cachedGroupMetadata: async (jid) => groupCache.get(jid),
		transactionOpts: {
			maxCommitRetries: 10,
			delayBetweenTriesMs: 10,
		},
		appStateMacVerification: {
			patch: true,
			snapshot: true,
		},
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, level),
		},
	})
	
	if (pairingCode && !naze.authState.creds.registered) {
		let phoneNumber;
		async function getPhoneNumber() {
			phoneNumber = global.number_bot ? global.number_bot : await question('Please type your WhatsApp number : ');
			phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
			
			if (!parsePhoneNumber(phoneNumber).valid && phoneNumber.length < 6) {
				console.log(chalk.bgBlack(chalk.redBright('Start with your Country WhatsApp code') + chalk.whiteBright(',') + chalk.greenBright(' Example : 62xxx')));
				await getPhoneNumber()
			}
		}
		
		setTimeout(async () => {
			await getPhoneNumber()
			await exec('rm -rf ./nazedev/*')
			console.log('Requesting Pairing Code...')
			await new Promise(resolve => setTimeout(resolve, 2000));
			let code = await naze.requestPairingCode(phoneNumber);
			console.log(`Your Pairing Code : ${code}`);
		}, 3000)
	}
	
	store.bind(naze.ev)
	
	await Solving(naze, store)
	
	naze.ev.on('creds.update', saveCreds)
	
	naze.ev.on('connection.update', async (update) => {
		const { connection, lastDisconnect, receivedPendingNotifications } = update
		if (connection === 'close') {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode
			if (reason === DisconnectReason.connectionLost) {
				console.log('Connection to Server Lost, Attempting to Reconnect...');
				await startNazeBot()
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log('Connection closed, Attempting to Reconnect...');
				await startNazeBot()
			} else if (reason === DisconnectReason.restartRequired) {
				console.log('Restart Required...');
				await startNazeBot()
			} else if (reason === DisconnectReason.timedOut) {
				console.log('Connection Timed Out, Attempting to Reconnect...');
				await startNazeBot()
			} else if (reason === DisconnectReason.badSession) {
				console.log('Delete Session and Scan again...');
				await startNazeBot()
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log('Close current Session first...');
				await startNazeBot()
			} else if (reason === DisconnectReason.loggedOut) {
				console.log('Scan again and Run...');
				exec('rm -rf ./nazedev/*')
				process.exit(1)
			} else if (reason === DisconnectReason.Multidevicemismatch) {
				console.log('Scan again...');
				exec('rm -rf ./nazedev/*')
				process.exit(0)
			} else {
				naze.end(`Unknown DisconnectReason : ${reason}|${connection}`)
			}
		}
		if (connection == 'open') {
			console.log('Connected to : ' + JSON.stringify(naze.user, null, 2));
			let botNumber = await naze.decodeJid(naze.user.id);
			if (db.set[botNumber] && !db.set[botNumber]?.join) {
				if (my.ch.length > 0 && my.ch.includes('@newsletter')) {
					if (my.ch) await naze.newsletterMsg(my.ch, { type: 'follow' }).catch(e => {})
					db.set[botNumber].join = true
				}
			}
		}
		if (receivedPendingNotifications == 'true') {
			console.log('Please wait About 1 Minute...')
			naze.ev.flush()
		}
	});
	
	naze.ev.on('contacts.update', (update) => {
		for (let contact of update) {
			let id = naze.decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
		}
	});
	
	naze.ev.on('call', async (call) => {
		let botNumber = await naze.decodeJid(naze.user.id);
		if (db.set[botNumber].anticall) {
			for (let id of call) {
				if (id.status === 'offer') {
					let msg = await naze.sendMessage(id.from, { text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? 'Video' : 'Suara'}.\nJika @${id.from.split('@')[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, mentions: [id.from]});
					await naze.sendContact(id.from, global.owner, msg);
					await naze.rejectCall(id.id, id.from)
				}
			}
		}
	});
	
	naze.ev.on('messages.upsert', async (message) => {
		lastMessageTime = Date.now();
		await MessagesUpsert(naze, message, store, groupCache);
	});
	
	naze.ev.on('groups.update', async (update) => {
		await GroupUpdate(naze, update, store, groupCache);
	});
	
	naze.ev.on('group-participants.update', async (update) => {
		await GroupParticipantsUpdate(naze, update, store, groupCache);
	});
	
	setInterval(() => {
		if (Date.now() - lastMessageTime > 30 * 60 * 1000) {
			console.log('No messages received for 30 minutes, restarting bot...');
			process.exit(0);
		}
	}, 30 * 60 * 1000);

	return naze
}

startNazeBot()

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});