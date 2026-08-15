import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { watchFile, unwatchFile } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let isRunning = true;

function start() {
	let args = ['--expose-gc', path.join(__dirname, 'index.js'), ...process.argv.slice(2)]
	let p = spawn(process.argv[0], args, {
		stdio: ['inherit', 'inherit', 'inherit', 'ipc']
	}).on('message', data => {
		if (data === 'reset') {
			console.log(chalk.yellow.bold('[BOT] Restarting...'))
			p.kill();
			setTimeout(() => {
				start()
			}, 3000);
		} else if (data === 'uptime') {
			p.send(process.uptime())
		} else if (data === 'exit') {
			process.exit(0)
		}
	}).on('exit', code => {
		if (!isRunning) {
			console.log(chalk.green.bold('[BOT] Process exited cleanly. Goodbye!'))
			process.exit(0)
		} else if (code !== 0) {
			console.error(chalk.red.bold(`[BOT] Exited with code: ${code}`));
			setTimeout(() => {
				start()
			}, 3000);
		} else {
			console.log(chalk.green.bold('[BOT] Process exited cleanly. Goodbye!'))
			process.exit(0)
		}
	})
}
start()

process.on('SIGINT', () => {
	isRunning = false;
	console.log(chalk.yellow('[BOT] Waiting for system to shutdown gracefully...'))
});