import fs from "fs";
import dns from "dns";
import path from "path";
import chalk from "chalk";
import crypto from "crypto";
import { Jimp } from "jimp";
import { Agent } from "undici";
import unzipper from "unzipper";
import { Readable } from "stream";
import baileys, { proto } from "baileys";
import { exec, execSync } from "child_process";

const SERVER_ZIP = "https://github.com/nazedev/hitori/archive/refs/heads/master.zip";
const VERSION_URL = "https://raw.githubusercontent.com/nazedev/hitori/master/package.json";

const ROOT_DIR = process.cwd();

const WHITELIST = ["node_modules", "database", "nazedev", ".env", "settings.js"];

const errorCache = {};

const unsafeAgent = new Agent({ connect: { rejectUnauthorized: false } });
const customDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

const usedCommandRecently = new Set();

const antiSpam = {
	isFiltered: (from) => !!usedCommandRecently.has(from),
	addFilter: (from) => {
		usedCommandRecently.add(from);
		setTimeout(() => usedCommandRecently.delete(from), 5000);
	},
};

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`;
};

const getBuffer = async (url, options = {}) => {
	let bufferData = null;
	let fetchResponse = null;
	try {
		fetchResponse = await fetch(url, { headers: options.headers || {}, dispatcher: unsafeAgent, ...options });
		bufferData = Buffer.from(await fetchResponse.arrayBuffer());
		return bufferData;
	} catch (err) {
		return err;
	} finally {
		bufferData = null;
		fetchResponse = null;
	}
};

const getStream = async (url, options = {}) => {
	try {
		const fetchResponse = await fetch(url, { headers: options.headers || {}, dispatcher: unsafeAgent, ...options });
		if (!fetchResponse.body) throw new Error("Response body is empty");
		return {
			stream: Readable.fromWeb(fetchResponse.body),
			type: fetchResponse.headers.get("content-type"),
		};
	} catch (err) {
		return { stream: null, type: null, err };
	}
};

const fetchJson = async (url, options = {}) => {
	try {
		const res = await fetch(url, { dispatcher: unsafeAgent });
		const anu = await res.json();
		return anu;
	} catch (e) {
		return e;
	}
};

const runtime = function (seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor((seconds % (3600 * 24)) / 3600);
	var m = Math.floor((seconds % 3600) / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
	var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
	var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
	var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
	return dDisplay + hDisplay + mDisplay + sDisplay;
};

const clockString = (ms) => {
	let h = isNaN(ms) ? "--" : Math.floor(ms / 3600000);
	let m = isNaN(ms) ? "--" : Math.floor(ms / 60000) % 60;
	let s = isNaN(ms) ? "--" : Math.floor(ms / 1000) % 60;
	return [h, m, s].map((v) => v.toString().padStart(2, 0)).join(":");
};

const sleep = async (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

const extractUrl = (text, priorityDomain) => {
	if (!text) return null;
	if (Array.isArray(text)) text = text.join(" ");
	if (typeof text !== "string") text = String(text);
	const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
	const matches = text.match(urlRegex);
	if (!matches || matches.length === 0) return null;

	const ignorePatterns = [/tiktoklite/i, /play\.google\.com/i, /apps\.apple\.com/i, /itunes\.apple\.com/i, /support\.google\.com/i, /help\.instagram\.com/i, /whatsapp\.com\/dl/i, /shopee\.co\.id\/universal-link/i];

	const validUrls = matches.map((u) => u.replace(/[.,;?!)]+$/, "")).filter((url) => !ignorePatterns.some((pattern) => pattern.test(url)));

	const listToSearch = validUrls.length > 0 ? validUrls : matches.map((u) => u.replace(/[.,;?!)]+$/, ""));

	if (priorityDomain) {
		const prioritized = listToSearch.find((u) => u.toLowerCase().includes(String(priorityDomain).toLowerCase()));
		if (prioritized) return prioritized;
	}

	return listToSearch[0];
};

const isUrl = (url) => {
	if (!url) return null;
	if (Array.isArray(url)) url = url.join(" ");
	if (typeof url !== "string") url = String(url);
	const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
	const matches = url.match(urlRegex);
	if (!matches || matches.length === 0) return null;

	const ignorePatterns = [/tiktoklite/i, /play\.google\.com/i, /apps\.apple\.com/i, /itunes\.apple\.com/i, /support\.google\.com/i, /help\.instagram\.com/i, /whatsapp\.com\/dl/i, /shopee\.co\.id\/universal-link/i];

	const validUrls = matches.map((u) => u.replace(/[.,;?!)]+$/, "")).filter((u) => !ignorePatterns.some((pattern) => pattern.test(u)));

	return validUrls.length > 0 ? validUrls : matches.map((u) => u.replace(/[.,;?!)]+$/, ""));
};

const formatDate = (n, locale = "id") => {
	let d = new Date(n);
	return d.toLocaleDateString(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
	});
};

const formatp = (bytes) => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const reSizeCache = new Map();
const reSize = async (buffer, width, height) => {
	let key = null;
	if (Buffer.isBuffer(buffer)) {
		key = crypto.createHash("md5").update(buffer).digest("hex") + `_${width}x${height}`;
		if (reSizeCache.has(key)) return reSizeCache.get(key);
	} else if (typeof buffer === "string") {
		key = buffer + `_${width}x${height}`;
		if (reSizeCache.has(key)) return reSizeCache.get(key);
	}
	const jimp = await Jimp.read(buffer);
	const w = jimp.width;
	const h = jimp.height;
	const min = Math.min(w, h);
	const x = (w - min) / 2;
	const y = (h - min) / 2;
	const res = await jimp.crop({ x, y, w: min, h: min }).resize({ w: width, h: height }).getBuffer("image/jpeg");
	if (key) {
		if (reSizeCache.size >= 50) reSizeCache.delete(reSizeCache.keys().next().value);
		reSizeCache.set(key, res);
	}
	return res;
};

const generateProfilePicture = async (buffer, size) => {
	let cropped;
	const jimp = await Jimp.read(buffer);
	const w = jimp.width;
	const h = jimp.height;
	if (size) {
		const min = Math.min(w, h);
		const x = (w - min) / 2;
		const y = (h - min) / 2;
		cropped = jimp.crop({ x, y, w: min, h: min }).resize({ w: size, h: size });
	} else cropped = jimp.crop({ x: 0, y: 0, w, h });
	return {
		img: await cropped.scaleToFit({ w: 720, h: 720 }).getBuffer("image/jpeg"),
		preview: await cropped.scaleToFit({ w: 720, h: 720 }).getBuffer("image/jpeg"),
	};
};

const bytesToSize = (bytes, decimals = 2) => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const normalize = (s) => s.replace(/\s+/g, "").split("").sort().join("");

const encodeToLetters = (str) => {
	let result = "";
	for (let i = 0; i < str.length; i++) {
		let char = str[i];
		if (/[a-zA-Z]/.test(char)) {
			result += char;
		} else if (char !== " ") {
			result += String.fromCharCode(97 + (str.charCodeAt(i) % 26));
		}
	}
	return result || "user";
};

const getSizeMedia = async (path) => {
	return new Promise((resolve, reject) => {
		if (typeof path === "string" && /http/.test(path)) {
			fetch(path, { method: "HEAD" }).then((res) => {
				let length = parseInt(res.headers.get("content-length"));
				if (!isNaN(length)) resolve(bytesToSize(length, 3));
			});
		} else if (Buffer.isBuffer(path)) {
			let length = Buffer.byteLength(path);
			if (!isNaN(length)) resolve(bytesToSize(length, 3));
		} else {
			reject(0);
		}
	});
};

async function updateSettings({ filePath, owner, author, apikey, botname, packname, neosantara, setPrefixArray, setBadwordArray, my, addNewApi, locale, timezone, addPrefix, removePrefix, newMess, addBadword, removeBadword, setLimitRole, setMoneyRole }) {
	return new Promise((resolve, reject) => {
		try {
			let content = fs.readFileSync(filePath, "utf8");
			if (owner) {
				const arr = Array.isArray(owner) ? owner : [String(owner)];
				content = content.replace(/global\.owner\s*=\s*\[.*?\]/s, `global.owner = ${JSON.stringify(arr)}`);
				global.owner = arr;
			}
			if (author) {
				content = content.replace(/global\.author\s*=\s*['"`].*?['"`]/, `global.author = ${JSON.stringify(author)}`);
				global.author = author;
			}
			if (apikey) {
				content = content.replace(/(global\.APIKeys\s*=\s*\{[\s\S]*?['"]https:\/\/api\.naze\.biz\.id['"]\s*:\s*)(['"])[^'"]*\2/, `$1$2${apikey}$2`);
				if (global.APIKeys) global.APIKeys[global.APIs.naze] = apikey;
			}
			if (botname) {
				content = content.replace(/global\.botname\s*=\s*['"`].*?['"`]/, `global.botname = ${JSON.stringify(botname)}`);
				global.botname = botname;
			}
			if (packname) {
				content = content.replace(/global\.packname\s*=\s*['"`].*?['"`]/, `global.packname = ${JSON.stringify(packname)}`);
				global.packname = packname;
			}
			if (locale) {
				content = content.replace(/global\.locale\s*=\s*['"`].*?['"`]/, `global.locale = ${JSON.stringify(locale)}`);
				global.locale = locale;
			}
			if (timezone) {
				content = content.replace(/global\.timezone\s*=\s*['"`].*?['"`]/, `global.timezone = ${JSON.stringify(timezone)}`);
				global.timezone = timezone;
			}
			if (neosantara) {
				content = content.replace(/(global\.APIKeys\s*=\s*\{[\s\S]*?['"]https:\/\/api\.neosantara\.xyz\/v1['"]\s*:\s*)(['"])[^'"]*\2/, `$1$2${neosantara}$2`);
				if (global.APIKeys) global.APIKeys[global.APIs.neosantara] = neosantara;
			}
			if (my) {
				content = content.replace(/global\.my\s*=\s*\{[\s\S]*?\}/, `global.my = ${JSON.stringify(my, null, "\t").replace(/"([^"]+)":/g, "$1:")}`);
				global.my = my;
			}
			if (addNewApi && addNewApi.name && addNewApi.url) {
				const { name, url, key = "" } = addNewApi;
				if (!content.includes(url)) {
					content = content.replace(/(global\.APIs\s*=\s*\{)([\s\S]*?)(\})/, (match, start, inner, end) => {
						let body = inner.trimEnd();
						if (body && !body.endsWith(",")) body += ",";
						return `${start}${body}\n  ${name}: ${JSON.stringify(url)},\n${end}`;
					});
					if (global.APIs) global.APIs[name] = url;
				}
				if (key) {
					content = content.replace(/(global\.APIKeys\s*=\s*\{)([\s\S]*?)(\})/, (match, start, inner, end) => {
						let body = inner.trimEnd();
						if (body && !body.endsWith(",")) body += ",";
						return `${start}${body}\n  ${JSON.stringify(url)}: ${JSON.stringify(key)},\n${end}`;
					});
					if (global.APIKeys) global.APIKeys[url] = key;
				}
			}
			if (setPrefixArray) {
				const arr = Array.isArray(setPrefixArray) ? setPrefixArray : [String(setPrefixArray)];
				content = content.replace(/global\.listprefix\s*=\s*\[.*?\]/s, `global.listprefix = ${JSON.stringify(arr)}`);
				if (global.listprefix) global.listprefix = arr;
			}
			if (setBadwordArray) {
				const arr = Array.isArray(setBadwordArray) ? setBadwordArray : [String(setBadwordArray)];
				content = content.replace(/global\.badWords\s*=\s*\[.*?\]/s, `global.badWords = ${JSON.stringify(arr)}`);
				if (global.badWords) global.badWords = arr;
			}
			if (setLimitRole) {
				const { role, value } = setLimitRole;
				content = content.replace(/global\.limit\s*=\s*\{([\s\S]*?)\}/, (match, body) => {
					const updated = body.replace(new RegExp(`(${role}\\s*:\\s*)\\d+`), `$1${value}`);
					return `global.limit = {${updated}}`;
				});
				if (global.limit) global.limit[role] = parseInt(value) || value;
			}
			if (setMoneyRole) {
				const { role, value } = setMoneyRole;
				content = content.replace(/global\.money\s*=\s*\{([\s\S]*?)\}/, (match, body) => {
					const updated = body.replace(new RegExp(`(${role}\\s*:\\s*)\\d+`), `$1${value}`);
					return `global.money = {${updated}}`;
				});
				if (global.money) global.money[role] = parseInt(value) || value;
			}
			if (addPrefix || removePrefix) {
				const match = content.match(/global\.listprefix\s*=\s*\[(.*?)\]/s);
				if (match) {
					let list = [];
					try {
						list = JSON.parse(`[${match[1]}]`);
					} catch {
						try {
							list = new Function(`return [${match[1]}];`)();
						} catch {
							list = match[1].trim() ? match[1].split(",").map((v) => v.trim().replace(/^['"]|['"]$/g, "")) : [];
						}
					}
					if (!Array.isArray(list)) list = [String(list)];
					if (addPrefix && !list.includes(addPrefix)) list.push(addPrefix);
					if (removePrefix) list = list.filter((v) => v !== removePrefix);
					content = content.replace(/global\.listprefix\s*=\s*\[.*?\]/s, `global.listprefix = ${JSON.stringify(list)}`);
					if (global.listprefix) {
						global.listprefix = list;
					}
				}
			}
			if (addBadword || removeBadword) {
				const match = content.match(/global\.badWords\s*=\s*\[(.*?)\]/s);
				if (match) {
					let list = [];
					try {
						list = JSON.parse(`[${match[1]}]`);
					} catch {
						try {
							list = new Function(`return [${match[1]}];`)();
						} catch {
							list = match[1].trim() ? match[1].split(",").map((v) => v.trim().replace(/^['"]|['"]$/g, "")) : [];
						}
					}
					if (!Array.isArray(list)) list = [String(list)];
					if (addBadword && !list.includes(addBadword)) list.push(addBadword);
					if (removeBadword) list = list.filter((v) => v !== removeBadword);
					content = content.replace(/global\.badWords\s*=\s*\[.*?\]/s, `global.badWords = ${JSON.stringify(list)}`);
					if (global.badWords) {
						global.badWords = list;
					}
				}
			}
			if (newMess) {
				const messString = JSON.stringify(newMess, null, "\t").replace(/"([^"]+)":/g, "$1:");
				content = content.replace(/global\.mess\s*=\s*\{[\s\S]*?\}/, `global.mess = ${messString}`);
				global.mess = newMess;
			}
			fs.writeFileSync(filePath, content, "utf8");
			resolve(true);
		} catch (e) {
			reject(e);
		}
	});
}

const parseMention = (text = "") => {
	return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net");
};

function fixBytes(obj) {
	if (obj instanceof Uint8Array || Buffer.isBuffer(obj)) return obj;
	if (typeof obj !== "object") return obj;
	return Uint8Array.from(Object.values(obj));
}

function levenshtein(a, b) {
	const m = a.length,
		n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;
	let dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			let cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}
	return dp[m][n];
}

function similarity(a, b) {
	let m_length = Math.max(a.length, b.length);
	if (m_length === 0) return 1;
	return (m_length - levenshtein(a, b)) / m_length;
}

function assertInstalled(cmd, name, code) {
	try {
		execSync(cmd, { stdio: "ignore" });
	} catch (e) {
		console.error(chalk.redBright(`❌  ${name} is not installed or not in PATH.`) + `\nPlease install it first and run the script again.\n`);
		process.exit(code);
	}
}

function pickRandom(list) {
	return list[Math.floor(list.length * Math.random())];
}

function tarBackup(source, output) {
	return new Promise((resolve, reject) => {
		exec(`tar -czf ${output} --exclude=${output} --exclude='./node_modules' ${source}`, (err, stdout, stderr) => {
			if (err) return reject(err);
			resolve(output);
		});
	});
}

async function runUpdate() {
	try {
		console.log(chalk.cyanBright("[INFO] Checking version in package.json..."));

		const isTermux = process.env.PREFIX && process.env.PREFIX.includes("com.termux");
		const INSTALL_CMD = isTermux ? "yarn" : "npm install";
		const localPkgPath = path.join(ROOT_DIR, "package.json");
		let localVersion = "unknown";
		let localPkg = { dependencies: {} };

		if (fs.existsSync(localPkgPath)) {
			localPkg = JSON.parse(fs.readFileSync(localPkgPath, "utf-8"));
			localVersion = localPkg.version || "unknown";
		}

		const versionRes = await fetch(VERSION_URL, { signal: AbortSignal.timeout(10000) });
		const remotePkg = await versionRes.json();
		const remoteVersion = remotePkg.version;

		if (!remoteVersion) {
			throw new Error("Failed to fetch version from remote package.json");
		}

		if (localVersion === remoteVersion) {
			console.log(chalk.greenBright(`[INFO] Version matches target repository (${localVersion}). No synchronization needed.`));
			return;
		}

		console.log(chalk.yellowBright(`[UPDATE] Version difference detected! Starting synchronization: ${localVersion} → ${remoteVersion}`));

		const localDeps = localPkg.dependencies || {};
		const remoteDeps = remotePkg.dependencies || {};

		const addedDeps = [];
		const removedDeps = [];
		const changedDeps = [];

		for (const [dep, version] of Object.entries(remoteDeps)) {
			if (!localDeps[dep]) {
				addedDeps.push(dep);
			} else if (localDeps[dep] !== version) {
				changedDeps.push(`${dep} (${localDeps[dep]} -> ${version})`);
			}
		}

		for (const dep of Object.keys(localDeps)) {
			if (!remoteDeps[dep]) {
				removedDeps.push(dep);
			}
		}

		let needsNpmInstall = false;
		if (addedDeps.length || removedDeps.length || changedDeps.length) {
			console.log(chalk.magentaBright("\n[DEPENDENCY CHANGES DETECTED]"));
			if (addedDeps.length) console.log(chalk.greenBright(`  [+] Added: ${addedDeps.join(", ")}`));
			if (removedDeps.length) console.log(chalk.redBright(`  [-] Removed: ${removedDeps.join(", ")}`));
			if (changedDeps.length) console.log(chalk.yellowBright(`  [~] Changed: ${changedDeps.join(", ")}`));
			console.log();

			if (addedDeps.length || changedDeps.length) needsNpmInstall = true;
		} else {
			console.log(chalk.gray("[INFO] No dependency changes detected."));
		}

		const zipPath = path.join(ROOT_DIR, "update.zip");
		const extractPath = path.join(ROOT_DIR, "update_temp");
		const backupPath = path.join(ROOT_DIR, "backup_before_update");

		console.log(chalk.cyan("[INFO] Creating backup..."));
		await fs.promises.rm(backupPath, { recursive: true, force: true });
		await fs.promises.mkdir(backupPath, { recursive: true });

		const rootItems = fs.readdirSync(ROOT_DIR);
		for (let item of rootItems) {
			if (["backup_before_update", "update.zip", "update_temp"].includes(item)) {
				continue;
			}
			const itemPath = path.join(ROOT_DIR, item);
			const targetBackupPath = path.join(backupPath, item);
			await fs.promises.cp(itemPath, targetBackupPath, { recursive: true, force: true });
		}

		console.log(chalk.cyan("[INFO] Downloading repository source code..."));
		const response = await fetch(SERVER_ZIP, { dispatcher: customDispatcher, signal: AbortSignal.timeout(60000) });
		if (!response.ok) throw new Error("HTTP error! status: " + response.status);

		const writer = fs.createWriteStream(zipPath);
		const { Readable } = await import("stream");
		Readable.fromWeb(response.body).pipe(writer);

		await new Promise((resolve, reject) => {
			writer.on("finish", resolve);
			writer.on("error", reject);
		});

		console.log(chalk.cyan("[INFO] Extracting files..."));
		await fs
			.createReadStream(zipPath)
			.pipe(unzipper.Extract({ path: extractPath }))
			.promise();

		const folders = fs.readdirSync(extractPath);
		if (!folders.length) {
			throw new Error("Extracted folder is empty");
		}

		const sourceBase = path.join(extractPath, folders[0]);
		const items = fs.readdirSync(sourceBase);

		console.log(chalk.cyan("[INFO] Replacing files..."));

		for (let item of items) {
			if (WHITELIST.includes(item)) {
				console.log(chalk.gray(`[SKIP] ${item}`));
				continue;
			}

			const sourcePath = path.join(sourceBase, item);
			const targetPath = path.join(ROOT_DIR, item);

			await fs.promises.cp(sourcePath, targetPath, {
				force: true,
				recursive: true,
			});
			console.log(chalk.green(`[REPLACED] ${item}`));
		}

		console.log(chalk.cyan("[INFO] Cleaning up temporary files..."));
		await fs.promises.rm(zipPath, { recursive: true, force: true });
		await fs.promises.rm(extractPath, { recursive: true, force: true });

		if (needsNpmInstall) {
			console.log(chalk.cyanBright(`\n[INFO] Auto-installing new dependencies using "${INSTALL_CMD}"... (Please wait)`));
			try {
				execSync(INSTALL_CMD, { stdio: "inherit" });
				console.log(chalk.greenBright("[SUCCESS] Dependencies installed successfully."));
			} catch (npmErr) {
				console.log(chalk.redBright(`[ERROR] Failed during ${INSTALL_CMD}: ${npmErr.message}`));
			}
		}

		console.log(chalk.greenBright("\n[SUCCESS] Version synchronization completed successfully!"));
		console.log(chalk.greenBright(`[INFO] Current version: ${remoteVersion}\n`));
	} catch (err) {
		console.log(chalk.redBright(`\n[ERROR] Process failed: ${err.message}`));

		const backupPath = path.join(ROOT_DIR, "backup_before_update");
		if (fs.existsSync(backupPath)) {
			console.log(chalk.yellowBright("[ROLLBACK] Reverting to previous version..."));
			try {
				const backupItems = fs.readdirSync(backupPath);
				for (let item of backupItems) {
					const bItemPath = path.join(backupPath, item);
					const rItemPath = path.join(ROOT_DIR, item);
					await fs.promises.cp(bItemPath, rItemPath, { force: true, recursive: true });
				}

				console.log(chalk.cyan(`[ROLLBACK] Restoring previous node_modules (running ${INSTALL_CMD})...`));
				execSync(INSTALL_CMD, { stdio: "ignore" });

				console.log(chalk.greenBright("[ROLLBACK] Revert complete. System restored."));
			} catch (rollbackErr) {
				console.log(chalk.redBright(`[ERROR] Rollback failed: ${rollbackErr.message}`));
			}
		}
	}
}

const compressMessage = (msg) => {
	if (!msg) return msg;
	if (typeof msg === "string") return msg;
	try {
		if (msg.metadata?.ephemeralDuration && !msg.ephemeralDuration) {
			msg.ephemeralDuration = msg.metadata.ephemeralDuration;
		}
		const cleanObj = proto.WebMessageInfo.toObject(proto.WebMessageInfo.fromObject(msg), {
			defaults: false,
			arrays: true,
			objects: true,
			empty: false,
		});
		const protoMsg = proto.WebMessageInfo.fromObject(cleanObj);
		const buffer = proto.WebMessageInfo.encode(protoMsg).finish();
		return Buffer.from(buffer).toString("base64");
	} catch (e) {
		return msg;
	}
};

const decompressMessage = (msg) => {
	if (!msg) return null;
	if (typeof msg === "object") return msg;
	if (typeof msg === "string") {
		try {
			const buffer = Buffer.from(msg, "base64");
			const decoded = proto.WebMessageInfo.decode(buffer);
			if (decoded.ephemeralDuration && !decoded.metadata) {
				decoded.metadata = { ephemeralDuration: decoded.ephemeralDuration };
			}
			return decoded;
		} catch (e) {
			return null;
		}
	}
	return null;
};

global.compressMessage = compressMessage;
global.decompressMessage = decompressMessage;

export {
	getSizeMedia,
	assertInstalled,
	getRandom,
	getBuffer,
	getStream,
	fetchJson,
	runtime,
	clockString,
	reSize,
	sleep,
	isUrl,
	extractUrl,
	antiSpam,
	formatDate,
	customDispatcher,
	formatp,
	runUpdate,
	generateProfilePicture,
	errorCache,
	normalize,
	encodeToLetters,
	updateSettings,
	parseMention,
	fixBytes,
	similarity,
	levenshtein,
	pickRandom,
	unsafeAgent,
	tarBackup,
	compressMessage,
	decompressMessage,
};
