import '../settings.js';
import fs from 'fs';
import path from 'path';
import { compressMessage } from '../lib/function.js';

const isSslEnabled = (name, url) => {
	const opt = global?.database?.options;
	if (opt?.ssl === true) return true;
	const dbOpt = name === 'bot_store' ? opt?.store : (name === 'bot_database' ? opt?.database : opt?.[name]);
	if (typeof dbOpt === 'object' && dbOpt?.ssl === true) return true;
	return typeof url === 'string' && (/tidbcloud|psdb|planetscale|supabase|neon|heroku|render|azure|rds\.amazonaws|cloud|aiven/i.test(url) || /ssl=true|tls=true|sslmode=require/i.test(url));
};

class MongoDB {
	constructor(url = global.tempatDB, name = 'database', options = { serverSelectionTimeoutMS: 5000 }) {
		this.url = url
		this.name = name
		this._model = null
		this.options = options
		this.isConnecting = false
		this.isReconnecting = false
		this.conn = null;
		this.mongoose = null;
	}

	initMongoose = async () => {
		if (this.mongoose) return this.mongoose;
		try {
			const mod = await import('mongoose');
			this.mongoose = mod.default || mod;
			return this.mongoose;
		} catch {
			throw new Error("The 'mongoose' module is not installed! Please run: npm install mongoose");
		}
	}
	
	connect = async (retries = 5, delay = 2000) => {
		const mongoose = await this.initMongoose();
		if (this.conn && this.conn.readyState === 1) {
			if (!this._model) {
				const schema = new mongoose.Schema({
					data: { type: Object, required: true, default: {} }
				})
				this._model = this.conn.models[this.name] || this.conn.model(this.name, schema);
			}
			return;
		}
		if (this.isConnecting) return;
		this.isConnecting = true;
		while (retries > 0) {
			try {
				console.log(`🔄 Attempting to connect to MongoDB (${this.name})... (Attempt ${6 - retries}/5)`);
				if (!this.conn || this.conn.readyState === 0) {
					const useSsl = isSslEnabled(this.name, this.url);
					const { useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify, ...safeOptions } = this.options || {};
					const mongoOpts = {
						...safeOptions,
						...(useSsl ? { ssl: true, tls: true, tlsAllowInvalidCertificates: false } : {})
					};
					this.conn = await mongoose.createConnection(this.url, mongoOpts).asPromise();
					this.conn.on('disconnected', async () => {
						if (this.isReconnecting) return;
						this.isReconnecting = true;
						console.warn(`❗ MongoDB connection lost (${this.name}). Attempting to reconnect in 5 seconds...`);
						await new Promise(resolve => setTimeout(resolve, 5000));
						await this.connect();
					});
				}
				if (!this._model) {
					const schema = new mongoose.Schema({
						data: { type: Object, required: true, default: {} }
					})
					this._model = this.conn.models[this.name] || this.conn.model(this.name, schema);
				}
				console.log(`✅ Successfully connected to MongoDB (${this.name}).`);
				this.isConnecting = false;
				this.isReconnecting = false;
				return;
			} catch (e) {
				console.error(`❌ MongoDB connection failed (${this.name}): ${e.message}`);
				await new Promise((res) => setTimeout(res, delay));
				retries--;
			}
		}
		this.isConnecting = false;
		throw new Error(`❌ MongoDB connection failed after multiple attempts (${this.name}).`);
	}
	
	read = async () => {
		if ((!this.conn || this.conn.readyState !== 1) && !this.isConnecting) {
			await this.connect();
		}
		let doc = await this._model.findOne({});
		if (!doc) {
			doc = new this._model({ data: {} });
			await doc.save();
		}
		try {
			return JSON.parse(doc.data);
		} catch {
			return doc.data || {};
		}
	}
	
	write = async (data) => {
		if (!data) return;
		if ((!this.conn || this.conn.readyState !== 1) && !this.isConnecting) {
			await this.connect();
		}
		const safeData = JSON.stringify(data, (key, value) => {
			if (typeof value === 'object' && value !== null && value._id) {
				return undefined;
			}
			if (typeof value === 'bigint') {
				return value.toString();
			}
			if ((this.name === 'store' || this.name === 'bot_store') && key === 'array' && Array.isArray(value)) {
				return value.map((m) => (typeof m === 'object' ? compressMessage(m) : m));
			}
			return value;
		});
		await this._model.findOneAndUpdate({}, { data: safeData }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
	}
}

class SqlDB {
	constructor(url, name = 'database') {
		this.url = url;
		this.name = name === 'store' ? 'bot_store' : 'bot_database';
		this.isConnecting = false;
		this.client = null;
		this.queryClient = null;
		this.dialect = /^mysql:\/\//i.test(url) ? 'mysql' : 'postgres';
	}
	
	connect = async () => {
		if (this.queryClient || this.isConnecting) return;
		this.isConnecting = true;
		try {
			if (this.dialect === 'mysql') {
				let mysql;
				try {
					mysql = await import('mysql2/promise');
				} catch {
					throw new Error("The 'mysql2' module is not installed! Please run: npm install mysql2");
				}
				const useSsl = isSslEnabled(this.name, this.url);
				const poolConfig = typeof this.url === 'string' ? {
					uri: this.url,
					...(useSsl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {})
				} : this.url;
				this.client = mysql.createPool(poolConfig);
				await this.client.execute(`
					CREATE TABLE IF NOT EXISTS \`${this.name}\` (
						id INT AUTO_INCREMENT PRIMARY KEY,
						data JSON NOT NULL
					);
				`);
				this.queryClient = async (sql, params) => this.client.execute(sql, params);
			} else {
				let Pool;
				try {
					const pg = await import('pg');
					Pool = pg.Pool;
				} catch {
					throw new Error("The 'pg' module is not installed! Please run: npm install pg");
				}
				const useSsl = isSslEnabled(this.name, this.url);
				const cleanUrl = typeof this.url === 'string' ? this.url.replace(/([?&])sslmode=[^&]+(&|$)/i, '$1').replace(/[?&]$/, '') : this.url;
				this.client = new Pool({
					connectionString: cleanUrl,
					...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
				});
				// Test connection
				await this.client.query('SELECT 1');
				await this.client.query(`
					CREATE TABLE IF NOT EXISTS ${this.name} (
						id SERIAL PRIMARY KEY,
						data JSONB NOT NULL
					);
				`);
				this.queryClient = async (sql, params) => this.client.query(sql, params);
			}
			console.log('✅ Successfully connected to SQL Database.');
		} catch (e) {
			console.error(`❌ SQL connection failed: ${e.message}`);
		} finally {
			this.isConnecting = false;
		}
	}
	
	read = async () => {
		if (!this.queryClient && !this.isConnecting) await this.connect();
		if (!this.queryClient) return {};
		
		try {
			if (this.dialect === 'mysql') {
				const [rows] = await this.queryClient(`SELECT data FROM \`${this.name}\` WHERE id = 1`);
				if (rows.length === 0) {
					await this.queryClient(`INSERT INTO \`${this.name}\` (id, data) VALUES (1, ?)`, ['{}']);
					return {};
				}
				return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
			} else {
				const res = await this.queryClient(`SELECT data FROM ${this.name} WHERE id = 1`);
				if (res.rows.length === 0) {
					await this.queryClient(`INSERT INTO ${this.name} (id, data) VALUES (1, $1)`, ['{}']);
					return {};
				}
				return typeof res.rows[0].data === 'string' ? JSON.parse(res.rows[0].data) : res.rows[0].data;
			}
		} catch (e) {
			console.error('SQL Read Error:', e);
			return {};
		}
	}
	
	write = async (data) => {
		if (!data) return;
		if (!this.queryClient && !this.isConnecting) await this.connect();
		if (!this.queryClient) return;

		const safeData = JSON.stringify(data, (key, value) => {
			if (typeof value === 'object' && value !== null && value._id) return undefined;
			if (typeof value === 'bigint') return value.toString();
			if ((this.name === 'store' || this.name === 'bot_store') && key === 'array' && Array.isArray(value)) {
				return value.map((m) => (typeof m === 'object' ? compressMessage(m) : m));
			}
			return value;
		});

		try {
			if (this.dialect === 'mysql') {
				await this.queryClient(
					`INSERT INTO \`${this.name}\` (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = ?`,
					[safeData, safeData]
				);
			} else {
				await this.queryClient(
					`INSERT INTO ${this.name} (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1`,
					[safeData]
				);
			}
		} catch (e) {
			console.error('❌ Write SQL Database failed: ', e);
		}
	}
}

class JsonDB {
	constructor(file = global.tempatDB || 'database.json', name = 'database') {
		if (typeof file === 'string' && !file.endsWith('.json')) {
			file = file + '.json';
		}
		this.file = file;
		this.name = name;
		this.data = {}
		this.file = path.join(process.cwd(), 'database', file);
		this.isWriting = false;
		this.writePending = false;
	}
	
	_fileExists = async (filePath) => {
		try {
			await fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}
	
	read = async () => {
		let data;
		const isExist = await this._fileExists(this.file);
		if (isExist) {
			try {
				const rawData = await fs.promises.readFile(this.file, 'utf-8');
				data = JSON.parse(rawData);
			} catch(e) {
				const isBakExist = await this._fileExists(this.file + '.bak');
				if (isBakExist) {
					const rawBakData = await fs.promises.readFile(this.file + '.bak', 'utf-8');
					data = JSON.parse(rawBakData);
					await fs.promises.writeFile(this.file, JSON.stringify(data, null, 2));
				} else {
					data = this.data;
					await fs.promises.writeFile(this.file, JSON.stringify(this.data, null, 2));
				}
			}
		} else {
			data = this.data;
			await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
			await fs.promises.writeFile(this.file, JSON.stringify(this.data, null, 2));
		}
		return data;
	}
	
	write = async (data) => {
		this.data = data || global.db || {};
		if (this.isWriting) {
			this.writePending = true;
			return;
		}
		this.isWriting = true;
		try {
			let dirname = path.dirname(this.file);
			const isDirExist = await this._fileExists(dirname);
			if (!isDirExist) {
				await fs.promises.mkdir(dirname, { recursive: true });
			}
			const isFileExist = await this._fileExists(this.file);
			if (isFileExist) {
				await fs.promises.copyFile(this.file, this.file + '.bak');
			}
			if (Object.keys(this.data).length > 0) {
				const indent = (this.name === 'store' || this.name === 'bot_store') ? undefined : 2;
				const safeData = JSON.stringify(this.data, (key, value) => {
					if (typeof value === 'bigint') {
						return value.toString();
					}
					if ((this.name === 'store' || this.name === 'bot_store') && key === 'array' && Array.isArray(value)) {
						return value.map((m) => (typeof m === 'object' ? compressMessage(m) : m));
					}
					return value;
				}, indent);
				const tmpFile = this.file + '.tmp';
				await fs.promises.writeFile(tmpFile, safeData);
				await fs.promises.rename(tmpFile, this.file);
			}
		} catch (e) {
			console.error('❌ Write Database failed: ', e);
		} finally {
			this.isWriting = false;
			if (this.writePending) {
				this.writePending = false;
				await this.write(this.data);
			}
		}
	}
}

const dataBase = (source, name = 'database') => {
	if (/^mongodb(\+srv)?:\/\//i.test(source)) {
		return new MongoDB(source, name);
	} else if (/^(mysql|postgres|postgresql)(\+srv)?:\/\//i.test(source)) {
		return new SqlDB(source, name);
	}
	return new JsonDB(source, name);
}

const cmdAdd = (hit) => {
	if (hit && !hit.totalcmd) {
		hit.totalcmd = 0;
	}
	if (hit && !hit.todaycmd) {
		hit.todaycmd = 0;
	}
	hit.totalcmd++;
	hit.todaycmd++;
}

const cmdDel = (hit) => {
	hit.todaycmd = 0
}

const cmdAddHit = (hit, feature) => {
	if (hit && !hit[feature]) {
		hit[feature] = 0;
	}
	if (hit) hit[feature]++;
}

const toMs = (str) => {
	if (typeof str === 'number') return str;
	if (typeof str !== 'string') return 0;
	const match = str.match(/^([\d.]+)\s*(s|m|h|d|w|y|ms)?$/i);
	if (!match) return 0;
	const val = parseFloat(match[1]);
	const unit = (match[2] || 'ms').toLowerCase();
	switch (unit) {
		case 'y': return val * 31536000000;
		case 'w': return val * 604800000;
		case 'd': return val * 86400000;
		case 'h': return val * 3600000;
		case 'm': return val * 60000;
		case 's': return val * 1000;
		case 'ms': return val;
		default: return val;
	}
};

const addExpired = ({ id, expired, ...options }, _dir) => {
	const _cek = _dir.find((a) => a.id == id);
	if (_cek) {
		_cek.expired = _cek.expired + toMs(expired);
	} else {
		_dir.push({ id, expired: Date.now() + toMs(expired), ...options });
	}
};

const getPosition = (id, _dir) => _dir.findIndex(a => a.id === id || a.url === id);

const getExpired = (id, _dir) => _dir.find(a => a.id === id || a.url === id)?.expired;

const getStatus = (id, _dir) => _dir.find(a => a.id === id || a.url === id);

const checkStatus = (id, _dir) => _dir.some(a => a.id === id || a.url === id);

const getAllExpired = (_dir) => _dir.map(a => a.id);

const checkExpired = (_dir, conn) => {
	setInterval(() => {
		for (let i = _dir.length - 1; i >= 0; i--) {
			if (Date.now() >= _dir[i].expired) {
				if (conn) {
					conn.groupLeave(_dir[i].id).catch(e => {});
				}
				console.log(`Expired: ${_dir[i].id}`);
				_dir.splice(i, 1);
			}
		}
	}, 5 * 60 * 1000);
};

export {
	dataBase,
	cmdAdd,
	cmdDel,
	cmdAddHit,
	addExpired,
	getPosition,
	getStatus,
	getExpired,
	checkStatus,
	getAllExpired,
	checkExpired
};