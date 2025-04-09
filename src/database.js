require('../settings');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const mongoose = require('mongoose');
let DataBase;

if (/mongo/.test(global.tempatDB)) {
	DataBase = class mongoDB {
		constructor(url = global.tempatDB, options = { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 }) {
			this.url = url
			this._model = null
			this.options = options
			this.isConnecting = false
			this.isReconnecting = false
			
			mongoose.connection.on('disconnected', async () => {
				if (this.isReconnecting) return
				this.isReconnecting = true
				console.warn('❗ MongoDB connection lost. Attempting to reconnect in 5 seconds...');
				await new Promise(resolve => setTimeout(resolve, 5000));
				await this.connect();
			});
		}
		
		connect = async (retries = 5, delay = 2000) => {
			if (mongoose.connection.readyState === 1 || this.isConnecting) {
				console.log('✅ MongoDB is already connected.');
				return;
			}
			this.isConnecting = true;
			while (retries > 0) {
				try {
					console.log(`🔄 Attempting to connect to MongoDB... (Attempt ${6 - retries}/5)`);
					if (mongoose.connection.readyState === 0) {
						await mongoose.connect(this.url, { ...this.options });
					}
					if (!this._model) {
						const schema = new mongoose.Schema({
							data: { type: Object, required: true, default: {} }
						})
						this._model = mongoose.models.data || mongoose.model('data', schema);
					}
					console.log('✅ Successfully connected to MongoDB.');
					this.isConnecting = false;
					this.isReconnecting = false;
					return;
				} catch (e) {
					console.error(`❌ MongoDB connection failed: ${e.message}`);
					await new Promise((res) => setTimeout(res, delay));
					retries--;
				}
			}
			this.isConnecting = false;
			throw new Error('❌ MongoDB connection failed after multiple attempts.');
		}
		
		read = async () => {
			if (mongoose.connection.readyState !== 1 && !this.isConnecting) {
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
			if (mongoose.connection.readyState !== 1 && !this.isConnecting) {
				await this.connect();
			}
			const safeData = JSON.stringify(data, (key, value) => {
				if (typeof value === 'object' && value !== null && value._id) {
					return undefined;
				}
				return value;
			});
			await this._model.findOneAndUpdate({}, { data: safeData }, { upsert: true, new: true, setDefaultsOnInsert: true });
		}
	}
} else if (/json/.test(global.tempatDB)) {
	DataBase = class dataBase {
		constructor(file = global.tempatDB) {
			this.data = {}
			this.file = path.join(process.cwd(), 'database', file);
		}
		
		read = async () => {
			let data;
			if (fs.existsSync(this.file)) {
				data = JSON.parse(fs.readFileSync(this.file))
			} else {
				fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
				data = this.data
			}
			return data
		}
		
		write = async (data) => {
			this.data = data || global.db || {}
			let dirname = path.dirname(this.file)
			if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true })
			fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
			return this.file
		}
	}
}

module.exports = DataBase


let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});