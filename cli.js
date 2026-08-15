#!/usr/bin/env node

import ora from "ora";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { select } from "@inquirer/prompts";

import { theme, showBanner, sectionHeader, logSuccess, logWarning, logError, EXIT_VALUE } from "./src/cli/helpers.js";
import { runSetupWizard, isFirstRun } from "./src/cli/setup.js";
import { settingsMenu } from "./src/cli/settings-menu.js";
import { statusDashboard } from "./src/cli/status.js";
import { reportMenu } from "./src/cli/report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * ┌──────────────────────────────────────────────────────────────┐
 * │  Hitori CLI — Main Entry Point                               │
 * │                                                              │
 * │  Usage:                                                      │
 * │    hitori              Open interactive menu                 │
 * │    hitori --setup      Run first-time setup wizard           │
 * │    hitori settings     Open settings menu directly           │
 * │    hitori start        Start the bot directly                │
 * │    hitori status       Show system health                    │
 * │    hitori report       Show reports                          │
 * └──────────────────────────────────────────────────────────────┘
 */

// ── Parse CLI Arguments ──────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

async function main() {
	try {
		if (command === "--setup" || command === "setup") {
			await runSetupWizard();
			return;
		}

		if (command === "settings") {
			await settingsMenu();
			return;
		}

		if (command === "start" || command === "run") {
			await startBot();
			return;
		}

		if (command === "status") {
			await statusDashboard();
			return;
		}

		if (command === "report") {
			await reportMenu();
			return;
		}

		if (command === "--help" || command === "-h") {
			showHelp();
			return;
		}

		if (isFirstRun()) {
			const completed = await runSetupWizard();
			if (!completed) {
				process.exit(0);
			}
		}

		await mainMenu();
	} catch (error) {
		if (error.name === "ExitPromptError" || error.message?.includes("User force closed")) {
			console.log(`\n${theme.muted("  Goodbye! 👋")}\n`);
			process.exit(0);
		}
		logError(`Unexpected error: ${error.message}`);
		process.exit(1);
	}
}

async function mainMenu() {
	let running = true;
	while (running) {
		showBanner();
		const choice = await select({
			message: "What would you like to do?",
			choices: [
				{
					name: `${theme.accent("▶")}  Start Bot          ${theme.dim("— Launch the WhatsApp bot")}`,
					value: "start",
				},
				{
					name: `${theme.primary("⚙")}  Settings           ${theme.dim("— Configure bot options")}`,
					value: "settings",
				},
				{
					name: `${theme.primary("💚")} Status / Health    ${theme.dim("— Check system readiness")}`,
					value: "status",
				},
				{
					name: `${theme.primary("📋")} Report             ${theme.dim("— View logs and diagnostics")}`,
					value: "report",
				},
				{
					name: `${theme.error("✕")}  Exit`,
					value: EXIT_VALUE,
				},
			],
		});

		switch (choice) {
			case "start":
				await startBot();
				break;
			case "settings":
				await settingsMenu();
				break;
			case "status":
				await statusDashboard();
				break;
			case "report":
				await reportMenu();
				break;
			case EXIT_VALUE:
				console.log(`\n${theme.muted("  Goodbye! 👋")}\n`);
				running = false;
				break;
		}
	}

	process.exit(0);
}

async function startBot() {
	showBanner();
	sectionHeader("Starting Bot");

	const spinner = ora({
		text: theme.dim("Initializing bot process..."),
		spinner: "dots12",
		color: "cyan",
	}).start();

	await new Promise((r) => setTimeout(r, 800));
	spinner.succeed(theme.accent("Launching Hitori Bot..."));
	console.log(`  ${theme.dim("Press Ctrl+C to stop the bot and return to terminal.")}\n`);

	return new Promise((resolve) => {
		const startFile = path.join(__dirname, "start.js");
		const child = spawn(process.execPath, [startFile], {
			cwd: __dirname,
			stdio: "inherit",
		});

		child.on("exit", (code) => {
			if (code === 0) {
				logSuccess("Bot stopped gracefully.");
			} else {
				logWarning(`Bot exited with code ${code}.`);
			}
			resolve();
		});

		child.on("error", (err) => {
			logError(`Failed to start bot: ${err.message}`);
			resolve();
		});
	});
}

function showHelp() {
	showBanner();
	console.log(`  ${theme.bold("Usage:")}  hitori ${theme.dim("[command]")}\n`);
	console.log(`  ${theme.bold("Commands:")}`);
	console.log(`    ${theme.accent("(none)".padEnd(16))} Open interactive menu`);
	console.log(`    ${theme.accent("start".padEnd(16))} Start the bot directly`);
	console.log(`    ${theme.accent("settings".padEnd(16))} Open settings manager`);
	console.log(`    ${theme.accent("status".padEnd(16))} Show system health dashboard`);
	console.log(`    ${theme.accent("report".padEnd(16))} View logs and diagnostics`);
	console.log(`    ${theme.accent("--setup".padEnd(16))} Run first-time setup wizard`);
	console.log(`    ${theme.accent("--help, -h".padEnd(16))} Show this help message`);
	console.log("");
}

main();
