import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import Table from "cli-table3";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { select } from "@inquirer/prompts";
import { theme, showBanner, sectionHeader, logSuccess, logWarning, logError, BACK_VALUE, backChoice } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function cmdExists(cmd) {
	try {
		const check = process.platform === "win32" ? `where ${cmd} 2>nul` : `command -v ${cmd} 2>/dev/null`;
		execSync(check, { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

function cmdVersion(cmd, flag = "--version") {
	try {
		return execSync(`${cmd} ${flag}`, { stdio: "pipe" }).toString().trim().split("\n")[0];
	} catch {
		return null;
	}
}

function formatBytes(bytes) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function pm2Status() {
	try {
		const raw = execSync("pm2 jlist", { stdio: "pipe" }).toString().trim();
		const list = JSON.parse(raw);
		const bot = list.find((p) => p.name === "hitori" || p.pm2_env?.pm_exec_path?.includes("start.js"));
		if (bot) {
			return {
				running: bot.pm2_env.status === "online",
				status: bot.pm2_env.status,
				uptime: bot.pm2_env.pm_uptime ? Date.now() - bot.pm2_env.pm_uptime : 0,
				memory: bot.monit?.memory || 0,
				cpu: bot.monit?.cpu || 0,
				restart: bot.pm2_env.restart_time || 0,
			};
		}
	} catch {}
	return null;
}

function formatUptime(ms) {
	if (!ms || ms <= 0) return "N/A";
	const s = Math.floor(ms / 1000);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const parts = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (parts.length === 0) parts.push(`${s % 60}s`);
	return parts.join(" ");
}

export async function statusDashboard() {
	showBanner();
	sectionHeader("System Health");

	const sysTable = new Table({
		chars: {
			top: "─",
			"top-mid": "┬",
			"top-left": "┌",
			"top-right": "┐",
			bottom: "─",
			"bottom-mid": "┴",
			"bottom-left": "└",
			"bottom-right": "┘",
			left: "│",
			"left-mid": "├",
			mid: "─",
			"mid-mid": "┼",
			right: "│",
			"right-mid": "┤",
			middle: "│",
		},
		style: { head: ["cyan"], border: ["gray"] },
		colWidths: [24, 36],
	});

	const ok = (text) => chalk.green(`✓ ${text}`);
	const fail = (text) => chalk.red(`✗ ${text}`);
	const warn = (text) => chalk.yellow(`⚠ ${text}`);

	sysTable.push(["Node.js", ok(process.version)]);

	const npmVer = cmdVersion("npm", "-v");
	sysTable.push(["NPM", npmVer ? ok(`v${npmVer}`) : fail("Not found")]);

	sysTable.push(["FFmpeg", cmdExists("ffmpeg") ? ok("Installed") : fail("Not found")]);

	sysTable.push(["PM2", cmdExists("pm2") ? ok("Installed") : warn("Not installed")]);

	const gitVer = cmdVersion("git");
	sysTable.push(["Git", gitVer ? ok(gitVer.replace("git version ", "v")) : fail("Not found")]);

	console.log(sysTable.toString());

	sectionHeader("Bot Process");

	const pm2Info = pm2Status();
	if (pm2Info) {
		const procTable = new Table({
			chars: {
				top: "─",
				"top-mid": "┬",
				"top-left": "┌",
				"top-right": "┐",
				bottom: "─",
				"bottom-mid": "┴",
				"bottom-left": "└",
				"bottom-right": "┘",
				left: "│",
				"left-mid": "├",
				mid: "─",
				"mid-mid": "┼",
				right: "│",
				"right-mid": "┤",
				middle: "│",
			},
			style: { head: ["cyan"], border: ["gray"] },
			colWidths: [24, 36],
		});

		const statusText = pm2Info.running ? ok("Online") : fail(pm2Info.status || "Stopped");
		procTable.push(["Status", statusText], ["Uptime", formatUptime(pm2Info.uptime)], ["Memory", formatBytes(pm2Info.memory)], ["CPU", `${pm2Info.cpu}%`], ["Restarts", String(pm2Info.restart)]);
		console.log(procTable.toString());
	} else {
		console.log(`  ${theme.muted("No bot process detected via PM2.")}`);
		console.log(`  ${theme.dim("Start the bot from the main menu or run: npm start")}`);
	}

	sectionHeader("Database");

	const dbPath = path.join(ROOT, "database.json");
	if (fs.existsSync(dbPath)) {
		const stats = fs.statSync(dbPath);
		console.log(`  ${theme.primary("•")} ${theme.dim("File".padEnd(20))} ${theme.bold("database.json")}`);
		console.log(`  ${theme.primary("•")} ${theme.dim("Size".padEnd(20))} ${theme.bold(formatBytes(stats.size))}`);
		console.log(`  ${theme.primary("•")} ${theme.dim("Last Modified".padEnd(20))} ${theme.bold(stats.mtime.toLocaleString())}`);
	} else {
		console.log(`  ${theme.muted("No database file found. It will be created on first run.")}`);
	}

	sectionHeader("System Resources");

	const memTotal = os.totalmem();
	const memFree = os.freemem();
	const memUsed = memTotal - memFree;
	const memPct = ((memUsed / memTotal) * 100).toFixed(1);

	console.log(`  ${theme.primary("•")} ${theme.dim("Platform".padEnd(20))} ${theme.bold(`${os.platform()} ${os.arch()}`)}`);
	console.log(`  ${theme.primary("•")} ${theme.dim("CPU".padEnd(20))} ${theme.bold(os.cpus()[0]?.model || "Unknown")} ${theme.dim(`(${os.cpus().length} cores)`)}`);
	console.log(`  ${theme.primary("•")} ${theme.dim("Memory".padEnd(20))} ${theme.bold(`${formatBytes(memUsed)} / ${formatBytes(memTotal)}`)} ${theme.dim(`(${memPct}%)`)}`);
	console.log(`  ${theme.primary("•")} ${theme.dim("Hostname".padEnd(20))} ${theme.bold(os.hostname())}`);

	console.log("");

	await select({
		message: "Press Enter to go back",
		choices: [backChoice("Back to Main Menu")],
	});
}
