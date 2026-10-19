import "../settings.js";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import crypto from "crypto";
import { Jimp } from "jimp";
import chokidar from "chokidar";
import { Readable } from "stream";
import { fileURLToPath } from "url";
import { parsePhoneNumber } from "awesome-phonenumber";
import { fileTypeFromBuffer, fileTypeFromFile } from "file-type";
import baileys, {
	jidNormalizedUser,
	proto,
	getBinaryNodeChild,
	generateWAMessageContent,
	prepareWAMessageMedia,
	areJidsSameUser,
	extractMessageContent,
	generateMessageID,
	downloadContentFromMessage,
	generateWAMessageFromContent,
	jidDecode,
	generateWAMessage,
	getContentType,
	getDevice,
} from "baileys";

import { writeExif } from "../lib/exif.js";
import { checkStatus } from "./database.js";
import { getBuffer, getStream, fixBytes, compressMessage, decompressMessage } from "../lib/function.js";
import { InteractiveMessage, normalizeNativeFlowButton, extractNativeFlowResponseId, extractNativeFlowResponseText, createThumbnailLink } from "./helper/interactive-message.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nazePath = fileURLToPath(new URL("../handler.js", import.meta.url));

let sockHandler = null;
const groupMetadataTimers = {};
const botStartTime = Date.now();
const thumbMediaCache = new Map();
class BoundedLidMap extends Map {
	constructor(maxEntries = 5000, defaultNegativeTtl = 300000) {
		super();
		this.maxEntries = maxEntries;
		this.defaultNegativeTtl = defaultNegativeTtl;
	}

	get(key) {
		const item = super.get(key);
		if (!item) return undefined;
		if (item.exp && Date.now() > item.exp) {
			super.delete(key);
			return undefined;
		}
		super.delete(key);
		super.set(key, item);
		return item.val;
	}

	has(key) {
		const item = super.get(key);
		if (!item) return false;
		if (item.exp && Date.now() > item.exp) {
			super.delete(key);
			return false;
		}
		return true;
	}

	set(key, val, ttl = null) {
		if (super.has(key)) {
			super.delete(key);
		} else if (this.size >= this.maxEntries) {
			const rawOldest = super.keys().next().value;
			if (rawOldest !== undefined) super.delete(rawOldest);
		}
		const exp = val === null ? Date.now() + (ttl || this.defaultNegativeTtl) : null;
		return super.set(key, { val, exp });
	}

	*keys() {
		const now = Date.now();
		for (const [k, item] of super.entries()) {
			if (item.exp && now > item.exp) continue;
			yield k;
		}
	}

	*values() {
		const now = Date.now();
		for (const [k, item] of super.entries()) {
			if (item.exp && now > item.exp) continue;
			yield item.val;
		}
	}

	*entries() {
		const now = Date.now();
		for (const [k, item] of super.entries()) {
			if (item.exp && now > item.exp) continue;
			yield [k, item.val];
		}
	}

	[Symbol.iterator]() {
		return this.entries();
	}

	forEach(callback, thisArg) {
		for (const [k, v] of this.entries()) {
			callback.call(thisArg, v, k, this);
		}
	}
}

const lidMap = new BoundedLidMap(5000, 300000);
const usernameMap = new BoundedLidMap(2000, 600000);

let _currentSessionPath = null;
const _lidPersistQueue = new Map();
let _lidPersistTimer = null;
let _lidPersistMaxTimer = null;

function _flushLidPersistQueue() {
	if (_lidPersistTimer) {
		clearTimeout(_lidPersistTimer);
		_lidPersistTimer = null;
	}
	if (_lidPersistMaxTimer) {
		clearTimeout(_lidPersistMaxTimer);
		_lidPersistMaxTimer = null;
	}
	if (!_lidPersistQueue.size) return;

	const items = [..._lidPersistQueue.values()];
	_lidPersistQueue.clear();

	import("./auth.js")
		.then(({ saveLidMapping }) => {
			for (const { sessionPath: targetSession, lid, pn } of items) {
				const finalPath = targetSession || _currentSessionPath || "./nazedev";
				saveLidMapping(finalPath, lid, pn).catch(() => {});
			}
		})
		.catch(() => {});
}

function _scheduleLidPersist(lid, pn, sessionPath = _currentSessionPath) {
	const targetSession = sessionPath || _currentSessionPath;
	if (!targetSession) return;
	const lidUser = String(lid)
		.split("@")[0]
		.replace(/[^0-9]/g, "");
	const pnUser = String(pn)
		.split("@")[0]
		.replace(/[^0-9]/g, "");
	if (!lidUser || !pnUser || lidUser === pnUser) return;
	_lidPersistQueue.set(`${targetSession}|${lidUser}|${pnUser}`, { sessionPath: targetSession, lid, pn });

	if (_lidPersistTimer) clearTimeout(_lidPersistTimer);
	_lidPersistTimer = setTimeout(_flushLidPersistQueue, 5000);

	if (!_lidPersistMaxTimer) {
		_lidPersistMaxTimer = setTimeout(_flushLidPersistQueue, 10000);
	}
}

function registerLidPair(lid, phoneNumber, sessionPath = _currentSessionPath) {
	if (!lid || !phoneNumber) return;
	const lidStr = String(lid).trim();
	const pnStr = String(phoneNumber).trim();
	if (!lidStr || !pnStr || lidStr === pnStr) return;

	if (lidStr.endsWith("@g.us") || lidStr.endsWith("@newsletter") || pnStr.endsWith("@g.us") || pnStr.endsWith("@newsletter")) return;

	const clean1 = lidStr.includes(":") ? lidStr.replace(/:.*@/, "@") : lidStr;
	const clean2 = pnStr.includes(":") ? pnStr.replace(/:.*@/, "@") : pnStr;

	let actualLid = clean1;
	let actualPn = clean2;

	if (clean2.endsWith("@lid") || clean1.endsWith("@s.whatsapp.net")) {
		actualLid = clean2;
		actualPn = clean1;
	}

	if (actualLid.endsWith("@s.whatsapp.net") && actualPn.endsWith("@s.whatsapp.net")) return;
	if (actualLid.endsWith("@lid") && actualPn.endsWith("@lid")) return;

	const lidUser = actualLid.split("@")[0].replace(/[^0-9]/g, "");
	if (!lidUser) return;
	const lidJid = lidUser + "@lid";

	const pnUser = actualPn.split("@")[0].replace(/[^0-9]/g, "");
	if (!pnUser) return;
	const pnJid = pnUser + "@s.whatsapp.net";

	if (lidUser === pnUser) return;

	const isNewPair = !lidMap.has(lidJid);
	lidMap.set(lidJid, pnJid);
	lidMap.set(lidUser, pnJid);

	if (isNewPair) _scheduleLidPersist(lidJid, pnJid, sessionPath);
}

function updateLidMapping(update) {
	if (!update) return;

	if (Array.isArray(update)) {
		for (const item of update) {
			updateLidMapping(item);
		}
		return;
	}

	if (update instanceof Map) {
		for (const [key, val] of update.entries()) {
			registerLidPair(key, val);
		}
		return;
	}

	if (typeof update !== "object") return;

	if (Array.isArray(update.mappings)) {
		for (const item of update.mappings) {
			updateLidMapping(item);
		}
	}

	if (Array.isArray(update.participants)) {
		for (const item of update.participants) {
			updateLidMapping(item);
		}
	}

	if (update.owner && update.ownerPn) registerLidPair(update.owner, update.ownerPn);
	if (update.subjectOwner && update.subjectOwnerPn) registerLidPair(update.subjectOwner, update.subjectOwnerPn);
	if (update.descOwner && update.descOwnerPn) registerLidPair(update.descOwner, update.descOwnerPn);

	if (update.lid && (update.pn || update.phoneNumber || update.jid)) {
		registerLidPair(update.lid, update.pn || update.phoneNumber || update.jid);
		return;
	}

	if (update.id && (update.phoneNumber || update.pn)) {
		registerLidPair(update.id, update.phoneNumber || update.pn);
		return;
	}

	if (update.id && update.lid) {
		registerLidPair(update.lid, update.id);
		return;
	}

	for (const [key, val] of Object.entries(update)) {
		if (["lid", "pn", "phoneNumber", "id", "jid", "name", "mappings", "participants"].includes(key)) continue;

		if (typeof val === "string") {
			registerLidPair(key, val);
		} else if (val && typeof val === "object") {
			updateLidMapping(val);
		}
	}
}

async function loadSessionLidMappings(sessionPath = "./nazedev") {
	try {
		if (!sessionPath) return;

		const isRemoteDb = /^(mongodb(\+srv)?|mysql|postgres(ql)?):\/\//i.test(sessionPath);
		if (isRemoteDb) {
			const { fetchSessionLidMappings } = await import("./auth.js");
			const pairs = await fetchSessionLidMappings(sessionPath).catch(() => []);
			if (Array.isArray(pairs)) {
				for (const item of pairs) {
					if (item?.lid && item?.pn) registerLidPair(item.lid, item.pn);
				}
			}
			return;
		}

		const folder = sessionPath === "database.json" || !sessionPath ? "nazedev" : sessionPath;
		if (!fs.existsSync(folder)) return;
		const files = await fs.promises.readdir(folder).catch(() => []);
		for (const f of files) {
			if (!f.startsWith("lid-mapping-") || !f.endsWith(".json")) continue;
			const fullPath = path.join(folder, f);
			try {
				if (f.endsWith("_reverse.json")) {
					const lid = f.slice("lid-mapping-".length, -"_reverse.json".length);
					const raw = await fs.promises.readFile(fullPath, "utf-8");
					const pn = JSON.parse(raw);
					if (lid && pn) registerLidPair(lid, pn);
				} else {
					const pn = f.slice("lid-mapping-".length, -".json".length);
					const raw = await fs.promises.readFile(fullPath, "utf-8");
					const lid = JSON.parse(raw);
					if (lid && pn) registerLidPair(lid, pn);
				}
			} catch {}
		}
	} catch {}
}

/*
 * Create By Naze
 * Follow https://github.com/nazedev
 * Whatsapp : https://whatsapp.com/channel/0029VaWOkNm7DAWtkvkJBK43
 */

let _reloadTimer = null;
const reloadHandler = async () => {
	if (_reloadTimer) clearTimeout(_reloadTimer);
	return new Promise((resolve) => {
		_reloadTimer = setTimeout(async () => {
			try {
				sockHandler = (await import(`../handler.js?update=${Date.now()}`)).default;
			} catch (err) {
				console.error(chalk.redBright(`[ERROR] ${err}`));
			}
			resolve(sockHandler);
		}, 300);
	});
};

reloadHandler();

async function GroupUpdate(sock, m, store) {
	function clearParse(parse) {
		try {
			return JSON.parse(parse);
		} catch {
			return parse;
		}
	}
	if (!m.messageStubType || !m.isGroup) return;
	if (global.db?.groups?.[m.chat] && store?.groupMetadata?.[m.chat]) {
		const senderPn = sock.findJidByLid?.(m.sender) || m.sender;
		const admin = `@${senderPn.split("@")[0]}`;
		const metadata = store.groupMetadata[m.chat];
		const normalizedTarget = clearParse(m.messageStubParameters?.[0]);

		const resolveDisplayId = (rawId) => {
			if (!rawId) return rawId;
			const r = sock.findJidByLid?.(rawId);
			return r && r.endsWith("@s.whatsapp.net") ? r : rawId;
		};

		const type = m.messageStubType;
		const messages = {
			1: "mereset link grup!",
			21: `mengubah Subject Grup menjadi :\n*${normalizedTarget}*`,
			22: "telah mengubah icon grup.",
			23: "mereset link grup!",
			24: `mengubah deskripsi grup.\n\n${normalizedTarget}`,
			25: `telah mengatur agar *${normalizedTarget == "on" ? "hanya admin" : "semua peserta"}* yang dapat mengedit info grup.`,
			26: `telah *${normalizedTarget == "on" ? "menutup" : "membuka"}* grup!\nSekarang ${normalizedTarget == "on" ? "hanya admin yang" : "semua peserta"} dapat mengirim pesan.`,
			29: `telah menjadikan @${resolveDisplayId(normalizedTarget?.id)?.split("@")?.[0]} sebagai admin.`,
			30: `telah memberhentikan @${resolveDisplayId(normalizedTarget?.id)?.split("@")?.[0]} dari admin.`,
			72: `mengubah durasi pesan sementara menjadi *@${normalizedTarget}*`,
			123: "menonaktifkan pesan sementara.",
			132: "mereset link grup!",
			172: `@${normalizedTarget?.pn?.split("@")?.[0]} meminta bergabung`,
		};
		if (sock.public && global.db?.groups?.[m.chat]?.setinfo && messages[type]) {
			if (!((type === 29 && global.db?.groups?.[m.chat]?.promote) || (type === 30 && global.db?.groups?.[m.chat]?.demote))) {
				const rawTargetId = normalizedTarget?.id || normalizedTarget;
				const resolvedTargetId = resolveDisplayId(String(rawTargetId || ""));
				await sock.sendMessage(
					m.chat,
					{
						text: `${admin} ${messages[type]}`,
						mentions: [...new Set([m.sender, senderPn, ...(String(rawTargetId).includes("@") ? [rawTargetId, resolvedTargetId] : [])].filter(Boolean))],
					},
					{ ephemeralExpiration: m.expiration || m?.metadata?.ephemeralDuration || store?.messages[m.chat]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 },
				);
			}
		}
		if (type === 20) {
			clearTimeout(groupMetadataTimers[m.chat]);
			groupMetadataTimers[m.chat] = setTimeout(async () => {
				store.groupMetadata[m.chat] = await sock.groupMetadata(m.chat).catch((e) => ({ ...store.groupMetadata[m.chat] }));
				if (store.groupMetadata[m.chat]?.participants) updateLidMapping(store.groupMetadata[m.chat].participants);
				delete groupMetadataTimers[m.chat];
			}, 5000);
		} else if (type === 29 || type === 30) {
			const target = jidNormalizedUser(normalizedTarget.id || normalizedTarget);
			const newAdminValue = type === 29 ? "admin" : null;
			if (metadata?.participants?.length) {
				metadata.participants = metadata.participants.map((p) => {
					const key = metadata.addressingMode === "lid" ? jidNormalizedUser(p.id) : jidNormalizedUser(p.phoneNumber);
					if (key === target) {
						return { ...p, admin: newAdminValue };
					}
					return p;
				});
			}
		} else if (type === 27) {
			if (!metadata?.participants?.some((a) => a.id === (normalizedTarget?.id || normalizedTarget) || a.phoneNumber === (normalizedTarget?.id || normalizedTarget))) {
				clearTimeout(groupMetadataTimers[m.chat]);
				groupMetadataTimers[m.chat] = setTimeout(async () => {
					store.groupMetadata[m.chat] = await sock.groupMetadata(m.chat).catch((e) => ({ ...store.groupMetadata[m.chat] }));
					if (store.groupMetadata[m.chat]?.participants) updateLidMapping(store.groupMetadata[m.chat].participants);
					delete groupMetadataTimers[m.chat];
				}, 5000);
			}
		} else if (type === 28 || type === 32) {
			if (m.fromMe && (jidNormalizedUser(sock.user.id) == (normalizedTarget.id || normalizedTarget) || jidNormalizedUser(sock.user.lid) == (normalizedTarget.id || normalizedTarget))) {
				delete store.messages[m.chat];
				delete store.presences[m.chat];
				delete store.groupMetadata[m.chat];
			}
			if (metadata && metadata.participants) {
				metadata.participants = metadata.participants.filter((p) => {
					const key = metadata.addressingMode === "lid" ? jidNormalizedUser(p.id) : jidNormalizedUser(p.phoneNumber);
					return key !== (normalizedTarget.id || normalizedTarget);
				});
			}
		} else {
			console.log({
				messageStubType: m.messageStubType,
				type,
				messageStubParameters: m.messageStubParameters,
			});
		}
	}
}

async function GroupParticipantsUpdate(sock, update, store) {
	try {
		const { id, participants, author, action } = update;
		function updateAdminStatus(participants, metadataParticipants, status) {
			for (const participant of metadataParticipants) {
				if (participants.includes(jidNormalizedUser(participant.id)) || participants.includes(jidNormalizedUser(participant.phoneNumber))) {
					participant.admin = status;
				}
			}
		}
		if (global.db?.groups?.[id] && store?.groupMetadata?.[id]) {
			const metadata = store.groupMetadata[id];
			const jids = participants.map((n) => (typeof n === "string" ? n : n?.phoneNumber || n?.id || ""));

			const displayJids = participants.map((n) => {
				const raw = typeof n === "string" ? n : n?.phoneNumber || n?.id || "";
				if (!raw) return raw;
				if (raw.endsWith("@s.whatsapp.net")) return raw;
				const resolved = sock.findJidByLid?.(raw);
				if (resolved && resolved.endsWith("@s.whatsapp.net")) return resolved;
				const pn = typeof n === "object" && n?.phoneNumber;
				if (pn && pn.endsWith("@s.whatsapp.net")) return pn;
				return raw;
			});
			const mentionsString = displayJids.map((jid) => `@${jid.split("@")[0]}`).join(", ");
			let profile;
			try {
				if (participants.length > 1) {
					profile = await sock.profilePictureUrl(id, "image");
				} else {
					profile = await sock.profilePictureUrl(displayJids[0] || jids[0], "image");
				}
			} catch {
				profile = "https://telegra.ph/file/95670d63378f7f4210f03.png";
			}

			const authorDisplay = author
				? (() => {
						const resolved = sock.findJidByLid?.(author);
						return resolved && resolved.endsWith("@s.whatsapp.net") ? resolved : author;
					})()
				: null;

			let messageText;
			if (action === "add") {
				if (global.db.groups[id]?.welcome) messageText = global.db.groups[id]?.text?.setwelcome || `Welcome to ${metadata.subject}\n@`;
				const hasMissingParticipant = jids.some((jid) => !metadata.participants.find((a) => a.id == jidNormalizedUser(jid)));
				if (hasMissingParticipant) {
					clearTimeout(groupMetadataTimers[id]);
					groupMetadataTimers[id] = setTimeout(async () => {
						store.groupMetadata[id] = await sock.groupMetadata(id).catch((e) => ({ ...store.groupMetadata[id] }));
						if (store.groupMetadata[id]?.participants) updateLidMapping(store.groupMetadata[id].participants);
						delete groupMetadataTimers[id];
					}, 5000);
				}
			} else if (action === "remove") {
				if (global.db.groups[id]?.leave) messageText = global.db.groups[id]?.text?.setleave || `@\nLeaving From ${metadata.subject}`;
				if (jids.some((jid) => jidNormalizedUser(sock.user.lid) == jidNormalizedUser(jid) || jidNormalizedUser(sock.user.id) == jidNormalizedUser(jid))) {
					delete store.messages[id];
					delete store.presences[id];
					delete store.groupMetadata[id];
				}
				if (metadata) metadata.participants = metadata.participants.filter((p) => !participants.includes(metadata.addressingMode === "lid" ? jidNormalizedUser(p.id) : jidNormalizedUser(p.phoneNumber)));
			} else if (action === "promote") {
				if (global.db.groups[id]?.promote) messageText = global.db.groups[id]?.text?.setpromote || `@\nPromote From ${metadata.subject}\nBy @admin`;
				updateAdminStatus(participants, metadata.participants, "admin");
			} else if (action === "demote") {
				if (global.db.groups[id]?.demote) messageText = global.db.groups[id]?.text?.setdemote || `@\nDemote From ${metadata.subject}\nBy @admin`;
				updateAdminStatus(participants, metadata.participants, null);
			}

			if (messageText && sock.public) {
				await sock.sendMessageV3(
					id,
					{
						text: messageText
							.replace("@subject", metadata.subject)
							.replace("@admin", authorDisplay ? `@${authorDisplay.split("@")[0]}` : "@admin")
							.replace(/(?<=\s|^)@(?!\w)/g, mentionsString),
						title: action == "add" ? "Welcome" : action == "remove" ? "Leaving" : action.charAt(0).toUpperCase() + action.slice(1),
						description: metadata.subject,
						thumbnailUrl: profile,
						sourceUrl: global.my.gh,
						mentions: [...new Set([...jids, ...displayJids, author, authorDisplay].filter(Boolean))],
						contextInfo: {
							forwardingScore: 1,
							isForwarded: true,
							forwardedNewsletterMessageInfo: {
								newsletterJid: global.my.ch,
								serverMessageId: null,
								newsletterName: "Join For More Info",
							},
						},
					},
					{ ephemeralExpiration: metadata?.ephemeralDuration || store?.messages[id]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 },
				);
			}
		}
	} catch (e) {
		throw e;
	}
}

async function LoadDataBase(sock, m) {
	try {
		const botNumber = sock.user?.id ? await sock.decodeJid(sock.user.id) : "";
		global.db = global.db || {};
		global.db.game = global.db.game || {};
		global.db.premium = global.db.premium || [];
		global.db.users = global.db.users || {};
		global.db.groups = global.db.groups || {};
		global.db.set = global.db.set || {};

		let game = global.db.game;
		let premium = global.db.premium;
		let user = (m?.sender && global.db.users[m.sender]) || {};
		let setBot = (botNumber && global.db.set[botNumber]) || {};

		if (botNumber) global.db.set[botNumber] = setBot;
		if (m?.sender && !m.sender.endsWith("@g.us")) global.db.users[m.sender] = user;

		const defaultSetBot = {
			lang: "id",
			limit: 0,
			money: 0,
			status: 0,
			log: true,
			join: false,
			public: true,
			anticall: false,
			original: true,
			readsw: false,
			autobio: false,
			autoread: false,
			antispam: false,
			autotyping: false,
			grouponly: true,
			multiprefix: false,
			privateonly: true,
			whitelistonly: false,
			didyoumean: false,
			author: global.author || "Nazedev",
			authorPrefix: "",
			autobackup: false,
			botname: global.botname || "Hitori Bot",
			packname: global.packname || "Bot WhatsApp",
			template: "documentMessage",
			owner: global.owner,
			whitelist: [],
		};
		for (let key in defaultSetBot) {
			if (!(key in setBot)) setBot[key] = defaultSetBot[key];
		}

		const limitUser = user.vip ? global.limit.vip : checkStatus(m.sender, premium) ? global.limit.premium : global.limit.free;
		const moneyUser = user.vip ? global.money.vip : checkStatus(m.sender, premium) ? global.money.premium : global.money.free;

		const defaultUser = {
			vip: false,
			ban: false,
			afkTime: -1,
			afkReason: "",
			register: false,
			limit: limitUser,
			money: moneyUser,
			lastclaim: Date.now(),
			lastbegal: Date.now(),
			lastrampok: Date.now(),
		};
		for (let key in defaultUser) {
			if (!(key in user)) user[key] = defaultUser[key];
		}

		if (typeof user.money !== "number" || isNaN(user.money) || !isFinite(user.money)) {
			user.money = moneyUser;
		} else if (user.money > 999999999999999) {
			user.money = 999999999999999;
		}

		if (typeof user.limit !== "number" || isNaN(user.limit) || !isFinite(user.limit)) {
			user.limit = limitUser;
		} else if (user.limit > 999999999999999) {
			user.limit = 999999999999999;
		}

		if (m.isGroup) {
			let group = global.db.groups[m.chat] || {};
			global.db.groups[m.chat] = group;

			const defaultGroup = {
				url: "",
				text: {},
				warn: {},
				tagsw: {},
				nsfw: false,
				mute: false,
				leave: false,
				setinfo: false,
				antilink: false,
				demote: false,
				antitoxic: false,
				promote: false,
				welcome: false,
				antivirtex: false,
				antitagsw: false,
				antidelete: false,
				antihidetag: false,
				waktusholat: false,
			};
			for (let key in defaultGroup) {
				if (!(key in group)) group[key] = defaultGroup[key];
			}
		}

		const defaultGameKeys = [
			"suit",
			"chess",
			"chat_ai",
			"menfes",
			"tekateki",
			"tictactoe",
			"tebaklirik",
			"kuismath",
			"cangkulan",
			"werewolf",
			"tebaklagu",
			"tebakkata",
			"family100",
			"susunkata",
			"tebakbom",
			"ulartangga",
			"tebakkimia",
			"caklontong",
			"tebakangka",
			"tebaknegara",
			"tebakgambar",
			"tebakbendera",
		];
		for (const key of defaultGameKeys) {
			if (!game[key]) game[key] = {};
		}
	} catch (e) {
		throw e;
	}
}

async function MessagesUpsert(sock, message, store) {
	try {
		if (!message?.messages || !Array.isArray(message.messages)) {
			if (message?.key) message = { messages: [message], type: message?.type || "notify" };
			else return;
		}
		store = store || global.store || {};
		const upsertType = message.type || "notify";
		let botNumber = sock.user?.id ? (sock.decodeJid ? await sock.decodeJid(sock.user.id) : sock.user.id) : "";
		if (!store.groupMetadata || Object.keys(store.groupMetadata).length === 0) {
			store.groupMetadata ??= await sock.groupFetchAllParticipating?.().catch(() => ({}));
		}
		for (const msg of message.messages) {
			try {
				if (!msg?.key) continue;
				if (msg.category === "peer" || msg.key?.category === "peer") {
					if (msg.key?.id && global.nodeMap) global.nodeMap.delete(msg.key.id);
					continue;
				}
				const msgTimestamp = typeof msg?.messageTimestamp === "number" ? msg.messageTimestamp : msg?.messageTimestamp?.low ? msg.messageTimestamp.low : Number(msg?.messageTimestamp) || 0;

				if (upsertType === "notify" && msgTimestamp > 0 && msgTimestamp * 1000 < botStartTime - 5000) continue;

				const remoteJid = msg.key.remoteJid;
				if (!remoteJid) continue;
				if (remoteJid.endsWith("@bot") || msg.key?.participant?.endsWith("@bot")) continue;

				(store.messages ??= {})[remoteJid] ??= {};
				store.messages[remoteJid].array ??= [];
				store.messages[remoteJid].keyId ??= new Set();
				if (!(store.messages[remoteJid].keyId instanceof Set)) {
					store.messages[remoteJid].keyId = new Set(store.messages[remoteJid].array.map((m) => m?.key?.id || decompressMessage(m)?.key?.id).filter(Boolean));
				}
				if (msg.key.id && store.messages[remoteJid].keyId.has(msg.key.id)) continue;
				store.messages[remoteJid].array.push(msg);
				if (msg.key.id) store.messages[remoteJid].keyId.add(msg.key.id);

				const maxChatLen = global.chatLength || 200;
				while (store.messages[remoteJid].array.length > maxChatLen) {
					const lastChat = store.messages[remoteJid].array.shift();
					const lastId = lastChat?.key?.id || decompressMessage(lastChat)?.key?.id;
					if (lastId) store.messages[remoteJid].keyId.delete(lastId);
				}

				store._chatAccessOrder ??= Object.keys(store.messages || {});
				store._chatAccessOrder = store._chatAccessOrder.filter((id) => id !== remoteJid);
				store._chatAccessOrder.push(remoteJid);
				const maxStoreChats = global.maxStoreChats || 200;
				while (store._chatAccessOrder.length > maxStoreChats) {
					const oldestJid = store._chatAccessOrder.shift();
					if (oldestJid && oldestJid !== remoteJid && store.messages[oldestJid]) {
						delete store.messages[oldestJid];
					}
				}

				const rawProto = msg?.message?.protocolMessage || (typeof extractMessageContent === "function" ? extractMessageContent(msg?.message)?.protocolMessage : null) || msg?.msg?.protocolMessage;
				const isMemberLabelChange = rawProto?.type === proto.Message?.ProtocolMessage?.Type?.GROUP_MEMBER_LABEL_CHANGE || rawProto?.type === "GROUP_MEMBER_LABEL_CHANGE" || !!rawProto?.memberLabel;
				if (isMemberLabelChange) {
					const memberLabelBase = memberLabelSerialize(msg);
					if (memberLabelBase?.groupJid) {
						const storesToUpdate = [store, global.store].filter(Boolean);
						for (const s of storesToUpdate) {
							s.groupMetadata ??= {};
							const gm = (s.groupMetadata[memberLabelBase.groupJid] ??= { id: memberLabelBase.groupJid, participants: [] });
							gm.memberLabels ??= {};
							if (memberLabelBase.authorLid) {
								if (memberLabelBase.label) gm.memberLabels[memberLabelBase.authorLid] = memberLabelBase.label;
								else delete gm.memberLabels[memberLabelBase.authorLid];
							}
							if (memberLabelBase.authorPn) {
								if (memberLabelBase.label) gm.memberLabels[memberLabelBase.authorPn] = memberLabelBase.label;
								else delete gm.memberLabels[memberLabelBase.authorPn];
							}
							if (Array.isArray(gm.participants)) {
								const p = gm.participants.find(
									(x) =>
										(memberLabelBase.authorLid && (x.id === memberLabelBase.authorLid || areJidsSameUser(x.id, memberLabelBase.authorLid))) ||
										(memberLabelBase.authorPn && (x.phoneNumber === memberLabelBase.authorPn || x.id === memberLabelBase.authorPn || areJidsSameUser(x.id, memberLabelBase.authorPn))),
								);
								if (p) {
									p.label = memberLabelBase.label || null;
									p.labelTimestamp = memberLabelBase.timestamp;
								}
							}
						}
					}
				}

				const type = msg.message ? getContentType(msg.message) || Object.keys(msg.message)[0] : "";
				const m = await Serialize(sock, msg, store);
				if (m) {
					m.eventType = upsertType;

					if (upsertType === "append") {
						continue;
					}

					if (sockHandler) {
						sockHandler(sock, m, store).catch((e) => console.error("Error in sockHandler:", e));
					} else {
						await reloadHandler();
						if (sockHandler) sockHandler(sock, m, store).catch((e) => console.error("Error in sockHandler:", e));
					}
				}

				if (upsertType !== "append" && botNumber && global.db?.set?.[botNumber]?.readsw && msg.key.remoteJid === "status@broadcast") {
					await sock.readMessages?.([msg.key]);
					const participantNumber = msg.key.participant ? msg.key.participant.split("@")[0] : "";
					if (/protocolMessage/i.test(type)) await sock.sendFromOwner?.(global.db?.set?.[botNumber]?.owner || global.owner, "Status dari @" + participantNumber + " Telah dihapus", msg, { mentions: msg.key.participant ? [msg.key.participant] : [] });
					if (/(audioMessage|imageMessage|videoMessage|extendedTextMessage)/i.test(type)) {
						let keke =
							type == "extendedTextMessage"
								? `Story Teks Berisi : ${msg.message?.extendedTextMessage?.text ? msg.message.extendedTextMessage.text : ""}`
								: type == "imageMessage"
									? `Story Gambar ${msg.message?.imageMessage?.caption ? "dengan Caption : " + msg.message.imageMessage.caption : ""}`
									: type == "videoMessage"
										? `Story Video ${msg.message?.videoMessage?.caption ? "dengan Caption : " + msg.message.videoMessage.caption : ""}`
										: type == "audioMessage"
											? "Story Audio"
											: "\nTidak diketahui cek saja langsung";
						await sock.sendFromOwner?.(global.db?.set?.[botNumber]?.owner || global.owner, `Melihat story dari @${participantNumber}\n${keke}`, msg, { mentions: msg.key.participant ? [msg.key.participant] : [] });
					}
				}
			} catch (err) {
				console.error("Error processing message in MessagesUpsert loop:", err);
			}
		}
	} catch (e) {
		console.log(message);
		throw e;
	}
}

async function resolveUsername(sock, username) {
	if (!username || typeof username !== "string") return null;
	let clean = username
		.trim()
		.toLowerCase()
		.replace(/^(?:https?:\/\/)?(?:(?:www\.)?wa\.me\/(?:m\/)?)?@?/, "")
		.split(/[/?#]/)[0]
		.trim();
	if (!clean) return null;

	if (clean.endsWith("@s.whatsapp.net") || clean.endsWith("@lid") || clean.endsWith("@g.us") || clean.endsWith("@newsletter")) {
		return clean.includes(":") ? clean.replace(/:.*@/, "@") : clean;
	}
	if (/^\d{5,16}$/.test(clean)) {
		return clean + "@s.whatsapp.net";
	}

	const cached = usernameMap.get(clean);
	if (cached !== undefined) return cached;

	let resolvedJid = null;
	try {
		const USyncQuery = baileys.USyncQuery;
		const USyncUser = baileys.USyncUser;
		const USyncUsernameProtocol = baileys.USyncUsernameProtocol;
		if (USyncQuery && USyncUser && typeof sock?.executeUSyncQuery === "function") {
			const user = new USyncUser().withUsername(clean);
			const uQuery = new USyncQuery().withContext("interactive").withMode("query").withUser(user);
			if (typeof uQuery.withUsernameProtocol === "function") {
				uQuery.withUsernameProtocol();
			} else if (USyncUsernameProtocol) {
				uQuery.protocols.push(new USyncUsernameProtocol());
			}
			const res = await sock.executeUSyncQuery(uQuery);
			const entry = res?.list?.[0];
			if (entry?.id) {
				resolvedJid = entry.id;
			}
		}
	} catch {}

	if (!resolvedJid && typeof sock?.query === "function") {
		try {
			const sid = typeof sock.generateMessageTag === "function" ? sock.generateMessageTag() : String(Date.now());
			const iqNode = {
				tag: "iq",
				attrs: {
					to: "s.whatsapp.net",
					type: "get",
					xmlns: "usync",
				},
				content: [
					{
						tag: "usync",
						attrs: {
							context: "interactive",
							mode: "query",
							sid,
							last: "true",
							index: "0",
						},
						content: [
							{
								tag: "query",
								attrs: {},
								content: [{ tag: "username", attrs: {} }],
							},
							{
								tag: "list",
								attrs: {},
								content: [
									{
										tag: "user",
										attrs: {},
										content: [
											{
												tag: "username",
												attrs: {},
												content: clean,
											},
										],
									},
								],
							},
						],
					},
				],
			};
			const response = await sock.query(iqNode);
			const usyncNode = getBinaryNodeChild(response, "usync");
			const listNode = usyncNode ? getBinaryNodeChild(usyncNode, "list") : null;
			const userNode = listNode ? getBinaryNodeChild(listNode, "user") : null;
			if (userNode?.attrs?.jid) {
				resolvedJid = userNode.attrs.jid;
			}
		} catch {}
	}

	if (resolvedJid) {
		if (resolvedJid.includes(":")) resolvedJid = resolvedJid.replace(/:.*@/, "@");
		usernameMap.set(clean, resolvedJid);
		return resolvedJid;
	}

	usernameMap.set(clean, null);
	return null;
}

async function Solving(sock, store, sessionPath = "./nazedev") {
	sock.lidMap = lidMap;
	sock.usernameMap = usernameMap;
	sock.updateLidMapping = updateLidMapping;
	sock.resolveUsername = (username) => resolveUsername(sock, username);

	_currentSessionPath = sessionPath;

	loadSessionLidMappings(sessionPath).catch(() => {});

	if (sock.user?.lid && sock.user?.id) {
		registerLidPair(sock.user.lid, sock.user.id);
	}

	if (store?.groupMetadata) {
		for (const g of Object.values(store.groupMetadata)) {
			updateLidMapping(g);
		}
	}
	if (store?.contacts) {
		for (const c of Object.values(store.contacts)) {
			updateLidMapping(c);
		}
	}

	sock.serializeM = (m) => MessagesUpsert(sock, m, store);

	sock.decodeJid = (jid) => {
		if (!jid) return jid;
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {};
			return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
		} else return jid;
	};

	sock.findJidByLid = (lid, store, resolve = false) => {
		if (!lid) return resolve ? lid : null;

		const str = typeof lid === "string" ? lid.trim() : String(lid).trim();
		if (!str) return resolve ? lid : null;

		const clean = str.includes(":") ? str.replace(/:.*@/, "@") : str;

		if (clean.endsWith("@s.whatsapp.net")) {
			return clean;
		}

		if (clean.endsWith("@g.us") || clean.endsWith("@newsletter") || clean.endsWith("@broadcast")) {
			return resolve ? lid : null;
		}

		if (/^\d+$/.test(clean)) {
			return clean + "@s.whatsapp.net";
		}

		if (!clean.endsWith("@lid")) {
			return resolve ? lid : null;
		}

		const resClean = lidMap.get(clean);
		if (resClean !== undefined) {
			if (resClean) return resClean;
			if (resClean === null) return resolve ? lid : null;
		}

		const user = clean.split("@")[0].replace(/[^0-9]/g, "");
		if (user) {
			const resUser = lidMap.get(user);
			if (resUser !== undefined) {
				if (resUser) return resUser;
				if (resUser === null) return resolve ? lid : null;
			}
			const asLid = user + "@lid";
			const resAsLid = lidMap.get(asLid);
			if (resAsLid !== undefined) {
				if (resAsLid) return resAsLid;
				if (resAsLid === null) return resolve ? lid : null;
			}
		}

		if (store) {
			const groupMeta = store.groupMetadata;
			if (groupMeta) {
				for (const g of Object.values(groupMeta)) {
					if (!g?.participants) continue;
					for (const contact of g.participants) {
						if (!contact) continue;
						const cId = contact.id ? (contact.id.includes(":") ? contact.id.replace(/:.*@/, "@") : contact.id) : "";
						const cLid = contact.lid ? (contact.lid.includes(":") ? contact.lid.replace(/:.*@/, "@") : contact.lid) : "";
						const cPn = contact.phoneNumber || contact.jid || (cId.endsWith("@s.whatsapp.net") ? cId : "");

						const isMatch = cId === clean || cLid === clean || (user && (cId.startsWith(user + "@") || cLid.startsWith(user + "@")));
						if (isMatch && cPn) {
							const matchedLid = cLid || (cId.endsWith("@lid") ? cId : clean);
							registerLidPair(matchedLid, cPn);
							return cPn.includes("@s.whatsapp.net") ? cPn : cPn + "@s.whatsapp.net";
						}
					}
				}
			}
			const contacts = store.contacts;
			if (contacts) {
				for (const [key, contact] of Object.entries(contacts)) {
					if (!contact) continue;
					const cId = contact.id ? (contact.id.includes(":") ? contact.id.replace(/:.*@/, "@") : contact.id) : key.includes(":") ? key.replace(/:.*@/, "@") : key;
					const cLid = contact.lid ? (contact.lid.includes(":") ? contact.lid.replace(/:.*@/, "@") : contact.lid) : "";
					const cPn = contact.phoneNumber || contact.jid || (cId.endsWith("@s.whatsapp.net") ? cId : key.endsWith("@s.whatsapp.net") ? key : "");

					const isMatch = cId === clean || cLid === clean || (user && (cId.startsWith(user + "@") || cLid.startsWith(user + "@")));
					if (isMatch && cPn) {
						const matchedLid = cLid || (cId.endsWith("@lid") ? cId : clean);
						registerLidPair(matchedLid, cPn);
						return cPn.includes("@s.whatsapp.net") ? cPn : cPn + "@s.whatsapp.net";
					}
				}
			}
		}

		lidMap.set(clean, null);
		if (user && user !== clean) lidMap.set(user, null);

		if (resolve) return lid;
		return null;
	};

	sock.getName = async (jid, withoutContact = false) => {
		const id = sock.decodeJid(jid);
		if (id.endsWith("@g.us")) {
			const groupInfo = store.contacts[id] || (store.groupMetadata[id] ? store.groupMetadata[id] : (store.groupMetadata[id] = await sock.groupMetadata(id).catch((e) => ({ ...store.groupMetadata[id] })))) || {};
			return groupInfo.name || groupInfo.subject || parsePhoneNumber("+" + id.replace("@g.us", "")).number?.international;
		} else {
			if (id === "0@s.whatsapp.net") {
				return "WhatsApp";
			}
			const contactInfo = store.contacts[id] || {};
			return withoutContact ? "" : contactInfo.name || contactInfo.subject || contactInfo.verifiedName || parsePhoneNumber("+" + id.replace("@s.whatsapp.net", "")).number?.international;
		}
	};

	sock.sendContact = async (jid, kon, quoted = "", opts = {}) => {
		let list = [];
		for (let i of kon) {
			list.push({
				displayName: await sock.getName(i + "@s.whatsapp.net"),
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await sock.getName(i + "@s.whatsapp.net")}\nFN:${await sock.getName(i + "@s.whatsapp.net")}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.ADR:;;Indonesia;;;;\nitem2.X-ABLabel:Region\nEND:VCARD`,
			});
		}
		sock.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 });
	};

	sock.profilePictureUrl = async (jid, type = "image", timeoutMs) => {
		const result = await sock.query(
			{
				tag: "iq",
				attrs: {
					target: jidNormalizedUser(jid),
					to: "@s.whatsapp.net",
					type: "get",
					xmlns: "w:profile:picture",
				},
				content: [
					{
						tag: "picture",
						attrs: {
							type,
							query: "url",
						},
					},
				],
			},
			timeoutMs,
		);
		const child = getBinaryNodeChild(result, "picture");
		return child?.attrs?.url;
	};

	sock.setStatus = (status) => {
		sock.query({
			tag: "iq",
			attrs: {
				to: "@s.whatsapp.net",
				type: "set",
				xmlns: "status",
			},
			content: [
				{
					tag: "status",
					attrs: {},
					content: Buffer.from(status, "utf-8"),
				},
			],
		});
		return status;
	};

	sock.relayMessageV2 = async (jid, message, options) => {
		const msg = generateWAMessageFromContent(jid, message, {
			upload: sock.waUploadToServer,
			messageId: generateMessageID(),
			...options,
		});
		const hasil = await sock.relayMessage(jid, msg.message, {
			messageId: msg.key.id,
			...options,
		});
		return hasil;
	};

	sock.sendPoll = (jid, name = "", values = [], quoted, selectableCount = 1) => {
		return sock.sendMessage(jid, { poll: { name, values, selectableCount } }, { quoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 });
	};

	sock.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		const quotedOptions = { quoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 };
		try {
			const res = await fetch(url, { method: "HEAD" });
			let mime = res.headers.get("content-type");
			if (mime && mime.includes("gif")) {
				return sock.sendMessage(jid, { video: { url }, caption: caption, gifPlayback: true, ...options }, quotedOptions);
			} else if (mime && mime === "application/pdf") {
				return sock.sendMessage(jid, { document: { url }, mimetype: "application/pdf", caption: caption, ...options }, quotedOptions);
			} else if (mime && mime.includes("image")) {
				return sock.sendMessage(jid, { image: { url }, caption: caption, ...options }, quotedOptions);
			} else if (mime && mime.includes("video")) {
				return sock.sendMessage(jid, { video: { url }, caption: caption, mimetype: "video/mp4", ...options }, quotedOptions);
			} else if (mime && mime.includes("audio")) {
				return sock.sendMessage(jid, { audio: { url }, mimetype: "audio/mpeg", ...options }, quotedOptions);
			} else {
				return sock.sendMessage(jid, { document: { url }, caption: caption, mimetype: mime, ...options }, quotedOptions);
			}
		} catch (e) {
			return sock.sendMessage(jid, { text: url, ...options }, quotedOptions);
		}
	};

	sock.sendGroupInviteV4 = async (jid, participant, inviteCode, inviteExpiration, groupName = "Unknown Subject", caption = "Invitation to join my WhatsApp group", jpegThumbnail = null, options = {}) => {
		const msg = proto.Message.create({
			groupInviteMessage: {
				inviteCode,
				inviteExpiration: parseInt(inviteExpiration) || +new Date(new Date() + 3 * 86400000),
				groupJid: jid,
				groupName,
				jpegThumbnail: Buffer.isBuffer(jpegThumbnail) ? jpegThumbnail : null,
				caption,
				contextInfo: {
					mentionedJid: options.mentions || [],
				},
			},
		});
		const message = generateWAMessageFromContent(participant, msg, options);
		const invite = await sock.relayMessage(participant, message.message, { messageId: message.key.id });
		return invite;
	};

	sock.sendFromOwner = async (jids, text, quoted, options = {}) => {
		const safeQuoted = quoted?.message ? quoted : undefined;
		for (const a of jids) {
			const jid = a.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
			await sock.sendMessage(jid, { text, ...options }, { quoted: safeQuoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 });
		}
	};

	sock.sendText = async (jid, text, quoted, options = {}) => {
		const safeQuoted = quoted?.message ? quoted : undefined;
		return sock.sendMessage(
			jid,
			{ text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map((v) => v[1] + "@s.whatsapp.net"), ...options },
			{ quoted: safeQuoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 },
		);
	};

	sock.downloadMediaMessage = async (message) => {
		const msg = message.msg || message;
		msg.mediaKey = fixBytes(msg.mediaKey);
		msg.fileSha256 = fixBytes(msg.fileSha256);
		msg.fileEncSha256 = fixBytes(msg.fileEncSha256);
		const mime = msg.mimetype || "";
		const messageType = (message.type || mime.split("/")[0]).replace(/Message/gi, "");
		const stream = await downloadContentFromMessage(msg, messageType);
		let buffer = Buffer.from([]);
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk]);
		}
		return buffer;
	};

	sock.downloadMediaMessageStream = async (message) => {
		const msg = message.msg || message;
		msg.mediaKey = fixBytes(msg.mediaKey);
		msg.fileSha256 = fixBytes(msg.fileSha256);
		msg.fileEncSha256 = fixBytes(msg.fileEncSha256);
		const mime = msg.mimetype || "";
		const messageType = (message.type || mime.split("/")[0]).replace(/Message/gi, "");
		const stream = await downloadContentFromMessage(msg, messageType);
		return stream;
	};

	sock.sendAsSticker = async (jid, media, quoted, options = {}) => {
		let streamData;
		let mimeType = options.mime || "";

		if (media && typeof media.pipe === "function") {
			streamData = media;
			if (!mimeType) mimeType = "image/jpeg";
		} else {
			let buff = Buffer.isBuffer(media) ? media : /^data:.*?\/.*?;base64,/i.test(media) ? Buffer.from(media.split`,`[1], "base64") : /^https?:\/\//.test(media) ? await getBuffer(media) : fs.existsSync(media) ? fs.readFileSync(media) : Buffer.alloc(0);
			streamData = Readable.from(buff);
			if (!mimeType) {
				const type = await fileTypeFromBuffer(buff);
				mimeType = type ? type.mime : "image/jpeg";
			}
		}

		const resultStream = await writeExif(streamData, options, mimeType);
		try {
			let anu = await sock.sendMessage(jid, { sticker: { stream: resultStream }, ...options }, { quoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 });
			return anu;
		} catch (e) {
			console.log(e);
		}
	};

	sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
		const msg = message.msg || message;
		msg.mediaKey = fixBytes(msg.mediaKey);
		msg.fileSha256 = fixBytes(msg.fileSha256);
		msg.fileEncSha256 = fixBytes(msg.fileEncSha256);
		const mime = msg.mimetype || "";
		const messageType = (message.type || mime.split("/")[0]).replace(/Message/gi, "");
		const ext = mime.split("/")[1]?.split(";")[0] || "bin";

		const dir = path.join(__dirname, "../database/temp");
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

		const randomName = crypto.randomBytes(6).readUIntLE(0, 6).toString(36);
		const trueFileName = attachExtension ? path.join(dir, `${filename ? filename : randomName}.${ext}`) : path.join(dir, filename || randomName);

		const stream = await downloadContentFromMessage(msg, messageType);
		return new Promise((resolve, reject) => {
			const writeStream = fs.createWriteStream(trueFileName);
			const cleanup = (err) => {
				try {
					writeStream.destroy();
				} catch {}
				try {
					if (fs.existsSync(trueFileName)) fs.unlinkSync(trueFileName);
				} catch {}
				reject(err);
			};
			stream.on("error", cleanup);
			writeStream.on("error", cleanup);
			writeStream.on("finish", () => resolve(trueFileName));
			stream.pipe(writeStream);
		});
	};

	sock.getFile = async (PATH) => {
		let filename;
		let mime = "application/octet-stream";
		let ext = "bin";
		let isTemp = false;

		const dir = path.join(__dirname, "../database/temp");
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

		const randomName = crypto.randomBytes(6).readUIntLE(0, 6).toString(36);

		if (Buffer.isBuffer(PATH)) {
			let type = (await fileTypeFromBuffer(PATH)) || { mime, ext };
			mime = type.mime;
			ext = type.ext;
			filename = path.join(dir, `${randomName}.${ext}`);
			fs.writeFileSync(filename, PATH);
			isTemp = true;
		} else if (/^data:.*?\/.*?;base64,/i.test(PATH)) {
			let buffer = Buffer.from(PATH.split`,`[1], "base64");
			let type = (await fileTypeFromBuffer(buffer)) || { mime, ext };
			mime = type.mime;
			ext = type.ext;
			filename = path.join(dir, `${randomName}.${ext}`);
			fs.writeFileSync(filename, buffer);
			isTemp = true;
		} else if (typeof PATH === "string" && /^https?:\/\//.test(PATH)) {
			const res = await fetch(PATH);
			if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
			mime = res.headers.get("content-type") || "application/octet-stream";
			ext = mime.split("/")[1]?.split(";")[0] || "tmp";
			if (ext === "jpeg") ext = "jpg";
			filename = path.join(dir, `${randomName}.${ext}`);
			const writeStream = fs.createWriteStream(filename);
			const webStream = Readable.fromWeb(res.body);
			await new Promise((resolve, reject) => {
				const cleanup = (err) => {
					try {
						writeStream.destroy();
					} catch {}
					try {
						if (fs.existsSync(filename)) fs.unlinkSync(filename);
					} catch {}
					reject(err);
				};
				webStream.on("error", cleanup);
				writeStream.on("error", cleanup);
				writeStream.on("finish", resolve);
				webStream.pipe(writeStream);
			});
			isTemp = true;
		} else if (typeof PATH === "string" && fs.existsSync(PATH)) {
			let type = (await fileTypeFromFile(PATH)) || { mime, ext };
			mime = type.mime;
			ext = type.ext;
			filename = PATH;
			isTemp = false;
		} else {
			throw new Error("Format media tidak didukung");
		}
		return { filename, mime, ext, isTemp };
	};

	sock.appendResponseMessage = async (m, text) => {
		let apb = await generateWAMessage(
			m.chat,
			{ text, mentions: m.mentionedJid },
			{ userJid: sock.user.id, quoted: m.quoted && m.quoted.fakeObj(), ephemeralExpiration: m.expiration || m?.metadata?.ephemeralDuration || store?.messages[m.chat]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 },
		);
		apb.key = m.key;
		apb.key.id = [...Array(32)].map(() => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
		apb.key.fromMe = areJidsSameUser(m.sender, sock.user.id);
		if (m.isGroup) apb.participant = m.sender;
		return sock.ev.emit("messages.upsert", {
			...m,
			messages: [proto.WebMessageInfo.create(apb)],
			type: "notify",
		});
	};

	sock.appendResponseMessageV2 = async (jid, content) => {
		let msg = await generateWAMessage(jid, content, { userJid: sock.user.id, ephemeralExpiration: store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0 });
		msg.key.fromMe = areJidsSameUser(jid, sock.user.id);
		msg.key.id = [...Array(32)].map(() => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");
		return sock.ev.emit("messages.upsert", { type: "notify", messages: [proto.WebMessageInfo.create(msg)] });
	};

	sock.sendMedia = async (jid, pathMedia, fileName = "", caption = "", quoted = "", options = {}) => {
		const { mime, filename, isTemp } = await sock.getFile(pathMedia);
		const botNumber = sock.decodeJid(sock.user.id);
		const isWebpSticker = options.asSticker || /webp/.test(mime);
		let type = "document",
			mimetype = mime,
			pathFile = filename;
		let filesToDelete = [];
		if (isTemp) filesToDelete.push(filename);
		try {
			if (isWebpSticker) {
				pathFile = await writeExif(filename, {
					packname: options.packname || global.db?.set?.[botNumber]?.packname || "Bot WhatsApp",
					author: options.author || global.db?.set?.[botNumber]?.author || "Nazedev",
					categories: options.categories || [],
				});
				filesToDelete.push(pathFile);
				type = "sticker";
				mimetype = "image/webp";
			} else if (/image|video|audio/.test(mime)) {
				type = mime.split("/")[0];
				mimetype = type == "video" ? "video/mp4" : type == "audio" ? "audio/mpeg" : mime;
			}
			let anu = await sock.sendMessage(
				jid,
				{ [type]: { url: pathFile }, caption, mimetype, fileName, ...options },
				{ quoted, ephemeralExpiration: quoted?.expiration || quoted?.metadata?.ephemeralDuration || store?.messages[jid]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0, ...options },
			);
			return anu;
		} finally {
			filesToDelete.forEach((file) => {
				if (fs.existsSync(file)) fs.unlinkSync(file);
			});
		}
	};

	sock.sendAlbumMessage = async (jid, content = {}, options = {}) => {
		const { album, mentions, contextInfo, ...others } = content;
		for (const media of album) {
			if (!media.image && !media.video) throw new TypeError(`album[i] must have image or video property`);
		}
		if (album.length < 2) throw new RangeError("Minimum 2 media");
		const medias = await generateWAMessageFromContent(
			jid,
			{
				albumMessage: {
					expectedImageCount: album.filter((m) => m.image).length,
					expectedVideoCount: album.filter((m) => m.video).length,
				},
			},
			{ quoted: options?.quoted || null },
		);
		await sock.relayMessage(jid, medias.message, { messageId: medias.key.id });
		for (const media of album) {
			const msg = await generateWAMessage(jid, { ...others, ...media }, { upload: sock.waUploadToServer });
			msg.message.messageContextInfo = {
				messageAssociation: {
					associationType: 1,
					parentMessageKey: medias.key,
				},
			};
			await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
		}
		return medias;
	};

	sock.sendListMsg = async (jid, content = {}, options = {}) => {
		const { text, caption, footer = "", title, subtitle, ai, contextInfo = {}, buttons = [], messageParamsJson = {}, mentions = [], ...media } = content;
		const msg = await generateWAMessageFromContent(
			jid,
			{
				viewOnceMessage: {
					message: {
						messageContextInfo: {
							deviceListMetadata: {},
							deviceListMetadataVersion: 2,
						},
						interactiveMessage: proto.Message.InteractiveMessage.create({
							body: proto.Message.InteractiveMessage.Body.create({ text: text || caption || "" }),
							footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
							header: proto.Message.InteractiveMessage.Header.create({
								title,
								subtitle,
								hasMediaAttachment: Object.keys(media).length > 0,
								...(media && typeof media === "object" && Object.keys(media).length > 0
									? await generateWAMessageContent(media, {
											upload: sock.waUploadToServer,
										})
									: {}),
							}),
							nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
								...(messageParamsJson && typeof messageParamsJson === "object" && Object.keys(messageParamsJson).length > 0 ? messageParamsJson : {}),
								buttons: buttons.map((a) => {
									return {
										name: a.name,
										buttonParamsJson: JSON.stringify(a.buttonParamsJson ? (typeof a.buttonParamsJson === "string" ? JSON.parse(a.buttonParamsJson) : a.buttonParamsJson) : ""),
									};
								}),
							}),
							contextInfo: {
								...contextInfo,
								...options.contextInfo,
								mentionedJid: options.mentions || mentions,
								...(options.quoted
									? {
											stanzaId: options.quoted.key.id,
											remoteJid: options.quoted.key.remoteJid,
											participant: options.quoted.key.participant || options.quoted.key.remoteJid,
											fromMe: options.quoted.key.fromMe,
											quotedMessage: options.quoted.message,
										}
									: {}),
							},
						}),
					},
				},
			},
			{},
		);
		const hasil = await sock.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id,
			additionalNodes: [
				{
					tag: "biz",
					attrs: { type: "native_flow", v: "1" },
					content: [
						{
							tag: "interactive",
							attrs: {
								type: "native_flow",
								v: "1",
							},
							content: [
								{
									tag: "native_flow",
									attrs: {
										v: "9",
										name: "mixed",
									},
								},
							],
						},
					],
				},
				...(ai ? [{ attrs: { biz_bot: "1" }, tag: "bot" }] : []),
				...(options.additionalNodes || []),
			],
			...options,
		});
		return hasil;
	};

	sock.sendButtonMsg = async (jid, content = {}, options = {}) => {
		const {
			text,
			caption,
			footer = "",
			title,
			subtitle,
			headerType = 1,
			ai,
			contextInfo = {},
			buttons = [],
			mentions = [],
			buttonLimit,
			button_limit,
			listTitle,
			list_title,
			buttonTitle,
			button_title,
			dividerIndices,
			divider_indices,
			messageParamsJson,
			viewOnce,
			additionalNodes,
			...media
		} = content;

		const im = new InteractiveMessage(sock);

		if (title) im.setTitle(title);
		if (subtitle) im.setSubtitle(subtitle);
		const bodyText = text || caption || "";
		if (bodyText) im.setBody(bodyText);
		if (footer) im.setFooter(footer);

		if (media && typeof media === "object" && Object.keys(media).length > 0) {
			im.setMedia(media);
		}

		const formattedButtons = buttons.map(normalizeNativeFlowButton).filter(Boolean);
		for (const btn of formattedButtons) {
			im.addButtonRaw(btn);
		}

		const limitConfig = buttonLimit ?? button_limit ?? options.buttonLimit ?? options.button_limit ?? content.in_thread_buttons_limit ?? options.in_thread_buttons_limit;
		if (limitConfig !== undefined && limitConfig !== null) {
			const bListTitle = listTitle || list_title || options.listTitle || options.list_title || "action list";
			const bBtnTitle = buttonTitle || button_title || options.buttonTitle || options.button_title || "choose action";
			const bDividers = dividerIndices || divider_indices || options.dividerIndices || options.divider_indices || [];

			if (typeof limitConfig === "object") {
				im.setButtonLimit(limitConfig.limit ?? limitConfig.in_thread_buttons_limit ?? 1, {
					listTitle: limitConfig.list_title || limitConfig.listTitle || bListTitle,
					buttonTitle: limitConfig.button_title || limitConfig.buttonTitle || bBtnTitle,
					dividerIndices: limitConfig.divider_indices || limitConfig.dividerIndices || bDividers,
				});
			} else {
				im.setButtonLimit(Number(limitConfig) || 1, {
					listTitle: bListTitle,
					buttonTitle: bBtnTitle,
					dividerIndices: bDividers,
				});
			}
		} else if (messageParamsJson || options.messageParamsJson) {
			im.setMessageParamsJson(messageParamsJson || options.messageParamsJson);
		}

		const mergedContextInfo = {
			...contextInfo,
			...options.contextInfo,
		};

		return await im.sendTo(jid, {
			quoted: options.quoted,
			mentions: options.mentions || mentions,
			contextInfo: mergedContextInfo,
			ai: ai ?? options.ai,
			viewOnce: viewOnce ?? options.viewOnce,
			additionalNodes: additionalNodes || options.additionalNodes,
			messageId: options.messageId,
		});
	};

	sock.sendButton = sock.sendButtonMsg;
	sock.InteractiveMessage = InteractiveMessage;

	sock.newsletterMsg = async (key, content = {}, timeout = 5000) => {
		const { type: rawType = "INFO", name, description = "", picture = null, react, id, newsletter_id = key, ...media } = content;
		const type = rawType.toUpperCase();
		if (react) {
			if (!(newsletter_id.endsWith("@newsletter") || !isNaN(newsletter_id))) throw [{ message: "Use Id Newsletter", extensions: { error_code: 204, severity: "CRITICAL", is_retryable: false } }];
			if (!id) throw [{ message: "Use Id Newsletter Message", extensions: { error_code: 204, severity: "CRITICAL", is_retryable: false } }];
			const hasil = await sock.query({
				tag: "message",
				attrs: {
					to: key,
					type: "reaction",
					server_id: id,
					id: generateMessageID(),
				},
				content: [
					{
						tag: "reaction",
						attrs: {
							code: react,
						},
					},
				],
			});
			return hasil;
		} else if (media && typeof media === "object" && Object.keys(media).length > 0) {
			const msg = await generateWAMessageContent(media, { upload: sock.waUploadToServer });
			const anu = await sock.query({
				tag: "message",
				attrs: { to: newsletter_id, type: "text" in media ? "text" : "media" },
				content: [
					{
						tag: "plaintext",
						attrs: /image|video|audio|sticker|poll/.test(Object.keys(media).join("|")) ? { mediatype: Object.keys(media).find((key) => ["image", "video", "audio", "sticker", "poll"].includes(key)) || null } : {},
						content: proto.Message.encode(msg).finish(),
					},
				],
			});
			return anu;
		} else {
			if (/(FOLLOW|UNFOLLOW|DELETE)/.test(type) && !(newsletter_id.endsWith("@newsletter") || !isNaN(newsletter_id))) return [{ message: "Use Id Newsletter", extensions: { error_code: 204, severity: "CRITICAL", is_retryable: false } }];
			const _query = await sock.query(
				{
					tag: "iq",
					attrs: {
						to: "s.whatsapp.net",
						type: "get",
						xmlns: "w:mex",
					},
					content: [
						{
							tag: "query",
							attrs: {
								query_id: type == "FOLLOW" ? "9926858900719341" : type == "UNFOLLOW" ? "7238632346214362" : type == "CREATE" ? "6234210096708695" : type == "DELETE" ? "8316537688363079" : "6563316087068696",
							},
							content: new TextEncoder().encode(
								JSON.stringify({
									variables: /(FOLLOW|UNFOLLOW|DELETE)/.test(type)
										? { newsletter_id }
										: type == "CREATE"
											? { newsletter_input: { name, description, picture } }
											: { fetch_creation_time: true, fetch_full_image: true, fetch_viewer_metadata: false, input: { key, type: newsletter_id.endsWith("@newsletter") || !isNaN(newsletter_id) ? "JID" : "INVITE" } },
								}),
							),
						},
					],
				},
				timeout,
			);
			let parsed = null;
			try {
				const rawContent = _query?.content?.[0]?.content;
				const text = rawContent instanceof Uint8Array || Buffer.isBuffer(rawContent) ? new TextDecoder().decode(rawContent) : String(rawContent || "{}");
				parsed = JSON.parse(text);
			} catch {
				parsed = {};
			}
			const res = parsed?.data?.xwa2_newsletter || parsed?.data?.xwa2_newsletter_join_v2 || parsed?.data?.xwa2_newsletter_leave_v2 || parsed?.data?.xwa2_newsletter_create || parsed?.data?.xwa2_newsletter_delete_v2 || parsed?.errors || parsed;
			if (res?.thread_metadata) {
				res.thread_metadata.host = "https://mmg.whatsapp.net";
			}
			return res;
		}
	};

	sock.sendCarouselMsg = async (jid, body = "", footer = "", cards = [], options = {}) => {
		async function getImageMsg(url) {
			const { imageMessage } = await generateWAMessageContent({ image: { url } }, { upload: sock.waUploadToServer });
			return imageMessage;
		}
		const cardPromises = cards.map(async (a) => {
			const imageMessage = await getImageMsg(a.url);
			return {
				header: {
					imageMessage: imageMessage,
					hasMediaAttachment: true,
				},
				body: { text: a.body },
				footer: { text: a.footer },
				nativeFlowMessage: {
					buttons: a.buttons.map((b) => ({
						name: b.name,
						buttonParamsJson: JSON.stringify(b.buttonParamsJson ? JSON.parse(b.buttonParamsJson) : ""),
					})),
				},
			};
		});

		const cardResults = await Promise.all(cardPromises);
		const msg = await generateWAMessageFromContent(
			jid,
			{
				viewOnceMessage: {
					message: {
						messageContextInfo: {
							deviceListMetadata: {},
							deviceListMetadataVersion: 2,
						},
						interactiveMessage: proto.Message.InteractiveMessage.create({
							body: proto.Message.InteractiveMessage.Body.create({ text: body }),
							footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
							carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
								cards: cardResults,
								messageVersion: 1,
							}),
						}),
					},
				},
			},
			{},
		);
		const hasil = await sock.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id,
			additionalNodes: [
				{
					tag: "biz",
					attrs: { type: "native_flow", v: "1" },
					content: [
						{
							tag: "interactive",
							attrs: { type: "native_flow", v: "1" },
							content: [
								{
									tag: "native_flow",
									attrs: { v: "9", name: "mixed" },
								},
							],
						},
					],
				},
				...(options.additionalNodes || []),
			],
			...options,
		});
		return hasil;
	};

	sock.sendMessageV3 = async (jid, content = {}, options = {}) => {
		const { text, title = "", description = "", thumbnail, thumbnailUrl, sourceUrl, favicon, faviconMMSMetadata, contextInfo = {}, mentions = [] } = content;
		if ((thumbnailUrl || thumbnail) && text) {
			try {
				let compressedMedia;
				let meta = { width: 1024, height: 576 };
				const cacheKey = Buffer.isBuffer(thumbnail) ? crypto.createHash("md5").update(thumbnail).digest("hex") : thumbnailUrl || (typeof thumbnail === "string" ? thumbnail : null);
				if (cacheKey && thumbMediaCache.has(cacheKey)) {
					const cached = thumbMediaCache.get(cacheKey);
					compressedMedia = cached.compressedMedia;
					meta = cached.meta;
				} else {
					try {
						const image = await Jimp.read(thumbnailUrl || thumbnail);
						meta.width = image.bitmap.width;
						meta.height = image.bitmap.height;
						compressedMedia = await image.quality(90).getBuffer(Jimp.MIME_JPEG || "image/jpeg");
					} catch (error) {
						compressedMedia = thumbnailUrl ? { url: thumbnailUrl } : thumbnail;
					}
					if (cacheKey) {
						if (thumbMediaCache.size >= 50) thumbMediaCache.delete(thumbMediaCache.keys().next().value);
						thumbMediaCache.set(cacheKey, { compressedMedia, meta });
					}
				}
				const mediaPayload = Buffer.isBuffer(compressedMedia) ? { image: compressedMedia } : compressedMedia?.url || typeof compressedMedia === "string" ? { image: typeof compressedMedia === "string" ? { url: compressedMedia } : compressedMedia } : { image: compressedMedia };
				const { imageMessage: img } = await prepareWAMessageMedia(mediaPayload, { upload: sock.waUploadToServer, mediaTypeOverride: "thumbnail-link" });
				if (!img) throw new Error("prepareWAMessageMedia returned no imageMessage");
				let resolvedFaviconMMS = faviconMMSMetadata || options.faviconMMSMetadata;
				const favInput = favicon || options.favicon;
				if (!resolvedFaviconMMS && favInput) {
					try {
						const favMedia = Buffer.isBuffer(favInput) ? { image: favInput } : typeof favInput === "string" ? { image: { url: favInput } } : favInput;
						const { imageMessage: fav } = await prepareWAMessageMedia(favMedia, { upload: sock.waUploadToServer, mediaTypeOverride: "thumbnail-link" });
						if (fav) {
							resolvedFaviconMMS = {
								thumbnailDirectPath: fav.directPath,
								thumbnailSha256: fav.fileSha256,
								thumbnailEncSha256: fav.fileEncSha256,
								mediaKey: fav.mediaKey,
								mediaKeyTimestamp: fav.mediaKeyTimestamp,
								thumbnailHeight: fav.height || 48,
								thumbnailWidth: fav.width || 48,
							};
						}
					} catch {}
				}
				const linkUrl = sourceUrl || thumbnailUrl;
				const customContextInfo = {
					...contextInfo,
					...options.contextInfo,
					mentionedJid: options.mentions || mentions,
					...(options.quoted
						? {
								stanzaId: options.quoted.key?.id || options.quoted.id,
								remoteJid: options.quoted.key?.remoteJid || options.quoted.chat,
								participant: options.quoted.key?.participant || options.quoted.sender || options.quoted.key?.remoteJid || options.quoted.chat,
								fromMe: options.quoted.key?.fromMe ?? options.quoted.fromMe,
								quotedMessage: options.quoted.message || options.quoted.msg,
							}
						: {}),
				};
				const payloadMessage = {
					extendedTextMessage: {
						text: `${linkUrl}\n\n${text}`.trim(),
						matchedText: linkUrl,
						title,
						description,
						previewType: 0,
						renderLargerThumbnail: true,
						jpegThumbnail: img.jpegThumbnail,
						thumbnailDirectPath: img.directPath,
						thumbnailSha256: img.fileSha256,
						thumbnailEncSha256: img.fileEncSha256,
						mediaKey: img.mediaKey,
						mediaKeyTimestamp: img.mediaKeyTimestamp,
						thumbnailHeight: meta.height,
						thumbnailWidth: meta.width,
						...(resolvedFaviconMMS ? { faviconMMSMetadata: resolvedFaviconMMS } : {}),
						contextInfo: customContextInfo,
					},
				};
				const hasil = await sock.relayMessage(jid, payloadMessage, { messageId: generateMessageID(), ...options });
				return hasil;
			} catch {
				return await sock.sendMessage(jid, content, options);
			}
		} else {
			return await sock.sendMessage(jid, content, options);
		}
	};

	sock.createThumbnailLink = (anyMediaMessageContent, thumbnailContent = {}) => createThumbnailLink(sock, anyMediaMessageContent, thumbnailContent);
	sock.sendThumbnailLink = async (jid, anyMediaMessageContent, thumbnailContent = {}, options = {}) => {
		const msg = await createThumbnailLink(sock, anyMediaMessageContent, { ...thumbnailContent, ...options });
		return await sock.relayMessage(jid, msg, { messageId: options.messageId || generateMessageID(), ...options });
	};

	if (sock.user && sock.user.id) {
		const botNumber = sock.decodeJid(sock.user.id);
		if (global.db?.set?.[botNumber]) {
			sock.public = global.db.set[botNumber].public;
		} else sock.public = true;
	} else sock.public = true;

	return sock;
}

/*
 * Create By Naze
 * Follow https://github.com/nazedev
 * Whatsapp : https://whatsapp.com/channel/0029VaWOkNm7DAWtkvkJBK43
 */

const BOT_MESSAGE_TYPES = new Set(["templateMessage", "buttonsMessage", "listMessage", "interactiveMessage", "highlyStructuredMessage", "botInvokeMessage", "botTaskMessage", "botForwardedMessage", "richResponseMessage", "bcallMessage"]);

const isBotMessageType = (msg, topType) => {
	if (topType && BOT_MESSAGE_TYPES.has(topType)) return true;
	if (!msg || typeof msg !== "object") return false;
	const type = getContentType(msg) || Object.keys(msg)[0];
	if (!type) return false;
	if (BOT_MESSAGE_TYPES.has(type)) return true;
	const inner = msg[type];
	if (inner && typeof inner === "object") {
		if (inner.message && isBotMessageType(inner.message)) return true;
		if (inner.editedMessage && isBotMessageType(inner.editedMessage)) return true;
		if (inner.protocolMessage && isBotMessageType(inner.protocolMessage)) return true;
	}
	return false;
};

const getMessageContextInfo = (msgObj) => {
	if (!msgObj || typeof msgObj !== "object") return null;
	if (msgObj.messageContextInfo) return msgObj.messageContextInfo;
	const type = getContentType(msgObj) || Object.keys(msgObj)[0];
	if (!type) return null;
	const inner = msgObj[type];
	if (inner && typeof inner === "object") {
		if (inner.messageContextInfo) return inner.messageContextInfo;
		if (inner.message) return getMessageContextInfo(inner.message);
	}
	return null;
};

const isProtobufAnomaly = (msgInfo) => {
	if (!msgInfo || typeof msgInfo !== "object") return false;
	const ts = typeof msgInfo.messageTimestamp === "number" ? msgInfo.messageTimestamp : msgInfo.messageTimestamp?.low ? msgInfo.messageTimestamp.low : Number(msgInfo.messageTimestamp) || 0;
	if (ts > 100000000000) return true;
	const contextInfo = getMessageContextInfo(msgInfo.message);
	if (contextInfo && (contextInfo.botMetadata || contextInfo.botMessageSecret)) return true;
	const chatJid = msgInfo.key?.remoteJid || msgInfo.chat || "";
	const isFromMe = msgInfo.key ? msgInfo.key.fromMe : msgInfo.fromMe;
	if (chatJid.endsWith("@g.us") && !isFromMe) {
		const hasDeviceList = !!contextInfo?.deviceListMetadata;
		if (contextInfo && contextInfo.deviceListMetadataVersion && !hasDeviceList) return true;
	}
	return false;
};
function buttonSerialize(WAM) {
	if (!WAM) return undefined;
	let kind;
	let id;
	let displayText;
	let description;
	let index;

	const rawMsg = WAM?.message || WAM?.msg || WAM;
	const unwrapped = (typeof extractMessageContent === "function" ? extractMessageContent(rawMsg) : null) || rawMsg;
	const msgObj = unwrapped?.message ? (typeof extractMessageContent === "function" ? extractMessageContent(unwrapped.message) : null) || unwrapped.message : unwrapped;
	const msg = WAM?.msg || msgObj;

	const nativeFlowParams =
		msgObj?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
		msg?.nativeFlowResponseMessage?.paramsJson ||
		msgObj?.nativeFlowResponseMessage?.paramsJson ||
		rawMsg?.viewOnceMessage?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
		rawMsg?.viewOnceMessageV2?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;

	if (msgObj?.buttonsResponseMessage || msg?.selectedButtonId) {
		kind = "buttonsResponseMessage";
		id = msgObj?.buttonsResponseMessage?.selectedButtonId || msg?.selectedButtonId;
		displayText = msgObj?.buttonsResponseMessage?.selectedDisplayText || msg?.selectedDisplayText;
	} else if (msgObj?.templateButtonReplyMessage || msg?.selectedId) {
		kind = "templateButtonReplyMessage";
		id = msgObj?.templateButtonReplyMessage?.selectedId || msg?.selectedId;
		displayText = msgObj?.templateButtonReplyMessage?.selectedDisplayText || msg?.selectedDisplayText;
		index = msgObj?.templateButtonReplyMessage?.selectedIndex || msg?.selectedIndex;
	} else if (nativeFlowParams) {
		try {
			const json = typeof nativeFlowParams === "object" ? nativeFlowParams : JSON.parse(nativeFlowParams);
			kind = "nativeFlowResponseMessage";
			id = json?.id || json?.selected_id || json?.selectedId || "";
			displayText = msgObj?.interactiveResponseMessage?.body?.text || msg?.body?.text || json?.display_text || "";
			description = json?.description;
		} catch {}
	} else if (msgObj?.listResponseMessage || msg?.singleSelectReply?.selectedRowId) {
		kind = "listResponseMessage";
		id = msgObj?.listResponseMessage?.singleSelectReply?.selectedRowId || msg?.singleSelectReply?.selectedRowId;
		displayText = msgObj?.listResponseMessage?.title || msg?.title;
		description = msgObj?.listResponseMessage?.description || msg?.description;
	}

	if (!id) {
		id = extractNativeFlowResponseId(msg, rawMsg) || extractNativeFlowResponseId(msg, msgObj);
		if (id) {
			kind = "nativeFlowResponseMessage";
			displayText = extractNativeFlowResponseText(msg, rawMsg) || extractNativeFlowResponseText(msg, msgObj);
		}
	}

	if (!id) return undefined;
	return { kind, id, displayText, description, index };
}

function memberLabelSerialize(WAM) {
	if (!WAM) return undefined;
	const groupJid = WAM?.key?.remoteJid;
	const p1 = WAM?.key?.participant;
	const p2 = WAM?.key?.participantAlt;
	let authorLid = p1?.endsWith("@lid") ? p1 : p2?.endsWith("@lid") ? p2 : undefined;
	let authorPn = p1?.endsWith("@s.whatsapp.net") ? p1 : p2?.endsWith("@s.whatsapp.net") ? p2 : undefined;
	if (!authorLid && !authorPn) {
		authorLid = p1;
		authorPn = p2;
	}
	const rawProto = WAM?.message?.protocolMessage || (typeof extractMessageContent === "function" ? extractMessageContent(WAM?.message)?.protocolMessage : null) || WAM?.msg?.protocolMessage;
	const labelTimestamp = rawProto?.memberLabel?.labelTimestamp;
	const timestamp = typeof labelTimestamp?.toInt === "function" ? labelTimestamp.toInt() : typeof labelTimestamp?.low === "number" ? labelTimestamp.low : typeof labelTimestamp === "number" ? labelTimestamp : labelTimestamp ? Number(labelTimestamp) || undefined : undefined;
	const label = rawProto?.memberLabel?.label || undefined;

	return {
		groupJid,
		authorLid,
		authorPn,
		timestamp,
		label,
	};
}

async function Serialize(sock, msg, store) {
	const botLid = sock.user?.lid ? sock.decodeJid(sock.user.lid) : "";
	const botNumber = sock.user?.id ? sock.decodeJid(sock.user.id) : "";
	const m = { ...msg };
	if (!m) return m;
	if (m.key) {
		m.id = m.key.id;
		m.chat = m.key.remoteJidAlt || m.key.remoteJid;
		m.fromMe = m.key.fromMe;
		m.isGroup = m.chat.endsWith("@g.us");
		if (m.key.participant && m.key.participantAlt) registerLidPair(m.key.participant, m.key.participantAlt);
		if (m.key.remoteJid && m.key.remoteJidAlt) registerLidPair(m.key.remoteJid, m.key.remoteJidAlt);
		if (!m.isGroup && m.chat.endsWith("@lid")) m.chat = sock.findJidByLid(m.chat, store) || m.chat;
		m.sender = sock.decodeJid((m.fromMe && sock.user?.id) || m.key.participantAlt || m.key.participant || m.chat || "");
		if (m.isGroup) {
			if (!store.groupMetadata) store.groupMetadata = await sock.groupFetchAllParticipating().catch((e) => ({}));
			let metadata = store.groupMetadata[m.chat] ? store.groupMetadata[m.chat] : (store.groupMetadata[m.chat] = await sock.groupMetadata(m.chat).catch((e) => ({ ...store.groupMetadata[m.chat] })));
			if (!metadata) {
				metadata = await sock.groupMetadata(m.chat).catch((e) => ({ ...store.groupMetadata[m.chat] }));
				store.groupMetadata[m.chat] = metadata;
			}
			m.metadata = metadata;
			m.metadata.size = (metadata.participants || []).length;
			if (metadata.addressingMode === "lid") {
				const participant = metadata.participants.find((a) => a.id === m.sender || a.phoneNumber === m.sender);
				m.sender = participant?.phoneNumber || m.key.participantAlt || m.sender;
				m.metadata.owner = m.metadata?.participants?.find((p) => p.id === m.metadata.owner)?.id || m.metadata.owner;
				m.metadata.subjectOwner = m.metadata?.participants?.find((p) => p.id === m.metadata.subjectOwner)?.id || m.metadata.subjectOwner;
				if (!m.sender.endsWith("@g.us")) {
					store.contacts ??= {};
					store.contacts[m.sender] = {
						...(store.contacts[m.sender] || {}),
						id: jidNormalizedUser((m.fromMe && sock.user?.lid) || participant?.id || store.contacts[m.sender]?.id || m.sender),
						phoneNumber: jidNormalizedUser((m.fromMe && sock.user?.id) || participant?.phoneNumber || store.contacts[m.sender]?.phoneNumber || m.sender),
						name: (m.fromMe && sock.user?.name) || m.pushName,
					};
					if (store.contacts[m.sender].id && store.contacts[m.sender].phoneNumber) {
						registerLidPair(store.contacts[m.sender].id, store.contacts[m.sender].phoneNumber);
					}
				}
			}
			let _admins;
			Object.defineProperty(m, "admins", {
				get() {
					return (_admins ??= m.metadata?.participants ? m.metadata.participants.filter((p) => p.admin).map((p) => ({ id: p.id, phoneNumber: p.phoneNumber, admin: p.admin })) : []);
				},
				set(v) {
					_admins = v;
				},
				configurable: true,
				enumerable: true,
			});
			let _isAdmin;
			Object.defineProperty(m, "isAdmin", {
				get() {
					return (_isAdmin ??= Boolean(m.admins.some((a) => a.id === m.sender || a.phoneNumber === m.sender)));
				},
				set(v) {
					_isAdmin = v;
				},
				configurable: true,
				enumerable: true,
			});
			let _isBotAdmin;
			Object.defineProperty(m, "isBotAdmin", {
				get() {
					return (_isBotAdmin ??= Boolean(m.admins.some((a) => [botNumber, botLid].includes(a.id) || [botNumber, botLid].includes(a.phoneNumber))));
				},
				set(v) {
					_isBotAdmin = v;
				},
				configurable: true,
				enumerable: true,
			});
			let _group;
			Object.defineProperty(m, "group", {
				get() {
					if (_group) return _group;
					const p = m.metadata?.participants?.find((x) => x.id === m.sender || x.phoneNumber === m.sender || (m.key.participant && (x.id === m.key.participant || x.phoneNumber === m.key.participant)));
					const lbl = p?.label || m.metadata?.memberLabels?.[m.key.participant] || m.metadata?.memberLabels?.[m.sender] || undefined;
					return (_group = {
						admin: m.admins.find((a) => a.id === m.sender || a.phoneNumber === m.sender)?.admin,
						label: lbl,
					});
				},
				set(v) {
					_group = v;
				},
				configurable: true,
				enumerable: true,
			});
			let _memberLabel;
			Object.defineProperty(m, "memberLabel", {
				get() {
					if (_memberLabel !== undefined) return _memberLabel;
					const p = m.metadata?.participants?.find((x) => x.id === m.sender || x.phoneNumber === m.sender || (m.key.participant && (x.id === m.key.participant || x.phoneNumber === m.key.participant)));
					const lbl = p?.label || m.metadata?.memberLabels?.[m.key.participant] || m.metadata?.memberLabels?.[m.sender] || undefined;
					if (!lbl) return (_memberLabel = null);
					return (_memberLabel = {
						groupJid: m.chat,
						authorLid: m.key.participant,
						authorPn: m.sender,
						label: lbl,
						timestamp: p?.labelTimestamp,
					});
				},
				set(v) {
					_memberLabel = v;
				},
				configurable: true,
				enumerable: true,
			});
		} else {
			m.admins = [];
			m.isAdmin = false;
			m.isBotAdmin = false;
			m.group = {};
		}
		if (m.key.addressingMode === "lid") {
			if (!m.sender.endsWith("@g.us")) {
				store.contacts ??= {};
				store.contacts[m.sender] = {
					...(store.contacts[m.sender] || {}),
					id: jidNormalizedUser((m.fromMe && sock.user?.lid) || store.contacts[m.sender]?.id || m.key.remoteJid),
					phoneNumber: jidNormalizedUser((m.fromMe && sock.user?.id) || store.contacts[m.sender]?.phoneNumber || m.sender),
					name: (m.fromMe && sock.user?.name) || m.pushName,
				};
				if (store.contacts[m.sender].id && store.contacts[m.sender].phoneNumber) {
					registerLidPair(store.contacts[m.sender].id, store.contacts[m.sender].phoneNumber);
				}
			}
		}
		let _isBaileys;
		Object.defineProperty(m, "isBaileys", {
			get() {
				if (_isBaileys !== undefined) return _isBaileys;
				return (_isBaileys = m.id ? ["BAE", "B1E", "B24E"].some((a) => m.id.startsWith(a) && [12, 16, 20, 40].includes(m.id.length)) || /(.)\1{5,}|[^0-9A-F]/.test(m.id) : false);
			},
			set(v) {
				_isBaileys = v;
			},
			configurable: true,
			enumerable: true,
		});
		if (m.key?.id) {
			m.rawNode = global.nodeMap?.get(m.key.id) || null;
			m.node = m.rawNode;
		}
	}
	if (m.message) {
		const extracted = extractMessageContent(m.message) || m.message;
		m.type = getContentType(extracted) || getContentType(m.message) || Object.keys(m.message)[0];
		m.isViewOnce = Boolean(m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension);
		let inner = extracted[m.type] || m.message[m.type];
		m.msg = inner?.message ? inner.message[getContentType(inner.message) || Object.keys(inner.message)[0]] : inner?.editedMessage ? inner.editedMessage : extractMessageContent(inner) || inner;
		m.nativeFlowId = extractNativeFlowResponseId(m.msg, m.message);
		m.nativeFlowText = extractNativeFlowResponseText(m.msg, m.message);
		m.body =
			m.message?.conversation ||
			m.msg?.text ||
			m.msg?.conversation ||
			m.msg?.caption ||
			m.msg?.selectedButtonId ||
			m.msg?.singleSelectReply?.selectedRowId ||
			m.msg?.selectedId ||
			m.nativeFlowId ||
			(m.type === "editedMessage" || m.type === "protocolMessage" ? m.message[m.type]?.editedMessage?.extendedTextMessage?.text || m.message[m.type]?.editedMessage?.conversation || "" : "") ||
			m.msg?.contentText ||
			m.msg?.title ||
			m.msg?.name ||
			"";
		m.button = buttonSerialize(m);
		if (m.button?.id) {
			m.body = m.button.id;
		}
		const rawMsgProto = m.message?.protocolMessage || (typeof extractMessageContent === "function" ? extractMessageContent(m.message)?.protocolMessage : null) || m.msg?.protocolMessage;
		if (rawMsgProto?.type === proto.Message.ProtocolMessage?.Type?.GROUP_MEMBER_LABEL_CHANGE || !!rawMsgProto?.memberLabel) {
			const labelBase = memberLabelSerialize(msg);
			m.memberLabel = labelBase;
			m.group = m.group || {};
			m.group.label = labelBase?.label;
		}
		let _mentionedJid;
		Object.defineProperty(m, "mentionedJid", {
			get() {
				if (_mentionedJid) return _mentionedJid;
				const raw = m.msg?.contextInfo?.mentionedJid;
				return (_mentionedJid = raw?.map((a) => sock.findJidByLid(a, store, true)) || []);
			},
			set(v) {
				_mentionedJid = v;
			},
			configurable: true,
			enumerable: true,
		});
		m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.nativeFlowText || m.nativeFlowId || m.button?.displayText || m.button?.id || m.body || "";
		m.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.body) ? m.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(m.body) ? m.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : "";
		m.command = m.body && m.body.replace(m.prefix, "").trim().split(/ +/).shift();
		m.args =
			m.body
				?.trim()
				.replace(new RegExp("^" + m.prefix?.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, "\\$&"), "i"), "")
				.replace(m.command, "")
				.split(/ +/)
				.filter((a) => a) || [];
		let _device;
		Object.defineProperty(m, "device", {
			get() {
				return (_device ??= getDevice(m.id));
			},
			set(v) {
				_device = v;
			},
			configurable: true,
			enumerable: true,
		});
		m.expiration = m.msg?.contextInfo?.expiration || m?.metadata?.ephemeralDuration || store?.messages?.[m.chat]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0;
		let _suspicionScore;
		Object.defineProperty(m, "suspicionScore", {
			get() {
				if (_suspicionScore !== undefined) return _suspicionScore;
				if (m.isBaileys || isBotMessageType(m.message, m.type) || isProtobufAnomaly(msg)) {
					return (_suspicionScore = 100);
				}
				let score = 0;
				const context = m.msg?.contextInfo || {};
				const extAd = context.externalAdReply;
				const devMeta = context.deviceListMetadata;
				if (context.isForwarded && context.forwardingScore >= 999) score += 35;
				else if (extAd && extAd.forwardingScore > 999) score += 30;
				else if (context.forwardingScore > 100) score += 15;
				if (devMeta && !(devMeta.senderKeyHash || devMeta.recipientKeyHash) && Object.keys(devMeta).length === 0) score += 15;
				if ((context.mentionedJid || []).length > 20) score += 15;
				if (extAd && (extAd.sourceType === "newsletter" || extAd.sourceUrl?.includes("newsletter"))) score += 15;
				if (m.msg?.interactiveResponseMessage || m.msg?.listResponseMessage) score += 8;
				const botSymbols = m.text?.match(/[^\x00-\x7F]/g) || [];
				if (botSymbols.length > 10) score += 10;
				else if (botSymbols.length > 5) score += 5;
				return (_suspicionScore = Math.min(100, score));
			},
			set(v) {
				_suspicionScore = v;
			},
			configurable: true,
			enumerable: true,
		});
		m.timestamp = (typeof m.messageTimestamp === "number" ? m.messageTimestamp : m.messageTimestamp?.low ? m.messageTimestamp.low : Number(m.messageTimestamp) || 0) || (m.msg?.timestampMs ? m.msg.timestampMs * 1000 : 0) || Math.floor(Date.now() / 1000);
		if (m.isMedia) {
			m.mime = m.msg?.mimetype;
			m.size = m.msg?.fileLength;
			m.height = m.msg?.height || "";
			m.width = m.msg?.width || "";
			if (/webp/i.test(m.mime)) {
				m.isAnimated = m.msg?.isAnimated;
			}
		}
		let _quoted;
		Object.defineProperty(m, "quoted", {
			get() {
				if (_quoted !== undefined) return _quoted;
				if (!m.msg?.contextInfo?.quotedMessage) {
					return (_quoted = null);
				}
				let qMsg = JSON.parse(JSON.stringify(m.msg.contextInfo.quotedMessage));
				const botPn = sock.user?.id ? sock.decodeJid(sock.user.id) : "";
				const botLid = sock.user?.lid ? sock.decodeJid(sock.user.lid) : "";
				const resolvedBotLid = botLid ? sock.findJidByLid(botLid, store, true) || botLid : "";

				let rawQuotedParticipant = m.msg?.contextInfo?.participant || "";
				if (!rawQuotedParticipant && !m.isGroup) {
					rawQuotedParticipant = m.fromMe ? m.chat : botPn || botLid || "";
				}

				const resolvedQuotedParticipant = rawQuotedParticipant && rawQuotedParticipant.endsWith("@lid") ? sock.findJidByLid(rawQuotedParticipant, store, true) || rawQuotedParticipant : rawQuotedParticipant;
				if (rawQuotedParticipant && rawQuotedParticipant !== resolvedQuotedParticipant) {
					m.msg.contextInfo.participant = resolvedQuotedParticipant;
				}

				const isQuotedFromMe = Boolean(
					m.msg?.contextInfo?.fromMe ||
					m.msg?.contextInfo?.isFromMe ||
					(!m.isGroup && !m.fromMe && !m.msg?.contextInfo?.participant) ||
					(botPn && (areJidsSameUser(rawQuotedParticipant, botPn) || areJidsSameUser(resolvedQuotedParticipant, botPn) || (resolvedBotLid && areJidsSameUser(resolvedQuotedParticipant, resolvedBotLid)))) ||
					(botLid && (areJidsSameUser(rawQuotedParticipant, botLid) || areJidsSameUser(resolvedQuotedParticipant, botLid))),
				);

				const quotedObj = {
					...qMsg,
					message: extractMessageContent(qMsg) || qMsg,
					type: getContentType(qMsg) || Object.keys(qMsg)[0],
					id: m.msg.contextInfo.stanzaId,
					chat: m.msg.contextInfo.remoteJid || m.chat,
					sender: sock.decodeJid(resolvedQuotedParticipant || rawQuotedParticipant),
					fromMe: isQuotedFromMe,
					text: qMsg?.conversation || qMsg?.caption || "",
				};
				quotedObj.key = {
					remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
					participant: quotedObj.sender,
					fromMe: isQuotedFromMe,
					id: m.msg?.contextInfo?.stanzaId,
				};
				quotedObj.msg = extractMessageContent(qMsg[quotedObj.type]) || qMsg[quotedObj.type];
				quotedObj.device = getDevice(quotedObj.id);
				quotedObj.fromMe = isQuotedFromMe;
				quotedObj.mentionedJid = quotedObj?.msg?.contextInfo?.mentionedJid?.map((a) => sock.findJidByLid(a, store, true)) || [];
				quotedObj.nativeFlowId = extractNativeFlowResponseId(quotedObj.msg, quotedObj.message);
				quotedObj.nativeFlowText = extractNativeFlowResponseText(quotedObj.msg, quotedObj.message);
				quotedObj.body =
					quotedObj.message?.conversation ||
					quotedObj.msg?.text ||
					quotedObj.msg?.conversation ||
					quotedObj.msg?.caption ||
					quotedObj.msg?.selectedButtonId ||
					quotedObj.msg?.singleSelectReply?.selectedRowId ||
					quotedObj.msg?.selectedId ||
					quotedObj.nativeFlowId ||
					(quotedObj.type === "editedMessage" || quotedObj.type === "protocolMessage" ? quotedObj.message[quotedObj.type]?.editedMessage?.extendedTextMessage?.text || quotedObj.message[quotedObj.type]?.editedMessage?.conversation || "" : "") ||
					quotedObj.msg?.contentText ||
					quotedObj.msg?.title ||
					quotedObj.msg?.name ||
					"";

				quotedObj.isBaileys = quotedObj.id ? ["BAE", "B1E", "B24E"].some((a) => quotedObj.id.startsWith(a) && [12, 16, 20, 40].includes(quotedObj.id.length)) || /(.)\1{5,}|[^0-9A-F]/.test(quotedObj.id) : false;
				let qsScore = 0;
				if (quotedObj.isBaileys || isBotMessageType(quotedObj.message, quotedObj.type) || isProtobufAnomaly(quotedObj)) {
					qsScore = 100;
				}
				quotedObj.suspicionScore = qsScore;
				quotedObj.isBot = qsScore >= 60 && !quotedObj.fromMe;
				quotedObj.getQuotedObj = async () => {
					if (!quotedObj.id) return null;
					let q = await global.loadMessage(m.chat, quotedObj.id, sock);
					if (q) {
						return await Serialize(sock, q, store);
					} else {
						return null;
					}
				};
				quotedObj.isGroup = quotedObj.chat.endsWith("@g.us");
				if (quotedObj.isGroup) {
					const qMeta = store?.groupMetadata?.[quotedObj.chat] || global.store?.groupMetadata?.[quotedObj.chat];
					const qParticipant = qMeta?.participants?.find((p) => p.id === quotedObj.sender || p.phoneNumber === quotedObj.sender || (rawQuotedParticipant && (p.id === rawQuotedParticipant || p.phoneNumber === rawQuotedParticipant)));
					const qLabel = qParticipant?.label || qMeta?.memberLabels?.[rawQuotedParticipant] || qMeta?.memberLabels?.[quotedObj.sender] || undefined;
					quotedObj.group = {
						admin: qParticipant?.admin || undefined,
						label: qLabel,
					};
					quotedObj.memberLabel = qLabel;
				}
				quotedObj.mentions = quotedObj.msg?.contextInfo?.mentionedJid || [];
				quotedObj.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(quotedObj.body) ? quotedObj.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : /[\uD800-\uDBFF][\uDC00-\uDFFF]/gi.test(quotedObj.body) ? quotedObj.body.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/gi)[0] : "";
				quotedObj.command = quotedObj.body && quotedObj.body.replace(quotedObj.prefix, "").trim().split(/ +/).shift();
				quotedObj.isMedia = !!quotedObj.msg?.mimetype || !!quotedObj.msg?.thumbnailDirectPath;
				if (quotedObj.isMedia) {
					quotedObj.fileSha256 = quotedObj[quotedObj.type]?.fileSha256 || "";
					quotedObj.mime = quotedObj.msg?.mimetype;
					quotedObj.size = quotedObj.msg?.fileLength;
					quotedObj.height = quotedObj.msg?.height || "";
					quotedObj.width = quotedObj.msg?.width || "";
					if (/webp/i.test(quotedObj.mime)) {
						quotedObj.isAnimated = quotedObj?.msg?.isAnimated || false;
					}
				}
				quotedObj.fakeObj = () => ({
					key: {
						remoteJid: quotedObj.chat,
						fromMe: quotedObj.fromMe,
						id: quotedObj.id,
					},
					message: quotedObj,
					...(m.isGroup ? { participant: quotedObj.sender } : {}),
				});
				quotedObj.download = () => sock.downloadMediaMessage(quotedObj);
				quotedObj.delete = () => {
					sock.sendMessage(quotedObj.chat, {
						delete: {
							remoteJid: quotedObj.chat,
							fromMe: m.isBotAdmin ? false : true,
							id: quotedObj.id,
							participant: quotedObj.sender,
						},
					});
				};

				return (_quoted = quotedObj);
			},
			set(val) {
				_quoted = val;
			},
			configurable: true,
			enumerable: true,
		});
	}

	m.download = () => sock.downloadMediaMessage(m);

	m.copy = () => Serialize(sock, JSON.parse(JSON.stringify(m)), store);

	m.react = (u) => sock.sendMessage(m.chat, { react: { text: u, key: m.key } });

	m.reply = async (content, options = {}) => {
		const { quoted = m, chat = m.chat, caption = "", mentions = [], ephemeralExpiration = m.expiration || m?.metadata?.ephemeralDuration || store?.messages[m.chat]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0, ...validate } = options;
		const textBody = typeof content === "string" ? content : content.text || content.caption || "";
		const providedMentions = Array.isArray(mentions) ? mentions : [];
		const extractedMentions = [...textBody.matchAll(/@(\d{5,16})/g)].map((v) => v[1] + "@s.whatsapp.net");
		const fixMentions = [...new Set([...providedMentions, ...extractedMentions])];
		if (typeof content === "object") {
			return sock.sendMessage(chat, content, { ...validate, quoted, ephemeralExpiration });
		} else if (typeof content === "string") {
			try {
				if (/^https?:\/\//.test(content)) {
					const res = await fetch(content, { method: "HEAD" }).catch(() => null);
					const mime = res?.headers?.get?.("content-type") || "";
					if (/gif|image|video|audio|pdf|stream/i.test(mime)) {
						let type = /image/.test(mime) ? "image" : /video/.test(mime) ? "video" : /audio/.test(mime) ? "audio" : "document";
						return sock.sendMessage(chat, { [type]: { url: content }, caption, mimetype: mime, ...validate }, { quoted, ephemeralExpiration });
					} else {
						return sock.sendMessage(chat, { text: content, mentions: fixMentions, ...validate }, { quoted, ephemeralExpiration });
					}
				} else {
					return sock.sendMessage(chat, { text: content, mentions: fixMentions, ...validate }, { quoted, ephemeralExpiration });
				}
			} catch (e) {
				return sock.sendMessage(chat, { text: content, mentions: fixMentions, ...validate }, { quoted, ephemeralExpiration });
			}
		}
	};

	return m;
}

export {
	GroupUpdate,
	GroupParticipantsUpdate,
	LoadDataBase,
	MessagesUpsert,
	Solving,
	Serialize,
	updateLidMapping,
	lidMap,
	InteractiveMessage,
	normalizeNativeFlowButton,
	extractNativeFlowResponseId,
	extractNativeFlowResponseText,
	buttonSerialize,
	memberLabelSerialize,
	createThumbnailLink,
	resolveUsername,
	usernameMap,
};

const watcher = chokidar.watch(nazePath, {
	ignored: /^\./,
	persistent: true,
	awaitWriteFinish: {
		stabilityThreshold: 100,
		pollInterval: 100,
	},
});

watcher.on("change", async (filePath) => {
	console.log(chalk.yellowBright(`[UPDATE] ${filePath}`));
	await reloadHandler();
});
