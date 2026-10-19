import "../settings.js";

import fs from "fs";
import pino from "pino";
import chalk from "chalk";
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import baileys, { Browsers, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } from "baileys";

import { useCustomAuthState } from "./auth.js";
import { GroupParticipantsUpdate, MessagesUpsert, Solving, updateLidMapping } from "./message.js";

global.client = {};
const msgRetryCounterCache = new NodeCache();
const WAConnection = baileys.default || baileys.makeWASocket || baileys;

async function CloneBot(sock, from, m, store) {
	async function startCloneBot() {
		try {
			const { version } = await fetchLatestWaWebVersion();
			const mainPath = global.database?.path || global.database?.url || "nazedev";
			const isRemoteSession = /^(mongodb(\+srv)?|mysql|postgres(ql)?)(\+srv)?:\/\//i.test(mainPath);
			const cloneSessionPath = isRemoteSession ? mainPath : `./database/clonebot/${from}`;

			const { state, saveCreds } = await useCustomAuthState(cloneSessionPath);
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
				cachedGroupMetadata: async (jid) => {
					if (!jid || typeof jid !== "string") return undefined;
					const id = jid.includes(":") ? jid.replace(/:.*@/, "@") : jid;
					const isValid = (m) => Boolean(m && Array.isArray(m.participants) && m.participants.length > 0);
					const localMatch = store?.groupMetadata?.[id] || store?.groupMetadata?.[jid];
					if (isValid(localMatch)) return localMatch;
					const globalMatch = global.store?.groupMetadata?.[id] || global.store?.groupMetadata?.[jid];
					if (isValid(globalMatch)) return globalMatch;
					return undefined;
				},
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

			await Solving(client[from], store, cloneSessionPath);

			global.nodeMap = global.nodeMap || new Map();
			const NODE_MAP_TTL = 60 * 1000;
			if (!global._nodeMapInterval) {
				global._nodeMapInterval = setInterval(() => {
					const now = Date.now();
					for (const [id, node] of global.nodeMap) {
						if (now - (node?._ts || 0) > NODE_MAP_TTL) {
							global.nodeMap.delete(id);
						}
					}
				}, 30 * 1000).unref();
			}

			if (client[from].ws) {
				client[from].ws.on("CB:message", (node) => {
					if (node?.attrs?.id) {
						global.nodeMap.set(node.attrs.id, {
							...node,
							content: Array.isArray(node.content) ? node.content.filter((v) => v?.tag !== "enc") : node.content,
							_ts: Date.now(),
						});
						if (global.nodeMap.size > 2000) {
							const oldestKey = global.nodeMap.keys().next().value;
							if (oldestKey) global.nodeMap.delete(oldestKey);
						}
					}
				});
				client[from].ws.on("CB:status", async (node) => {
					try {
						if (typeof client[from].sendMessageAck === "function") {
							await client[from].sendMessageAck(node).catch(() => {});
						} else if (node?.attrs?.id) {
							await client[from]
								.sendNode?.({
									tag: "ack",
									attrs: {
										id: node.attrs.id,
										to: node.attrs.from || "status@broadcast",
										class: "status",
										type: node.attrs.type || "media",
										...(node.attrs.participant ? { participant: node.attrs.participant } : {}),
									},
								})
								.catch(() => {});
						}
					} catch {}
				});
			}

			client[from].pairingStarted = false;

			client[from].ev.on("creds.update", saveCreds);

			client[from].ev.on("connection.update", async (update) => {
				const { connection, lastDisconnect, receivedPendingNotifications } = update;
				if (connection === "connecting" && !client[from]?.authState?.creds?.registered && !client[from]?.pairingStarted) {
					client[from].pairingStarted = true;
					setTimeout(async () => {
						if (!client[from]) return;
						try {
							fs.rmSync("./database/clonebot/" + from, { recursive: true, force: true });
						} catch (e) {
							console.log(chalk.yellow(`[CLONEBOT] Notice: Could not remove old creds for ${from}: ${e.message}`));
						}
						try {
							const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
							let code = await client[from].requestPairingCode(from.replace(/[^0-9]/g, ""), "NAZE" + randomPart);
							if (!client[from]) return;
							m.reply(`Your Pairing Code : ${code?.match(/.{1,4}/g)?.join("-") || code}`);
						} catch (e) {
							console.log(chalk.redBright(`[CLONEBOT] Error requesting pairing code for ${from}: ${e.message}`));
							m.reply("Gagal meminta kode pairing clone bot!");
						}
					}, 3000);
				}
				if (connection === "close") {
					if (!client[from]) return;
					const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
					console.log(reason);
					if (reason === DisconnectReason.loggedOut) {
						m.reply("Scan again and Run...");
						StopCloneBot(sock, from, m);
					} else if (reason === DisconnectReason.forbidden) {
						m.reply("Connection Failure, Scan again and Run...");
						StopCloneBot(sock, from, m);
					} else if (reason === DisconnectReason.multideviceMismatch) {
						m.reply("Scan again...");
						StopCloneBot(sock, from, m);
					} else {
						try {
							client[from]?.ev?.removeAllListeners?.();
						} catch {}
						try {
							client[from]?.ws?.removeAllListeners?.();
						} catch {}
						try {
							client[from]?.end?.();
						} catch {}
						setTimeout(() => {
							CloneBot(sock, from, m, store);
						}, 3000);
					}
				}
				if (connection == "open") {
					let botNumber = await client[from].decodeJid(client[from].user.id);
					if (client[from]?.user?.lid && client[from]?.user?.id) {
						updateLidMapping({ lid: client[from].user.lid, pn: client[from].user.id });
					}
					if (global.db?.set?.[botNumber] && !global.db?.set?.[botNumber]?.join) {
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
				if (global.db?.set?.[botNumber]?.anticall) {
					for (let id of call) {
						if (id.status === "offer") {
							let msg = await client[from].sendMessage(id.from, { text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? "Video" : "Suara"}.\nJika @${id.from.split("@")[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, mentions: [id.from] });
							await client[from].sendContact(id.from, global.owner, msg);
							await client[from].rejectCall(id.id, id.from);
						}
					}
				}
			});

			client[from].ev.on("groups.upsert", (groups) => {
				for (let n of groups) {
					if (store?.groupMetadata) {
						if (store.groupMetadata[n.id]) {
							Object.assign(store.groupMetadata[n.id], n);
						} else store.groupMetadata[n.id] = n;
					}
					updateLidMapping(n);
				}
			});

			client[from].ev.on("groups.update", (update) => {
				for (let n of update) {
					if (store?.groupMetadata) {
						if (store.groupMetadata[n.id]) {
							Object.assign(store.groupMetadata[n.id], n);
						} else store.groupMetadata[n.id] = n;
					}
					updateLidMapping(n);
				}
			});

			client[from].ev.on("lid-mapping.update", (update) => {
				updateLidMapping(update);
			});

			client[from].ev.on("contacts.upsert", (contacts) => {
				for (const contact of contacts) {
					if (store?.contacts) store.contacts[contact.id] = Object.assign(store.contacts[contact.id] || {}, contact);
					updateLidMapping(contact);
				}
				if (store?.contacts && Object.keys(store.contacts).length > 5000) {
					Object.keys(store.contacts)
						.slice(0, 500)
						.forEach((k) => delete store.contacts[k]);
				}
			});

			client[from].ev.on("contacts.update", (contacts) => {
				for (const contact of contacts) {
					if (store?.contacts) Object.assign(store.contacts[contact.id] || {}, contact);
					updateLidMapping(contact);
				}
				if (store?.contacts && Object.keys(store.contacts).length > 5000) {
					Object.keys(store.contacts)
						.slice(0, 500)
						.forEach((k) => delete store.contacts[k]);
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
					if (Object.keys(store.presences).length > 500) {
						Object.keys(store.presences)
							.slice(0, 50)
							.forEach((k) => delete store.presences[k]);
					}
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
	try {
		fs.rmSync(`./database/clonebot/${from}`, { recursive: true, force: true });
	} catch (e) {
		console.log(chalk.yellow(`[CLONEBOT] Notice: Could not remove directory on Windows: ${e.message}`));
	}
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
