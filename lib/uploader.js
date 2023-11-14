const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');
const form = new FormData();

async function TelegraPh(buffer) {
	return new Promise (async (resolve, reject) => {
		try {
			const input = Buffer.from(buffer);
			form.append('file', input, { filename: 'data' });
			const data = await axios.post('https://telegra.ph/upload', form, {
				headers: {
					'User-Agent': 'okhttp/4.9.3',
					...form.getHeaders()
				}
			})
			resolve('https://telegra.ph' + data.data[0].src)
		} catch (e) {
			reject(e)
		}
	})
}

async function UguuSe(buffer) {
	return new Promise (async (resolve, reject) => {
		try {
			const input = Buffer.from(buffer);
			form.append('files[]', input, { filename: 'data' });
			const data = await axios.post('https://uguu.se/upload.php', form, {
				headers: {
					'User-Agent': 'okhttp/4.9.3',
					...form.getHeaders()
				}
			})
			resolve(data.data.files[0])
		} catch (e) {
			reject(e)
		}
	})
}

async function Aemt(buffer) {
  return new Promise (async (resolve, reject) =>{
    try {
      const input = Buffer.from(buffer);
      const { ext } = await fromBuffer(buffer);
      form.append('file', input, 'file.' + ext);
      const anu = await axios.post('https://aemt.me/api/upload.php', form, {
        headers: {
          ...form.getHeaders()
        }
      });
      resolve(anu.data)
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = { TelegraPh, UguuSe, Aemt }
