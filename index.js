require('./settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const FileType = require('file-type');
const { exec } = require('child_process');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const PhoneNumber = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, proto, PHONENUMBER_MCC, getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys');

let currentIndex = 0;
const colors = ['🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚪','⚫'];
const pairingCode = process.argv.includes('--pairing-code');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })
const inputNumberPairingCode = (text) => new Promise((resolve) => rl.question(text, resolve))

global.api = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')

const DataBase = require('./src/database');
const database = new DataBase();
(async () => {
	const loadData = await database.read()
	if (loadData && Object.keys(loadData).length === 0) {
		global.db = {
			users: {},
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

const { GroupUpdate, GroupParticipantsUpdate, MessageDelete, MessagesUpsert, Solving } = require('./src/message');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('./lib/function');

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : wa.me/6282113821188
*/

async function startNazeBot() {
	const { state, saveCreds } = await useMultiFileAuthState('nazedev');
	const msgRetryCounterCache = new NodeCache()
	const level = pino({ level: 'silent' })
	
	const getMessage = async (key) => {
		if (store) {
			const msg = await store.loadMessage(key.remoteJid, key.id);
			return msg?.message
		}
		return {
			conversation: 'Halo Saya Naze Bot'
		}
	}
	
	const naze = WAConnection({
		printQRInTerminal: !pairingCode,
		logger: level,
		browser: ['Chrome (Linux)', '', ''],
		generateHighQualityLinkPreview: true,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, level),
			},
		getMessage,
		msgRetryCounterCache,
		defaultQueryTimeoutMs: undefined,
	})
	
	if (pairingCode && !naze.authState.creds.registered) {
		let yourPhoneNumber;
		while (true) {
			yourPhoneNumber = await inputNumberPairingCode('Please type your WhatsApp number : ');
			if (!Object.keys(PHONENUMBER_MCC).some(v => yourPhoneNumber.startsWith(v)) && !yourPhoneNumber.length < 6) {
				console.log(chalk.bgBlack(chalk.redBright('Start with your Country WhatsApp code') + chalk.whiteBright(',') + chalk.greenBright(' Example : 62xxx')));
				continue;
			}
			break;
		}
		(async () => {
			await exec('rm -rf ./nazedev/*')
			let code = await naze.requestPairingCode(yourPhoneNumber);
			console.log(`Your Pairing Code : ${code}`);
		})();
	}
	
	function colorsStartLoading() {
		const currentColor = colors[currentIndex];
		process.stdout.write(`Loading ${currentColor}\r`);
		currentIndex = (currentIndex + 1) % colors.length;
	}
	
	const loadingInterval = setInterval(colorsStartLoading, 400);
	
	store.bind(naze.ev)
	
	await Solving(naze, store)
	
	naze.ev.on('creds.update', saveCreds)
	
	naze.ev.on('connection.update', async (update) => {
		const { connection, lastDisconnect, receivedPendingNotifications } = update
		if (connection === 'close') {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode
			if (reason === DisconnectReason.connectionLost) {
				console.log('Connection to Server Lost, Attempting to Reconnect...');
				await startNazeBot();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log('Connection closed, Attempting to Reconnect...');
				await startNazeBot();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log('Restart Required...');
				await startNazeBot();
			} else if (reason === DisconnectReason.timedOut) {
				console.log('Connection Timed Out, Attempting to Reconnect...');
				await startNazeBot();
			} else if (reason === DisconnectReason.badSession) {
				console.log('Delete Session and Scan again...');
				await process.exit(1)
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log('Close current Session first...');
				await naze.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log('Scan again and Run...');
				await exec('rm -rf ./nazedev/*')
				await process.exit(1)
			} else if (reason === DisconnectReason.Multidevicemismatch) {
				console.log('Scan again...');
				await exec('rm -rf ./nazedev/*')
				await process.exit(0)
			} else {
				await naze.end(`Unknown DisconnectReason : ${reason}|${connection}`)
			}
		}
		if (connection == 'open') {
			clearInterval(loadingInterval);
			console.log('Connected to : ' + JSON.stringify(naze.user, null, 2));
		} else if (receivedPendingNotifications == 'true') {
			console.log('Please wait About 1 Minute...')
		}
	})
	
	naze.ev.on('contacts.update', (update) => {
		for (let contact of update) {
			let id = naze.decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
		}
	})
	
	naze.ev.on('call', async (call) => {
		let botNumber = await naze.decodeJid(naze.user.id);
		if (global.settings.anticall) {
			for (let id of call) {
				if (id.status === 'offer') {
					let msg = await naze.sendMessage(id.from, { text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? 'Video' : 'Suara'}.\nJika @${id.from.split('@')[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, mentions: [id.from]});
					await naze.sendContact(id.from, global.owner, msg);
					await naze.rejectCall(id.id, id.from)
				}
			}
		}
	})
	
	naze.ev.on('groups.update', async (update) => {
		await GroupUpdate(naze, update);
	})
	
	naze.ev.on('group-participants.update', async (update) => {
		await GroupParticipantsUpdate(naze, update);
	})
	
	naze.ev.on('messages.upsert', async (message) => {
		await MessagesUpsert(naze, message, store);
	})

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