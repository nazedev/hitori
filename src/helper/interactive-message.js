import { prepareWAMessageMedia, generateWAMessageContent, proto } from "baileys";

/**
 * @typedef {"PROMOTION" | "DEFAULT" | "REVIEW" | "DOCUMENT"} Icon
 */

/**
 * @typedef {object} ButtonUrlOptions
 * @property {boolean} [webview_interaction]
 * @property {Icon} [icon]
 */

/**
 * @typedef {object} ButtonQuickReplyOption
 * @property {Icon} [icon]
 */

/**
 * @typedef {object} ButtonCopyOptions
 * @property {Icon} [icon]
 */

/**
 * @typedef {object} SingleSelectSectionRow
 * @property {string} title
 * @property {string} [description]
 * @property {string} id
 */

/**
 * @typedef {object} SingleSelectSection
 * @property {string} title
 * @property {string} [highlight_label]
 * @property {SingleSelectSectionRow[]} rows
 */

/**
 * @typedef {object} SingleSelectOptions
 * @property {Icon} [icon]
 */

/**
 * @typedef {object} ButtonLimitOptions
 * @property {string} [listTitle]
 * @property {string} [list_title]
 * @property {string} [buttonTitle]
 * @property {string} [button_title]
 * @property {string[] | number[] | "all"} [dividerIndicies]
 * @property {string[] | number[] | "all"} [divider_indices]
 */

/**
 * Normalizes legacy, shorthand, or native flow button object into standard Native Flow button structure
 * @param {object} btn
 * @returns {object|null}
 */
function normalizeNativeFlowButton(btn) {
	if (!btn || typeof btn !== "object") return null;

	if (btn.nativeFlowInfo) {
		const name = btn.nativeFlowInfo.name || "quick_reply";
		const params = btn.nativeFlowInfo.paramsJson || btn.nativeFlowInfo.buttonParamsJson || "";
		return {
			name,
			buttonParamsJson: typeof params === "string" ? params : JSON.stringify(params || {}),
		};
	}

	if (btn.name) {
		if (btn.buttonParamsJson !== undefined) {
			return {
				name: btn.name,
				buttonParamsJson: typeof btn.buttonParamsJson === "string" ? btn.buttonParamsJson : JSON.stringify(btn.buttonParamsJson || {}),
			};
		}
		if (btn.name === "cta_url") {
			return {
				name: "cta_url",
				buttonParamsJson: JSON.stringify({
					display_text: btn.display_text || btn.displayText || btn.text || "",
					url: btn.url || "",
					webview_interaction: btn.webview_interaction,
					icon: btn.icon,
				}),
			};
		}
		if (btn.name === "cta_copy") {
			return {
				name: "cta_copy",
				buttonParamsJson: JSON.stringify({
					display_text: btn.display_text || btn.displayText || btn.text || "",
					copy_code: btn.copy_code || btn.copyCode || btn.code || "",
					icon: btn.icon,
				}),
			};
		}
		if (btn.name === "quick_reply") {
			return {
				name: "quick_reply",
				buttonParamsJson: JSON.stringify({
					display_text: btn.display_text || btn.displayText || btn.text || "",
					id: btn.id || btn.buttonId || "",
					icon: btn.icon,
				}),
			};
		}
		if (btn.name === "single_select") {
			return {
				name: "single_select",
				buttonParamsJson: JSON.stringify({
					title: btn.title || btn.text || "",
					sections: btn.sections || [],
					icon: btn.icon,
				}),
			};
		}
		return {
			name: btn.name,
			buttonParamsJson: JSON.stringify(btn.params || {}),
		};
	}

	if (btn.url || btn.type === "url") {
		return {
			name: "cta_url",
			buttonParamsJson: JSON.stringify({
				display_text: btn.buttonText?.displayText || btn.displayText || btn.display_text || btn.text || "Link",
				url: btn.url || "",
				webview_interaction: btn.webview_interaction,
				icon: btn.icon,
			}),
		};
	}

	if (btn.copyCode || btn.copy_code || btn.type === "copy") {
		return {
			name: "cta_copy",
			buttonParamsJson: JSON.stringify({
				display_text: btn.buttonText?.displayText || btn.displayText || btn.display_text || btn.text || "Salin",
				copy_code: btn.copyCode || btn.copy_code || "",
				icon: btn.icon,
			}),
		};
	}

	if (btn.sections || btn.type === "single_select" || btn.type === "list") {
		return {
			name: "single_select",
			buttonParamsJson: JSON.stringify({
				title: btn.title || btn.text || "Pilih Opsi",
				sections: btn.sections || [],
				icon: btn.icon,
			}),
		};
	}

	const displayText = btn.buttonText?.displayText || btn.displayText || btn.display_text || btn.text || btn.title || "";
	const id = btn.buttonId || btn.id || displayText || "";
	return {
		name: "quick_reply",
		buttonParamsJson: JSON.stringify({
			display_text: displayText,
			id: id,
			icon: btn.icon,
		}),
	};
}

class InteractiveMessage {
	#message = {
		interactiveMessage: {
			header: {},
			body: {
				text: "",
			},
			footer: {},
			nativeFlowMessage: {
				buttons: [],
				messageParamsJson: null,
			},
		},
	};
	#sock;
	#tempAnyMessageContent;
	#mediaTypeOverride;
	#additionalNodes;

	/**
	 * @param {import("baileys").WASocket} [sock]
	 */
	constructor(sock) {
		this.#sock = sock;
	}

	/**
	 * Set title in header
	 * @param {string} text
	 * @returns {InteractiveMessage}
	 */
	setTitle(text) {
		if (typeof text !== "string") throw Error("input harus string");
		this.#message.interactiveMessage.header.title = text;
		return this;
	}

	/**
	 * Set subtitle in header
	 * @param {string} text
	 * @returns {InteractiveMessage}
	 */
	setSubtitle(text) {
		if (typeof text !== "string") throw Error("input harus string");
		this.#message.interactiveMessage.header.subtitle = text;
		return this;
	}

	/**
	 * Set footer text
	 * @param {string} text
	 * @returns {InteractiveMessage}
	 */
	setFooter(text) {
		if (typeof text !== "string") throw Error("input harus string");
		this.#message.interactiveMessage.footer.text = text;
		return this;
	}

	/**
	 * Set body text
	 * @param {string} text
	 * @returns {InteractiveMessage}
	 */
	setBody(text) {
		if (typeof text !== "string") throw Error("input harus string");
		this.#message.interactiveMessage.body.text = text;
		return this;
	}

	/**
	 * Set media content attachment
	 * @param {object} anyMessageContent
	 * @param {object} [options]
	 * @returns {InteractiveMessage}
	 */
	setMedia(anyMessageContent, options = {}) {
		this.#tempAnyMessageContent = anyMessageContent;
		if (options.mediaTypeOverride) this.#mediaTypeOverride = options.mediaTypeOverride;
		return this;
	}

	/**
	 * Set mediaTypeOverride (e.g. 'thumbnail-link')
	 * @param {string} override
	 * @returns {InteractiveMessage}
	 */
	setMediaTypeOverride(override) {
		this.#mediaTypeOverride = override;
		return this;
	}

	/**
	 * Set contextInfo
	 * @param {object} contextInfo
	 * @returns {InteractiveMessage}
	 */
	setContextInfo(contextInfo) {
		this.#message.interactiveMessage.contextInfo = {
			...(this.#message.interactiveMessage.contextInfo || {}),
			...contextInfo,
		};
		return this;
	}

	/**
	 * Add CTA URL button
	 * @param {string} displayText
	 * @param {string} url
	 * @param {ButtonUrlOptions} [opts]
	 * @returns {InteractiveMessage}
	 */
	addButtonUrl(displayText, url, opts) {
		if (typeof displayText !== "string") throw Error("displayText harus string");
		if (typeof url !== "string") throw Error("url harus string");

		const { webview_interaction = undefined, icon = undefined } = opts ?? {};
		this.#message.interactiveMessage.nativeFlowMessage.buttons.push({
			name: "cta_url",
			buttonParamsJson: JSON.stringify({
				display_text: displayText,
				url: url,
				webview_interaction,
				icon,
			}),
		});
		return this;
	}

	/**
	 * Add Quick Reply button
	 * @param {string} displayText
	 * @param {string} id
	 * @param {ButtonQuickReplyOption} [opts]
	 * @returns {InteractiveMessage}
	 */
	addButtonQuickReply(displayText, id, opts) {
		if (typeof displayText !== "string") throw Error("displayText harus string");
		if (typeof id !== "string") throw Error("id harus string");
		const { icon = undefined } = opts ?? {};
		this.#message.interactiveMessage.nativeFlowMessage.buttons.push({
			name: "quick_reply",
			buttonParamsJson: JSON.stringify({
				display_text: displayText,
				id: id,
				icon,
			}),
		});
		return this;
	}

	/**
	 * Add CTA Copy button
	 * @param {string} displayText
	 * @param {string} copyCode
	 * @param {ButtonCopyOptions} [opts]
	 * @returns {InteractiveMessage}
	 */
	addButtonCopy(displayText, copyCode, opts) {
		if (typeof displayText !== "string") throw Error("displayText harus string");
		if (typeof copyCode !== "string") throw Error("copycode harus string");
		const { icon = undefined } = opts ?? {};
		this.#message.interactiveMessage.nativeFlowMessage.buttons.push({
			name: "cta_copy",
			buttonParamsJson: JSON.stringify({
				display_text: displayText,
				copy_code: copyCode,
				icon,
			}),
		});
		return this;
	}

	/**
	 * Add Single Select button
	 * @param {string} title
	 * @param {SingleSelectSection[]} sections
	 * @param {SingleSelectOptions} [opts]
	 * @returns {InteractiveMessage}
	 */
	addButtonSingleSelect(title, sections, opts) {
		const { icon = undefined } = opts || {};
		this.#message.interactiveMessage.nativeFlowMessage.buttons.push({
			name: "single_select",
			buttonParamsJson: JSON.stringify({
				title: title,
				sections: sections,
				icon,
			}),
		});
		return this;
	}

	/**
	 * Add raw or normalized button
	 * @param {object} button
	 * @returns {InteractiveMessage}
	 */
	addButtonRaw(button) {
		const normalized = normalizeNativeFlowButton(button);
		if (normalized) {
			this.#message.interactiveMessage.nativeFlowMessage.buttons.push(normalized);
		}
		return this;
	}

	/**
	 * Set bottom sheet pagination
	 * @param {number|string} [limit=1]
	 * @param {ButtonLimitOptions} [opts={}]
	 * @returns {InteractiveMessage}
	 */
	setButtonLimit(limit = 1, opts = {}) {
		const list_title = opts.list_title || opts.listTitle || "action list";
		const button_title = opts.button_title || opts.buttonTitle || "choose action";
		const rawDividers = opts.divider_indices ?? opts.dividerIndices ?? opts.dividerIndicies ?? [];

		let finalDividers = rawDividers;
		if (finalDividers === "all") {
			finalDividers = Array.from({ length: this.#message.interactiveMessage.nativeFlowMessage.buttons.length }, (v, i) => i + 1);
		}

		this.#message.interactiveMessage.nativeFlowMessage.messageParamsJson = JSON.stringify({
			bottom_sheet: {
				in_thread_buttons_limit: Number(limit) || 1,
				divider_indices: finalDividers,
				list_title: list_title,
				button_title: button_title,
			},
		});
		return this;
	}

	/**
	 * Set messageParamsJson directly
	 * @param {string|object} json
	 * @returns {InteractiveMessage}
	 */
	setMessageParamsJson(json) {
		this.#message.interactiveMessage.nativeFlowMessage.messageParamsJson = typeof json === "string" ? json : JSON.stringify(json);
		return this;
	}

	/**
	 * Set custom additionalNodes
	 * @param {Array} nodes
	 * @returns {InteractiveMessage}
	 */
	setAdditionalNodes(nodes) {
		this.#additionalNodes = nodes;
		return this;
	}

	/**
	 * Build message object
	 * @param {object} [opts={}]
	 * @returns {object}
	 */
	build(opts = {}) {
		const msg = JSON.parse(JSON.stringify(this.#message));
		if (opts.viewOnce) {
			return {
				viewOnceMessage: {
					message: {
						messageContextInfo: {
							deviceListMetadata: {},
							deviceListMetadataVersion: 2,
						},
						...msg,
					},
				},
			};
		}
		return msg;
	}

	/**
	 * Send interactive message to target JID
	 * @param {string} jid
	 * @param {object} [options={}]
	 * @returns {Promise<any>}
	 */
	async sendTo(jid, options = {}) {
		const sock = this.#sock || options.sock;
		if (!sock) throw Error("WASocket instance is required to send interactive message");

		if (this.#tempAnyMessageContent) {
			let media;
			if (this.#tempAnyMessageContent.location) {
				media = await generateWAMessageContent(this.#tempAnyMessageContent, {
					upload: sock.waUploadToServer,
				});
			} else {
				try {
					const mediaTypeOverride = options.mediaTypeOverride || this.#mediaTypeOverride || this.#tempAnyMessageContent?.mediaTypeOverride;
					media = await prepareWAMessageMedia(this.#tempAnyMessageContent, {
						upload: sock.waUploadToServer,
						...(mediaTypeOverride ? { mediaTypeOverride } : {}),
					});
				} catch {
					media = await generateWAMessageContent(this.#tempAnyMessageContent, {
						upload: sock.waUploadToServer,
					});
				}
			}
			this.#message.interactiveMessage.header.hasMediaAttachment = true;
			this.#message.interactiveMessage.header = {
				...this.#message.interactiveMessage.header,
				...media,
			};
		}

		if (options.contextInfo || options.quoted || options.mentions) {
			this.#message.interactiveMessage.contextInfo = {
				...(this.#message.interactiveMessage.contextInfo || {}),
				...options.contextInfo,
				...(options.mentions ? { mentionedJid: options.mentions } : {}),
				...(options.quoted
					? {
							stanzaId: options.quoted.key.id,
							remoteJid: options.quoted.key.remoteJid,
							participant: options.quoted.key.participant || options.quoted.key.remoteJid,
							fromMe: options.quoted.key.fromMe,
							quotedMessage: options.quoted.message,
						}
					: {}),
			};
		}

		const bizNode = {
			tag: "biz",
			attrs: { type: "native_flow", v: "1" },
			content: [
				{
					tag: "interactive",
					attrs: { type: "native_flow", v: "1" },
					content: [
						{
							tag: "native_flow",
							attrs: { v: "9", name: "mixed" },
						},
					],
				},
			],
		};
		const extraNodes = options.additionalNodes || this.#additionalNodes || [];
		const hasBiz = Array.isArray(extraNodes) && extraNodes.some((node) => node?.tag === "biz");
		const additionalNodes = [...(hasBiz ? [] : [bizNode]), ...(options.ai ? [{ attrs: { biz_bot: "1" }, tag: "bot" }] : []), ...(Array.isArray(extraNodes) ? extraNodes : [])];

		const messageToSend = options.viewOnce
			? {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadata: {},
								deviceListMetadataVersion: 2,
							},
							...this.#message,
						},
					},
				}
			: this.#message;

		return sock.relayMessage(jid, messageToSend, {
			...(options.messageId ? { messageId: options.messageId } : {}),
			additionalNodes,
		});
	}
}

/**
 * Extracts clicked button ID from nativeFlowResponseMessage safely without requiring m.quoted
 * @param {object} [msg]
 * @param {object} [rawMessage]
 * @returns {string}
 */
function extractNativeFlowResponseId(msg, rawMessage) {
	const nativeFlow = msg?.nativeFlowResponseMessage || msg?.interactiveResponseMessage?.nativeFlowResponseMessage || rawMessage?.interactiveResponseMessage?.nativeFlowResponseMessage || rawMessage?.viewOnceMessage?.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
	if (!nativeFlow) return "";
	const params = nativeFlow.paramsJson;
	if (!params) return "";
	if (typeof params === "object") return params.id || params.selected_id || params.selectedId || "";
	try {
		const parsed = JSON.parse(params);
		return parsed?.id || parsed?.selected_id || parsed?.selectedId || "";
	} catch {
		return "";
	}
}

/**
 * Extracts display text from nativeFlowResponseMessage safely
 * @param {object} [msg]
 * @param {object} [rawMessage]
 * @returns {string}
 */
function extractNativeFlowResponseText(msg, rawMessage) {
	return msg?.body?.text || msg?.interactiveResponseMessage?.body?.text || rawMessage?.interactiveResponseMessage?.body?.text || rawMessage?.viewOnceMessage?.message?.interactiveResponseMessage?.body?.text || "";
}

/**
 * Generates a native link preview extendedTextMessage with MMS thumbnail (mediaTypeOverride: 'thumbnail-link')
 * and optional favicon MMS metadata.
 * @param {import("baileys").WASocket} sock
 * @param {import("baileys").AnyMediaMessageContent} anyMediaMessageContent
 * @param {object} [thumbnailContent={}]
 * @returns {Promise<import("baileys").proto.Message>}
 */
async function createThumbnailLink(sock, anyMediaMessageContent, thumbnailContent = {}) {
	const { text = "", description = "", title = "", url = "https://example.com/", favicon, faviconMMSMetadata, previewType = "NONE", renderLargerThumbnail = true, contextInfo = {}, mentions = [], quoted } = thumbnailContent;

	let mediaInput = anyMediaMessageContent;
	if (Buffer.isBuffer(mediaInput)) {
		mediaInput = { image: mediaInput };
	} else if (typeof mediaInput === "string") {
		mediaInput = { image: { url: mediaInput } };
	} else if (mediaInput && typeof mediaInput === "object" && !mediaInput.image && !mediaInput.video && !mediaInput.document) {
		mediaInput = { image: mediaInput };
	}

	let i;
	try {
		const res = await prepareWAMessageMedia(mediaInput, {
			upload: sock.waUploadToServer,
			mediaTypeOverride: "thumbnail-link",
		});
		i = res?.imageMessage;
	} catch {}

	let resolvedFaviconMMS = faviconMMSMetadata;
	if (!resolvedFaviconMMS && favicon) {
		try {
			let favMedia = favicon;
			if (Buffer.isBuffer(favMedia)) favMedia = { image: favMedia };
			else if (typeof favMedia === "string") favMedia = { image: { url: favMedia } };
			else if (favMedia && typeof favMedia === "object" && !favMedia.image) favMedia = { image: favMedia };
			const { imageMessage: fav } = await prepareWAMessageMedia(favMedia, {
				upload: sock.waUploadToServer,
				mediaTypeOverride: "thumbnail-link",
			});
			if (fav) {
				resolvedFaviconMMS = {
					thumbnailDirectPath: fav.directPath,
					thumbnailSha256: fav.fileSha256,
					thumbnailEncSha256: fav.fileEncSha256,
					mediaKey: fav.mediaKey,
					mediaKeyTimestamp: fav.mediaKeyTimestamp,
					thumbnailHeight: fav.height || 48,
					thumbnailWidth: fav.width || 48,
				};
			}
		} catch {}
	}

	const fallbackJpeg =
		"/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH7QcFDQwLDAsLDA0OEhAODhEOCwsQFhARExQVFRUMDxcYFhQYEhQVFBT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";
	const message_obj = {
		extendedTextMessage: {
			title,
			description,
			text: url ? `${url}\n${text}`.trim() : text,
			matchedText: url,
			previewType: previewType === "NONE" ? 0 : previewType,
			renderLargerThumbnail,
			inviteLinkGroupTypeV2: "DEFAULT",
			thumbnailDirectPath: i?.directPath,
			thumbnailSha256: i?.fileSha256,
			thumbnailEncSha256: i?.fileEncSha256,
			mediaKey: i?.mediaKey,
			mediaKeyTimestamp: i?.mediaKeyTimestamp,
			thumbnailWidth: i?.width,
			thumbnailHeight: i?.height,
			jpegThumbnail: thumbnailContent.jpegThumbnail || i?.jpegThumbnail || fallbackJpeg,
			...(resolvedFaviconMMS ? { faviconMMSMetadata: resolvedFaviconMMS } : {}),
			contextInfo: {
				...contextInfo,
				...(mentions?.length ? { mentionedJid: mentions } : {}),
				...(quoted
					? {
							stanzaId: quoted.key?.id || quoted.id,
							remoteJid: quoted.key?.remoteJid || quoted.chat,
							participant: quoted.key?.participant || quoted.sender || quoted.key?.remoteJid || quoted.chat,
							fromMe: quoted.key?.fromMe ?? quoted.fromMe,
							quotedMessage: quoted.message || quoted.msg,
						}
					: {}),
			},
		},
	};
	return proto.Message.fromObject(message_obj);
}

export { InteractiveMessage, normalizeNativeFlowButton, extractNativeFlowResponseId, extractNativeFlowResponseText, createThumbnailLink };
export default InteractiveMessage;
