import path from "path";
import chalk from "chalk";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let isRunning = true;
let isRestarting = false;

function start() {
	isRestarting = false;
	let args = ["--expose-gc", path.join(__dirname, "index.js"), ...process.argv.slice(2)];
	let p = spawn(process.argv[0], args, {
		stdio: ["inherit", "inherit", "inherit", "ipc"],
	})
		.on("message", (data) => {
			if (data === "reset") {
				console.log(chalk.yellow.bold("[BOT] Restarting..."));
				isRestarting = true;
				p.kill();
			} else if (data === "uptime") {
				p.send(process.uptime());
			} else if (data === "exit") {
				isRunning = false;
				p.kill();
				process.exit(0);
			}
		})
		.on("exit", (code) => {
			if (!isRunning) {
				console.log(chalk.green.bold("[BOT] Process exited cleanly. Goodbye!"));
				process.exit(0);
			} else if (isRestarting || code !== 0) {
				if (code !== 0 && !isRestarting) {
					console.error(chalk.red.bold(`[BOT] Exited with code: ${code}`));
				}
				setTimeout(() => {
					start();
				}, 3000);
			} else {
				console.log(chalk.green.bold("[BOT] Process exited cleanly. Goodbye!"));
				process.exit(0);
			}
		});
}
start();

process.on("SIGINT", () => {
	isRunning = false;
	console.log(chalk.yellow("[BOT] Waiting for system to shutdown gracefully..."));
});
process.on("SIGTERM", () => {
	isRunning = false;
	process.exit(0);
});
