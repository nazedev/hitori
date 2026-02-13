require('./settings');
const os = require('os');
const pino = require('pino');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const { toBuffer } = require('qrcode');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');
const { parsePhoneNumber } = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, Browsers, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestWaWebVersion, jidNormalizedUser } = require('baileys');

const { dataBase } = require('./src/database');
const { app, server, PORT } = require('./src/server');
const { assertInstalled, unsafeAgent } = require('./lib/function');
const { GroupParticipantsUpdate, MessagesUpsert, Solving } = require('./src/message');

const print = (label, value) => console.log(`${chalk.green.bold('║')} ${chalk.cyan.bold(label.padEnd(16))}${chalk.yellow.bold(':')} ${value}`);
const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || global.pairing_code;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
let pairingStarted = false;
let phoneNumber;

const userInfoSyt = () => {
	try {
		return os.userInfo().username
	} catch (e) {
		return process.env.USER || process.env.USERNAME || 'unknown';
	}
}

global.fetchApi = async (path='/', data={}, options={}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const base = options.name ? (options.name in global.APIs ? global.APIs[options.name] : options.name) : global.APIs.naze
      const apikey = global.APIKeys[base]
      let method = (options.method || 'GET').toUpperCase()
      let url = base + path
      let payload = null
      let headers = options.headers || { 'user-agent': 'Mozilla/5.0 (Linux; Android 15)' }
      const isForm = options.form || data instanceof FormData || (data && typeof data.getHeaders === 'function')
      if (isForm) {
        payload = data
        method = 'POST'
        headers = { apikey, ...headers, ...data.getHeaders() }
      } else if (method !== 'GET') {
        payload = { ...data, apikey }
        headers['content-type'] = 'application/json'
      } else {
        url += '?' + new URLSearchParams({ ...data, apikey }).toString()
      }

      const res = await axios({
        method, url, data: payload,
        headers, httpsAgent: unsafeAgent,
        responseType: options.buffer ? 'arraybuffer'  : options.responseType || options.type || 'json'
      });
      resolve(options.buffer ? Buffer.from(res.data) : res.data);
    } catch (e) {
      reject(e)
    }
  })
}

const storeDB = dataBase(global.tempatStore);
const database = dataBase(global.tempatDB);
const msgRetryCounterCache = new NodeCache();

assertInstalled(process.platform === 'win32' ? 'where ffmpeg' : 'command -v ffmpeg', 'FFmpeg', 0);
//assertInstalled(process.platform === 'win32' ? 'where magick' : 'command -v convert', 'ImageMagick', 0);
console.log(chalk.greenBright('✅  All external dependencies are satisfied'));
console.log(chalk.green.bold(`╔═════[${`${chalk.cyan(userInfoSyt())}@${chalk.cyan(os.hostname())}`}]═════`));
print('OS', `${os.platform()} ${os.release()} ${os.arch()}`);
print('Uptime', `${Math.floor(os.uptime() / 3600)} h ${Math.floor((os.uptime() % 3600) / 60)} m`);
print('Shell', process.env.SHELL || process.env.COMSPEC || 'unknown');
print('CPU', os.cpus()[0]?.model.trim() || 'unknown');
print('Memory', `${(os.freemem()/1024/1024).toFixed(0)} MiB / ${(os.totalmem()/1024/1024).toFixed(0)} MiB`);
print('Script version', `v${require('./package.json').version}`);
print('Node.js', process.version);
print('Baileys', `v${require('./package.json').dependencies.baileys}`);
print('Date & Time', new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false }));
console.log(chalk.green.bold('╚' + ('═'.repeat(30))));
server.listen(PORT, () => {
	console.log('App listened on port', PORT);
});

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : https://whatsapp.com/channel/0029VaWOkNm7DAWtkvkJBK43
*/

async function startNazeBot() {
	try {
		const loadData = await database.read()
		const storeLoadData = await storeDB.read()
		if (!loadData || Object.keys(loadData).length === 0) {
			global.db = {
				hit: {},
				set: {},
				cmd: {},
				store: {},
				users: {},
				game: {},
				groups: {},
				database: {},
				premium: [],
				sewa: [],
				...(loadData || {}),
			}
			await database.write(global.db)
		} else {
			global.db = loadData
		}
		if (!storeLoadData || Object.keys(storeLoadData).length === 0) {
			global.store = {
				contacts: {},
				presences: {},
				messages: {},
				groupMetadata: {},
				...(storeLoadData || {}),
			}
			await storeDB.write(global.store)
		} else {
			global.store = storeLoadData
		}
		
		global.loadMessage = function (remoteJid, id) {
			const messages = store.messages?.[remoteJid]?.array;
			if (!messages) return null;
			return messages.find(msg => msg?.key?.id === id) || null;
		}
		
		if (!global._dbInterval) {
			global._dbInterval = setInterval(async () => {
				if (global.db) await database.write(global.db)
				if (global.store) await storeDB.write(global.store)
			}, 30 * 1000)
		}
	} catch (e) {
		console.log(e)
		process.exit(1)
	}
	
	const level = pino({ level: 'silent' });
	const { version } = await fetchLatestWaWebVersion();
	const { state, saveCreds } = await useMultiFileAuthState('nazedev');
	const getMessage = async (key) => {
		if (global.store) {
			const msg = await global.loadMessage(key.remoteJid, key.id);
			return msg?.message || ''
		}
		return {
			conversation: 'Halo Saya Naze Bot'
		}
	}
	
	const naze = WAConnection({
		version,
		logger: level,
		getMessage,
		syncFullHistory: false,
		maxMsgRetryCount: 15,
		msgRetryCounterCache,
		retryRequestDelayMs: 10,
		defaultQueryTimeoutMs: 0,
		connectTimeoutMs: 60000,
		keepAliveIntervalMs: 30000,
		browser: Browsers.ubuntu('Chrome'),
		generateHighQualityLinkPreview: false,
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
	
	if (pairingCode && !phoneNumber && !naze.authState.creds.registered) {
		async function getPhoneNumber() {
			phoneNumber = global.number_bot ? global.number_bot : process.env.BOT_NUMBER || await question('Please type your WhatsApp number : ');
			phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
			
			if (!parsePhoneNumber('+' + phoneNumber).valid && phoneNumber.length < 6) {
				console.log(chalk.bgBlack(chalk.redBright('Start with your Country WhatsApp code') + chalk.whiteBright(',') + chalk.greenBright(' Example : 62xxx')));
				await getPhoneNumber()
			}
		}
		(async () => {
			await getPhoneNumber();
			exec('rm -rf ./nazedev/*');
			console.log('Phone number captured. Waiting for Connection...\n' + chalk.blueBright('Estimated time: around 2 ~ 5 minutes'))
		})()
	}
	
	await Solving(naze, global.store)
	
	naze.ev.on('creds.update', saveCreds)
	
	naze.ev.on('connection.update', async (update) => {
		const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
		if ((connection === 'connecting' || !!qr) && pairingCode && phoneNumber && !naze.authState.creds.registered && !pairingStarted) {
			setTimeout(async () => {
				pairingStarted = true;
				console.log('Requesting Pairing Code...')
				let code = await naze.requestPairingCode(phoneNumber);
				console.log(chalk.blue('Your Pairing Code :'), chalk.green(code), '\n', chalk.yellow('Expires in 15 second'));
			}, 3000)
		}
		if (connection === 'close') {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode
			if (reason === DisconnectReason.connectionLost) {
				console.log('Connection to Server Lost, Attempting to Reconnect...');
				startNazeBot()
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log('Connection closed, Attempting to Reconnect...');
				startNazeBot()
			} else if (reason === DisconnectReason.restartRequired) {
				console.log('Restart Required...');
				startNazeBot()
			} else if (reason === DisconnectReason.timedOut) {
				console.log('Connection Timed Out, Attempting to Reconnect...');
				startNazeBot()
			} else if (reason === DisconnectReason.badSession) {
				console.log('Delete Session and Scan again...');
				startNazeBot()
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log('Close current Session first...');
			} else if (reason === DisconnectReason.loggedOut) {
				console.log('Scan again and Run...');
				exec('rm -rf ./nazedev/*')
				process.exit(1)
			} else if (reason === DisconnectReason.forbidden) {
				console.log('Connection Failure, Scan again and Run...');
				exec('rm -rf ./nazedev/*')
				process.exit(1)
			} else if (reason === DisconnectReason.multideviceMismatch) {
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
			if (global.db?.set[botNumber] && !global.db?.set[botNumber]?.join) {
				if (my.ch.length > 0 && my.ch.includes('@newsletter')) {
					if (my.ch) await naze.newsletterMsg(my.ch, { type: 'follow' }).catch(e => {})
					db.set[botNumber].join = true
				}
			}
		}
		if (qr) {
			if (!pairingCode) qrcode.generate(qr, { small: true })
			app.use('/qr', async (req, res) => {
				res.setHeader('content-type', 'image/png')
				res.end(await toBuffer(qr))
			});
		}
		if (isNewLogin) console.log(chalk.green('New device login detected...'))
		if (receivedPendingNotifications == 'true') {
			console.log('Please wait About 1 Minute...')
			naze.ev.flush()
		}
	});
	
	naze.ev.on('contacts.update', (update) => {
		for (let contact of update) {
			let trueJid;
			if (!trueJid) continue;
			if (contact.id.endsWith('@lid')) {
				trueJid = naze.findJidByLid(jidNormalizedUser(contact.id), store);
			} else {
				trueJid = jidNormalizedUser(contact.id);
			}
			global.store.contacts[trueJid] = {
				...global.store.contacts[trueJid],
				id: trueJid,
				name: contact.notify
			}
			if (contact.id.endsWith('@lid')) {
				global.store.contacts[trueJid].lid = jidNormalizedUser(contact.id);
			}
		}
	});
	
	naze.ev.on('call', async (call) => {
		let botNumber = await naze.decodeJid(naze.user.id);
		if (global.db?.set[botNumber]?.anticall) {
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
		await MessagesUpsert(naze, message, global.store);
	});
	
	naze.ev.on('group-participants.update', async (update) => {
		await GroupParticipantsUpdate(naze, update, global.store);
	});
	
	naze.ev.on('groups.update', (update) => {
		for (const n of update) {
			if (global.store.groupMetadata[n.id]) {
				Object.assign(global.store.groupMetadata[n.id], n);
			} else global.store.groupMetadata[n.id] = n;
		}
	});
	
	naze.ev.on('presence.update', ({ id, presences: update }) => {
		store.presences[id] = global.store.presences?.[id] || {};
		Object.assign(global.store.presences[id], update);
	});
	
	if (!global._dbPresence) {
		global._dbPresence = setInterval(async () => {
			if (naze?.user?.id) await naze.sendPresenceUpdate('available', naze.decodeJid(naze.user.id)).catch(e => {})
		}, 10 * 60 * 1000);
	}

	return naze
}

startNazeBot()

// Process Exit
const cleanup = async (signal) => {
	console.log(`Received ${signal}. Menyimpan database...`)
	if (global.db) await database.write(global.db)
	if (global.store) await storeDB.write(global.store)
	server.close(() => {
		console.log('Server closed. Exiting...')
		process.exit(0)
	})
}

process.on('SIGINT', () => cleanup('SIGINT'))
process.on('SIGTERM', () => cleanup('SIGTERM'))
process.on('exit', () => cleanup('exit'))

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') {
		console.log(`Address localhost:${PORT} in use. Please retry when the port is available!`);
		server.close();
	} else console.error('Server error:', error);
});

setInterval(() => {}, 1000 * 60 * 10);