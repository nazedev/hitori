import os from "os";
import fs from "fs";
import path from "path";
import boxen from "boxen";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

export const theme = {
	primary: chalk.cyan,
	accent: chalk.greenBright,
	warning: chalk.yellow,
	error: chalk.redBright,
	muted: chalk.gray,
	bold: chalk.bold,
	highlight: chalk.magentaBright,
	success: chalk.green.bold,
	info: chalk.blueBright,
	dim: chalk.dim,
	url: chalk.yellowBright.underline,
};

const BANNER_ART = `
 ██╗  ██╗██╗████████╗ ██████╗ ██████╗ ██╗
 ██║  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗██║
 ███████║██║   ██║   ██║   ██║██████╔╝██║
 ██╔══██║██║   ██║   ██║   ██║██╔══██╗██║
 ██║  ██║██║   ██║   ╚██████╔╝██║  ██║██║
 ╚═╝  ╚═╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝`;

export function showBanner() {
	console.clear();
	console.log("");

	let version = "1.0.0";
	let baileysVersion = "latest";
	try {
		const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
		version = pkg.version;
		if (pkg.dependencies && pkg.dependencies.baileys) baileysVersion = pkg.dependencies.baileys;
	} catch (e) {}

	const memTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) + " GB";
	const memUsed = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0) + " MB";

	let user = "container";
	try {
		user = os.userInfo().username;
	} catch (e) {
		user = process.env.USER || "container";
	}
	const host = os.hostname();
	const platform = os.type();
	const uptime = `${Math.floor(os.uptime() / 3600)} h ${Math.floor((os.uptime() % 3600) / 60)} m`;
	const shell = process.env.SHELL || process.env.COMSPEC || "unknown";
	const cpu = os.cpus()[0]?.model.trim() || "unknown";
	const dateTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta", hour12: false });

	const artLines = BANNER_ART.split("\n");

	for (const line of artLines) {
		if (line) console.log(theme.primary(line));
	}

	console.log();
	console.log(`  ${theme.accent(user)}@${theme.accent(host)}`);
	console.log(theme.muted("  " + "─".repeat(user.length + host.length + 1)));
	console.log(`  ${theme.primary("OS".padEnd(14))} ${theme.muted(":")} ${platform} ${os.release()}`);
	console.log(`  ${theme.primary("Uptime".padEnd(14))} ${theme.muted(":")} ${uptime}`);
	console.log(`  ${theme.primary("Shell".padEnd(14))} ${theme.muted(":")} ${shell}`);
	console.log(`  ${theme.primary("CPU".padEnd(14))} ${theme.muted(":")} ${cpu}`);
	console.log(`  ${theme.primary("Memory".padEnd(14))} ${theme.muted(":")} ${memUsed} / ${memTotal}`);
	console.log(`  ${theme.primary("Script Version".padEnd(14))} ${theme.muted(":")} v${version}`);
	console.log(`  ${theme.primary("Node.js".padEnd(14))} ${theme.muted(":")} ${process.version}`);
	console.log(`  ${theme.primary("Baileys".padEnd(14))} ${theme.muted(":")} ${baileysVersion.replace("^", "v")}`);
	console.log(`  ${theme.primary("Date & Time".padEnd(14))} ${theme.muted(":")} ${dateTime}`);

	console.log(
		boxen(`${theme.accent("WhatsApp Bot")}  ${theme.muted("•")}  ${theme.bold("CLI Manager")}`, {
			padding: { left: 2, right: 2, top: 0, bottom: 0 },
			borderStyle: "round",
			borderColor: "cyan",
			margin: { top: 1, bottom: 0, left: 1, right: 0 },
		}),
	);
	console.log(`  ${theme.warning("⚠")}  ${theme.dim("Unofficial API • Use at your own risk • Zero liability for account sanctions or data loss")}\n`);
}

export function sectionHeader(title) {
	const line = theme.muted("─".repeat(48));
	console.log(`\n${line}`);
	console.log(`  ${theme.primary.bold("›")} ${theme.bold(title)}`);
	console.log(`${line}\n`);
}

export function statusLine(label, value, icon = "•") {
	const paddedLabel = label.padEnd(20);
	console.log(`  ${theme.muted(icon)} ${theme.dim(paddedLabel)} ${value}`);
}

export function logSuccess(msg) {
	console.log(`\n  ${theme.success("✓")} ${theme.success(msg)}\n`);
}

export function logError(msg) {
	console.log(`\n  ${theme.error("✗")} ${theme.error(msg)}\n`);
}

export function logInfo(msg) {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const formattedMsg = msg.replace(urlRegex, (url) => theme.url(url));
	console.log(`  ${theme.info("ℹ")} ${theme.info(formattedMsg)}`);
}

export function logWarning(msg) {
	console.log(`  ${theme.warning("⚠")} ${theme.warning(msg)}`);
}

export function separator() {
	console.log(theme.muted("  " + "─".repeat(46)));
}

export const BACK_VALUE = "__BACK__";
export const EXIT_VALUE = "__EXIT__";

export function backChoice(label = "Back") {
	return { name: `${theme.muted("←")} ${label}`, value: BACK_VALUE };
}
