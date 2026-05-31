import { spawn, execSync } from 'child_process';

export const DIFFICULTY_MAP = {
	'beginner': 0, 'easy': 2, 'middle': 5, 'hard': 8,
	'advanced': 10, 'expert': 12, 'candidate': 14,
	'master': 16, 'grandmaster': 18, 'champion': 20
};

const STOCKFISH_PATHS = [
	'stockfish',
	'/usr/bin/stockfish',
	'/usr/games/stockfish',
	'/usr/local/bin/stockfish',
	'/data/data/com.termux/files/usr/bin/stockfish',
	'/opt/homebrew/bin/stockfish',
];

function findStockfish() {
	for (const path of STOCKFISH_PATHS) {
		try {
			execSync(`"${path}" uci`, { timeout: 2000, stdio: 'pipe' });
			return path;
		} catch (_) {}
	}
	return null;
}

const STOCKFISH_BIN = findStockfish();

export function getStockfishMove(fen, skillLevel = 0) {
	return new Promise((resolve, reject) => {
		if (!STOCKFISH_BIN) return reject(new Error('Stockfish tidak ditemukan'));
		const engine = spawn(STOCKFISH_BIN);
		let resolved = false;
		const timeout = setTimeout(() => {
			if (!resolved) { resolved = true; engine.kill(); reject(new Error('stockfish timeout')); }
		}, 8000);
		let buffer = '';
		engine.stdout.on('data', (data) => {
			buffer += data.toString();
			const lines = buffer.split('\n');
			buffer = lines.pop();
			for (const line of lines) {
				if (line.startsWith('bestmove') && !resolved) {
					resolved = true;
					clearTimeout(timeout);
					engine.kill();
					const move = line.trim().split(' ')[1];
					resolve(move && move !== '(none)' ? move : null);
				}
			}
		});
		engine.stderr.on('data', (data) => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timeout);
				engine.kill();
				reject(new Error(data.toString().trim()));
			}
		});
		engine.on('error', (err) => { if (!resolved) { resolved = true; clearTimeout(timeout); reject(err); } });
		const moveTime = 50 + skillLevel * 30;
		engine.stdin.write('uci\n');
		engine.stdin.write(`setoption name Skill Level value ${skillLevel}\n`);
		engine.stdin.write('ucinewgame\n');
		engine.stdin.write(`position fen ${fen}\n`);
		engine.stdin.write(`go movetime ${moveTime}\n`);
	});
}
