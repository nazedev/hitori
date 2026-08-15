import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { select } from "@inquirer/prompts";
import { theme, showBanner, sectionHeader, logInfo, logWarning, BACK_VALUE, backChoice } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export async function reportMenu() {
	let running = true;

	while (running) {
		showBanner();
		sectionHeader("Reports");

		const choice = await select({
			message: "Select a report:",
			choices: [
				{
					name: `${theme.primary("📋")} Recent Logs        ${theme.dim("— Last 30 lines of bot output")}`,
					value: "logs",
				},
				{
					name: `${theme.primary("❌")} Error Logs         ${theme.dim("— Recent errors from PM2")}`,
					value: "errors",
				},
				{
					name: `${theme.primary("🗄️")}  Database Check     ${theme.dim("— Verify database integrity")}`,
					value: "dbcheck",
				},
				{
					name: `${theme.primary("📦")} Dependency Audit   ${theme.dim("— Check for outdated packages")}`,
					value: "audit",
				},
				backChoice("Back to Main Menu"),
			],
		});

		switch (choice) {
			case "logs":
				await viewLogs();
				break;
			case "errors":
				await viewErrors();
				break;
			case "dbcheck":
				await checkDatabase();
				break;
			case "audit":
				await dependencyAudit();
				break;
			case BACK_VALUE:
				running = false;
				break;
		}
	}
}

async function viewLogs() {
	showBanner();
	sectionHeader("Recent Logs");

	let logs = "";

	try {
		logs = execSync("pm2 logs --nostream --lines 30", {
			stdio: "pipe",
			timeout: 5000,
		})
			.toString()
			.trim();
	} catch {}

	if (logs) {
		const lines = logs.split("\n");
		for (const line of lines) {
			if (line.includes("error") || line.includes("Error") || line.includes("ERROR")) {
				console.log(`  ${chalk.red(line)}`);
			} else if (line.includes("warn") || line.includes("Warning") || line.includes("WARNING")) {
				console.log(`  ${chalk.yellow(line)}`);
			} else {
				console.log(`  ${theme.dim(line)}`);
			}
		}
	} else {
		logWarning("No PM2 logs available. The bot may not have been started with PM2.");
		logInfo("Start the bot, then run this report again to view logs.");
	}

	console.log("");
	await select({
		message: "Press Enter to go back",
		choices: [backChoice("Back")],
	});
}

async function viewErrors() {
	showBanner();
	sectionHeader("Error Logs");

	let errors = "";

	try {
		const raw = execSync("pm2 logs --nostream --lines 100", {
			stdio: "pipe",
			timeout: 5000,
		}).toString();

		const errorLines = raw.split("\n").filter((line) => /error|Error|ERROR|exception|Exception|FATAL|fatal|TypeError|ReferenceError|SyntaxError/i.test(line));

		if (errorLines.length > 0) {
			console.log(`  ${theme.error(`Found ${errorLines.length} error(s) in recent logs:`)}\n`);
			for (const line of errorLines.slice(-20)) {
				console.log(`  ${chalk.red("•")} ${theme.dim(line.trim())}`);
			}
		} else {
			console.log(`  ${theme.success("✓")} ${theme.accent("No errors found in recent logs. Looking good!")}`);
		}
	} catch {
		logWarning("Unable to read PM2 logs. PM2 may not be running.");
	}

	console.log("");
	await select({
		message: "Press Enter to go back",
		choices: [backChoice("Back")],
	});
}

async function checkDatabase() {
	showBanner();
	sectionHeader("Database Integrity Check");

	const dbPath = path.join(ROOT, "database.json");
	const storePath = path.join(ROOT, "baileys_store.json");

	for (const [name, filePath] of [
		["database.json", dbPath],
		["baileys_store.json", storePath],
	]) {
		console.log(`  ${theme.primary("›")} ${theme.bold(name)}`);

		if (!fs.existsSync(filePath)) {
			console.log(`    ${theme.muted("File not found — will be created on first run.")}\n`);
			continue;
		}

		const stats = fs.statSync(filePath);
		console.log(`    ${theme.dim("Size:".padEnd(16))} ${formatBytes(stats.size)}`);
		console.log(`    ${theme.dim("Modified:".padEnd(16))} ${stats.mtime.toLocaleString()}`);

		try {
			const content = fs.readFileSync(filePath, "utf-8");
			JSON.parse(content);
			console.log(`    ${chalk.green("✓ Valid JSON")}\n`);
		} catch (e) {
			console.log(`    ${chalk.red(`✗ Invalid JSON: ${e.message}`)}\n`);
		}
	}

	await select({
		message: "Press Enter to go back",
		choices: [backChoice("Back")],
	});
}

async function dependencyAudit() {
	showBanner();
	sectionHeader("Dependency Audit");

	logInfo("Checking for known vulnerabilities...\n");

	try {
		const result = execSync('npm audit --json 2>/dev/null || echo "{}"', {
			cwd: ROOT,
			stdio: "pipe",
			timeout: 30000,
		}).toString();

		const audit = JSON.parse(result);
		const vulns = audit.metadata?.vulnerabilities || {};
		const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0);

		if (total === 0) {
			console.log(`  ${theme.success("✓")} ${theme.accent("No known vulnerabilities found!")}`);
		} else {
			console.log(`  ${theme.warning(`Found ${total} vulnerability(ies):`)}`);
			if (vulns.critical) console.log(`    ${chalk.red(`Critical: ${vulns.critical}`)}`);
			if (vulns.high) console.log(`    ${chalk.redBright(`High:     ${vulns.high}`)}`);
			if (vulns.moderate) console.log(`    ${chalk.yellow(`Moderate: ${vulns.moderate}`)}`);
			if (vulns.low) console.log(`    ${chalk.dim(`Low:      ${vulns.low}`)}`);
			console.log(`\n  ${theme.dim('Run "npm audit fix" to attempt automatic fixes.')}`);
		}
	} catch {
		logWarning("Could not run npm audit. Check your internet connection.");
	}

	console.log("");
	await select({
		message: "Press Enter to go back",
		choices: [backChoice("Back")],
	});
}

function formatBytes(bytes) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
