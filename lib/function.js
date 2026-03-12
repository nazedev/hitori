const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const axios = require('axios');
const https = require('https');
const chalk = require('chalk');
const fse = require('fs-extra');
const fetch = require('node-fetch');
const unzipper = require('unzipper');
const { sizeFormatter } = require('human-readable');
const { exec, spawn, execSync } = require('child_process');
const { proto, areJidsSameUser, extractMessageContent, downloadContentFromMessage, getContentType, getDevice } = require('baileys');
const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');

const SERVER_ZIP = 'https://github.com/nazedev/hitori/archive/refs/heads/master.zip';
const VERSION_URL = 'https://raw.githubusercontent.com/nazedev/hitori/master/package.json';

const ROOT_DIR = process.cwd();

const WHITELIST = [
  'node_modules',
  'database',
  'nazedev',
  '.env',
  'settings.js'
];

const errorCache = {};

const unsafeAgent = new https.Agent({
	rejectUnauthorized: false
});

const axiosss = axios.create({
	httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: false }),
});

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`
}

const getBuffer = async (url, options = {}) => {
	try {
		const { data } = await axios.get(url, {
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			responseType: 'arraybuffer',
			httpsAgent: unsafeAgent,
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url, { agent: unsafeAgent });
			const anu = await res.buffer()
			return anu
		} catch (e) {
			return e
		}
	}
}

const fetchJson = async (url, options = {}) => {
	try {
		const { data } = await axios.get(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
			},
			httpsAgent: unsafeAgent,
			...options
		})
		return data
	} catch (e) {
		try {
			const res = await fetch(url, { agent: unsafeAgent });
			const anu = await res.json()
			return anu
		} catch (e) {
			return e
		}
	}
}

const runtime = function(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor(seconds % (3600 * 24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
	var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
	var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
	var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const clockString = (ms) => {
    let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
    let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
    let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

const formatDate = (n, locale = 'id') => {
	let d = new Date(n)
	return d.toLocaleDateString(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	})
}

const formatp = sizeFormatter({
    std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`,
});

const generateProfilePicture = async (buffer, size) => {
	let cropped;
	const jimp = await Jimp.read(buffer)
	const w = jimp.getWidth()
	const h = jimp.getHeight()
	if (size) {
		const min = Math.min(w, h)
		const x = (w - min) / 2
		const y = (h - min) / 2
		cropped = jimp.crop(x, y, min, min).resize(size, size)
	} else cropped = jimp.crop(0, 0, w, h)
	return {
		img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
		preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
	}
}

const bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const normalize = s => s.replace(/\s+/g, '').split('').sort().join('');

const getSizeMedia = async (path) => {
    return new Promise((resolve, reject) => {
        if (typeof path === 'string' && /http/.test(path)) {
            axios.get(path).then((res) => {
                let length = parseInt(res.headers['content-length'])
                if(!isNaN(length)) resolve(bytesToSize(length, 3))
            })
        } else if (Buffer.isBuffer(path)) {
            let length = Buffer.byteLength(path)
            if(!isNaN(length)) resolve(bytesToSize(length, 3))
        } else {
            reject(0)
        }
    })
}

async function updateSettings({
  filePath, owner, author, apikey, botname, packname,
  locale, timezone, addPrefix, removePrefix, newMess,
  addBadword, removeBadword, setLimitRole, setMoneyRole
}) {
  return new Promise((resolve, reject) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (owner) content = content.replace(/global\.owner\s*=\s*\[[^\]]*\]/, `global.owner = ${JSON.stringify(owner)}`);
      if (author) content = content.replace(/global\.author\s*=\s*['"`].*?['"`]/, `global.author = '${author}'`);
      if (apikey) content = content.replace(/(global\.APIKeys\s*=\s*\{[\s\S]*?'https:\/\/api\.naze\.biz\.id'\s*:\s*')[^']*(')/, `$1${apikey}$2`);
      if (botname) content = content.replace(/global\.botname\s*=\s*['"`].*?['"`]/, `global.botname = '${botname}'`);
      if (packname) content = content.replace(/global\.packname\s*=\s*['"`].*?['"`]/, `global.packname = '${packname}'`);
      if (locale) content = content.replace(/global\.locale\s*=\s*['"`].*?['"`]/, `global.locale = '${locale}'`);
      if (timezone) content = content.replace(/global\.timezone\s*=\s*['"`].*?['"`]/, `global.timezone = '${timezone}'`);
      if (setLimitRole) {
        const { role, value } = setLimitRole;
        content = content.replace(/global\.limit\s*=\s*\{([\s\S]*?)\}/, (match, body) => {
          const updated = body.replace(new RegExp(`(${role}\\s*:\\s*)\\d+`), `$1${value}`);
          return `global.limit = {${updated}}`;
        });
      }
      if (setMoneyRole) {
        const { role, value } = setMoneyRole;
        content = content.replace(/global\.money\s*=\s*\{([\s\S]*?)\}/, (match, body) => {
          const updated = body.replace(new RegExp(`(${role}\\s*:\\s*)\\d+`), `$1${value}`);
          return `global.money = {${updated}}`;
        });
      }
      if (addPrefix || removePrefix) {
        const match = content.match(/global\.listprefix\s*=\s*\[(.*?)\]/s);
        if (match) {
          let list = match[1].trim() ? match[1].split(',').map(v => v.trim()) : [];
          if (addPrefix && !list.includes(`'${addPrefix}'`)) list.push(`'${addPrefix}'`);
          if (removePrefix) list = list.filter(v => v !== `'${removePrefix}'`);
          content = content.replace(/global\.listprefix\s*=\s*\[(.*?)\]/s, `global.listprefix = [${list.join(', ')}]`);
        }
      }
      if (addBadword || removeBadword) {
        const match = content.match(/global\.badWords\s*=\s*\[(.*?)\]/s);
        if (match) {
          let list = match[1].trim() ? match[1].split(',').map(v => v.trim()) : [];
          if (addBadword && !list.includes(`'${addBadword}'`)) list.push(`'${addBadword}'`);
          if (removeBadword) list = list.filter(v => v !== `'${removeBadword}'`);
          content = content.replace(/global\.badWords\s*=\s*\[(.*?)\]/s, `global.badWords = [${list.join(', ')}]`);
        }
      }
      if (newMess) {
        const messString = JSON.stringify(newMess, null, '\t').replace(/"([^"]+)":/g, '$1:');
        content = content.replace(/global\.mess\s*=\s*\{[\s\S]*?\}/, `global.mess = ${messString}`);
      }
      fs.writeFileSync(filePath, content, 'utf8');
      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
}

const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

function fixBytes(obj) {
	if (obj instanceof Uint8Array || Buffer.isBuffer(obj)) return obj
	if (typeof obj !== 'object') return obj
	return Uint8Array.from(Object.values(obj))
}

function levenshtein(a, b) {
    const m = a.length, n = b.length
    if (m === 0) return n
    if (n === 0) return m
    let dp = Array.from({ length: m+1 }, () => Array(n+1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            let cost = a[i - 1] === b[j - 1] ? 0 : 1
            dp[i][j] = Math.min(dp[i - 1][j]+1, dp[i][j - 1]+1, dp[i - 1][j - 1]+cost)
        }
    }
    return dp[m][n]
}

function similarity(a, b) {
    let m_length = Math.max(a.length, b.length)
    if (m_length === 0) return 1
    return (m_length - levenshtein(a, b)) / m_length
}

function assertInstalled(cmd, name, code) {
	try {
		execSync(cmd, { stdio: 'ignore' });
	} catch (e) {
		console.error(chalk.redBright(`❌  ${name} is not installed or not in PATH.`) +`\nPlease install it first and run the script again.\n`);
		process.exit(code);
	}
}

function pickRandom(list) {
	return list[Math.floor(list.length * Math.random())]
}

function tarBackup(source, output) {
	return new Promise((resolve, reject) => {
		exec(`tar -czf ${output} --exclude=${output} --exclude='./node_modules' ${source}`, (err, stdout, stderr) => {
			if (err) return reject(err);
			resolve(output);
		})
	})
}

async function runUpdate() {
  try {
    console.log(chalk.cyanBright('[INFO] Checking version in package.json...'));
	
	const isTermux = process.env.PREFIX && process.env.PREFIX.includes('com.termux');
	const INSTALL_CMD = isTermux ? 'yarn' : 'npm install';
    const localPkgPath = path.join(ROOT_DIR, 'package.json');
    let localVersion = 'unknown';
    let localPkg = { dependencies: {} };

    if (fs.existsSync(localPkgPath)) {
      localPkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf-8'));
      localVersion = localPkg.version || 'unknown';
    }

    const versionRes = await axios.get(VERSION_URL, { timeout: 10000 });
    const remotePkg = versionRes.data;
    const remoteVersion = remotePkg.version; 

    if (!remoteVersion) {
      throw new Error('Failed to fetch version from remote package.json');
    }

    if (localVersion === remoteVersion) {
      console.log(chalk.greenBright(`[INFO] Version matches target repository (${localVersion}). No synchronization needed.`));
      return;
    }

    console.log(chalk.yellowBright(`[UPDATE] Version difference detected! Starting synchronization: ${localVersion} → ${remoteVersion}`));

    const localDeps = localPkg.dependencies || {};
    const remoteDeps = remotePkg.dependencies || {};

    const addedDeps = [];
    const removedDeps = [];
    const changedDeps = [];

    for (const [dep, version] of Object.entries(remoteDeps)) {
      if (!localDeps[dep]) {
        addedDeps.push(dep);
      } else if (localDeps[dep] !== version) {
        changedDeps.push(`${dep} (${localDeps[dep]} -> ${version})`);
      }
    }

    for (const dep of Object.keys(localDeps)) {
      if (!remoteDeps[dep]) {
        removedDeps.push(dep);
      }
    }

    let needsNpmInstall = false;
    if (addedDeps.length || removedDeps.length || changedDeps.length) {
      console.log(chalk.magentaBright('\n[DEPENDENCY CHANGES DETECTED]'));
      if (addedDeps.length) console.log(chalk.greenBright(`  [+] Added: ${addedDeps.join(', ')}`));
      if (removedDeps.length) console.log(chalk.redBright(`  [-] Removed: ${removedDeps.join(', ')}`));
      if (changedDeps.length) console.log(chalk.yellowBright(`  [~] Changed: ${changedDeps.join(', ')}`));
      console.log();
      
      if (addedDeps.length || changedDeps.length) needsNpmInstall = true;
    } else {
      console.log(chalk.gray('[INFO] No dependency changes detected.'));
    }

    const zipPath = path.join(ROOT_DIR, 'update.zip');
    const extractPath = path.join(ROOT_DIR, 'update_temp');
    const backupPath = path.join(ROOT_DIR, 'backup_before_update');

    console.log(chalk.cyan('[INFO] Creating backup...'));
    await fse.remove(backupPath);
    await fse.ensureDir(backupPath);

    const rootItems = fs.readdirSync(ROOT_DIR);
    for (let item of rootItems) {
      if (['backup_before_update', 'update.zip', 'update_temp'].includes(item)) {
        continue;
      }
      const itemPath = path.join(ROOT_DIR, item);
      const targetBackupPath = path.join(backupPath, item);
      await fse.copy(itemPath, targetBackupPath);
    }

    console.log(chalk.cyan('[INFO] Downloading repository source code...'));
    const response = await axios({
      method: 'GET',
      url: SERVER_ZIP,
      responseType: 'stream',
      timeout: 60000
    });

    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(chalk.cyan('[INFO] Extracting files...'));
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    const folders = fs.readdirSync(extractPath);
    if (!folders.length) {
      throw new Error('Extracted folder is empty');
    }

    const sourceBase = path.join(extractPath, folders[0]);
    const items = fs.readdirSync(sourceBase);

    console.log(chalk.cyan('[INFO] Replacing files...'));

    for (let item of items) {
      if (WHITELIST.includes(item)) {
        console.log(chalk.gray(`[SKIP] ${item}`));
        continue;
      }

      const sourcePath = path.join(sourceBase, item);
      const targetPath = path.join(ROOT_DIR, item);

      await fse.copy(sourcePath, targetPath, {
        overwrite: true,
        recursive: true
      });
      console.log(chalk.green(`[REPLACED] ${item}`));
    }

    console.log(chalk.cyan('[INFO] Cleaning up temporary files...'));
    await fse.remove(zipPath);
    await fse.remove(extractPath);

    if (needsNpmInstall) {
      console.log(chalk.cyanBright(`\n[INFO] Auto-installing new dependencies using "${INSTALL_CMD}"... (Please wait)`));
      try {
        execSync(INSTALL_CMD, { stdio: 'inherit' });
        console.log(chalk.greenBright('[SUCCESS] Dependencies installed successfully.'));
      } catch (npmErr) {
        console.log(chalk.redBright(`[ERROR] Failed during ${INSTALL_CMD}: ${npmErr.message}`));
      }
    }

    console.log(chalk.greenBright('\n[SUCCESS] Version synchronization completed successfully!'));
    console.log(chalk.greenBright(`[INFO] Current version: ${remoteVersion}\n`));

  } catch (err) {
    console.log(chalk.redBright(`\n[ERROR] Process failed: ${err.message}`));

    const backupPath = path.join(ROOT_DIR, 'backup_before_update');
    if (fs.existsSync(backupPath)) {
      console.log(chalk.yellowBright('[ROLLBACK] Reverting to previous version...'));
      try {
        const backupItems = fs.readdirSync(backupPath);
        for (let item of backupItems) {
          const bItemPath = path.join(backupPath, item);
          const rItemPath = path.join(ROOT_DIR, item);
          await fse.copy(bItemPath, rItemPath, { overwrite: true, recursive: true });
        }
        
        console.log(chalk.cyan(`[ROLLBACK] Restoring previous node_modules (running ${INSTALL_CMD})...`));
        execSync(INSTALL_CMD, { stdio: 'ignore' });

        console.log(chalk.greenBright('[ROLLBACK] Revert complete. System restored.'));
      } catch (rollbackErr) {
        console.log(chalk.redBright(`[ERROR] Rollback failed: ${rollbackErr.message}`));
      }
    }
  }
}

module.exports = {
	getSizeMedia,
	axiosss,
	assertInstalled,
	getRandom,
	getBuffer,
	fetchJson,
	runtime,
	clockString,
	sleep,
	isUrl,
	formatDate,
	formatp,
	runUpdate,
	generateProfilePicture,
	errorCache,
	normalize,
	updateSettings,
	parseMention,
	fixBytes,
	similarity,
	levenshtein,
	pickRandom,
	unsafeAgent,
	tarBackup
};