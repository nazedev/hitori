import { select, input } from "@inquirer/prompts";
import { parsePhoneNumber } from "awesome-phonenumber";

import { theme, showBanner, sectionHeader, logSuccess, logWarning, separator, BACK_VALUE, backChoice } from "./helpers.js";
import { readAllSettings, readSetting, writeSetting, readDatabaseConfig, writeDatabaseConfig } from "./settings-parser.js";

export async function settingsMenu() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("Settings");

		const choice = await select({
			message: "Select a category:",
			choices: [
				{
					name: `${theme.primary("⚙")}  General           ${theme.dim("— Name, timezone, locale, prefix")}`,
					value: "general",
				},
				{
					name: `${theme.primary("👤")} Owner             ${theme.dim("— Manage owner phone numbers")}`,
					value: "owner",
				},
				{
					name: `${theme.primary("🔑")} API Keys          ${theme.dim("— View and edit API keys")}`,
					value: "apikeys",
				},
				{
					name: `${theme.primary("🗄️")} Database          ${theme.dim("— Database connections (Local/Mongo/MySQL)")}`,
					value: "database",
				},
				{
					name: `${theme.primary("📊")} Limits            ${theme.dim("— Free, premium, and VIP limits")}`,
					value: "limits",
				},
				backChoice("Back to Main Menu"),
			],
		});

		switch (choice) {
			case "general":
				await generalSettings();
				break;
			case "owner":
				await ownerSettings();
				break;
			case "apikeys":
				await apiKeySettings();
				break;
			case "database":
				await databaseSettings();
				break;
			case "limits":
				await limitSettings();
				break;
			case BACK_VALUE:
				running = false;
				break;
		}
	}
}

async function generalSettings() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("General Settings");

		const fields = [
			["Bot Name", readSetting("botname") || "Hitori Bot"],
			["Bot Number", readSetting("number_bot") || theme.muted("Not set (Prompt on start)")],
			["Author", readSetting("author") || "Nazedev"],
			["Pack Name", readSetting("packname") || "Bot WhatsApp"],
			["Timezone", readSetting("timezone") || "Asia/Jakarta"],
			["Locale", readSetting("locale") || "en"],
			["Prefix", (Array.isArray(readSetting("listprefix")) ? readSetting("listprefix") : ["+", "!", "."]).join("  ")],
		];

		for (const [label, value] of fields) {
			console.log(`  ${theme.primary("•")} ${theme.dim(label.padEnd(14))} ${theme.bold(value)}`);
		}
		console.log("");

		const choice = await select({
			message: "What would you like to edit?",
			choices: [
				{ name: "Bot Name", value: "botname" },
				{ name: "Bot Number", value: "number_bot" },
				{ name: "Author", value: "author" },
				{ name: "Pack Name", value: "packname" },
				{ name: "Timezone", value: "timezone" },
				{ name: "Locale", value: "locale" },
				{ name: "Prefix", value: "listprefix" },
				backChoice("Back"),
			],
		});

		if (choice === BACK_VALUE) {
			running = false;
			continue;
		}

		if (choice === "listprefix") {
			let current = readSetting("listprefix") || ["+", "!", "."];
			if (!Array.isArray(current)) current = [String(current)];
			const val = await input({
				message: "Enter prefixes separated by spaces (e.g. + ! .):",
				default: current.join(" "),
			});
			writeSetting("listprefix", val.split(/\s+/).filter(Boolean));
		} else {
			const labels = {
				botname: "Bot Name",
				number_bot: "Bot Number",
				author: "Author",
				packname: "Pack Name",
				timezone: "Timezone",
				locale: "Locale",
			};
			const val = await input({
				message: `${labels[choice]}:`,
				default: readSetting(choice) || "",
				validate: (inputVal) => {
					if (choice === "number_bot" && inputVal.trim() !== "") {
						const cleanNum = inputVal.trim().replace(/^\+/, "");
						if (!/^\d+$/.test(cleanNum)) return "Invalid format. Use digits only.";
						const pn = parsePhoneNumber("+" + cleanNum);
						if (!pn.valid) return `Invalid phone number.`;
					}
					return true;
				},
			});

			const finalVal = choice === "number_bot" ? val.trim().replace(/^\+/, "") : val;
			writeSetting(choice, finalVal);
		}

		logSuccess("Setting updated in settings.js");
	}
}

async function ownerSettings() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("Owner Numbers");

		let owners = readSetting("owner") || [];
		if (!Array.isArray(owners)) owners = [String(owners)];
		if (owners.length === 0) {
			logWarning("No owner numbers configured.");
		} else {
			owners.forEach((num, i) => {
				console.log(`  ${theme.accent(`${i + 1}.`)} ${theme.bold(num)}`);
			});
		}
		console.log("");

		const choice = await select({
			message: "Select an action:",
			choices: [
				{ name: `${theme.accent("+")} Add owner number`, value: "add" },
				...(owners.length > 0
					? [
							{
								name: `${theme.error("−")} Remove owner number`,
								value: "remove",
							},
						]
					: []),
				backChoice("Back"),
			],
		});

		if (choice === BACK_VALUE) {
			running = false;
			continue;
		}

		if (choice === "add") {
			const num = await input({
				message: "Enter phone number (e.g. 628123456789):",
				validate: (val) => {
					const cleanNum = val.trim().replace(/^\+/, "");
					if (!/^\d+$/.test(cleanNum)) return "Invalid format. Use digits only.";
					const pn = parsePhoneNumber("+" + cleanNum);
					if (!pn.valid) return `Invalid phone number. Please enter a valid international number with country code.`;
					return true;
				},
			});
			const cleanNum = num.trim().replace(/^\+/, "");
			writeSetting("owner", [...owners, cleanNum]);
			logSuccess(`Added owner: ${cleanNum}`);
		}

		if (choice === "remove") {
			const toRemove = await select({
				message: "Select number to remove:",
				choices: [...owners.map((num) => ({ name: num, value: num })), backChoice("Cancel")],
			});

			if (toRemove !== BACK_VALUE) {
				writeSetting(
					"owner",
					owners.filter((n) => n !== toRemove),
				);
				logSuccess(`Removed owner: ${toRemove}`);
			}
		}
	}
}

async function apiKeySettings() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("API Keys");

		const apiKey = readSetting("nazeApiKey");
		const masked = (key) => (key ? key.slice(0, 6) + "••••••" : theme.muted("(not set)"));

		console.log(`  ${theme.primary("•")} ${theme.dim("Naze API".padEnd(20))} ${theme.bold(masked(apiKey))}`);
		console.log("");

		const choice = await select({
			message: "Select an action:",
			choices: [{ name: "Edit Naze API Key", value: "naze" }, backChoice("Back")],
		});

		if (choice === BACK_VALUE) {
			running = false;
			continue;
		}

		if (choice === "naze") {
			const val = await input({
				message: "Naze API Key:",
				default: apiKey === "YOUR_API_KEY" ? "" : apiKey || "",
			});
			const finalVal = val.trim() || "YOUR_API_KEY";
			writeSetting("nazeApiKey", finalVal);
			if (finalVal === "YOUR_API_KEY") {
				logWarning("API Key is missing! Certain bot features will encounter errors and will not function properly.");
			} else {
				logSuccess("API key updated in settings.js");
			}
		}
	}
}

async function limitSettings() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("Limits & Economy");

		const fields = [
			["Free Limit", readSetting("limitFree") ?? 20],
			["Premium Limit", readSetting("limitPremium") ?? 999],
			["VIP Limit", readSetting("limitVip") ?? 900],
		];

		for (const [label, value] of fields) {
			console.log(`  ${theme.primary("•")} ${theme.dim(label.padEnd(20))} ${theme.bold(String(value))}`);
		}
		console.log("");

		const choice = await select({
			message: "What would you like to edit?",
			choices: [{ name: "Free Limit", value: "limitFree" }, { name: "Premium Limit", value: "limitPremium" }, { name: "VIP Limit", value: "limitVip" }, backChoice("Back")],
		});

		if (choice === BACK_VALUE) {
			running = false;
			continue;
		}

		if (choice === BACK_VALUE) {
			running = false;
			continue;
		}

		const labels = {
			limitFree: "Free Limit",
			limitPremium: "Premium Limit",
			limitVip: "VIP Limit",
		};
		const val = await input({
			message: `${labels[choice]}:`,
			default: String(readSetting(choice) ?? ""),
			validate: (v) => /^\d+$/.test(v.trim()) || "Please enter a valid number.",
		});
		writeSetting(choice, parseInt(val.trim(), 10));
		logSuccess("Limit updated in settings.js");
	}
}

async function databaseSettings() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("Database Settings");

		const dbConfig = readDatabaseConfig();
		const currentPath = dbConfig.path || "database.json";

		let storeVal = "true";
		let dbVal = "true";

		if (dbConfig.options) {
			if (dbConfig.options.store === false) storeVal = "false";
			else if (typeof dbConfig.options.store === "object") storeVal = dbConfig.options.store.path;

			if (dbConfig.options.database === false) dbVal = "false";
			else if (typeof dbConfig.options.database === "object") dbVal = dbConfig.options.database.path;
		}

		console.log(`  ${theme.primary("•")} ${theme.dim("Main Path".padEnd(14))} ${theme.bold(currentPath)}`);
		console.log(`  ${theme.primary("•")} ${theme.dim("Store Path".padEnd(14))} ${theme.bold(storeVal === "true" ? "Follow Main Path" : storeVal === "false" ? "Local (baileys_store.json)" : storeVal)}`);
		console.log(`  ${theme.primary("•")} ${theme.dim("Bot DB Path".padEnd(14))} ${theme.bold(dbVal === "true" ? "Follow Main Path" : dbVal === "false" ? "Local (database.json)" : dbVal)}`);
		console.log("");

		const choice = await select({
			message: "What would you like to edit?",
			choices: [
				{
					name: `${theme.primary("\u{1F517}")} Main Path       ${theme.dim("\u2014 Session Folder / MongoDB / MySQL URL")}`,
					value: "path",
				},
				{
					name: `${theme.primary("\u{1F4E6}")} Store Path      ${theme.dim("\u2014 Where to save chat history")}`,
					value: "store",
				},
				{
					name: `${theme.primary("\u{1F5C3}\u{FE0F}")} Bot DB Path     ${theme.dim("\u2014 Where to save users, limits, groups")}`,
					value: "database",
				},
				backChoice("Back"),
			],
		});

		if (choice === BACK_VALUE) {
			running = false;
			continue;
		}

		if (choice === "path") {
			const val = await input({
				message: `Enter Main Path:\n  ${theme.dim("(Use 'nazedev' for local folder, or 'mongodb://...' for cloud URL)")}`,
				default: currentPath,
			});
			dbConfig.path = val;
		} else {
			const isStore = choice === "store";
			const typeChoice = await select({
				message: `Select mode for ${isStore ? "STORE (Chat History)" : "DATABASE (Users & Limits)"}:`,
				choices: [
					{ name: `${theme.primary("\u{1F504}")} Follow Main Path ${theme.dim("\u2014 Share the exact same URL as Main Path")}`, value: "true" },
					{ name: `${theme.primary("\u{1F4C4}")} Local File       ${theme.dim("\u2014 Save locally as .json file")}`, value: "false" },
					{ name: `${theme.primary("\u{1F50C}")} Custom URL       ${theme.dim("\u2014 Use a completely different database URL")}`, value: "custom" },
				],
			});

			if (!dbConfig.options) dbConfig.options = { store: true, database: true };

			if (typeChoice === "true") {
				dbConfig.options[choice] = true;
			} else if (typeChoice === "false") {
				dbConfig.options[choice] = false;
			} else if (typeChoice === "custom") {
				const val = await input({
					message: `Enter custom URL for ${choice} (e.g. mongodb://...):`,
				});
				dbConfig.options[choice] = { path: val };
			}
		}

		writeDatabaseConfig(dbConfig);
		logSuccess("Database settings updated in settings.js");
	}
}
