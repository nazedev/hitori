import "../settings.js";

import fs from "fs";
import pino from "pino";
import chalk from "chalk";
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import baileys, { useMultiFileAuthState, Browsers, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } from "baileys";

import { GroupParticipantsUpdate, MessagesUpsert, Solving } from "./message.js";

global.client = {};
const msgRetryCounterCache = new NodeCache();
const WAConnection = baileys.default || baileys.makeWASocket || baileys;

async function CloneBot(sock, from, m, store) {
	async function startCloneBot() {
		try {
			const { version } = await fetchLatestWaWebVersion();
			const { state, saveCreds } = await useMultiFileAuthState(`./database/CloneBot/${from}`);
			const level = pino({ level: "silent" });

			const getMessage = async (key) => {
				if (store) {
					const msg = await store.loadMessage(key.remoteJid, key.id);
					return msg?.message || "";
				}
				return {
					conversation: "Halo Saya Adalah Bot",
				};
			};

			client[from] = WAConnection({
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
				browser: Browsers.ubuntu("Chrome"),
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
			});

			await Solving(client[from], store);

			client[from].pairingStarted = false;

			client[from].ev.on("creds.update", saveCreds);

			client[from].ev.on("connection.update", async (update) => {
				const { connection, lastDisconnect, receivedPendingNotifications } = update;
				if (connection === "connecting" && !client[from].authState.creds.registered && !client[from].pairingStarted) {
					setTimeout(async () => {
						if (!client[from]) return;
						client[from].pairingStarted = true;
						fs.rmSync("./database/CloneBot/" + from, { recursive: true, force: true });
						const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
						let code = await client[from].requestPairingCode(from.replace(/[^0-9]/g, ""), "NAZE" + randomPart);
						if (!client[from]) return;
						m.reply(`Your Pairing Code : ${code?.match(/.{1,4}/g)?.join("-") || code}`);
					}, 3000);
				}
				if (connection === "close") {
					if (!client[from]) return;
					const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
					console.log(reason);
					if ([DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired, DisconnectReason.timedOut, DisconnectReason.badSession, DisconnectReason.connectionReplaced].includes(reason)) {
						CloneBot(sock, from, m, store);
					} else if (reason === DisconnectReason.loggedOut) {
						m.reply("Scan again and Run...");
						StopCloneBot(sock, from, m);
					} else if (reason === DisconnectReason.forbidden) {
						m.reply("Connection Failure, Scan again and Run...");
						StopCloneBot(sock, from, m);
					} else if (reason === DisconnectReason.multideviceMismatch) {
						m.reply("Scan again...");
						StopCloneBot(sock, from, m);
					} else {
						m.reply("Anda Sudah Tidak Lagi Menjadi Bot!");
					}
				}
				if (connection == "open") {
					let botNumber = await client[from].decodeJid(client[from].user.id);
					if (global.db?.set[botNumber] && !global.db?.set[botNumber]?.join) {
						global.db.set[botNumber].original = false;
						if (global.my?.ch?.length > 0 && global.my.ch.includes("@newsletter")) {
							if (global.my.ch) await client[from].newsletterMsg(global.my.ch, { type: "follow" }).catch((e) => {});
							global.db.set[botNumber].join = true;
						}
					}
				}
				if (receivedPendingNotifications == "true") {
					client[from].ev.flush();
				}
			});

			client[from].ev.on("call", async (call) => {
				let botNumber = await client[from].decodeJid(client[from].user.id);
				if (global.db?.set[botNumber]?.anticall) {
					for (let id of call) {
						if (id.status === "offer") {
							let msg = await client[from].sendMessage(id.from, { text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? "Video" : "Suara"}.\nJika @${id.from.split("@")[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, mentions: [id.from] });
							await client[from].sendContact(id.from, global.owner, msg);
							await client[from].rejectCall(id.id, id.from);
						}
					}
				}
			});

			client[from].ev.on("groups.update", (update) => {
				for (let n of update) {
					if (store.groupMetadata[n.id]) {
						Object.assign(store.groupMetadata[n.id], n);
					} else store.groupMetadata[n.id] = n;
				}
			});

			client[from].ev.on("presence.update", (update) => {
				const { id, presences } = update;
				if (store) {
					store.presences[id] = store.presences?.[id] || {};
					for (const jid in presences) {
						presences[jid].timestamp = Date.now();
					}
					Object.assign(store.presences[id], presences);
				}
			});

			client[from].ev.on("group-participants.update", async (update) => {
				await GroupParticipantsUpdate(client[from], update, store);
			});

			client[from].ev.on("messages.upsert", async (message) => {
				await MessagesUpsert(client[from], message, store);
			});

			return client[from];
		} catch (e) {
			console.log(chalk.redBright(`[ERROR] ${e}`));
		}
	}
	return startCloneBot();
}

async function StopCloneBot(sock, from, m) {
	if (!Object.keys(client).includes(from)) {
		return sock.sendMessage(m.chat, { text: "Anda Tidak Sedang clonebot!" }, { quoted: m });
	}
	try {
		client[from].ev.removeAllListeners();
		if (client[from].ws) client[from].ws.close();
		client[from].end("Stop");
	} catch (e) {
		console.log(chalk.redBright(`[ERROR] ${e}`));
	}
	delete client[from];
	fs.rmSync(`./database/CloneBot/${from}`, { recursive: true, force: true });
	return m.reply("Sukses Keluar Dari Sessi Jadi bot");
}

async function ListCloneBot(sock, m) {
	let teks = "List Clone Bot :\n\n";
	for (let CloneBot of Object.values(client)) {
		teks += CloneBot.user?.id ? `- @${sock.decodeJid(CloneBot.user.id).split("@")[0]}\n` : "";
	}
	return m.reply(teks);
}

export { CloneBot, StopCloneBot, ListCloneBot };
