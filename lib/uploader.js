const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const FormData = require('form-data');
const FileType = require('file-type');

async function UguuSe(filePath) {
	return new Promise (async (resolve, reject) => {
		try {
			const form = new FormData();
			const fileType = await FileType.fromFile(filePath);
			const ext = fileType ? fileType.ext : 'bin';
			form.append('files[]', fs.createReadStream(filePath), { filename: 'data.' + ext });
			const data = await axios.post('https://uguu.se/upload.php', form, {
				headers: {
					...form.getHeaders()
				}
			})
			resolve(data.data.files[0])
		} catch (e) {
			reject(e)
		}
	})
}

async function webp2mp4File(path) {
	return new Promise((resolve, reject) => {
		const form = new FormData();
		 form.append('new-image-url', '')
		 form.append('new-image', fs.createReadStream(path))
		 axios({
			  method: 'post',
			  url: 'https://s6.ezgif.com/webp-to-mp4',
			  data: form,
			  headers: {
				   'Content-Type': `multipart/form-data; boundary=${form._boundary}`
			  }
		 }).then(({ data }) => {
			  const FormDataThen = new FormData()
			  const $ = cheerio.load(data)
			  const file = $('input[name="file"]').attr('value')
			  FormDataThen.append('file', file)
			  FormDataThen.append('convert', "Convert WebP to MP4!")
			  axios({
				   method: 'post',
				   url: 'https://ezgif.com/webp-to-mp4/' + file,
				   data: FormDataThen,
				   headers: {
						'Content-Type': `multipart/form-data; boundary=${FormDataThen._boundary}`
				   }
			  }).then(({ data }) => {
				   const $ = cheerio.load(data)
				   const result = 'https:' + $('div#output > p.outfile > video > source').attr('src')
				   resolve({
						status: true,
						message: "Created By MRHRTZ",
						result: result
				   })
			  }).catch(reject)
		 }).catch(reject)
	})
}

module.exports = { UguuSe, webp2mp4File }
