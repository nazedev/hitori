import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = path.resolve(__dirname, "..", "..", "settings.js");

const FIELD_MAP = {
	owner: {
		pattern: /^(\s*global\.owner\s*=\s*)(\[.*?\])/,
		serialize: (val) => JSON.stringify(val),
	},
	author: {
		pattern: /^(\s*global\.author\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	botname: {
		pattern: /^(\s*global\.botname\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	tempatStore: {
		pattern: /^(\s*global\.tempatStore\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	number_bot: {
		pattern: /^(\s*global\.number_bot\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	packname: {
		pattern: /^(\s*global\.packname\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	timezone: {
		pattern: /^(\s*global\.timezone\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	locale: {
		pattern: /^(\s*global\.locale\s*=\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
	listprefix: {
		pattern: /^(\s*global\.listprefix\s*=\s*)(\[.*?\])/,
		serialize: (val) => JSON.stringify(val),
	},
	limitFree: {
		pattern: /^(\s*free\s*:\s*)(\d+)/,
		serialize: (val) => String(val),
		section: "global.limit",
	},
	limitPremium: {
		pattern: /^(\s*premium\s*:\s*)(\d+)/,
		serialize: (val) => String(val),
		section: "global.limit",
	},
	limitVip: {
		pattern: /^(\s*vip\s*:\s*)(\d+)/,
		serialize: (val) => String(val),
		section: "global.limit",
	},
	nazeApiKey: {
		pattern: /^(\s*['"]https:\/\/api\.naze\.biz\.id['"]\s*:\s*)(['"].*?['"])/,
		serialize: (val) => JSON.stringify(val),
	},
};

export function readSetting(key) {
	const field = FIELD_MAP[key];
	if (!field) return undefined;

	const lines = fs.readFileSync(SETTINGS_FILE, "utf-8").split("\n");

	let inSection = !field.section;

	for (const line of lines) {
		if (field.section && line.includes(field.section)) {
			inSection = true;
			continue;
		}
		if (field.section && inSection && /^\s*\}/.test(line)) {
			inSection = false;
			continue;
		}

		if (inSection) {
			const match = line.match(field.pattern);
			if (match) {
				const raw = match[2].trim();
				let result;
				try {
					result = JSON.parse(raw);
				} catch {
					try {
						result = new Function(`return ${raw};`)();
					} catch {
						result = raw.replace(/^['"]|['"]$/g, "");
					}
				}
				if ((key === "owner" || key === "listprefix") && !Array.isArray(result)) {
					return [String(result)];
				}
				return result;
			}
		}
	}

	return undefined;
}

export function readAllSettings() {
	const config = {};
	for (const key of Object.keys(FIELD_MAP)) {
		const val = readSetting(key);
		if (val !== undefined) config[key] = val;
	}
	return config;
}

export function writeSetting(key, value) {
	const field = FIELD_MAP[key];
	if (!field) throw new Error(`Unknown setting key: ${key}`);

	const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
	const lines = content.split("\n");
	let written = false;

	let inSection = !field.section;

	for (let i = 0; i < lines.length; i++) {
		if (field.section && lines[i].includes(field.section)) {
			inSection = true;
			continue;
		}
		if (field.section && inSection && /^\s*\}/.test(lines[i])) {
			inSection = false;
			continue;
		}

		if (inSection) {
			const match = lines[i].match(field.pattern);
			if (match) {
				const prefix = match[1];
				const oldValue = match[2];
				const newValue = field.serialize(value);

				const prefixEnd = match.index + prefix.length;
				const valueEnd = prefixEnd + oldValue.length;
				const before = lines[i].substring(0, prefixEnd);
				const after = lines[i].substring(valueEnd);

				lines[i] = before + newValue + after;

				written = true;
				break;
			}
		}
	}

	if (!written) {
		throw new Error(`Could not find setting "${key}" in settings.js`);
	}

	fs.writeFileSync(SETTINGS_FILE, lines.join("\n"), "utf-8");
}

export function writeSettings(config) {
	const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
	let lines = content.split("\n");

	for (const [key, value] of Object.entries(config)) {
		const field = FIELD_MAP[key];
		if (!field) continue;

		let inSection = !field.section;

		for (let i = 0; i < lines.length; i++) {
			if (field.section && lines[i].includes(field.section)) {
				inSection = true;
				continue;
			}
			if (field.section && inSection && /^\s*\}/.test(lines[i])) {
				inSection = false;
				continue;
			}

			if (inSection) {
				const match = lines[i].match(field.pattern);
				if (match) {
					const prefix = match[1];
					const oldValue = match[2];
					const newValue = field.serialize(value);

					const prefixEnd = match.index + prefix.length;
					const valueEnd = prefixEnd + oldValue.length;
					const before = lines[i].substring(0, prefixEnd);
					const after = lines[i].substring(valueEnd);

					lines[i] = before + newValue + after;
					break;
				}
			}
		}
	}

	fs.writeFileSync(SETTINGS_FILE, lines.join("\n"), "utf-8");
}

export function readDatabaseConfig() {
	const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
	const match = content.match(/global\.database\s*=\s*(\{[\s\S]*?\n\})/);
	if (match) {
		try {
			const res = eval(`(${match[1]})`);
			if (res && !res.path && res.url) res.path = res.url;
			if (res && res.options) {
				if (typeof res.options.store === "object" && !res.options.store.path && res.options.store.url) res.options.store.path = res.options.store.url;
				if (typeof res.options.database === "object" && !res.options.database.path && res.options.database.url) res.options.database.path = res.options.database.url;
			}
			return res;
		} catch (e) {
			console.error("Failed to parse database config", e);
		}
	}
	return { path: "nazedev" };
}

export function writeDatabaseConfig(configObj) {
	let content = fs.readFileSync(SETTINGS_FILE, "utf-8");
	let formatted = `{\n\tpath: '${configObj.path}'`;
	if (configObj.options) {
		const storeVal = typeof configObj.options.store === "object" ? `{ path: '${configObj.options.store.path}' }` : configObj.options.store;
		const dbVal = typeof configObj.options.database === "object" ? `{ path: '${configObj.options.database.path}' }` : configObj.options.database;
		formatted += `,\n\toptions: {\n\t\tstore: ${storeVal},\n\t\tdatabase: ${dbVal}\n\t}`;
	}
	formatted += "\n}";

	content = content.replace(/global\.database\s*=\s*\{[\s\S]*?\n\}/, `global.database = ${formatted}`);
	fs.writeFileSync(SETTINGS_FILE, content, "utf-8");
}

export function isFirstRun() {
	const marker = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".hitori_setup_done");
	return !fs.existsSync(marker);
}
