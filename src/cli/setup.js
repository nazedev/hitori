import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { input, confirm } from "@inquirer/prompts";
import { parsePhoneNumber } from "awesome-phonenumber";

import { theme, showBanner, sectionHeader, logSuccess, logInfo, logWarning, separator } from "./helpers.js";
import { readSetting, writeSettings, isFirstRun as checkFirstRun } from "./settings-parser.js";

export { checkFirstRun as isFirstRun };

export async function runSetupWizard() {
	showBanner();
	sectionHeader("First-Time Setup");

	console.log(`  ${theme.dim("Welcome! Let's configure the essentials.")}\n` + `  ${theme.dim("You can change any of these later with")} ${theme.accent("hitori settings")}\n`);

	separator();

	logInfo("Owner phone number(s) — used for bot admin privileges.");
	console.log(`  ${theme.dim("Format: country code + number, e.g. 628123456789")}`);
	console.log(`  ${theme.dim("Separate multiple numbers with commas.")}\n`);

	let currentOwner = readSetting("owner") || [];
	if (!Array.isArray(currentOwner)) currentOwner = [String(currentOwner)];
	const ownerRaw = await input({
		message: "Owner number(s):",
		default: currentOwner.join(", "),
		validate: (val) => {
			if (!val.trim()) return "At least one owner number is required.";
			const nums = val.split(",").map((n) => n.trim());
			for (const n of nums) {
				const cleanNum = n.replace(/^\+/, "");
				if (!/^\d+$/.test(cleanNum)) return `Invalid format: "${n}". Use digits only.`;

				const pn = parsePhoneNumber("+" + cleanNum);
				if (!pn.valid) {
					return `Invalid phone number: "${n}". Please enter a valid international number with country code (e.g. 628...).`;
				}
			}
			return true;
		},
	});
	const ownerNumbers = ownerRaw.split(",").map((n) => n.trim());

	separator();

	logInfo("Author name — displayed in bot info and stickers.");

	const authorName = await input({
		message: "Author name:",
		default: readSetting("author") || "Nazedev",
	});

	separator();

	logInfo("Bot name — the display name for your bot.");

	const botName = await input({
		message: "Bot name:",
		default: readSetting("botname") || "Hitori Bot",
	});

	separator();

	logInfo("Naze API Key — get yours at https://naze.biz.id");
	console.log(`  ${theme.dim("Press Enter to use the current key.")}\n`);

	const currentKey = readSetting("nazeApiKey");
	const apiKey = await input({
		message: "Naze API Key:",
		default: currentKey === "YOUR_API_KEY" ? "" : currentKey || "",
	});

	const finalApiKey = apiKey.trim() || "YOUR_API_KEY";

	if (finalApiKey === "YOUR_API_KEY") {
		logWarning("API Key is missing! Certain bot features will encounter errors and will not function properly.");
	}

	separator();

	logInfo("Bot WhatsApp Number — used for pairing code.");
	console.log(`  ${theme.dim("Format: 628123456789. Leave empty to skip.")}\n`);

	const currentBotNumber = readSetting("number_bot") || "";
	const botNumberRaw = await input({
		message: "Bot Number:",
		default: currentBotNumber,
		validate: (val) => {
			if (!val.trim()) return true;
			const cleanNum = val.trim().replace(/^\+/, "");
			if (!/^\d+$/.test(cleanNum)) return "Invalid format. Use digits only.";
			const pn = parsePhoneNumber("+" + cleanNum);
			if (!pn.valid) return `Invalid phone number.`;
			return true;
		},
	});

	const botNumber = botNumberRaw.trim().replace(/^\+/, "");

	separator();

	console.log("\n");
	sectionHeader("Review Configuration");

	const display = [
		["Owner(s)", ownerNumbers.join(", ")],
		["Author", authorName],
		["Bot Name", botName],
		["API Key", apiKey.startsWith("nz-") ? apiKey.slice(0, 6) + "••••••" : theme.error("YOUR_API_KEY")],
		["Bot Number", botNumber || theme.muted("Not set (Will prompt on start)")],
	];

	for (const [label, value] of display) {
		console.log(`  ${theme.primary("•")} ${theme.dim(label.padEnd(14))} ${theme.bold(value)}`);
	}
	console.log("");

	const confirmed = await confirm({
		message: "Save this configuration?",
		default: true,
	});

	if (!confirmed) {
		logWarning("Setup cancelled. You can run it again with: hitori --setup");
		return false;
	}

	writeSettings({
		owner: ownerNumbers,
		author: authorName,
		botname: botName,
		nazeApiKey: finalApiKey,
		number_bot: botNumber,
	});

	logSuccess("Configuration saved to settings.js");

	const markerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".hitori_setup_done");
	fs.writeFileSync(markerPath, "1", "utf-8");

	console.log(`  ${theme.dim("Tip: Use")} ${theme.accent("'hitori start'")} ${theme.dim("command to start the bot anytime.")}\n`);

	return true;
}
