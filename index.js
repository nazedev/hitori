import "./settings.js";
import fs from "fs";
import dns from "dns";
import pino from "pino";
import path from "path";
import chalk from "chalk";
import cron from "node-cron";
import readline from "readline";
import { Readable } from "stream";
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import { fileURLToPath } from "url";
import qrcode from "qrcode-terminal";
import { parsePhoneNumber } from "awesome-phonenumber";
import baileys, { Browsers, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestWaWebVersion } from "baileys";

import { setupDashboard } from "./src/server.js";
import { useCustomAuthState } from "./src/auth.js";
import { showBanner, logSuccess, logInfo } from "./src/cli/helpers.js";
import { dataBase, cmdDel, checkStatus, checkExpired } from "./src/database.js";
import { GroupParticipantsUpdate, MessagesUpsert, Solving } from "./src/message.js";
import { assertInstalled, customDispatcher, compressMessage, decompressMessage } from "./lib/function.js";

const WAConnection = baileys.default || baileys.makeWASocket || baileys;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pairingCode = process.argv.includes("--qr") ? false : process.argv.includes("--pairing-code") || global.pairing_code;
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const tempDir = path.join(__dirname, "database/temp");
const time_now = new Date();
const time_end = 60000 - (time_now.getSeconds() * 1000 + time_now.getMilliseconds());
let pairingStarted = false;
let setupServer = null;
let phoneNumber;

if (global.dns_use === "custom") {
	try {
		dns.setServers(["8.8.8.8", "1.1.1.1"]);
		logInfo("Custom DNS Google & Cloudflare initialized.");
	} catch (e) {
		logInfo("Failed to set custom DNS: " + e.message);
	}
}

// Fetch Api
global.fetchApi = async (endpoint = "/", data = {}, options = {}) => {
	return new Promise(async (resolve, reject) => {
		try {
			const apiList = Object.keys(global.APIs);
			if (options.api !== undefined) {
				if (typeof options.api !== "number" || options.api < 1 || options.api > apiList.length) {
					return reject(new Error(`[Fetch Error] Parameter { api: ${options.api} } tidak terdaftar. Harap gunakan angka 1 hingga ${apiList.length}.`));
				}
			}
			const apiName = typeof options.api === "number" ? apiList[options.api - 1] : options.name;
			const base = apiName ? global.APIs[apiName] || apiName : global.APIs.naze;
			const apikey = global.APIKeys[base] || "";
			let method = (options.method || "GET").toUpperCase();
			let url = base + endpoint;
			let payload = null;
			let headers = options.headers || {
				"user-agent": "Mozilla/5.0 (Linux; Android 15)",
			};
			const isForm = options.form || data instanceof FormData;
			if (isForm) {
				payload = data;
				method = "POST";
				headers = {
					...(options.headers?.["Authorization"] ? {} : { apikey }),
					...headers,
				};
			} else if (method !== "GET") {
				payload = JSON.stringify({
					...data,
					...(options.headers?.["Authorization"] ? {} : { apikey }),
				});
				headers["content-type"] = "application/json";
			} else {
				url += "?" + new URLSearchParams({ ...data, apikey }).toString();
			}
			const fetchOptions = { method, headers, dispatcher: customDispatcher };
			if (method !== "GET" && method !== "HEAD") fetchOptions.body = payload;
			const res = await fetch(url, fetchOptions);
			if (!res.ok) {
				let errorData = "";
				try { errorData = await res.text(); } catch (e) {}
				throw new Error(`API Request Failed!\nURL: ${url}\nStatus: ${res.status} ${res.statusText}\nResponse: ${errorData || "No error message provided by server."}`);
			}

			if (options.stream) {
				let ext = options.ext;
				if (typeof options.stream !== "string" && !ext) {
					const contentDisp = res.headers.get("content-disposition");
					const contentType = res.headers.get("content-type");
					if (contentDisp && contentDisp.includes("filename=")) {
						const match = contentDisp.match(/filename="?([^"]+)"?/);
						if (match && match[1]) {
							ext = match[1].split(".").pop();
						}
					}
					if (!ext && contentType) {
						ext = contentType.split("/")[1]?.split(";")[0];
						if (ext === "jpeg") ext = "jpg";
					}
					ext = ext || "tmp";
				}
				let streamPath = typeof options.stream === "string" ? options.stream : path.join(process.cwd(), "database/temp", "temp-" + Date.now() + "." + ext);
				const writeStream = fs.createWriteStream(streamPath);
				Readable.fromWeb(res.body).pipe(writeStream);
				writeStream.on("finish", () => resolve(streamPath));
				writeStream.on("error", reject);
			} else {
				if (options.buffer) {
					resolve(Buffer.from(await res.arrayBuffer()));
				} else {
					const responseType = options.responseType || options.type || "json";
					if (responseType === "json") resolve(await res.json());
					else if (responseType === "text") resolve(await res.text());
					else resolve(await res.arrayBuffer());
				}
			}
		} catch (e) {
			reject(e);
		}
	});
};

let mainPath = global.database.path || global.database.url || "nazedev";
const isUrl = /^(mongodb|mysql|postgres|postgresql)(\+srv)?:\/\//i.test(mainPath);
if (!isUrl) {
	const forbiddenPaths = ["temp", "clonebot", "backup", "node_modules"];
	if (forbiddenPaths.includes(mainPath.trim().toLowerCase())) {
		console.log(chalk.redBright(`[WARNING] The database folder name "${mainPath}" is reserved by the system. Reverting to default directory ("nazedev") to prevent data loss.`));
		mainPath = "nazedev";
	}
}
const options = global.database.options || {};

const getPath = (configOption, defaultLocal) => {
	if (configOption === true) return isUrl ? mainPath : path.join(mainPath, defaultLocal);
	if (configOption === false) return defaultLocal;
	if (typeof configOption === "object" && (configOption.path || configOption.url)) return configOption.path || configOption.url;
	if (typeof configOption === "string") return isUrl ? configOption : path.join(mainPath, configOption);
	if (isUrl && configOption === undefined) return mainPath;
	return isUrl ? mainPath : path.join(mainPath, defaultLocal);
};
const sessionPath = mainPath;
const storePath = getPath(options.store, "baileys_store.json");
const dbPath = getPath(options.database, "database.json");

const storeDB = dataBase(storePath, "store");
const database = dataBase(dbPath, "database");
const msgRetryCounterCache = new NodeCache({
	stdTTL: 60 * 60,
	useClones: false,
});

if (fs.existsSync(tempDir)) {
	fs.readdirSync(tempDir).forEach((file) => {
		fs.unlinkSync(path.join(tempDir, file));
	});
	logSuccess("Temp folder cleared successfully!");
} else {
	fs.mkdirSync(tempDir, { recursive: true });
}

assertInstalled(process.platform === "win32" ? "where ffmpeg" : "command -v ffmpeg", "FFmpeg", 0);
logSuccess("All external dependencies are satisfied");

showBanner();

async function startNazeBot() {
	try {
		const loadData = await database.read();
		const storeLoadData = await storeDB.read();
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
		};
		if (!loadData || Object.keys(loadData).length === 0) {
			await database.write(global.db);
		}
		global.store = {
			contacts: {},
			presences: {},
			messages: {},
			groupMetadata: {},
			...(storeLoadData || {}),
		};
		if (!storeLoadData || Object.keys(storeLoadData).length === 0) {
			await storeDB.write(global.store);
		}
		if (global.store.messages) {
			for (const jid in global.store.messages) {
				if (Array.isArray(global.store.messages[jid]?.array)) {
					global.store.messages[jid].array = global.store.messages[jid].array.map((m) => decompressMessage(m)).filter(Boolean);
				}
			}
		}

		global.loadMessage = function (remoteJid, id) {
			const messages = global.store.messages?.[remoteJid]?.array;
			if (!messages) return null;
			for (const m of messages) {
				const msgObj = decompressMessage(m);
				if (msgObj?.key?.id === id) return msgObj;
			}
			return null;
		};
		if (global.store) global.store.loadMessage = global.loadMessage;

		if (!global._gcInterval) {
			global._gcInterval = setInterval(
				() => {
					if (typeof global.gc === "function") {
						global.gc();
					}
				},
				5 * 60 * 1000,
			); // 5 menit
		}

		if (!global._dbInterval) {
			global._dbInterval = setInterval(
				async () => {
					if (global.db) await database.write(global.db);
					if (global.store) await storeDB.write(global.store);
				},
				3 * 60 * 1000,
			); // 3 Menit
		}
	} catch (e) {
		console.log(e);
		process.exit(1);
	}

	const level = pino({ level: "silent" });
	const { version } = await fetchLatestWaWebVersion();
	if (pairingCode && !phoneNumber && !fs.existsSync("./nazedev/creds.json")) {
		fs.rmSync("./nazedev", { recursive: true, force: true });
		async function getPhoneNumber() {
			phoneNumber = global.number_bot ? global.number_bot : process.env.BOT_NUMBER || (await question("Please type your WhatsApp number : "));
			phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
			if (!parsePhoneNumber("+" + phoneNumber).valid && phoneNumber.length < 6) {
				console.log(chalk.bgBlack(chalk.redBright("Start with your Country WhatsApp code") + chalk.whiteBright(",") + chalk.greenBright(" Example : 62xxx")));
				await getPhoneNumber();
			}
		}
		await getPhoneNumber();
		console.log("Phone number captured. Waiting for Connection...\n" + chalk.blueBright("Estimated time: around 2 ~ 5 minutes"));
	}
	const { state, saveCreds } = await useCustomAuthState(sessionPath);
	const getMessage = async (key) => {
		if (global.store) {
			const msg = await global.loadMessage(key.remoteJid, key.id);
			return msg?.message || "";
		}
		return {
			conversation: "Halo Saya Naze Bot",
		};
	};

	// Connector
	const sock = WAConnection({
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

	await Solving(sock, global.store);

	sock.ev.on("creds.update", saveCreds);

	sock.ev.on("connection.update", async (update) => {
		const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
		if ((connection === "connecting" || !!qr) && pairingCode && phoneNumber && !sock.authState.creds.registered && !pairingStarted) {
			pairingStarted = true;
			setTimeout(async () => {
				try {
					console.log("Requesting Pairing Code...");
					const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
					let code = await sock.requestPairingCode(phoneNumber, "NAZE" + randomPart);
					code = code?.match(/.{1,4}/g)?.join("-") || code;
					console.log(chalk.blue("Your Pairing Code :"), chalk.green(code), "\n", chalk.yellow("Expires in 15 second"));
				} catch (err) {
					console.log(chalk.redBright("[ERROR] Failed to retrieve the Pairing Code:"), err.message);
					pairingStarted = false;
				}
			}, 3000);
		}
		if (connection === "close") {
			pairingStarted = false;
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode;

			const reconnect = () => {
				setTimeout(() => {
					startNazeBot();
				}, 3000);
			};

			if (reason === DisconnectReason.connectionLost) {
				console.log("Connection to Server Lost, Attempting to Reconnect...");
				reconnect();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, Attempting to Reconnect...");
				reconnect();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required...");
				reconnect();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection Timed Out, Attempting to Reconnect...");
				reconnect();
			} else if (reason === DisconnectReason.badSession) {
				console.log("Delete Session and Scan again...");
				reconnect();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Close current Session first...");
			} else if (reason === DisconnectReason.loggedOut) {
				console.log("Scan again and Run...");
				fs.rmSync("./nazedev", { recursive: true, force: true });
				process.exit(0);
			} else if (reason === DisconnectReason.forbidden) {
				console.log("Connection Failure, Scan again and Run...");
				fs.rmSync("./nazedev", { recursive: true, force: true });
				process.exit(1);
			} else if (reason === DisconnectReason.multideviceMismatch) {
				console.log("Scan again...");
				fs.rmSync("./nazedev", { recursive: true, force: true });
				process.exit(0);
			} else {
				sock.end(`Unknown DisconnectReason : ${reason}|${connection}`);
			}
		}
		if (connection == "open") {
			console.log("Connected to : " + JSON.stringify(sock.user, null, 2));
			let botNumber = await sock.decodeJid(sock.user.id);
			if (global.db?.set[botNumber] && !global.db?.set[botNumber]?.join) {
				if (global.my.ch.length > 0 && global.my.ch.includes("@newsletter")) {
					if (global.my.ch) await sock.newsletterMsg(global.my.ch, { type: "follow" }).catch((e) => {});
					global.db.set[botNumber].join = true;
				}
			}
		}
		if (qr) {
			if (!pairingCode) qrcode.generate(qr, { small: true });
		}
		if (isNewLogin) console.log(chalk.green("[INFO] New device login detected..."));
		if (receivedPendingNotifications == "true") {
			console.log(chalk.green("[INFO] Please wait About 1 Minute..."));
			sock.ev.flush();
		}
	});

	sock.ev.on("call", async (call) => {
		let botNumber = await sock.decodeJid(sock.user.id);
		if (global.db?.set[botNumber]?.anticall) {
			for (let id of call) {
				if (id.status === "offer") {
					let msg = await sock.sendMessage(id.from, {
						text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? "Video" : "Suara"}.\nJika @${id.from.split("@")[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`,
						mentions: [id.from],
					});
					await sock.sendContact(id.from, global.owner, msg);
					await sock.rejectCall(id.id, id.from);
				}
			}
		}
	});

	sock.ev.on("messages.upsert", async (message) => {
		await MessagesUpsert(sock, message, global.store);
	});

	sock.ev.on("group-participants.update", async (update) => {
		await GroupParticipantsUpdate(sock, update, global.store);
	});
	sock.ev.on("groups.update", (update) => {
		for (const n of update) {
			if (global.store.groupMetadata[n.id]) {
				Object.assign(global.store.groupMetadata[n.id], n);
			} else global.store.groupMetadata[n.id] = n;
		}
	});

	sock.ev.on("presence.update", (update) => {
		const { id, presences } = update;
		global.store.presences[id] = global.store.presences?.[id] || {};
		for (const jid in presences) {
			presences[jid].timestamp = Date.now();
		}
		Object.assign(global.store.presences[id], presences);
	});

	// Reset Limit & Backup
	cron.schedule(
		"00 00 * * *",
		async () => {
			cmdDel(global.db.hit);
			console.log(chalk.cyan("[INFO] Reseted Limit Users"));
			let user = Object.keys(global.db.users);
			let botNumber = await sock.decodeJid(sock.user.id);
			for (let jid of user) {
				const limitUser = global.db.users[jid].vip ? global.limit.vip : checkStatus(jid, global.db.premium) ? global.limit.premium : global.limit.free;
				if (global.db.users[jid].limit < limitUser) global.db.users[jid].limit = limitUser;
			}
			if (global.db?.set[botNumber].autobackup) {
				let datanya = "./database/" + dbPath;
				if (/^(mongodb|mysql|postgres)/i.test(dbPath)) {
					datanya = "./database/backup_database.json";
					fs.writeFileSync(datanya, JSON.stringify(global.db, null, 2), "utf-8");
				}
				for (let o of global.owner) {
					try {
						await sock.sendMessage(o, {
							document: fs.readFileSync(datanya),
							mimetype: "application/json",
							fileName: new Date().toISOString().replace(/[:.]/g, "-") + "_database.json",
						});
						console.log(chalk.cyanBright(`[AUTO BACKUP] Backup success send to ${o}`));
					} catch (error) {
						console.error(chalk.cyanBright(`[AUTO BACKUP] Failed to Sending Backup ${o}:`, error));
					}
				}
			}
		},
		{
			scheduled: true,
			timezone: global.timezone,
		},
	);

	// Waktu Sholat
	if (!global.intervalSholat) global.intervalSholat = null;
	if (!global.waktusholat) global.waktusholat = {};
	if (global.intervalSholat) clearInterval(global.intervalSholat);
	setTimeout(() => {
		global.intervalSholat = setInterval(async () => {
			const sekarang = new Date();
			const jamSholat = sekarang.toLocaleTimeString("en-GB", { timeZone: global.timezone, hour: "2-digit", minute: "2-digit" });
			const hariIni = sekarang.toLocaleDateString("en-CA", { timeZone: global.timezone });
			const detik = sekarang.toLocaleTimeString("en-GB", { timeZone: global.timezone, hour12: false }).split(":")[2];
			if (detik !== "00") return;
			for (const [sholat, waktu] of Object.entries(global.jadwalSholat)) {
				if (jamSholat === waktu && global.waktusholat[sholat] !== hariIni) {
					global.waktusholat[sholat] = hariIni;
					for (const [idnya, settings] of Object.entries(global.db.groups)) {
						if (settings.waktusholat) {
							await sock
								.sendMessage(
									idnya,
									{
										text: `Waktu *${sholat}* telah tiba, ambilah air wudhu dan segeralah shalat🙂.\n\n*${waktu.slice(0, 5)}*\n_untuk wilayah ${global.timezone} dan sekitarnya._`,
									},
									{
										ephemeralExpiration: store?.messages[idnya]?.array?.slice(-1)[0]?.metadata?.ephemeralDuration || 0,
									},
								)
								.catch((e) => {});
						}
					}
				}
			}
		}, 60000);
	}, time_end);

	if (!global._dbPresence) {
		if (global?.db?.premium) checkExpired(global.db.premium);
		if (global?.db?.sewa && sock?.user?.id) checkExpired(global.db.sewa, sock);
		global._dbPresence = setInterval(
			async () => {
				if (sock?.user?.id) await sock.sendPresenceUpdate("available", sock.decodeJid(sock.user.id)).catch((e) => {});
			},
			60 * 60 * 1000,
		);
	}

	if (!setupServer && database && sock) {
		setupServer = await setupDashboard(database, storeDB, sock);
	}

	return sock;
}

startNazeBot();

const cleanup = async (signal) => {
	console.log(chalk.greenBright(`[SYSTEM] Received ${signal}. Menyimpan database...`));
	if (global.db) await database.write(global.db);
	if (global.store) await storeDB.write(global.store);
	process.exit(0);
};

process.on("uncaughtException", function (err) {
	console.error(chalk.redBright("[UNCAUGHT EXCEPTION]"), err);
});

process.on("unhandledRejection", function (err) {
	console.error(chalk.redBright("[UNHANDLED REJECTION]"), err);
});

process.on("SIGINT", () => cleanup("SIGINT"));
process.on("SIGTERM", () => cleanup("SIGTERM"));
process.on("exit", () => cleanup("exit"));
