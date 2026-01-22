require('./settings');
const fs = require('fs');
const os = require('os');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const NodeCache = require('node-cache');
const { toBuffer, toDataURL } = require('qrcode');
const { exec, spawn, execSync } = require('child_process');
const { parsePhoneNumber } = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, proto, jidNormalizedUser, getAggregateVotesInPollMessage } = require('baileys');

const { dataBase } = require('./src/database');
const { app, server, PORT } = require('./src/server');
const { GroupParticipantsUpdate, MessagesUpsert, Solving } = require('./src/message');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, assertInstalled, sleep } = require('./lib/function');

const print = (label, value) => console.log(`${chalk.green.bold('║')} ${chalk.cyan.bold(label.padEnd(16))}${chalk.yellow.bold(':')} ${value}`);
const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || global.pairing_code;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

// Check FFmpeg
const checkFFmpeg = () => {
    try {
        const command = process.platform === 'win32' ? 'where ffmpeg' : 'command -v ffmpeg';
        execSync(command, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
};

// Check ImageMagick
const checkImageMagick = () => {
    try {
        const command = process.platform === 'win32' ? 'where magick' : 'command -v convert';
        execSync(command, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
};

// Perform checks
console.log(chalk.cyan('🔍 Checking dependencies...'));

if (checkFFmpeg()) {
    console.log(chalk.green('✅ FFmpeg installed'));
} else {
    console.log(chalk.yellow('⚠️  FFmpeg not found (optional)'));
    console.log(chalk.gray('   Install: https://ffmpeg.org/download.html'));
}

if (checkImageMagick()) {
    console.log(chalk.green('✅ ImageMagick installed'));
} else {
    console.log(chalk.yellow('⚠️  ImageMagick not found (optional)'));
    console.log(chalk.gray('   Install: https://imagemagick.org/script/download.php'));
}

console.log('');

let pairingCodeSent = false;
let phoneNumber;

const userInfoSyt = () => {
	try {
		return os.userInfo().username
	} catch (e) {
		return process.env.USER || process.env.USERNAME || 'unknown';
	}
}

global.fetchApi = async (path = '/', query = {}, options) => {
	const urlnya = (options?.name || options ? ((options?.name || options) in global.APIs ? global.APIs[(options?.name || options)] : (options?.name || options)) : global.APIs['hitori'] ? global.APIs['hitori'] : (options?.name || options)) + path + (query ? '?' + decodeURIComponent(new URLSearchParams(Object.entries({ ...query }))) : '')
	const { data } = await axios.get(urlnya, { ...((options?.name || options) ? {} : { headers: { 'accept': 'application/json', 'x-api-key': global.APIKeys[global.APIs['hitori']]}})})
	return data
}

const storeDB = dataBase(global.tempatStore);
const database = dataBase(global.tempatDB);
const msgRetryCounterCache = new NodeCache();

assertInstalled(process.platform === 'win32' ? 'where ffmpeg' : 'command -v ffmpeg', 'FFmpeg', 0);
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

async function startNazeBot() {
	const { state, saveCreds } = await useMultiFileAuthState('nazedev');
	const { version, isLatest } = await fetchLatestBaileysVersion();
	const level = pino({ level: 'silent' });
	
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
		
		setInterval(async () => {
			if (global.db) await database.write(global.db)
			if (global.store) await storeDB.write(global.store)
		}, 30 * 1000)
	} catch (e) {
		console.log(e)
		process.exit(1)
	}
	
	store.loadMessage = function (remoteJid, id) {
		const messages = store.messages?.[remoteJid]?.array;
		if (!messages) return null;
		return messages.find(msg => msg?.key?.id === id) || null;
	}
	
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
		syncFullHistory: false, // ✅ Fixed: Don't sync full history
		maxMsgRetryCount: 15,
		msgRetryCounterCache,
		retryRequestDelayMs: 10,
		defaultQueryTimeoutMs: 0,
		connectTimeoutMs: 60000,
		keepAliveIntervalMs: 30000, // ✅ Added: Keep connection alive
		browser: Browsers.ubuntu('Chrome'),
		markOnlineOnConnect: true, // ✅ Added: Mark as online immediately
		fireInitQueries: false, // ✅ Added: Don't fire initial queries
		generateHighQualityLinkPreview: false, // ✅ Fixed: Faster connection
		emitOwnEvents: false, // ✅ Added: Don't emit own events
		shouldSyncHistoryMessage: msg => {
			console.log(`\x1b[32mMemuat Chat [${msg.progress || 0}%]\x1b[39m`);
			return false; // ✅ Fixed: Don't sync history
		},
		transactionOpts: {
			maxCommitRetries: 10,
			delayBetweenTriesMs: 10,
		},
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, level),
		},
	})
	
	// ✅ FIXED PAIRING CODE LOGIC
	if (pairingCode && !naze.authState.creds.registered) {
		if (!phoneNumber) {
			phoneNumber = global.number_bot || process.env.BOT_NUMBER;
			
			if (!phoneNumber) {
				phoneNumber = await question(chalk.cyan('Please type your WhatsApp number : '));
			}
			
			phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
			
			if (!parsePhoneNumber('+' + phoneNumber).valid || phoneNumber.length < 6) {
				console.log(chalk.red('❌ Invalid phone number!'));
				console.log(chalk.yellow('Start with your country code, Example: 62xxx'));
				phoneNumber = null;
				await exec('rm -rf ./nazedev/*');
				process.exit(1);
			}
			
			console.log(chalk.blue('Phone number captured. Waiting for connection...'));
			console.log(chalk.blueBright('Estimated time: 2-5 minutes\n'));
		}
	}
	
	await Solving(naze, store)
	
	naze.ev.on('creds.update', saveCreds)
	
	naze.ev.on('connection.update', async (update) => {
		const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
		
		// ✅ FIXED: Better pairing code request
		if (connection === 'connecting' && pairingCode && phoneNumber && !naze.authState.creds.registered && !pairingCodeSent) {
			console.log(chalk.cyan('🔄 Socket connecting...'));
			
			setTimeout(async () => {
				try {
					pairingCodeSent = true;
					console.log(chalk.yellow('📲 Requesting pairing code...'));
					
					let code = await naze.requestPairingCode(phoneNumber);
					
					console.log('\n' + chalk.green('═'.repeat(40)));
					console.log(chalk.green.bold('  📱 PAIRING CODE: ') + chalk.yellow.bold(code));
					console.log(chalk.green('═'.repeat(40)) + '\n');
					
					console.log(chalk.cyan('📖 Instructions:'));
					console.log(chalk.white('  1. Open WhatsApp on your phone'));
					console.log(chalk.white('  2. Go to Settings → Linked Devices'));
					console.log(chalk.white('  3. Tap "Link a Device"'));
					console.log(chalk.white('  4. Tap "Link with phone number instead"'));
					console.log(chalk.white('  5. Enter: ') + chalk.yellow.bold(code));
					console.log(chalk.cyan('\n⏱️  Code expires in 60 seconds!\n'));
					
				} catch (err) {
					pairingCodeSent = false;
					console.error(chalk.red('❌ Pairing code request failed:'), err.message);
					
					if (err.message.includes('timed out') || err.message.includes('closed')) {
						console.log(chalk.yellow('\n💡 Connection closed too quickly.'));
						console.log(chalk.yellow('   This usually happens due to:'));
						console.log(chalk.yellow('   1. Unstable internet connection'));
						console.log(chalk.yellow('   2. Firewall blocking WhatsApp servers'));
						console.log(chalk.yellow('   3. Old Baileys version\n'));
					}
				}
			}, 5000); // ✅ Wait 5 seconds for socket to be ready
		}
		
		if (connection === 'close') {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
			console.log(chalk.yellow(`\n⚠️  Connection closed. Reason: ${reason || 'Unknown'}`));
			
			if (reason === DisconnectReason.loggedOut) {
				console.log(chalk.red('❌ Logged out. Delete "nazedev" and restart.'));
				exec('rm -rf ./nazedev/*');
				process.exit(1);
			} else if (reason === DisconnectReason.connectionLost) {
				console.log(chalk.yellow('Connection lost. Reconnecting...'));
				pairingCodeSent = false;
				startNazeBot();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log(chalk.yellow('Connection closed. Reconnecting...'));
				pairingCodeSent = false;
				startNazeBot();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log(chalk.yellow('Restart required...'));
				pairingCodeSent = false;
				startNazeBot();
			} else if (reason === DisconnectReason.timedOut) {
				console.log(chalk.yellow('Connection timed out. Reconnecting...'));
				pairingCodeSent = false;
				startNazeBot();
			} else if (reason === DisconnectReason.badSession) {
				console.log(chalk.red('Bad session. Delete and scan again...'));
				exec('rm -rf ./nazedev/*');
				startNazeBot();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log(chalk.red('Close current session first...'));
			} else if (reason === DisconnectReason.forbidden) {
				console.log(chalk.red('Connection forbidden. Scan again...'));
				exec('rm -rf ./nazedev/*');
				process.exit(1);
			} else if (reason === DisconnectReason.multideviceMismatch) {
				console.log(chalk.red('Multidevice mismatch. Scan again...'));
				exec('rm -rf ./nazedev/*');
				process.exit(0);
			} else {
				console.log(chalk.red(`Unknown disconnect: ${reason}|${connection}`));
				pairingCodeSent = false;
				startNazeBot();
			}
		}
		
		if (connection === 'open') {
			pairingCodeSent = false;
			console.log('\n' + chalk.green('═'.repeat(40)));
			console.log(chalk.green.bold('  ✅ CONNECTED SUCCESSFULLY!'));
			console.log(chalk.green('═'.repeat(40)));
			console.log(chalk.white('  📱 Number: ') + chalk.cyan(naze.user.id.split(':')[0]));
			console.log(chalk.white('  👤 Name: ') + chalk.cyan(naze.user.name || 'Unknown'));
			console.log(chalk.green('═'.repeat(40)) + '\n');
			
			let botNumber = await naze.decodeJid(naze.user.id);
			if (global.db?.set[botNumber] && !global.db?.set[botNumber]?.join) {
				if (my.ch.length > 0 && my.ch.includes('@newsletter')) {
					if (my.ch) await naze.newsletterMsg(my.ch, { type: 'follow' }).catch(e => {})
					db.set[botNumber].join = true
				}
			}
		}
		
		if (qr) {
			if (!pairingCode) qrcode.generate(qr, { small: true });
			app.use('/qr', async (req, res) => {
				res.setHeader('content-type', 'image/png');
				res.end(await toBuffer(qr));
			});
		}
		
		if (isNewLogin) console.log(chalk.green('✨ New device login detected...'));
		
		if (receivedPendingNotifications === 'true') {
			console.log(chalk.yellow('⏳ Please wait about 1 minute...'));
			naze.ev.flush();
		}
	});
	
	naze.ev.on('contacts.update', (update) => {
		for (let contact of update) {
			let trueJid;
			if (!trueJid) continue;
			if (contact.id.endsWith('@lid')) {
				trueJid = naze.findJidByLid(contact.id, store);
			} else {
				trueJid = jidNormalizedUser(contact.id);
			}
			store.contacts[trueJid] = {
				...store.contacts[trueJid],
				id: trueJid,
				name: contact.notify
			}
			if (contact.id.endsWith('@lid')) {
				store.contacts[trueJid].lid = jidNormalizedUser(contact.id);
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
		await MessagesUpsert(naze, message, store);
	});
	
	naze.ev.on('group-participants.update', async (update) => {
		await GroupParticipantsUpdate(naze, update, store);
	});
	
	naze.ev.on('groups.update', (update) => {
		for (const n of update) {
			if (store.groupMetadata[n.id]) {
				Object.assign(store.groupMetadata[n.id], n);
			} else store.groupMetadata[n.id] = n;
		}
	});
	
	naze.ev.on('presence.update', ({ id, presences: update }) => {
		store.presences[id] = store.presences?.[id] || {};
		Object.assign(store.presences[id], update);
	});
	
	setInterval(async () => {
		if (naze?.user?.id) await naze.sendPresenceUpdate('available', naze.decodeJid(naze.user.id)).catch(e => {})
	}, 10 * 60 * 1000);

	return naze;
}

startNazeBot();

const cleanup = async (signal) => {
	console.log(`Received ${signal}. Saving database...`)
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
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});