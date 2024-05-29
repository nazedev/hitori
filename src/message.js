require('../settings');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const FileType = require('file-type');
const PhoneNumber = require('awesome-phonenumber');

const prem = require('./premium');
const { imageToWebp, videoToWebp, writeExif } = require('../lib/exif');
const premium = JSON.parse(fs.readFileSync('./database/premium.json'));
const { isUrl, getGroupAdmins, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep, getTypeUrlMedia } = require('../lib/function');
const { jidNormalizedUser, proto, getBinaryNodeChildren, generateWAMessageContent, generateForwardMessageContent, prepareWAMessageMedia, delay, areJidsSameUser, extractMessageContent, generateMessageID, downloadContentFromMessage, generateWAMessageFromContent, jidDecode, generateWAMessage, toBuffer, getContentType, getDevice } = require('@whiskeysockets/baileys');

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : wa.me/6282113821188
*/

async function GroupUpdate(naze, update) {
	try {
		for (let n of update) {
			let setinfo = global.db.groups[n.id].setinfo
			if (setinfo) {
				let profile;
				try {
					profile = await naze.profilePictureUrl(n.id, 'image');
				} catch {
					profile = 'https://telegra.ph/file/95670d63378f7f4210f03.png';
				}
				if (n.announce) {
					await naze.sendMessage(n.id, {
						text: 'Group telah ditutup oleh Admin',
						contextInfo: {
							externalAdReply: {
								title: 'Group Closed',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else if (n.announce == false) {
					await naze.sendMessage(n.id, {
						text: 'Group telah dibuka oleh Admin',
						contextInfo: {
							externalAdReply: {
								title: 'Group Open',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else if (n.restrict) {
					await naze.sendMessage(n.id, {
						text: 'Sekarang hanya Admin yang dapat mengedit info Group',
						contextInfo: {
							externalAdReply: {
								title: 'Info Group Update',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else if (n.restrict == false) {
					await naze.sendMessage(n.id, {
						text: 'Sekarang Peserta dapat mengedit info Group',
						contextInfo: {
							externalAdReply: {
								title: 'Info Group Update',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else {
					await naze.sendMessage(n.id, {
						text: 'Group Subject diganti menjadi ' + n.subject,
						contextInfo: {
							externalAdReply: {
								title: 'Subject Group Update',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				}
			}
		}
	} catch (e) {
		throw e;
	}
}

async function GroupParticipantsUpdate(naze, { id, participants, action }) {
	try {
		let welcome = global.db.groups[id].welcome
		if (welcome) {
			let metadata = await naze.groupMetadata(id);
			for (let n of participants) {
				let profile;
				try {
					profile = await naze.profilePictureUrl(n, 'image');
				} catch {
					profile = 'https://telegra.ph/file/95670d63378f7f4210f03.png';
				}
				if (action == 'add') {
					await naze.sendMessage(id, {
						text: `Welcome to ${metadata.subject}\n@${n.split('@')[0]}`,
						contextInfo: {
							mentionedJid: [n],
							externalAdReply: {
								title: 'Welcome',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else if (action == 'remove') {
					await naze.sendMessage(id, {
						text: `@${n.split('@')[0]}\nLeaving From ${metadata.subject}`,
						contextInfo: {
							mentionedJid: [n],
							externalAdReply: {
								title: 'Leave',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else if (action == 'promote') {
					await naze.sendMessage(id, {
						text: `@${n.split('@')[0]}\nPromote From ${metadata.subject}`,
						contextInfo: {
							mentionedJid: [n],
							externalAdReply: {
								title: 'Promote',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				} else if (action == 'demote') {
					await naze.sendMessage(id, {
						text: `@${n.split('@')[0]}\nDemote From ${metadata.subject}`,
						contextInfo: {
							mentionedJid: [n],
							externalAdReply: {
								title: 'Demote',
								mediaType: 1,
								previewType: 0,
								thumbnailUrl: profile,
								renderLargerThumbnail: true,
								sourceUrl: global.my.gh
							}
						}
					});
				}
			}
		}
	} catch (e) {
		throw e;
	}
}

async function MessageDelete(naze, message) {
	try {
		
	} catch (e) {
		throw e;
	}
}

async function LoadDataBase(naze, m) {
	try {
		const isNumber = x => typeof x === 'number' && !isNaN(x)
		const isBoolean = x => typeof x === 'boolean' && Boolean(x)
		let user = global.db.users[m.sender]
		let limitUser = user ? (user.vip ? global.limit.vip : prem.checkPremiumUser(m.sender, premium) ? global.limit.premium : global.limit.free) : prem.checkPremiumUser(m.sender, premium) ? global.limit.premium : global.limit.free
		let uangUser = user ? (user.vip ? global.uang.vip : prem.checkPremiumUser(m.sender, premium) ? global.uang.premium : global.uang.free) : prem.checkPremiumUser(m.sender, premium) ? global.uang.premium : global.uang.free
		if (typeof user !== 'object') global.db.users[m.sender] = {}
		if (user) {
			if (!('vip' in user)) user.afkReason = false
			if (!isNumber(user.afkTime)) user.afkTime = -1
			if (!('afkReason' in user)) user.afkReason = ''
			if (!isNumber(user.limit)) user.limit = limitUser
			if (!('uang' in user)) user.uang = uangUser
			if (!('lastclaim' in user)) user.lastclaim = new Date * 1
			if (!('lastrampok' in user)) user.lastrampok = new Date * 1
		} else {
			global.db.users[m.sender] = {
				vip: false,
				afkTime: -1,
				afkReason: '',
				limit: limitUser,
				uang: uangUser,
				lastclaim: new Date * 1,
				lastrampok: new Date * 1,
			}
		}
		
		if (m.isGroup) {
			let group = global.db.groups[m.chat]
			if (typeof group !== 'object') global.db.groups[m.chat] = {}
			if (group) {
				if (!('mute' in group)) group.mute = false
				if (!('setinfo' in group)) group.setinfo = true
				if (!('antilink' in group)) group.antilink = false
				if (!('welcome' in group)) group.welcome = true
				if (!('antidelete' in group)) group.antidelete = true
				if (!('waktusholat' in group)) group.waktusholat = false
			} else {
				global.db.groups[m.chat] = {
					mute: false,
					setinfo: true,
					antilink: false,
					welcome: true,
					antidelete: true,
					waktusholat: false,
				}
			}
		}
	} catch (e) {
		throw e;
	}
}

async function MessagesUpsert(naze, message, store) {
	try {
		let botNumber = await naze.decodeJid(naze.user.id);
		const msg = message.messages[0];
		const type = msg.message ? (getContentType(msg.message) || Object.keys(msg.message)[0]) : '';
		if (!naze.public && !msg.key.fromMe && message.type === 'notify') return
		if (msg.key.id.startsWith('BAE5')) return
		if (!msg.message) return
		const m = await Serialize(naze, msg, store)
		require('../naze')(naze, m, message, store);
		if (type === 'interactiveResponseMessage' && m.quoted && m.quoted.fromMe) {
			let apb = await generateWAMessage(m.chat, { text: JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id, mentions: m.mentionedJid }, {
				userJid: naze.user.id,
				quoted: m.quoted
			});
			apb.key = msg.key
			apb.key.fromMe = areJidsSameUser(m.sender, naze.user.id);
			if (m.isGroup) apb.participant = m.sender;
			let pbr = {
				...msg,
				messages: [proto.WebMessageInfo.fromObject(apb)],
				type: 'append'
			}
			naze.ev.emit('messages.upsert', pbr);
		}
		if (global.settings.readsw) {
			if (msg.key.remoteJid === 'status@broadcast') {
				await naze.readMessages([msg.key]);
				if (/protocolMessage/i.test(type)) naze.sendFromOwner(global.owner, 'Status dari @' + msg.key.participant.split('@')[0] + ' Telah dihapus', msg, { mentions: [msg.key.participant] });
				if (/(audioMessage|imageMessage|videoMessage|extendedTextMessage)/i.test(type)) {
					let keke = (type == 'extendedTextMessage') ? `Story Teks Berisi : ${msg.message.extendedTextMessage.text ? msg.message.extendedTextMessage.text : ''}` : (type == 'imageMessage') ? `Story Gambar ${msg.message.imageMessage.caption ? 'dengan Caption : ' + msg.message.imageMessage.caption : ''}` : (type == 'videoMessage') ? `Story Video ${msg.message.videoMessage.caption ? 'dengan Caption : ' + msg.message.videoMessage.caption : ''}` : (type == 'audioMessage') ? 'Story Audio' : '\nTidak diketahui cek saja langsung'
					await naze.sendFromOwner(global.owner, `Melihat story dari @${msg.key.participant.split('@')[0]}\n${keke}`, msg, { mentions: [msg.key.participant] });
				}
			}
		}
	} catch (e) {
		throw e;
	}
}

async function Solving(naze, store) {
	naze.database = {
		chats: {},
		messages: {},
	}
	
	naze.public = true
	
	naze.serializeM = (m) => MessagesUpsert(naze, m, store)
	
	naze.decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + '@' + decode.server || jid
		} else return jid
	}
	
	naze.getName = (jid, withoutContact  = false) => {
		const id = naze.decodeJid(jid);
		if (id.endsWith('@g.us')) {
			const groupInfo = store.contacts[id] || naze.groupMetadata(id) || {};
			return Promise.resolve(groupInfo.name || groupInfo.subject || PhoneNumber('+' + id.replace('@g.us', '')).getNumber('international'));
		} else {
			if (id === '0@s.whatsapp.net') {
				return 'WhatsApp';
			}
		const contactInfo = store.contacts[id] || {};
		return withoutContact ? '' : contactInfo.name || contactInfo.subject || contactInfo.verifiedName || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international');
		}
	}
	
	naze.sendContact = async (jid, kon, quoted = '', opts = {}) => {
		let list = []
		for (let i of kon) {
			list.push({
				displayName: await naze.getName(i + '@s.whatsapp.net'),
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await naze.getName(i + '@s.whatsapp.net')}\nFN:${await naze.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.ADR:;;Indonesia;;;;\nitem2.X-ABLabel:Region\nEND:VCARD` //vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await naze.getName(i + '@s.whatsapp.net')}\nFN:${await naze.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:whatsapp@gmail.com\nitem2.X-ABLabel:Email\nitem3.URL:https://instagram.com/naze_dev\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
			})
		}
		naze.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
	}
	
	naze.setStatus = (status) => {
		naze.query({
			tag: 'iq',
			attrs: {
				to: '@s.whatsapp.net',
				type: 'set',
				xmlns: 'status',
			},
			content: [{
				tag: 'status',
				attrs: {},
				content: Buffer.from(status, 'utf-8')
			}]
		})
		return status
	}
	
	naze.sendPoll = (jid, name = '', values = [], selectableCount = 1) => {
		return naze.sendMessage(jid, { poll: { name, values, selectableCount }})
	}
	
	naze.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		const buffer = await axios.get(url, { responseType: 'arraybuffer' });
		const mime = buffer.headers['content-type'] || (await FileType.fromBuffer(buffer.data)).mime
		if (mime.includes('gif')) {
			return naze.sendMessage(jid, { video: buffer.data, caption: caption, gifPlayback: true, ...options }, { quoted });
		} else if (mime === 'application/pdf') {
			return naze.sendMessage(jid, { document: buffer.data, mimetype: 'application/pdf', caption: caption, ...options }, { quoted });
		} else if (mime.includes('image')) {
			return naze.sendMessage(jid, { image: buffer.data, caption: caption, ...options }, { quoted });
		} else if (mime.includes('video')) {
			return naze.sendMessage(jid, { video: buffer.data, caption: caption, mimetype: 'video/mp4', ...options }, { quoted });
		} else if (mime.includes('audio')) {
			return naze.sendMessage(jid, { audio: buffer.data, mimetype: 'audio/mpeg', ...options }, { quoted });
		}
	}
	
	naze.sendFakeLink = async (jid, text, title, body, thumbnail, myweb, options = {}) => {
		await naze.sendMessage(jid, {
			text: text,
			contextInfo: {
				externalAdReply: {
					title: title,
					body: body,
					previewType: 'PHOTO',
					thumbnailUrl: myweb,
					thumbnail: thumbnail,
					sourceUrl: myweb
				}
			}
		}, {
		...options
		})
	}
	
	naze.sendFromOwner = async (jid, text, quoted, options = {}) => {
		for (const a of jid) {
			await naze.sendMessage(a + '@s.whatsapp.net', { text, ...options }, { quoted });
		}
	}
	
	naze.sendTextMentions = async (jid, text, quoted, options = {}) => naze.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
	
	naze.sendAsSticker = async (jid, path, quoted, type, options = {}) => {
		let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
		if (options && (options.packname || options.author)) {
			buff = await writeExif(buff, options);
		} else {
			if (type === 'image') {
				buff = await imageToWebp(buff);
			} else if (type === 'video') {
				buff = await videoToWebp(buff);
			}
		}
		await naze.sendMessage(jid, { sticker: { url: buff }, ...options }, { quoted });
		return buff;
	}
	
	naze.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
		const quoted = message.msg || message;
		const mime = quoted.mimetype || '';
		const messageType = (message.mtype || mime.split('/')[0]).replace(/Message/gi, '');
		const stream = await downloadContentFromMessage(quoted, messageType);
		let buffer = Buffer.from([]);
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk]);
		}
		const type = await FileType.fromBuffer(buffer);
		const trueFileName = attachExtension ? `${filename}.${type.ext}` : filename;
		await fs.promises.writeFile(trueFileName, buffer);
		return trueFileName;
	}
	
	naze.getFile = async (PATH, save) => {
		let res
		let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
		let type = await FileType.fromBuffer(data) || {
			mime: 'application/octet-stream',
			ext: '.bin'
		}
		filename = path.join(__filename, '../database/sampah/' + new Date * 1 + '.' + type.ext)
		if (data && save) fs.promises.writeFile(filename, data)
		return {
			res,
			filename,
			size: await getSizeMedia(data),
			...type,
			data
		}
	}
	
	naze.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
		const { mime, data, filename } = await naze.getFile(path, true);
		const isWebpSticker = options.asSticker || /webp/.test(mime);
		let type = 'document', mimetype = mime, pathFile = filename;
		if (isWebpSticker) {
			const { writeExif } = require('../lib/exif');
			const media = { mimetype: mime, data };
			pathFile = await writeExif(media, {
				packname: options.packname || global.packname,
				author: options.author || global.author,
				categories: options.categories || [],
			})
			await fs.promises.unlink(filename);
			type = 'sticker';
			mimetype = 'image/webp';
		} else if (/image|video|audio/.test(mime)) {
			type = mime.split('/')[0];
		}
		await naze.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options });
		return fs.promises.unlink(pathFile);
	}
	
	naze.sendButtonMsg = async (jid, body = '', footer = '', title = '', media, buttons = [], quoted, options = {}) => {
		const msg = await generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					messageContextInfo: {
						deviceListMetadata: {},
						deviceListMetadataVersion: 2,
					},
					interactiveMessage: proto.Message.InteractiveMessage.create({
						body: proto.Message.InteractiveMessage.Body.create({ text: body }),
						footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
						header: proto.Message.InteractiveMessage.Header.fromObject({
							title,
							hasMediaAttachment: !!media,
							...(media ? await generateWAMessageContent({
								[media.type]: media.url ? { url: media.url } : media.data
							}, {
								upload: naze.waUploadToServer
							}) : {})
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: buttons.map(a => {
								return {
									name: a.name,
									buttonParamsJson: JSON.stringify(a.buttonParamsJson ? JSON.parse(a.buttonParamsJson) : '')
								}
							})
						}),
						contextInfo: {
							mentionedJid: options.mentions || [],
							...options.contextInfo,
							...(quoted ? {
								stanzaId: quoted.key.id,
								remoteJid: quoted.key.remoteJid,
								participant: quoted.key.participant || quoted.key.remoteJid,
								fromMe: quoted.key.fromMe,
								quotedMessage: quoted.message
							} : {})
						}
					})
				}
			}
		}, {});
		await naze.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
	}
	
	naze.sendCarouselMsg = async (jid, body = '', footer = '', cards = [], options = {}) => {
		async function getImageMsg(url) {
			const { imageMessage } = await generateWAMessageContent({ image: { url } }, { upload: naze.waUploadToServer });
			return imageMessage;
		}
		const cardPromises = cards.map(async (a) => {
			const imageMessage = await getImageMsg(a.url);
			return {
				header: {
					imageMessage: imageMessage,
					hasMediaAttachment: true
				},
				body: { text: a.body },
				footer: { text: a.footer },
				nativeFlowMessage: {
					buttons: a.buttons.map(b => ({
						name: b.name,
						buttonParamsJson: JSON.stringify(b.buttonParamsJson ? JSON.parse(b.buttonParamsJson) : '')
					}))
				}
			};
		});
		
		const cardResults = await Promise.all(cardPromises);
		const msg = await generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					messageContextInfo: {
						deviceListMetadata: {},
						deviceListMetadataVersion: 2
					},
					interactiveMessage: proto.Message.InteractiveMessage.create({
						body: proto.Message.InteractiveMessage.Body.create({ text: body }),
						footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
						carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
							cards: cardResults,
							messageVersion: 1
						})
					})
				}
			}
		}, {});
		await naze.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
	}

	return naze
}

/*
	* Create By Naze
	* Follow https://github.com/nazedev
	* Whatsapp : wa.me/6282113821188
*/

async function Serialize(naze, m, store) {
	const botNumber = naze.decodeJid(naze.user.id)
	if (!m) return m
	if (m.key) {
		m.id = m.key.id
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isBaileys = m.id.startsWith('BAE5')
		m.isGroup = m.chat.endsWith('@g.us')
		m.sender = naze.decodeJid(m.fromMe && naze.user.id || m.participant || m.key.participant || m.chat || '')
		if (m.isGroup) {
			m.metadata = await naze.groupMetadata(m.chat)
			m.admins = (m.metadata.participants.reduce((a, b) => (b.admin ? a.push({ id: b.id, admin: b.admin }) : [...a]) && a, []))
			m.isAdmin = m.admins.some((b) => b.id === m.sender)
			m.participant = m.key.participant
			m.isBotAdmin = !!m.admins.find((member) => member.id === botNumber)
		}
	}
	if (m.message) {
		m.type = getContentType(m.message) || Object.keys(m.message)[0]
		m.msg = (/viewOnceMessage/i.test(m.type) ? m.message[m.type].message[getContentType(m.message[m.type].message)] : (extractMessageContent(m.message[m.type]) || m.message[m.type]))
		m.body = m.message?.conversation || m.msg?.text || m.msg?.conversation || m.msg?.caption || m.msg?.selectedButtonId || m.msg?.singleSelectReply?.selectedRowId || m.msg?.selectedId || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || m.msg?.name || ''
		m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
		m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';
		m.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.body) ? m.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : ''
		m.command = m.body && m.body.replace(m.prefix, '').trim().split(/ +/).shift()
		m.args = m.body?.trim().replace(new RegExp("^" + m.prefix?.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, '\\$&'), 'i'), '').replace(m.command, '').split(/ +/).filter(a => a) || []
		m.expiration = m.msg?.contextInfo?.expiration || 0
		m.timestamp = (typeof m.messageTimestamp === "number" ? m.messageTimestamp : m.messageTimestamp.low ? m.messageTimestamp.low : m.messageTimestamp.high) || m.msg.timestampMs * 1000
		m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath
		if (m.isMedia) {
			m.mime = m.msg?.mimetype
			m.size = m.msg?.fileLength
			m.height = m.msg?.height || ''
			m.width = m.msg?.width || ''
			if (/webp/i.test(m.mime)) {
				m.isAnimated = m.msg?.isAnimated
			}
		}
		m.quoted = m.msg?.contextInfo?.quotedMessage || null
		if (m.quoted) {
			m.quoted.message = extractMessageContent(m.msg?.contextInfo?.quotedMessage)
			m.quoted.type = getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0]
			m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.device = getDevice(m.quoted.id)
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
			m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') : false
			m.quoted.sender = naze.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === naze.decodeJid(naze.user.id)
			m.quoted.text = m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
			m.quoted.msg = extractMessageContent(m.quoted.message[m.quoted.type]) || m.quoted.message[m.quoted.type]
			m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
			m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ''
			m.getQuotedObj = async () => {
				if (!m.quoted.id) return false
				let q = await store.loadMessage(m.chat, m.quoted.id, naze)
				return await Serialize(naze, q, store)
			}
			m.quoted.key = {
				remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
				participant: m.quoted.sender,
				fromMe: areJidsSameUser(naze.decodeJid(m.msg?.contextInfo?.participant), naze.decodeJid(naze?.user?.id)),
				id: m.msg?.contextInfo?.stanzaId
			}
			m.quoted.isGroup = m.quoted.chat.endsWith('@g.us')
			m.quoted.mentions = m.quoted.msg?.contextInfo?.mentionedJid || []
			m.quoted.body = m.quoted.msg?.text || m.quoted.msg?.caption || m.quoted?.message?.conversation || m.quoted.msg?.selectedButtonId || m.quoted.msg?.singleSelectReply?.selectedRowId || m.quoted.msg?.selectedId || m.quoted.msg?.contentText || m.quoted.msg?.selectedDisplayText || m.quoted.msg?.title || m.quoted?.msg?.name || ''
			m.quoted.prefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi.test(m.quoted.body) ? m.quoted.body.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi)[0] : ''
			m.quoted.command = m.quoted.body && m.quoted.body.replace(m.quoted.prefix, '').trim().split(/ +/).shift()
			m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath
			if (m.quoted.isMedia) {
				m.quoted.mime = m.quoted.msg?.mimetype
				m.quoted.size = m.quoted.msg?.fileLength
				m.quoted.height = m.quoted.msg?.height || ''
				m.quoted.width = m.quoted.msg?.width || ''
				if (/webp/i.test(m.quoted.mime)) {
					m.quoted.isAnimated = m?.quoted?.msg?.isAnimated || false
				}
			}
			m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
				key: {
					remoteJid: m.quoted.chat,
					fromMe: m.quoted.fromMe,
					id: m.quoted.id
				},
				message: m.quoted,
				...(m.isGroup ? { participant: m.quoted.sender } : {})
			})
			m.quoted.download = async () => {
				const quotednya = m.quoted.msg || m.quoted;
				const mimenya = quotednya.mimetype || '';
				const messageType = (m.quoted.type || mimenya.split('/')[0]).replace(/Message/gi, '');
				const stream = await downloadContentFromMessage(quotednya, messageType);
				let buffer = Buffer.from([]);
				for await (const chunk of stream) {
					buffer = Buffer.concat([buffer, chunk]);
				}
				return buffer
			}
			m.quoted.delete = () => {
				naze.sendMessage(m.quoted.chat, {
					delete: {
						remoteJid: m.quoted.chat,
						fromMe: m.isBotAdmins ? false : true,
						id: m.quoted.id,
						participant: m.quoted.sender
					}
				})
			}
		}
	}
	
	m.download = async () => {
		const quotednya = m.msg || m.quoted;
		const mimenya = quotednya.mimetype || '';
		const messageType = (m.type || mimenya.split('/')[0]).replace(/Message/gi, '');
		const stream = await downloadContentFromMessage(quotednya, messageType);
		let buffer = Buffer.from([]);
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk]);
		}
		return buffer
	}
	
	m.copy = () => Serialize(naze, proto.WebMessageInfo.fromObject(proto.WebMessageInfo.toObject(m)))
	
	m.reply = async (text, options = {}) => {
		const chatId = options?.chat ? options.chat : m.chat
		const caption = options.caption || '';
		const quoted = options?.quoted ? options.quoted : m
		try {
			if (/^https?:\/\//.test(text)) {
				const data = await axios.get(text, { responseType: 'arraybuffer' });
				const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data)).mime
				if (/gif|image|video|audio|pdf/i.test(mime)) {
					return naze.sendFileUrl(chatId, text, caption, quoted, options)
				} else {
					return naze.sendMessage(chatId, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
				}
			} else {
				return naze.sendMessage(chatId, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
			}
		} catch (e) {
			return naze.sendMessage(chatId, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })
		}
	}

	return m
}

module.exports = { GroupUpdate, GroupParticipantsUpdate, LoadDataBase, MessageDelete, MessagesUpsert, Solving }

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});
