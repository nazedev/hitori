require("../settings");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const mongoose = require("mongoose");

let DataBase;

if (/mongo/.test(global.tempatDB)) {
  class MongoDB {
    constructor(url = global.tempatDB, options = { useNewUrlParser: true }) {
      this.url = url;
      this.data = {};
      this._model = {};
      this.options = options;
      this.connection = null;
    }

    async connect() {
      try {
        this.connection = await mongoose.connect(this.url, this.options);
        const schema = new mongoose.Schema({
          data: {
            type: Object,
            required: true,
            default: {},
          },
        });
        this._model = mongoose.models.datas || mongoose.model("data", schema);
      } catch (error) {
        console.error(chalk.red("Connection error:", error));
      }
    }

    async read() {
      await this.connect();
      this.data = await this._model.findOne({});
      if (!this.data) {
        await new this._model({ data: {} }).save();
        this.data = await this._model.findOne({});
      }
      return this.data?.data || this.data;
    }

    async write(data) {
      if (this.data && !this.data.data) {
        return await new this._model({ data }).save();
      }

      try {
        const docs = await this._model.findById(this.data._id);
        if (!docs.data) docs.data = {};
        docs.data = data;
        return await docs.save();
      } catch (error) {
        console.error(chalk.red("Write error:", error));
      }
    }
  }

  DataBase = MongoDB;
} else if (/json/.test(global.tempatDB)) {
  class JSONDatabase {
    constructor() {
      this.data = {};
      this.file = path.join(process.cwd(), "database", global.tempatDB);
    }

    async read() {
      let data;
      if (fs.existsSync(this.file)) {
        data = JSON.parse(fs.readFileSync(this.file));
      } else {
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
        data = this.data;
      }
      return data;
    }

    async write(data) {
      this.data = data || global.db;
      const dirname = path.dirname(this.file);
      if (!fs.existsSync(dirname)) fs.mkdirSync(dirname, { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
      return this.file;
    }
  }

  DataBase = JSONDatabase;
}

module.exports = DataBase;

const file = require.resolve(__filename);

fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});
