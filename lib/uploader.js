import fs from 'fs';


import { fileTypeFromFile } from 'file-type';

async function UguuSe(buffer, ext = 'bin') {
	return new Promise(async (resolve, reject) => {
		try {
			const form = new FormData();
			form.append('files[]', new Blob([buffer]), 'data.' + ext);
			const res = await fetch('https://uguu.se/upload.php', { method: 'POST', body: form });
			const data = await res.json();
			resolve(data.files[0])
		} catch (e) {
			reject(e)
		}
	})
}

export { UguuSe }