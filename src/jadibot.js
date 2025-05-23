require('../settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const { exec, spawn, execSync } = require('child_process');
const { parsePhoneNumber } = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, Browsers, DisconnectReason, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, proto, getAggregateVotesInPollMessage } = require('baileys');

const { GroupCacheUpdate, GroupParticipantsUpdate, MessagesUpsert, Solving } = require('./message');

global.client = {};


const msgRetryCounterCache = new NodeCache();
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

async function JadiBot(conn, from, m, store) {
	async function startJadiBot() {
		try {
			const { state, saveCreds } = await useMultiFileAuthState(`./database/jadibot/${from}`);
			const { version, isLatest } = await fetchLatestBaileysVersion();
			const level = pino({ level: 'silent' })
			
			const getMessage = async (key) => {
				if (store) {
					const msg = await store.loadMessage(key.remoteJid, key.id);
					return msg?.message || ''
				}
				return {
					conversation: 'Halo Saya Adalah Bot'
				}
			}
			
			client[from] = WAConnection({
				isLatest,
				logger: level,
				getMessage,
				syncFullHistory: false,
				maxMsgRetryCount: 15,
				msgRetryCounterCache,
				retryRequestDelayMs: 10,
				defaultQueryTimeoutMs: 0,
				cachedGroupMetadata: async (jid) => groupCache.get(jid),
				browser: Browsers.ubuntu('Chrome'),
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
			
			await Solving(client[from], store)
			
			client[from].pairingStarted = false;
			
			client[from].ev.on('creds.update', saveCreds)
			
			client[from].ev.on('connection.update', async (update) => {
				const { connection, lastDisconnect, receivedPendingNotifications } = update
				if (connection === 'connecting' && !client[from].authState.creds.registered && !client[from].pairingStarted) {
					setTimeout(async () => {
						client[from].pairingStarted = true;
						exec('rm -rf ./database/jadibot/' + from + '/*');
						let code = await client[from].requestPairingCode(from.replace(/[^0-9]/g, ''));
						m.reply(`Your Pairing Code : ${code?.match(/.{1,4}/g)?.join('-') || code}`);
					}, 3000);
				}
				if (connection === 'close') {
					const reason = new Boom(lastDisconnect?.error)?.output.statusCode
					console.log(reason)
					if ([DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired, DisconnectReason.timedOut, DisconnectReason.badSession, DisconnectReason.connectionReplaced].includes(reason)) {
						JadiBot(conn, from, m, store)
					} else if (reason === DisconnectReason.loggedOut) {
						m.reply('Scan again and Run...');
						StopJadiBot(conn, from, m)
					} else if (reason === DisconnectReason.Multidevicemismatch) {
						m.reply('Scan again...');
						StopJadiBot(conn, from, m)
					} else {
						m.reply('Anda Sudah Tidak Lagi Menjadi Bot!')
					}
				}
				if (connection == 'open') {
					let botNumber = await client[from].decodeJid(client[from].user.id);
					if (db.set[botNumber] && !db.set[botNumber]?.join) {
						db.set[botNumber].original = false
						if (my.ch.length > 0 && my.ch.includes('@newsletter')) {
							if (my.ch) await client[from].newsletterMsg(my.ch, { type: 'follow' }).catch(e => {})
							db.set[botNumber].join = true
						}
					}
				}
				if (receivedPendingNotifications == 'true') {
					client[from].ev.flush()
				}
			});
			
			client[from].ev.on('contacts.update', (update) => {
				for (let contact of update) {
					let id = client[from].decodeJid(contact.id)
					if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
				}
			});
			
			client[from].ev.on('call', async (call) => {
				let botNumber = await client[from].decodeJid(client[from].user.id);
				if (db.set[botNumber].anticall) {
					for (let id of call) {
						if (id.status === 'offer') {
							let msg = await client[from].sendMessage(id.from, { text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? 'Video' : 'Suara'}.\nJika @${id.from.split('@')[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, mentions: [id.from]});
							await client[from].sendContact(id.from, global.owner, msg);
							await client[from].rejectCall(id.id, id.from)
						}
					}
				}
			});
			
			client[from].ev.on('groups.update', (update) => {
				for (let n of update) {
					if (store.groupMetadata[n.id]) {
						groupCache.set(n.id, n);
						Object.assign(store.groupMetadata[n.id], n);
					}
				}
			});
			
			client[from].ev.on('group-participants.update', async (update) => {
				await GroupParticipantsUpdate(client[from], update, store, groupCache);
			});
			
			client[from].ev.on('messages.upsert', async (message) => {
				await MessagesUpsert(client[from], message, store, groupCache);
			});
		
			return client[from]
		} catch (e) {
			console.log('Error di jadibot : ', e)
		}
	}
	return startJadiBot()
}

async function StopJadiBot(conn, from, m) {
	if (!Object.keys(client).includes(from)) {
		return conn.sendMessage(m.chat, { text: 'Anda Tidak Sedang jadibot!' }, { quoted: m })
	}
	try {
		client[from].end('Stop')
		client[from].ev.removeAllListeners()
	} catch (e) {
		console.log('Errornya di stopjadibot : ', e)
	}
	delete client[from]
	exec(`rm -rf ./database/jadibot/${from}`)
	return m.reply('Sukses Keluar Dari Sessi Jadi bot')
}

async function ListJadiBot(conn, m) {
	let teks = 'List Jadi Bot :\n\n'
	for (let jadibot of Object.values(client)) {
		teks += (jadibot.user?.id ? `- @${conn.decodeJid(jadibot.user.id).split('@')[0]}\n` : '')
	}
	return m.reply(teks)
}

module.exports = { JadiBot, StopJadiBot, ListJadiBot }