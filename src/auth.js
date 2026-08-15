import baileys, { initAuthCreds, BufferJSON, proto } from "baileys";



const isSslEnabled = (url) => {
	const opt = global?.database?.options;
	if (opt?.ssl === true) return true;
	if (typeof opt?.auth === "object" && opt?.auth?.ssl === true) return true;
	return typeof url === "string" && (/tidbcloud|psdb|planetscale|supabase|neon|heroku|render|azure|rds\.amazonaws|cloud|aiven/i.test(url) || /ssl=true|tls=true|sslmode=require/i.test(url));
};

/**
 * useCustomAuthState
 * Handles Baileys Auth State via MongoDB, SQL (MySQL/Postgres), or Local JSON
 * based on the provided path URL.
 */

export const useCustomAuthState = async (sessionPath) => {
	let dialect = "local";

	if (/^mongodb(\+srv)?:\/\//i.test(sessionPath)) {
		dialect = "mongodb";
	} else if (/^(mysql|postgres|postgresql)(\+srv)?:\/\//i.test(sessionPath)) {
		dialect = "sql";
	}

	const sessionName = "nazedev_session"; // Default session identifier

	if (dialect === "local") {
		const folder = sessionPath === "database.json" || !sessionPath ? "nazedev" : sessionPath;
		// Fallback to Baileys' native local auth
		const { useMultiFileAuthState } = await import("baileys");
		return await useMultiFileAuthState(folder);
	}

	// For MongoDB and SQL, we need read/write/remove adapters
	let storeData, readData, removeData;

	if (dialect === "mongodb") {
		let mongoose;
		try {
			const mod = await import("mongoose");
			mongoose = mod.default || mod;
		} catch {
			throw new Error("The 'mongoose' module is not installed! Please run: npm install mongoose");
		}

		const useSsl = isSslEnabled(sessionPath);
		const mongoConn = await mongoose
			.createConnection(sessionPath, {
				serverSelectionTimeoutMS: 5000,
				...(useSsl ? { ssl: true, tls: true, tlsAllowInvalidCertificates: false } : {}),
			})
			.asPromise();

		const schema = new mongoose.Schema({
			identifier: { type: String, required: true },
			session: { type: String, required: true },
			value: { type: String, required: true },
		});

		schema.index({ session: 1, identifier: 1 }, { unique: true });
		const AuthModel = mongoConn.models.BaileysAuth || mongoConn.model("BaileysAuth", schema);

		storeData = async (data, identifier) => {
			const value = JSON.stringify(data, BufferJSON.replacer);
			await AuthModel.updateOne({ session: sessionName, identifier }, { $set: { session: sessionName, identifier, value } }, { upsert: true });
		};

		readData = async (identifier) => {
			const doc = await AuthModel.findOne({ session: sessionName, identifier });
			return doc ? JSON.parse(doc.value, BufferJSON.reviver) : null;
		};

		removeData = async (identifier) => {
			await AuthModel.deleteOne({ session: sessionName, identifier });
		};
	} else if (dialect === "sql") {
		// Dynamic import for SQL depending on the driver
		let executeQuery;

		if (/^mysql:\/\//i.test(sessionPath)) {
			let mysql;
			try {
				mysql = await import("mysql2/promise");
			} catch {
				throw new Error("The 'mysql2' module is not installed! Please run: npm install mysql2");
			}
			const useSsl = isSslEnabled(sessionPath);
			const poolConfig =
				typeof sessionPath === "string"
					? {
							uri: sessionPath,
							...(useSsl ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
						}
					: sessionPath;
			const pool = mysql.createPool(poolConfig);
			await pool.execute(`
				CREATE TABLE IF NOT EXISTS \`baileys_auth\` (
					session VARCHAR(40) NOT NULL,
					identifier VARCHAR(100) NOT NULL,
					value TEXT DEFAULT NULL,
					UNIQUE KEY idx_unique (session, identifier)
				);
			`);
			executeQuery = async (query, params) => pool.execute(query, params);

			storeData = async (data, identifier) => {
				const value = JSON.stringify(data, BufferJSON.replacer);
				await executeQuery(`INSERT INTO \`baileys_auth\` (session, identifier, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?`, [sessionName, identifier, value, value]);
			};

			readData = async (identifier) => {
				const [rows] = await executeQuery(`SELECT value FROM \`baileys_auth\` WHERE session = ? AND identifier = ?`, [sessionName, identifier]);
				return rows.length > 0 ? JSON.parse(rows[0].value, BufferJSON.reviver) : null;
			};

			removeData = async (identifier) => {
				await executeQuery(`DELETE FROM \`baileys_auth\` WHERE session = ? AND identifier = ?`, [sessionName, identifier]);
			};
		} else if (/^postgres(ql)?:\/\//i.test(sessionPath)) {
			let Pool;
			try {
				const pg = await import("pg");
				Pool = pg.Pool;
			} catch {
				throw new Error("The 'pg' module is not installed! Please run: npm install pg");
			}
			const useSsl = isSslEnabled(sessionPath);
			const cleanUrl = typeof sessionPath === "string" ? sessionPath.replace(/([?&])sslmode=[^&]+(&|$)/i, "$1").replace(/[?&]$/, "") : sessionPath;
			const pool = new Pool({
				connectionString: cleanUrl,
				...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
			});
			await pool.query("SELECT 1"); // Test connection
			await pool.query(`
				CREATE TABLE IF NOT EXISTS baileys_auth (
					session VARCHAR(40) NOT NULL,
					identifier VARCHAR(100) NOT NULL,
					value TEXT DEFAULT NULL,
					UNIQUE (session, identifier)
				);
			`);

			storeData = async (data, identifier) => {
				const value = JSON.stringify(data, BufferJSON.replacer);
				await pool.query(`INSERT INTO baileys_auth (session, identifier, value) VALUES ($1, $2, $3) ON CONFLICT (session, identifier) DO UPDATE SET value = $3`, [sessionName, identifier, value]);
			};

			readData = async (identifier) => {
				const res = await pool.query(`SELECT value FROM baileys_auth WHERE session = $1 AND identifier = $2`, [sessionName, identifier]);
				return res.rows.length > 0 ? JSON.parse(res.rows[0].value, BufferJSON.reviver) : null;
			};

			removeData = async (identifier) => {
				await pool.query(`DELETE FROM baileys_auth WHERE session = $1 AND identifier = $2`, [sessionName, identifier]);
			};
		} else {
			throw new Error("SQL Dialect not fully supported yet in Custom Auth Adapter");
		}
	}

	const creds = (await readData("creds")) || initAuthCreds();
	const keyCache = new Map();
	let writeQueue = Promise.resolve();
	const MAX_CACHE_SIZE = global?.database?.options?.maxCacheSize || 10000;

	const cacheGet = (key) => {
		if (!keyCache.has(key)) return undefined;
		const val = keyCache.get(key);
		keyCache.delete(key);
		keyCache.set(key, val);
		return val;
	};

	const cacheSet = (key, value) => {
		if (keyCache.has(key)) keyCache.delete(key);
		keyCache.set(key, value);
		if (keyCache.size > MAX_CACHE_SIZE) {
			const oldest = keyCache.keys().next().value;
			if (oldest) keyCache.delete(oldest);
		}
	};

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const data = {};
					await Promise.all(
						ids.map(async (id) => {
							const key = `${type}-${id}`;
							let value = cacheGet(key);
							if (value === undefined) {
								value = await readData(key);
								if (value) cacheSet(key, value);
							}
							if (type === "app-state-sync-key" && value) {
								value = proto.Message.AppStateSyncKeyData.fromObject(value);
							}
							data[id] = value;
						}),
					);
					return data;
				},
				set: async (data) => {
					const tasks = [];
					for (const category in data) {
						for (const id in data[category]) {
							const value = data[category][id];
							const key = `${category}-${id}`;
							if (value) {
								cacheSet(key, value);
								tasks.push(() => storeData(value, key));
							} else {
								keyCache.delete(key);
								tasks.push(() => removeData(key));
							}
						}
					}
					for (const task of tasks) {
						writeQueue = writeQueue.then(task).catch(() => {});
					}
					await writeQueue;
				},
			},
		},
		saveCreds: () => {
			writeQueue = writeQueue.then(() => storeData(creds, "creds")).catch(() => {});
			return writeQueue;
		},
	};
};
