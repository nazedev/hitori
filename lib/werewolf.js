import baileys, { delay } from "baileys";


export async function werewolf(sock, prefix, m, args) {
	const from = m.chat;
	const isGroup = m.isGroup;
	const sender = m.sender;
	const isOwner = global.isOwner || false;
	let target = args[1] ? (args[1].startsWith("@") ? args[1].slice(1) : args[1]) : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : "";
	if (target && !target.includes("@s.whatsapp.net")) {
		target += "@s.whatsapp.net";
	}
	const pushname = m.pushName;

	const gid = Object.keys(global.db.game.werewolf).find((id) => global.db.game.werewolf[id].players.some((p) => p.id === sender)) || "";
	switch (args[0]) {
		case "play":
			if (!isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di group" }, { quoted: m });
			if (global.db.game.werewolf[from]) {
				if (global.db.game.werewolf[from].started) {
					return sock.sendMessage(from, { text: "Game Werewolf sedang berlangsung! Selesaikan game sebelum memulai yang baru." }, { quoted: m });
				} else {
					return sock.sendMessage(from, { text: `Game sudah dibuat! Ketik *${prefix}ww join* untuk bergabung.` }, { quoted: m });
				}
			}
			global.db.game.werewolf[from] = {
				creator: sender,
				createat: null,
				status: "matchmaking",
				phase: "night",
				dayCount: 0,
				players: [],
				eliminated: [],
				roles: {},
				alphaUsed: false,
				serialKillerUsed: false,
				witchdUsed: false,
				seerUsed: false,
				WerewolfUsed: false,
				guardUsed: false,
				priestUsed: 2,
				witchTarget: [],
				alphaTarget: [],
				skTarget: [],
				WerewolfTarget: [],
				guardTarget: [],
				lastGuard: [],
				priestTarget: [],
				votes: {},
				wwvotes: {},
			};
			global.db.game.werewolf[from].players.push({ id: sender, pushname });
			console.log(global.db.game.werewolf);
			await sock.sendListMsg(from, {
				title: "🎲 Bergabung ke Permainan!",
				text: `🔹 Permainan Werewolf telah dimulai! Apakah kamu siap untuk bergabung dan memainkan peranmu?\n\n> Apabila tombol tidak berfungsi ketik ${prefix}ww join`,
				footer: "🐺 WW",
				buttons: [
					{
						name: "quick_reply",
						buttonParamsJson: JSON.stringify({
							display_text: "🎮 Bergabung ke Game",
							id: `${prefix}ww join`,
						}),
					},
				],
			});
			break;
		case "join":
			if (!global.db.game.werewolf[from]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[from].status !== "matchmaking") return sock.sendMessage(from, { text: "Game sudah dimulai kamu telat join" }, { quoted: m });
			if (global.db.game.werewolf[from].players.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah bergabung" }, { quoted: m });
			global.db.game.werewolf[from].players.push({ id: sender, pushname });
			let playerList = global.db.game.werewolf[from].players.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n");
			await sock.sendMessage(from, { text: `✅ *@${sender.split("@")[0]} telah bergabung!*\n\n*Daftar Pemain:*\n${playerList}\n\n> Apabila tombol tidak berfungsi ketik ${prefix}ww join`, mentions: global.db.game.werewolf[from].players.map((p) => p.id) }, { quoted: m });
			if (global.db.game.werewolf[from].players.length === 27) {
				await sock.sendMessage(from, { text: "🚀 *Pemain mencapai 27! Permainan akan dimulai secara otomatis!*" });
				await startGame(sock, from, prefix);
			}
			break;
		case "togod":
			if (!isOwner) return;
			global.db.game.werewolf[gid].roles[sender] = "God";
			await sock.sendMessage(from, { text: `OKOKLH*` }, { quoted: m });
			break;
		case "delete":
			if (global.db.game.werewolf[from].creator !== sender && !isOwner)
				return sock.sendMessage(from, { text: `🚫 *Hanya pembuat game yang bisa menghapus permainan!*\n\nSilahkan chat @${global.db.game.werewolf[from].creator.split("@")[0]} untuk menghapus permainan`, mentions: [global.db.game.werewolf[from].creator] }, { quoted: m });
			delete global.db.game.werewolf[from];
			await sock.sendMessage(from, { text: "🗑️ *Game berhasil dihapus!*" }, { quoted: m });
			break;
		case "leave":
			if (!global.db.game.werewolf[from]) return sock.sendMessage(from, { text: "Tidak ada sesi game yang sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[from].status !== "matchmaking") return sock.sendMessage(from, { text: "Game sudah mulai, tidak bisa leave!" }, { quoted: m });
			const inPlayers = global.db.game.werewolf[from].players.findIndex((p) => p.id === sender);
			const inEliminated = global.db.game.werewolf[from].eliminated.findIndex((p) => p.id === sender);
			if (inPlayers === -1 && inEliminated === -1) return sock.sendMessage(from, { text: "Kamu bukan bagian dari game ini!" }, { quoted: m });
			if (inPlayers !== -1) global.db.game.werewolf[from].players.splice(inPlayers, 1);
			if (inEliminated !== -1) global.db.game.werewolf[from].eliminated.splice(inEliminated, 1);
			if (sender === global.db.game.werewolf[from].creator) {
				delete global.db.game.werewolf[from];
				return sock.sendMessage(from, { text: "Karena host telah keluar dari matchmaking maka sesi game dihapus" }, { quoted: m });
			}
			await sock.sendMessage(from, { text: `🚪 *@${sender.split("@")[0]}* keluar dari matchmaking.`, mentions: [sender] }, { quoted: m });
			break;
		case "start":
			if (!global.db.game.werewolf[from]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[from].creator !== sender && !isOwner)
				return sock.sendMessage(from, { text: `🚫 *Hanya pembuat game yang bisa memulai permainan!*\n\nSilahkan chat @${global.db.game.werewolf[from].creator.split("@")[0]} untuk memulai permainan`, mentions: [global.db.game.werewolf[from].creator] }, { quoted: m });
			if (global.db.game.werewolf[from].status !== "matchmaking") return sock.sendMessage(from, { text: "Game sudah dimulai!" }, { quoted: m });
			if (global.db.game.werewolf[from].players.length < 4) return sock.sendMessage(from, { text: "Minimal 4 pemain untuk memulai game!" }, { quoted: m });
			if (global.db.game.werewolf[from].players.length > 27) return sock.sendMessage(from, { text: "Maximal 27 pemain untuk memulai game!" }, { quoted: m });
			await startGame(sock, from, prefix);
			break;
		case "player":
			if (!global.db.game.werewolf[from]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			let aliv = global.db.game.werewolf[from].players.map((p) => p.id);
			let dea = global.db.game.werewolf[from].eliminated;
			let aliveLis = aliv.length ? aliv.map((id, i) => `${i + 1}. @${id.split("@")[0]}`).join("\n") : "";
			let deadLis = dea.length ? dea.map((player, i) => `${i + 1}. @${player.id.split("@")[0]}`).join("\n") : "";
			await sock.sendMessage(from, { text: `\`[ LIST PLAYER ]\`\n\n${aliveLis}\n${deadLis}`, mentions: [...aliv, ...dea.map((p) => p.id)] });
			break;
		case "status":
			if (!isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di group chat" }, { quoted: m });
			if (!global.db.game.werewolf[from]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			let alive = global.db.game.werewolf[from].players.map((p) => p.id);
			let dead = global.db.game.werewolf[from].eliminated;
			let aliveList = alive.length ? alive.map((id, i) => `${i + 1}. @${id.split("@")[0]}`).join("\n") : "Tidak ada pemain yang tersisa.";
			let deadList = dead.length ? dead.map((player, i) => `${i + 1}. @${player.id.split("@")[0]} (${global.db.game.werewolf[from].roles[player.id] || "???"})`).join("\n") : "Belum ada pemain yang tereliminasi.";
			await sock.sendMessage(from, {
				text: `🎮 *Status Game* 🎮\n\n*⌚ Game dimulai:* ${global.db.game.werewolf[from].createat}\n*🕰️ Waktu:* ${global.db.game.werewolf[from].phase}\n*📅 Hari ke-${global.db.game.werewolf[from].dayCount}*\n👥 *Pemain yang Masih Hidup:*\n${aliveList}\n\n💀 *Pemain yang Tereliminasi:*\n${deadList}`,
				mentions: [...alive, ...dead.map((p) => p.id)],
			});
			break;
		case "vote":
			if (!global.db.game.werewolf[from]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[from].eliminated.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah mati, tidak dapat mengirim suara!" }, { quoted: m });
			if (!global.db.game.werewolf[from].players.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu bukan player" }, { quoted: m });
			if (global.db.game.werewolf[from].phase !== "day") return sock.sendMessage(from, { text: "Voting hanya bisa dilakukan di siang hari!" }, { quoted: m });
			if (global.db.game.werewolf[from].status !== "vote") return sock.sendMessage(from, { text: "Tidak ada sesi voting" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: `Tag pemain yang ingin di vote\n\n*Contoh:*\n${prefix}ww vote @${sender.split("@")[0]}`, mentions: [sender] }, { quoted: m });
			if (!global.db.game.werewolf[from].players.some((p) => p.id === target)) return sock.sendMessage(from, { text: "Pemain tidak valid atau sudah tereliminasi!" }, { quoted: m });
			if (Object.values(global.db.game.werewolf[from].votes).some((voters) => Array.isArray(voters) && voters.includes(sender))) return sock.sendMessage(from, { text: "Kamu sudah memberikan suara!" }, { quoted: m });
			if (!global.db.game.werewolf[from].votes[target]) global.db.game.werewolf[from].votes[target] = [];
			const doubleVoteRoles = ["Walikota", "Prince"];
			const playerRole = global.db.game.werewolf[from].roles[sender] || "";
			const isDoubleVote = doubleVoteRoles.includes(playerRole);
			Object.keys(global.db.game.werewolf[from].votes).forEach((v) => {
				global.db.game.werewolf[from].votes[v] = global.db.game.werewolf[from].votes[v].filter((p) => p !== sender);
			});
			if (!global.db.game.werewolf[from].votes[target]) global.db.game.werewolf[from].votes[target] = [];
			global.db.game.werewolf[from].votes[target].push(sender);
			if (isDoubleVote) {
				global.db.game.werewolf[from].votes[target].push(sender);
			}
			let displayVotes = Object.values(global.db.game.werewolf[from].votes).reduce((acc, voters) => acc + (Array.isArray(voters) ? new Set(voters).size : 0), 0);
			let totalPlayers = global.db.game.werewolf[from].players.length;
			let voteMessage = `📩 *@${sender.split("@")[0]}* memberikan suara untuk *@${target.split("@")[0]}!* (${displayVotes}/${totalPlayers})\n\n> Apabila tombol tidak berfungsi ketik ${prefix}ww vote @tag`;
			await sock.sendMessage(from, { text: voteMessage, mentions: [sender, target] }, { quoted: m });
			await onPlayerVote(sock, from, prefix);
			break;
		case "wwvote":
			if (isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di private chat" }, { quoted: m });
			if (!global.db.game.werewolf[gid]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[gid].status !== "start") return sock.sendMessage(from, { text: "Game belum dimulai" }, { quoted: m });
			if (global.db.game.werewolf[gid].eliminated.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah mati" }, { quoted: m });
			if (!global.db.game.werewolf[gid].players.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu bukan player" }, { quoted: m });
			if (global.db.game.werewolf[gid].phase !== "night") return sock.sendMessage(from, { text: "Voting Werewolf hanya bisa dilakukan di malam hari!" }, { quoted: m });
			if (global.db.game.werewolf[gid].roles[sender] !== "Werewolf" && global.db.game.werewolf[gid].roles[sender] !== "AlphaWolf") return sock.sendMessage(from, { text: "Hanya Werewolf yang bisa voting!" }, { quoted: m });
			if (!target || !global.db.game.werewolf[gid].players.some((p) => p.id === target)) return sock.sendMessage(from, { text: "Target tidak valid atau sudah tereliminasi!" }, { quoted: m });
			if (Object.values(global.db.game.werewolf[gid].wwvotes).some((v) => Array.isArray(v) && v.includes(sender))) return sock.sendMessage(from, { text: "Kamu sudah memilih!" }, { quoted: m });
			if (!global.db.game.werewolf[gid].wwvotes[target]) global.db.game.werewolf[gid].wwvotes[target] = [];
			const dvRoles = ["AlphaWolf"];
			const role = global.db.game.werewolf[gid].roles[sender] || "";
			const isDV = dvRoles.includes(role);
			Object.keys(global.db.game.werewolf[gid].wwvotes).forEach((v) => (global.db.game.werewolf[gid].wwvotes[v] = global.db.game.werewolf[gid].wwvotes[v].filter((p) => p !== sender)));
			global.db.game.werewolf[gid].wwvotes[target] = global.db.game.werewolf[gid].wwvotes[target] || [];
			global.db.game.werewolf[gid].wwvotes[target].push(sender);
			if (isDV) global.db.game.werewolf[gid].wwvotes[target].push(sender);
			let dVotes = Object.values(global.db.game.werewolf[gid].wwvotes).reduce((acc, voters) => acc + (Array.isArray(voters) ? new Set(voters).size : 0), 0);
			let tWolves = global.db.game.werewolf[gid].players.filter((p) => ["Werewolf", "AlphaWolf"].includes(global.db.game.werewolf[gid].roles[p.id])).length;
			await sock.sendMessage(from, { text: `🐺 *@${sender.split("@")[0]}* memilih *@${target.split("@")[0]}!* (${dVotes}/${tWolves})`, mentions: [sender, target] }, { quoted: m });
			break;
		case "pseer":
			if (isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di private chat" }, { quoted: m });
			if (!global.db.game.werewolf[gid]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[from].status !== "start") return sock.sendMessage(from, { text: "Game belum dimulai" }, { quoted: m });
			if (global.db.game.werewolf[gid].eliminated.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah mati" }, { quoted: m });
			if (global.db.game.werewolf[gid].roles[sender] !== "Priest") return sock.sendMessage(from, { text: "Kamu bukan Priest!" }, { quoted: m });
			if (global.db.game.werewolf[gid].priestUsed === 0) return sock.sendMessage(from, { text: "Priest sudah tidak memiliki kemampuan untuk digunakan lagi!" }, { quoted: m });
			if (!global.db.game.werewolf[gid].players.some((p) => p.id === target)) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Ketik *!ww pseer @user* untuk melihat peran!" }, { quoted: m });
			global.db.game.werewolf[gid].priestUsed -= 1;
			await sock.sendMessage(sender, { text: `🔮 Dalam penglihatanmu, *@${target.split("@")[0]}* mempunyai role sebagai *${global.db.game.werewolf[gid].roles[target]}*`, mentions: [target] }, { quoted: m });
			break;
		case "seer":
			if (isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di private chat" }, { quoted: m });
			if (!global.db.game.werewolf[gid]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[gid].status === "vote") return sock.sendMessage(from, { text: "Sekarang sesi vote, tidak bisa menggunakan kemampuan" }, { quoted: m });
			if (global.db.game.werewolf[gid].status !== "start") return sock.sendMessage(from, { text: "Game belum dimulai" }, { quoted: m });
			if (global.db.game.werewolf[gid].eliminated.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah mati" }, { quoted: m });
			if (global.db.game.werewolf[gid].phase !== "night") return sock.sendMessage(from, { text: "Perintah hanya bisa digunakan malam hari!" }, { quoted: m });
			if (global.db.game.werewolf[gid].roles[sender] !== "Seer") return sock.sendMessage(from, { text: "Kamu bukan Seer!" }, { quoted: m });
			if (global.db.game.werewolf[gid].seerUsed) return sock.sendMessage(sender, { text: "🔮 Kamu hanya bisa menggunakan kemampuan ini sekali per malam!" });
			if (!global.db.game.werewolf[gid].players.some((p) => p.id === target)) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Gunakan *!ww seer @user* untuk melihat peran!" }, { quoted: m });
			const goodRoles = ["Villager", "Seer", "Guard", "Walikota", "Priest", "Hunter", "AlphaWolf", "Witch", "Prince", "Cursed"];
			const evilRoles = ["Werewolf", "Lycan", "SerialKiller"];
			const targetRole = global.db.game.werewolf[gid].roles[target];
			const alignment = goodRoles.includes(targetRole) ? "✨ *baik*" : evilRoles.includes(targetRole) ? "🌑 *jahat*" : "❓ *tidak diketahui*";
			global.db.game.werewolf[gid].seerUsed = true;
			global.db.game.werewolf[gid].priestUsed -= 1;
			await sock.sendMessage(sender, { text: `🔮 Dalam penglihatanmu, kamu merasakan bahwa *@${target.split("@")[0]}* memiliki aura ${alignment}...\n\n*📅 Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, mentions: [target] }, { quoted: m });
			break;
		case "guard":
			if (!validateNightSkill(sock, from, sender, isGroup, m, gid)) return;
			if (global.db.game.werewolf[gid].roles[sender] !== "Guard") return sock.sendMessage(from, { text: "Hanya Guard yang bisa menggunakan perintah ini!" }, { quoted: m });
			if (global.db.game.werewolf[gid].guardUsed) return sock.sendMessage(sender, { text: "🛡️ Kamu hanya bisa melindungi satu pemain per malam!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Gunakan *!guard protect @user* untuk melindungi!" }, { quoted: m });
			const tg = global.db.game.werewolf[gid].players.find((p) => p.id === target) || "";
			if (!tg) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			if (global.db.game.werewolf[gid].lastGuard.some((g) => g.id === tg.id)) {
				return sock.sendMessage(from, { text: "⚠️ Target ini sudah dilindungi dalam 1 malam terakhir! Pilih orang lain." }, { quoted: m });
			}
			global.db.game.werewolf[gid].guardTarget.push({ id: tg.id, pushname: tg.pushname });
			global.db.game.werewolf[gid].lastGuard.push({ id: tg.id, pushname: tg.pushname });
			if (global.db.game.werewolf[gid].lastGuard.length > 2) {
				global.db.game.werewolf[gid].lastGuard.splice(0, global.db.game.werewolf[gid].lastGuard.length - 2);
			}
			global.db.game.werewolf[gid].guardUsed = true;
			await sock.sendMessage(sender, { text: `🛡️ Kamu telah melindungi @${target.split("@")[0]}\n\n*📅 Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, mentions: [target] }, { quoted: m });
			break;
		case "kill":
			if (!validateNightSkill(sock, from, sender, isGroup, m, gid)) return;
			if (global.db.game.werewolf[gid].roles[sender] !== "AlphaWolf") return sock.sendMessage(from, { text: "Hanya Alpha Wolf yang bisa menggunakan perintah ini!" }, { quoted: m });
			if (global.db.game.werewolf[gid].WerewolfUsed) return sock.sendMessage(sender, { text: "🐺 Kamu hanya bisa membunuh satu target per malam!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Gunakan *!ww kill @user* untuk membunuh!" }, { quoted: m });
			const tk = global.db.game.werewolf[gid].players.find((p) => p.id === target) || "";
			if (!tk) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			global.db.game.werewolf[gid].alphaTarget.push({ id: tk.id, pushname: tk.pushname });
			global.db.game.werewolf[gid].alphaUsed = true;
			await sock.sendMessage(sender, { text: `🐺 Kamu telah memilih untuk membunuh @${target.split("@")[0]}\n\n*📅 Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, mentions: [target] }, { quoted: m });
			break;
		case "skill":
			if (!validateNightSkill(sock, from, sender, isGroup, m, gid)) return;
			if (global.db.game.werewolf[gid].roles[sender] !== "SerialKiller") return sock.sendMessage(from, { text: "Hanya Serial killer yang bisa menggunakan perintah ini!" }, { quoted: m });
			if (global.db.game.werewolf[gid].serialKillerUsed) return sock.sendMessage(sender, { text: "🔪 Kamu hanya bisa membunuh satu target per malam!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Gunakan *!ww kill @user* untuk membunuh!" }, { quoted: m });
			const tks = global.db.game.werewolf[gid].players.find((p) => p.id === target) || "";
			if (!tks) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			global.db.game.werewolf[gid].skTarget.push({ id: tks.id, pushname: tks.pushname });
			global.db.game.werewolf[gid].serialKillerUsed = true;
			await sock.sendMessage(sender, { text: `🔪 Kamu telah memilih untuk membunuh @${target.split("@")[0]}\n\n*📅 Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, mentions: [target] }, { quoted: m });
			break;
		case "kutuk":
			if (isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di private chat" }, { quoted: m });
			if (!global.db.game.werewolf[gid]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[gid].status === "vote") return sock.sendMessage(from, { text: "Sekarang sesi vote, tidak bisa menggunakan kemampuan" }, { quoted: m });
			if (global.db.game.werewolf[gid].status !== "start") return sock.sendMessage(from, { text: "Game belum dimulai" }, { quoted: m });
			if (global.db.game.werewolf[gid].eliminated.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah mati" }, { quoted: m });
			if (global.db.game.werewolf[gid].roles[sender] !== "Priest") return sock.sendMessage(from, { text: "Kamu bukan Priest!" }, { quoted: m });
			if (global.db.game.werewolf[gid].priestUsed === 0) return sock.sendMessage(from, { text: "Limit skill mu sudah habis" }, { quoted: m });
			if (!global.db.game.werewolf[gid].players.some((p) => p.id === target)) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Gunakan *!ww kutuk @user* untuk melihat peran!" }, { quoted: m });
			global.db.game.werewolf[gid].priestUsed -= 1;
			const tkk = global.db.game.werewolf[gid].players.find((p) => p.id === target) || "";
			if (!tkk) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			global.db.game.werewolf[gid].priestTarget.push({ id: tkk.id, pushname: tkk.pushname });
			await sock.sendMessage(
				sender,
				{
					text: `💀 Kamu telah memilih untuk mengutuk @${target.split("@")[0]}\n\nKutukan mu akan berefek jika target yg kamu kutuk adalah werewolf, dan jika bukan maka tidak ada apa apa dan jumlah penggunaan skill mu akan tetap berkurang 1\n\n*📅 Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
					mentions: [target],
				},
				{ quoted: m },
			);
			break;
		case "witch":
			if (isGroup) return sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di private chat" }, { quoted: m });
			if (!global.db.game.werewolf[gid]) return sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
			if (global.db.game.werewolf[from].status !== "start") return sock.sendMessage(from, { text: "Game belum dimulai" }, { quoted: m });
			if (global.db.game.werewolf[gid].eliminated.some((p) => p.id === sender)) return sock.sendMessage(from, { text: "Kamu sudah mati" }, { quoted: m });
			if (global.db.game.werewolf[gid].roles[sender] !== "Witch") return sock.sendMessage(from, { text: "Kamu bukan Witch!" }, { quoted: m });
			if (global.db.game.werewolf[gid].witchdUsed) return sock.sendMessage(from, { text: "Limit skill mu sudah habis" }, { quoted: m });
			if (!global.db.game.werewolf[gid].players.some((p) => p.id === target)) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			if (!target) return sock.sendMessage(from, { text: "Gunakan *!ww witch @user* untuk melihat peran!" }, { quoted: m });
			global.db.game.werewolf[gid].witchdUsed = true;
			const tkq = global.db.game.werewolf[gid].players.find((p) => p.id === target) || "";
			if (!tkq) return sock.sendMessage(from, { text: "Pengguna yang dipilih tidak ada dalam game!" }, { quoted: m });
			global.db.game.werewolf[gid].witchTarget.push({ id: tkq.id, pushname: tkq.pushname });
			await sock.sendMessage(sender, { text: `💀 Kamu telah memilih untuk mengutuk @${target.split("@")[0]}\n\nKutukan mu tidak akan berefek jika targetnya adalah priest\n\n*📅 Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, mentions: [target] }, { quoted: m });
			break;
		default:
			return sock.sendMessage(
				from,
				{
					text: `*🎮 WEREWOLF MENU 🐺*\n\nPerintah tidak lengkap atau tidak valid! Silakan gunakan command di bawah ini:\n\n*👥 Matchmaking (Grup):*\n- ${prefix}ww play\n- ${prefix}ww join\n- ${prefix}ww leave\n- ${prefix}ww start\n- ${prefix}ww status\n- ${prefix}ww player\n\n*🌞 Siang Hari (Grup):*\n- ${prefix}ww vote @tag\n\n*🌙 Malam Hari (Private Chat):*\n- ${prefix}ww wwvote @tag (Werewolf)\n- ${prefix}ww seer @tag (Seer)\n- ${prefix}ww guard @tag (Guard)\n- ${prefix}ww kill @tag (Killer)\n- ${prefix}ww kutuk @tag (Cursed)\n- ${prefix}ww witch (Witch)`,
				},
				{ quoted: m },
			);
	}
}
async function startNightPhase(sock, from, prefix) {
	if (!global.db.game.werewolf[from] || global.db.game.werewolf[from].status !== "start") return;
	global.db.game.werewolf[from].dayCount += 1;
	let werewolves = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "Werewolf" || global.db.game.werewolf[from].roles[p.id] === "AlphaWolf").length;
	let serialKillers = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "SerialKiller").length;
	let gods = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "God").length;
	let villagers = global.db.game.werewolf[from].players.length - (werewolves + serialKillers + gods);
	let survivors = global.db.game.werewolf[from].players.map((p, index) => `${index + 1}. *@${p.id.split("@")[0]}* (${global.db.game.werewolf[from].roles[p.id] || "Unknown"})`).join("\n");
	let eliminated = global.db.game.werewolf[from].eliminated.map((p, index) => `${index + 1}. *@${p.id.split("@")[0]}* (${global.db.game.werewolf[from].roles[p.id] || "Unknown"})`).join("\n");
	let allPlayers = [...global.db.game.werewolf[from].players.map((p) => p.id), ...global.db.game.werewolf[from].eliminated.map((p) => p.id)];
	if (werewolves === 0 && serialKillers === 0) {
		await sock.sendMessage(from, { text: `🎉 *Warga desa menang!* Semua Werewolf telah dieliminasi!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
		delete global.db.game.werewolf[from];
		return;
	}
	if (werewolves >= villagers + serialKillers) {
		await sock.sendMessage(from, { text: `🐺 *Werewolf menang!* Mereka telah menguasai desa!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
		delete global.db.game.werewolf[from];
		return;
	}
	if (serialKillers === 1 && villagers === 0 && werewolves === 0) {
		await sock.sendMessage(from, { text: `🔪 *Serial Killer menang!* Dia telah membantai semua player!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
		delete global.db.game.werewolf[from];
		return;
	}
	if (global.db.game.werewolf[from].players.length === 2) {
		let player1 = global.db.game.werewolf[from].players[0];
		let player2 = global.db.game.werewolf[from].players[1];
		let role1 = global.db.game.werewolf[from].roles[player1.id];
		let role2 = global.db.game.werewolf[from].roles[player2.id];
		if ((role1 === "Cursed" && ["AlphaWolf", "SerialKiller", "Werewolf"].includes(role2)) || (role2 === "Cursed" && ["AlphaWolf", "SerialKiller", "Werewolf"].includes(role1))) {
			let [cursedPlayer, opponentPlayer] = role1 === "Cursed" ? [player1, player2] : [player2, player1];
			await sock.sendMessage(from, { text: `⚖️ *Permainan berakhir seri!*\n\n💀 *@${cursedPlayer.id.split("@")[0]}* (Cursed) dan *@${opponentPlayer.id.split("@")[0]}* (${global.db.game.werewolf[from].roles[opponentPlayer.id]}) telah saling membunuh!`, mentions: allPlayers });
			delete global.db.game.werewolf[from];
			return;
		}
		if ((role1 === "Werewolf" && role2 === "SerialKiller") || (role1 === "SerialKiller" && role2 === "Werewolf")) {
			await sock.sendMessage(from, { text: `🔪 *Serial Killer menang!* Dia berhasil menghabisi Werewolf terakhir!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
			delete global.db.game.werewolf[from];
			return;
		}
		if ((role1 === "AlphaWolf" && role2 === "SerialKiller") || (role1 === "SerialKiller" && role2 === "AlphaWolf")) {
			await sock.sendMessage(from, { text: `🐺 *Werewolf menang!* Dia berhasil membunuh seluruh player!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
			delete global.db.game.werewolf[from];
			return;
		}
	}
	if (global.db.game.werewolf[from].guardTarget.length > 0) {
		global.db.game.werewolf[from].lastGuard.push(...global.db.game.werewolf[from].guardTarget);
		if (global.db.game.werewolf[from].lastGuard.length > 2) {
			global.db.game.werewolf[from].lastGuard.splice(0, global.db.game.werewolf[from].lastGuard.length - 2);
		}
	}
	global.db.game.werewolf[from].status = "start";
	global.db.game.werewolf[from].phase = "night";
	global.db.game.werewolf[from].seerUsed = false;
	global.db.game.werewolf[from].WerewolfUsed = false;
	global.db.game.werewolf[from].guardUsed = false;
	global.db.game.werewolf[from].serialKillerUsed = false;
	global.db.game.werewolf[from].WerewolfTarget = [];
	global.db.game.werewolf[from].guardTarget = [];
	for (let player of global.db.game.werewolf[from].players) {
		let role = global.db.game.werewolf[from].roles[player.id];
		if (role === "Guard") {
			await sock.sendListMsg(player.id, {
				title: "🌙 Malam tiba!",
				text: "📝 Pilih pemain untuk dilindungi:",
				footer: "🛡️ Guard",
				buttons: global.db.game.werewolf[from].players
					.filter((p) => p.id !== player.id)
					.map((p) => ({
						name: "quick_reply",
						buttonParamsJson: JSON.stringify({
							display_text: `🛡️ Lindungi ${p.pushname}`,
							id: `${prefix}ww guard ${p.id}`,
						}),
					}))
					.concat([
						{
							name: "quick_reply",
							buttonParamsJson: JSON.stringify({
								display_text: "🛡️ Lindungi Diri Sendiri",
								id: `${prefix}ww guard ${player.id}`,
							}),
						},
					]),
			});
		}
		if (role === "SerialKiller") {
			await sock.sendListMsg(player.id, {
				title: "🌙 Malam tiba!",
				text: "📝 Pilih pemain yang ingin dibunuh:",
				footer: "🔪 Serial Killer",
				buttons: global.db.game.werewolf[from].players
					.filter((p) => p.id !== player.id)
					.map((p) => ({
						name: "quick_reply",
						buttonParamsJson: JSON.stringify({
							display_text: `💀 kill ${p.pushname}`,
							id: `${prefix}ww skill ${p.id}`,
						}),
					})),
			});
		} else if (role === "Werewolf" || role === "AlphaWolf") {
			let wwGroup = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "Werewolf");
			await sock.sendListMsg(player.id, {
				title: "🌙 Malam tiba!",
				text: `🗣️ Berdiskusilah dengan teman-teman Werewolf:\n${wwGroup.map((p) => `@${p.id.split("@")[0]}`).join("\n")}\n\nlalu vote siapa yang ingin dibunuh:`,
				footer: "🐺 Werewolf",
				buttons: global.db.game.werewolf[from].players
					.filter((p) => p.id !== player.id && global.db.game.werewolf[from].roles[p.id] !== "Werewolf")
					.map((p) => ({
						name: "quick_reply",
						buttonParamsJson: JSON.stringify({
							display_text: `💀 Vote kill ${p.pushname}`,
							id: `${prefix}ww wwvote ${p.id}`,
						}),
					})),
				contextInfo: { mentionedJid: wwGroup.map((p) => p.id) },
			});
		} else if (role === "Seer") {
			await sock.sendListMsg(player.id, {
				title: "🌙 Malam tiba!",
				text: "📝 Pilih pemain untuk diintip:",
				footer: "🔮 Seer",
				buttons: global.db.game.werewolf[from].players
					.filter((p) => p.id !== player.id)
					.map((p) => ({
						name: "quick_reply",
						buttonParamsJson: JSON.stringify({
							display_text: `🔮 Periksa ${p.pushname}`,
							id: `${prefix}ww seer ${p.id}`,
						}),
					})),
			});
		}
	}
	await sock.sendMessage(from, { text: "🌙 Malam tiba! Semua pemain tidur..." });
	setTimeout(async () => {
		if (global.db.game.werewolf[from]?.phase !== "night") return;
		let voteCounts = {};
		for (let target in global.db.game.werewolf[from].wwvotes) voteCounts[target] = global.db.game.werewolf[from].wwvotes[target].length;
		if (Object.keys(voteCounts).length > 0) {
			let maxVotes = Math.max(...Object.values(voteCounts));
			let candidates = Object.keys(voteCounts).filter((player) => voteCounts[player] === maxVotes);
			let chosenTarget = candidates.length > 1 ? [candidates[Math.floor(Math.random() * candidates.length)]] : candidates;
			global.db.game.werewolf[from].WerewolfTarget = chosenTarget.map((id) => ({ id, pushname: global.db.game.werewolf[from].players.find((p) => p.id === id)?.pushname || "Unknown" }));
		} else {
			global.db.game.werewolf[from].WerewolfTarget = [];
			await sock.sendMessage(from, { text: "🌙 *Malam berlalu dengan tenang...*\n🐺 *Para Werewolf tidak membunuh siapa pun malam ini!*" });
		}
		await startDayPhase(sock, from, prefix);
	}, 60000);
}
async function startDayPhase(sock, from, prefix) {
	if (!global.db.game.werewolf[from] || global.db.game.werewolf[from].status !== "start") return;
	global.db.game.werewolf[from].phase = "day";
	global.db.game.werewolf[from].votes = {};
	global.db.game.werewolf[from].wwvotes = {};
	global.db.game.werewolf[from].status = "vote";
	if (global.db.game.werewolf[from].priestTarget.length > 0) {
		for (const target of global.db.game.werewolf[from].priestTarget) {
			let targetIndex = global.db.game.werewolf[from].players.findIndex((p) => p.id === target.id);
			if (targetIndex === -1) continue;
			let targetRole = global.db.game.werewolf[from].roles[target.id];
			if (["Werewolf", "AlphaWolf", "Lycan"].includes(targetRole)) {
				global.db.game.werewolf[from].eliminated.push(target);
				global.db.game.werewolf[from].players.splice(targetIndex, 1);
				await sock.sendMessage(from, { text: `☠️ *@${target.id.split("@")[0]}* telah mati dikutuk oleh *Priest* karena merupakan *${targetRole}*!`, mentions: [target.id] });
			} else if (targetRole === "Cursed") {
				global.db.game.werewolf[from].roles[target.id] = "Villager";
				await sock.sendMessage(from, { text: `✨ *@${target.id.split("@")[0]}* telah disucikan oleh *Priest*! Sekarang dia menjadi *Villager*!`, mentions: [target.id] });
			} else {
				let priestId = global.db.game.werewolf[from].players.find((p) => global.db.game.werewolf[from].roles[p.id] === "Priest")?.id;
				if (priestId) await sock.sendMessage(priestId, { text: `⚠️ Kamu tidak dapat mengutuk *@${target.id.split("@")[0]}* karena bukan Werewolf, AlphaWolf, atau Cursed.`, mentions: [target.id] });
			}
		}
	}
	if (global.db.game.werewolf[from].witchTarget.length > 0) {
		for (const target of global.db.game.werewolf[from].witchTarget) {
			let witchId = global.db.game.werewolf[from].players.find((p) => global.db.game.werewolf[from].roles[p.id] === "Witch")?.id;
			let targetIndex = global.db.game.werewolf[from].players.findIndex((p) => p.id === target.id);
			if (targetIndex === -1) continue;
			let targetRole = global.db.game.werewolf[from].roles[target.id];
			if (targetRole === "Priest") {
				await sock.sendMessage(witchId, { text: `✨ *@${target.id.split("@")[0]}* selamat dari kutukan kamu! karena dia adalah *Priest*, dia kebal terhadap kutukan.`, mentions: [target.id] });
				continue;
			}
			if (targetRole === "God") {
				await sock.sendMessage(from, { text: `💀 *Witch gagal! @${target.id.split("@")[0]} tidak bisa dibunuh karena dia adalah Admin*!`, mentions: [target.id] });
				continue;
			}
			global.db.game.werewolf[from].eliminated.push(target);
			global.db.game.werewolf[from].players.splice(targetIndex, 1);
			await sock.sendMessage(from, { text: `☠️ *@${target.id.split("@")[0]}* telah mati terkena kutukan *Witch*! Peran dia adalah *${targetRole}*.`, mentions: [target.id] });
		}
	}
	if (global.db.game.werewolf[from].skTarget.length > 0) {
		for (const target of global.db.game.werewolf[from].skTarget) {
			let targetIndex = global.db.game.werewolf[from].players.findIndex((p) => p.id === target.id);
			if (targetIndex === -1) continue;
			if (global.db.game.werewolf[from].guardTarget.some((guard) => guard.id === target.id)) {
				await sock.sendMessage(from, { text: `🛡️ *Serial killer gagal! @${target.id.split("@")[0]} dilindungi oleh Guard!*`, mentions: [target.id] });
				continue;
			}
			let targetRole = global.db.game.werewolf[from].roles[target.id];
			if (targetRole === "God") {
				await sock.sendMessage(from, { text: `💀 *Serial Killer gagal! @${target.id.split("@")[0]} tidak bisa dibunuh karena dia adalah Admin*!`, mentions: [target.id] });
				continue;
			}
			global.db.game.werewolf[from].eliminated.push(target);
			global.db.game.werewolf[from].players.splice(targetIndex, 1);
			await sock.sendMessage(from, { text: `☠️ *@${target.id.split("@")[0]}* telah mati karena dibunuh oleh *Serial killer*! Peran dia adalah *${targetRole}*.`, mentions: [target.id] });
		}
	}
	if (global.db.game.werewolf[from].alphaTarget.length > 0) {
		for (const target of global.db.game.werewolf[from].alphaTarget) {
			let targetIndex = global.db.game.werewolf[from].players.findIndex((p) => p.id === target.id);
			if (targetIndex === -1) continue;
			let guard = global.db.game.werewolf[from].guardTarget.find((g) => g.id === target.id);
			if (guard) {
				let guardIndex = global.db.game.werewolf[from].players.findIndex((p) => p.id === guard.id);
				if (guardIndex !== -1) {
					global.db.game.werewolf[from].eliminated.push(guard);
					global.db.game.werewolf[from].players.splice(guardIndex, 1);
					await sock.sendMessage(from, { text: `☠️ *🛡️ Guardian @${guard.id.split("@")[0]}* mati karena mencoba melindungi target serangan alpha wolf\n\n*@${target.id.split("@")[0]}*! Perannya: *${global.db.game.werewolf[from].roles[guard.id]}*.`, mentions: [guard.id, target.id] });
				}
			}
			const targetRole = global.db.game.werewolf[from].roles[target.id] || "Unknown";
			if (targetRole === "God") {
				await sock.sendMessage(from, { text: `💀 *Alpha Wolf gagal! @${target.id.split("@")[0]} tidak bisa dibunuh karena dia adalah Admin*!`, mentions: [target.id] });
				continue;
			}
			global.db.game.werewolf[from].eliminated.push(target);
			global.db.game.werewolf[from].players.splice(targetIndex, 1);
			await sock.sendMessage(from, { text: `☠️ *@${target.id.split("@")[0]}* mati dibunuh *Alpha Wolf*! Perannya: *${global.db.game.werewolf[from].roles[target.id]}*.`, mentions: [target.id] });
		}
	}
	if (global.db.game.werewolf[from].WerewolfTarget.length > 0) {
		for (const target of global.db.game.werewolf[from].WerewolfTarget) {
			let targetIndex = global.db.game.werewolf[from].players.findIndex((p) => p.id === target.id);
			if (targetIndex === -1) continue;
			if (global.db.game.werewolf[from].guardTarget.some((guard) => guard.id === target.id)) {
				await sock.sendMessage(from, { text: `🛡️ *Serigala gagal! @${target.id.split("@")[0]} dilindungi oleh Guard!*`, mentions: [target.id] });
				continue;
			}
			const targetRole = global.db.game.werewolf[from].roles[target.id] || "Unknown";
			if (targetRole === "God") {
				await sock.sendMessage(from, { text: `💀 *Serigala gagal! @${target.id.split("@")[0]} tidak bisa dibunuh karena dia adalah Admin*!`, mentions: [target.id] });
				continue;
			}
			global.db.game.werewolf[from].eliminated.push(target);
			global.db.game.werewolf[from].players.splice(targetIndex, 1);
			await sock.sendMessage(from, { text: `☠️ *@${target.id.split("@")[0]}* telah dibunuh oleh Werewolf! Peran dia adalah *${targetRole}*`, mentions: [target.id] });
			if (["Cursed", "SerialKiller", "Hunter"].includes(targetRole)) {
				let werewolves = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "Werewolf");
				let alphaWolf = global.db.game.werewolf[from].players.find((p) => global.db.game.werewolf[from].roles[p.id] === "AlphaWolf");
				let targetWolf = werewolves.length ? werewolves[Math.floor(Math.random() * werewolves.length)] : alphaWolf;
				if (targetRole === "Cursed" && targetWolf) {
					global.db.game.werewolf[from].eliminated.push(targetWolf);
					global.db.game.werewolf[from].players = global.db.game.werewolf[from].players.filter((p) => p.id !== targetWolf.id);
					await sock.sendMessage(from, { text: `☠️ *@${targetWolf.id.split("@")[0]}* mati karena menyerang *Cursed*!`, mentions: [targetWolf.id] });
				} else if (["SerialKiller", "Hunter"].includes(targetRole) && targetWolf) {
					if (werewolves.length) {
						global.db.game.werewolf[from].eliminated.push(targetWolf);
						global.db.game.werewolf[from].players = global.db.game.werewolf[from].players.filter((p) => p.id !== targetWolf.id);
						await sock.sendMessage(from, { text: `☠️ *@${targetWolf.id.split("@")[0]}* mati saat menyerang *${targetRole}*!`, mentions: [targetWolf.id] });
					} else if (alphaWolf) {
						await sock.sendMessage(alphaWolf.id, { text: `Kamu berhasil menang dari serangan *${targetRole}*!`, mentions: [alphaWolf.id] });
					}
				}
			}
		}
	}
	global.db.game.werewolf[from].WerewolfTarget = [];
	global.db.game.werewolf[from].guardTarget = [];
	global.db.game.werewolf[from].priestTarget = [];
	global.db.game.werewolf[from].skTarget = [];
	global.db.game.werewolf[from].alphaTarget = [];
	let werewolves = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "Werewolf" || global.db.game.werewolf[from].roles[p.id] === "AlphaWolf").length;
	let serialKillers = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "SerialKiller").length;
	let gods = global.db.game.werewolf[from].players.filter((p) => global.db.game.werewolf[from].roles[p.id] === "God").length;
	let villagers = global.db.game.werewolf[from].players.length - (werewolves + serialKillers + gods);
	let survivors = global.db.game.werewolf[from].players.map((p, index) => `${index + 1}. *@${p.id.split("@")[0]}* (${global.db.game.werewolf[from].roles[p.id] || "Unknown"})`).join("\n");
	let eliminated = global.db.game.werewolf[from].eliminated.map((p, index) => `${index + 1}. *@${p.id.split("@")[0]}* (${global.db.game.werewolf[from].roles[p.id] || "Unknown"})`).join("\n");
	let allPlayers = [...global.db.game.werewolf[from].players.map((p) => p.id), ...global.db.game.werewolf[from].eliminated.map((p) => p.id)];
	if (werewolves === 0 && serialKillers === 0) {
		await sock.sendMessage(from, { text: `🎉 *Warga desa menang!* Semua Werewolf telah dieliminasi!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
		delete global.db.game.werewolf[from];
		return;
	}
	if (werewolves >= villagers + serialKillers) {
		await sock.sendMessage(from, { text: `🐺 *Werewolf menang!* Mereka telah menguasai desa!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
		delete global.db.game.werewolf[from];
		return;
	}
	if (serialKillers === 1 && villagers === 0 && werewolves === 0) {
		await sock.sendMessage(from, { text: `🔪 *Serial Killer menang!* Dia telah membantai semua player!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
		delete global.db.game.werewolf[from];
		return;
	}
	if (global.db.game.werewolf[from].players.length === 2) {
		let player1 = global.db.game.werewolf[from].players[0];
		let player2 = global.db.game.werewolf[from].players[1];
		let role1 = global.db.game.werewolf[from].roles[player1.id];
		let role2 = global.db.game.werewolf[from].roles[player2.id];
		if ((role1 === "Cursed" && ["AlphaWolf", "SerialKiller", "Werewolf"].includes(role2)) || (role2 === "Cursed" && ["AlphaWolf", "SerialKiller", "Werewolf"].includes(role1))) {
			let [cursedPlayer, opponentPlayer] = role1 === "Cursed" ? [player1, player2] : [player2, player1];
			await sock.sendMessage(from, { text: `⚖️ *Permainan berakhir seri!*\n\n💀 *@${cursedPlayer.id.split("@")[0]}* (Cursed) dan *@${opponentPlayer.id.split("@")[0]}* (${global.db.game.werewolf[from].roles[opponentPlayer.id]}) telah saling membunuh!`, mentions: allPlayers });
			delete global.db.game.werewolf[from];
			return;
		}
		if ((role1 === "Werewolf" && role2 === "SerialKiller") || (role1 === "SerialKiller" && role2 === "Werewolf")) {
			await sock.sendMessage(from, { text: `🔪 *Serial Killer menang!* Dia berhasil menghabisi Werewolf terakhir!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
			delete global.db.game.werewolf[from];
			return;
		}
		if ((role1 === "AlphaWolf" && role2 === "SerialKiller") || (role1 === "SerialKiller" && role2 === "AlphaWolf")) {
			await sock.sendMessage(from, { text: `🐺 *Werewolf menang!* Dia berhasil membunuh seluruh player!\n\n🔹 *Pemain yang masih hidup:*\n${survivors}\n\n💀 *Pemain yang sudah mati:*\n${eliminated}`, mentions: allPlayers });
			delete global.db.game.werewolf[from];
			return;
		}
	}
	await sock.sendListMsg(from, {
		title: `*PAGI TELAH TIBA*`,
		text: `🗳️ Pilih pemain yang ingin kamu vote:\n\n> Apabila tombol tidak berfungsi ketik ${prefix}ww vote @tag`,
		footer: `Hari ke-${global.db.game.werewolf[from].dayCount}`,
		buttons: global.db.game.werewolf[from]?.players
			.filter((p) => !global.db.game.werewolf[from].eliminated.some((e) => e.id === p.id))
			.map((p) => ({
				name: "quick_reply",
				buttonParamsJson: JSON.stringify({
					display_text: `🗳️ Vote ${p.pushname} (${p.id.split("@")[0].slice(-3)})`,
					id: `${prefix}ww vote ${p.id}`,
				}),
			})),
	});
	setTimeout(async () => {
		if (global.db.game.werewolf[from]?.phase === "day") {
			await processVotes(sock, from, prefix);
		}
	}, 120000);
}
async function processVotes(sock, from, prefix) {
	if (global.db.game.werewolf[from]?.phase !== "day") return;
	if (global.db.game.werewolf[from].status !== "vote") return;
	let uniqueVoters = new Set(Object.values(global.db.game.werewolf[from].votes).flat()).size;
	if (uniqueVoters < Math.ceil(global.db.game.werewolf[from].players.length / 2)) {
		await sock.sendMessage(from, { text: "🔄 Voting kurang dari 50%, voting akan diulang!" });
		global.db.game.werewolf[from].status = "start";
		startDayPhase(sock, from, prefix);
		return;
	}
	let voteCounts = {};
	let voteVoters = {};
	for (let target in global.db.game.werewolf[from].votes) {
		voteCounts[target] = global.db.game.werewolf[from].votes[target].length;
		voteVoters[target] = global.db.game.werewolf[from].votes[target];
	}
	if (Object.keys(voteCounts).length === 0) {
		await sock.sendMessage(from, { text: "Tidak ada yang memberikan suara, voting diulang!" });
		global.db.game.werewolf[from].status = "start";
		startDayPhase(sock, from, prefix);
		return;
	}
	let voteResult = "📊 *Hasil Voting:*\n\n";
	let allVoters = [];
	let totalVotesGiven = Object.values(voteCounts).reduce((acc, count) => acc + count, 0);
	for (let player in voteCounts) {
		let totalVotes = voteCounts[player];
		let percentage = ((totalVotes / totalVotesGiven) * 100).toFixed(2);
		let uniqueVoterList = [...new Set(voteVoters[player])];
		let voterList = uniqueVoterList.map((voter, index) => `${index + 1}. @${voter.split("@")[0]}`).join("\n");
		voteResult += `🔹 *@${player.split("@")[0]}* - ${totalVotes} suara (${percentage}%)\n`;
		voteResult += `   *Voters:*\n${voterList}\n\n`;
		allVoters = [...allVoters, ...uniqueVoterList, player];
	}
	await sock.sendMessage(from, { text: voteResult, mentions: allVoters });
	let maxVotes = Math.max(...Object.values(voteCounts));
	let candidates = Object.keys(voteCounts).filter((player) => voteCounts[player] === maxVotes);
	let eliminatedPlayer = candidates.length > 1 ? candidates[Math.floor(Math.random() * candidates.length)] : candidates[0];
	if (candidates.length > 1) {
		await sock.sendMessage(from, { text: `⚖️ *Voting Seri!* Kandidat:\n\n${candidates.map((c, i) => `${i + 1}. @${c.split("@")[0]}`).join("\n")}`, mentions: candidates });
		await delay(10000);
	}
	let eliminatedPlayerData = global.db.game.werewolf[from].players.find((p) => p.id === eliminatedPlayer);
	if (eliminatedPlayerData) {
		const eliminatedRole = global.db.game.werewolf[from].roles[eliminatedPlayerData.id];
		if (eliminatedRole === "Prince") {
			await sock.sendMessage(from, { text: `*👑 @${eliminatedPlayerData.id.split("@")[0]} Adalah Prince*\n\nPrince kebal dari eksekusi! Dia tetap hidup dan game berlanjut ke malam hari!`, mentions: [eliminatedPlayerData.id] });
			global.db.game.werewolf[from].status = "start";
			await delay(10000);
			startNightPhase(sock, from, prefix);
			return;
		}
		if (eliminatedRole === "God") {
			await sock.sendMessage(from, { text: `*@${eliminatedPlayerData.id.split("@")[0]} ADMIN GABISA DI EKSEKUSI BOSSS*`, mentions: [eliminatedPlayerData.id] });
			global.db.game.werewolf[from].status = "start";
			await delay(10000);
			startNightPhase(sock, from, prefix);
			return;
		}
		if (eliminatedRole === "Joker") {
			await sock.sendMessage(from, { text: `*🤡 @${eliminatedPlayerData.id.split("@")[0]} Adalah Joker!*\n\nJoker berhasil dieksekusi dan MENANG! 🎉\n\nPermainan berakhir karena Joker telah mencapai tujuannya!`, mentions: [eliminatedPlayerData.id] });
			delete global.db.game.werewolf[from];
			return;
		}
		global.db.game.werewolf[from].eliminated.push({ id: eliminatedPlayerData.id, pushname: eliminatedPlayerData.pushname });
		global.db.game.werewolf[from].players = global.db.game.werewolf[from].players.filter((p) => p.id !== eliminatedPlayer);
		await sock.sendMessage(from, { text: `☠️ *@${eliminatedPlayerData.id.split("@")[0]} telah dieksekusi oleh warga!* Peran dia adalah *${global.db.game.werewolf[from].roles[eliminatedPlayer] || "Unknown"}*`, mentions: [eliminatedPlayerData.id] });
		if (eliminatedRole === "Cursed" && global.db.game.werewolf[from].players.length > 0) {
			await sock.sendMessage(from, { text: `💀 *DANGER*\n\nOrang yg baru saja dieksekusi ternyata adalah cursed` });
			await delay(5000);
			await sock.sendMessage(from, { text: `🩸 *Cursed mengamuk dan akan mengambil salah satu nyawa player disini, tidak ada yg bisa menghentikannya*` });
			await delay(10000);
			const randomVictim = global.db.game.werewolf[from].players[Math.floor(Math.random() * global.db.game.werewolf[from].players.length)];
			global.db.game.werewolf[from].eliminated.push({ id: randomVictim.id, pushname: randomVictim.pushname });
			global.db.game.werewolf[from].players = global.db.game.werewolf[from].players.filter((p) => p.id !== randomVictim.id);
			await sock.sendMessage(from, { text: `*@${randomVictim.id.split("@")[0]}* telah mati sebagai korban kutukan! role dia adalah *${global.db.game.werewolf[from].roles[randomVictim.id]}*`, mentions: [randomVictim.id] });
		}
		global.db.game.werewolf[from].status = "start";
		await delay(10000);
		await startNightPhase(sock, from, prefix);
	}
}
async function onPlayerVote(sock, from, prefix) {
	let totalPlayers = global.db.game.werewolf[from].players.length;
	let totalVoters = new Set(Object.values(global.db.game.werewolf[from].votes).flat()).size;
	if (totalVoters === totalPlayers) {
		await processVotes(sock, from, prefix);
	}
}
async function startGame(sock, from, prefix) {
	const bagiRole = {
		4: { Villager: 2, Seer: 1, Werewolf: 1 },
		5: { Villager: 2, Seer: 1, Werewolf: 1, Walikota: 1 },
		6: { Villager: 2, Seer: 1, Werewolf: 1, Walikota: 1, Lycan: 1 },
		7: { Villager: 2, Seer: 1, Werewolf: 1, Walikota: 1, Lycan: 1, Guard: 1 },
		8: { Villager: 2, Seer: 1, Werewolf: 2, Walikota: 1, Lycan: 1, Guard: 1 },
		9: { Villager: 2, Seer: 1, Werewolf: 2, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1 },
		10: { Villager: 2, Seer: 1, Werewolf: 2, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1 },
		11: { Villager: 3, Seer: 1, Werewolf: 2, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1 },
		12: { Villager: 3, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1 },
		13: { Villager: 4, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1 },
		14: { Villager: 4, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1 },
		15: { Villager: 4, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1 },
		16: { Villager: 5, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1 },
		17: { Villager: 6, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1 },
		18: { Villager: 6, Seer: 1, Werewolf: 3, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1 },
		19: { Villager: 6, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1 },
		20: { Villager: 7, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1 },
		21: { Villager: 7, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1 },
		22: { Villager: 7, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1, Prince: 1 },
		23: { Villager: 8, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1, Prince: 1 },
		24: { Villager: 9, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1, Prince: 1 },
		25: { Villager: 9, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1, Prince: 1, Joker: 1 },
		26: { Villager: 10, Seer: 1, Werewolf: 4, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1, Prince: 1, Joker: 1 },
		27: { Villager: 10, Seer: 1, Werewolf: 5, Walikota: 1, Lycan: 1, Guard: 1, Hunter: 1, Priest: 1, AlphaWolf: 1, Witch: 1, SerialKiller: 1, Cursed: 1, Prince: 1, Joker: 1 },
	};
	const roleDescriptions = {
		Werewolf:
			"*🐺 Werewolf*\nSetiap malam, berkumpul dengan sesama Werewolf untuk menentukan target yang akan dibunuh. Harus berusaha berbaur dengan warga desa saat siang hari agar tidak dicurigai. Strategi yang baik adalah menghasut dan mempengaruhi diskusi agar orang lain saling mencurigai. Jika semua warga terbunuh, Werewolf menang.",
		Seer: "*🔮 Seer*\nMemiliki kemampuan untuk melihat aura seseorang setiap malam. Informasi yang diperoleh harus digunakan secara hati-hati agar tidak langsung diincar oleh Werewolf. Berpura-pura menjadi Villager biasa dan memberikan petunjuk secara halus dapat membantu mengarahkan diskusi ke arah yang benar.",
		Villager: "*👨‍🌾 Villager*\nTidak memiliki kemampuan khusus, tetapi perannya sangat penting dalam permainan. Harus mengandalkan logika, observasi, dan diskusi untuk menemukan Werewolf. Berhati-hati dalam memberikan voting dan jangan mudah terprovokasi oleh manipulasi Werewolf.",
		Lycan: "*🐺 Lycan*\nSeorang manusia biasa yang terlihat sebagai Werewolf jika diperiksa oleh Seer. Dapat menjadi korban kesalahpahaman dalam permainan karena hasil investigasi yang menyesatkan. Perlu membangun kepercayaan dengan Villager lain dan meyakinkan mereka bahwa bukan bagian dari kawanan Werewolf.",
		Walikota:
			"*🏛️ Walikota*\nMemiliki suara voting yang bernilai dua kali lipat. Bisa menjadi pemimpin dalam diskusi dan memberikan pengaruh besar dalam menentukan siapa yang akan dieksekusi. Jika identitasnya terbongkar, kemungkinan besar akan menjadi target Werewolf, sehingga harus berhati-hati dalam berbicara dan mengambil keputusan.",
		Guard: "*🛡️ Guard*\nSetiap malam, dapat memilih satu pemain untuk dilindungi dari serangan Werewolf. Jika pemain yang dilindungi menjadi target Werewolf, serangan tersebut akan digagalkan. Tidak bisa melindungi orang yang sama dua malam berturut-turut. Perlu memperkirakan siapa yang berisiko tinggi menjadi target untuk memaksimalkan perlindungan.",
		Priest: "*✝️ Priest*\nPriest memiliki dua kemampuan spesial yang hanya bisa digunakan dua kali sepanjang permainan: memeriksa peran pemain lain dan mengutuk seorang pemain. Jika yang dikutuk adalah Werewolf atau Alpha Werewolf, maka mereka akan mati. Namun, jika yang dikutuk bukan Werewolf, tidak akan terjadi apa-apa dan pemain yang dikutuk tetap hidup. Penggunaan kemampuan ini harus dilakukan dengan sangat hati-hati, karena keputusan yang salah bisa berisiko besar bagi tim villager.",
		AlphaWolf:
			"*🐺 Alpha Werewolf*\nSalah satu Werewolf yang lebih kuat dengan kemampuan khusus. Alpha Werewolf memiliki kemampuan sekali dalam permainan untuk mengubah seorang Villager menjadi Werewolf. Selain itu, Alpha Werewolf akan terlihat baik di mata Seer, sehingga tidak mudah dicurigai. Menggunakan taktik licik untuk menyesatkan Villager dan membuat perpecahan dalam diskusi adalah keahliannya.",
		Hunter: "*🏹 Hunter*\nSebagai Hunter, jika kamu terbunuh oleh serangan Werewolf, kamu akan membalas dengan menembak satu Werewolf secara acak sebelum kamu mati. Namun, jika kamu menjadi target Serial Killer, kamu akan mati bersamanya. Tetap bertahan selama mungkin untuk mengumpulkan informasi, karena kemampuanmu bisa menjadi pembeda dalam permainan.",
		SerialKiller:
			"*🔪 Serial Killer*\nBeroperasi secara independen dan membunuh satu pemain setiap malam. Tidak berpihak pada Werewolf maupun Villager, tetapi harus bertahan sampai akhir permainan. Menggunakan kebohongan, manipulasi, dan bermain di kedua sisi dapat membantu tetap bertahan lebih lama.",
		Witch: "*🧙‍♀️ Witch*\nSeorang ahli sihir dengan dua ramuan ajaib yang hanya bisa menggunakan salah satu sepanjang permainan. Witch memiliki dua pilihan berikut:\n\n- *Revive*: Dapat menghidupkan kembali pemain yang telah mati, tanpa mengetahui perannya. Jika pemain yang dihidupkan memiliki kemampuan terbatas seperti Priest atau Alpha Werewolf, kemampuan mereka akan di-reset dan bisa digunakan kembali.\n- *Kill*: Dapat membunuh siapa pun tanpa mengetahui perannya.\n\nWitch juga akan diberi informasi tentang siapa yang akan mati setiap malam, tetapi tetap tidak bisa mengetahui peran asli mereka. Jika memilih Revive, pemain yang dihidupkan akan diberi tahu secara pribadi tanpa pengumuman ke publik. Keputusan Witch dapat menjadi pedang bermata dua, membawa harapan atau kehancuran bagi Villager.",
		Cursed: "*🩸 Cursed*\nSeorang Villager yang terkutuk dan membawa kehancuran bahkan setelah kematiannya. Jika dibunuh oleh Werewolf di malam hari, salah satu Werewolf akan mati secara acak sebagai balasan atas kutukan ini. Namun, jika Cursed dieksekusi oleh voting, kutukannya akan memilih target secara acak bisa seorang Villager atau Werewolf sebelum akhirnya mati. Tidak ada yang selamat dari amarah Cursed, dan kematiannya selalu membawa kehancuran bagi seseorang.",
		Prince: "*👑 Prince*\nJika mendapatkan suara terbanyak dalam voting eksekusi, tidak akan terbunuh dan identitasnya akan terungkap. Setelah itu, masih bisa terus bermain, tetapi menjadi target utama Werewolf di malam hari. Bisa memanfaatkan kekebalan ini untuk mengarahkan diskusi dan melindungi Villager lainnya sebelum akhirnya diincar oleh musuh.",
		Joker: "*🤡 Joker*\nJoker adalah pemain yang bermain sendiri dan tidak berpihak pada Villager maupun Werewolf. Tujuan utama Joker adalah dieksekusi melalui voting siang hari. Jika berhasil, Joker menang secara otomatis,",
	};
	const playerCount = global.db.game.werewolf[from].players.length;
	const cretad = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
	const roleSet = bagiRole[playerCount] || bagiRole[4];
	const rolesToAssign = Object.entries(roleSet).flatMap(([role, count]) => Array(count).fill(role));
	const shuffledPlayers = [...global.db.game.werewolf[from].players].sort(() => Math.random() - 0.5);
	global.db.game.werewolf[from].status = "start";
	global.db.game.werewolf[from].createat = cretad;
	global.db.game.werewolf[from].roles = Object.fromEntries(shuffledPlayers.map((player, index) => [player.id, rolesToAssign[index]]));
	await Promise.all(global.db.game.werewolf[from].players.map((player) => sock.sendMessage(player.id, { text: `\`[ PLAYER ROLE ]\`\n\n${roleDescriptions[global.db.game.werewolf[from].roles[player.id]]}\n\n*📅 Time:* ${cretad}\n*👤 Player:* @${player.id.split("@")[0]}`, mentions: [player.id] })));
	await sock.sendMessage(from, { text: `🎭 Role telah dibagikan! Cek private chat untuk melihat peran Anda.\nGame akan dimulai dalam *30 detik*!` });
	await delay(30000);
	await Promise.allSettled([priestOption(sock, from, prefix), Alpha(sock, from, prefix), WTCH(sock, from, prefix), startNightPhase(sock, from, prefix)]);
}
async function priestOption(sock, from, prefix) {
	const priest = global.db.game.werewolf[from].players.find((p) => global.db.game.werewolf[from].roles[p.id] === "Priest");
	if (!priest) return;
	await sock.sendListMsg(priest.id, {
		title: `*PRIEST SKILL*`,
		text: `📝 Pilih pemain yang ingin kamu lihat rolenya`,
		footer: `✝️ Priest`,
		buttons: global.db.game.werewolf[from].players
			.filter((p) => p.id !== priest.id)
			.map((p) => ({
				name: "quick_reply",
				buttonParamsJson: JSON.stringify({
					display_text: `🔮 Periksa ${p.pushname}`,
					id: `${prefix}ww pseer ${p.id}`,
				}),
			})),
	});
	await sock.sendListMsg(priest.id, {
		title: `*PRIEST SKILL*`,
		text: `📝 Pilih pemain yg kamu curigai sebagai werewolf untuk dikutuk\nEfek kutukan yg kamu berikan akan terjadi di keesokan harinya`,
		footer: `✝️ Priest`,
		buttons: global.db.game.werewolf[from].players
			.filter((p) => p.id !== priest.id)
			.map((p) => ({
				name: "quick_reply",
				buttonParamsJson: JSON.stringify({
					display_text: `💀 Kutuk ${p.pushname}`,
					id: `${prefix}ww kutuk ${p.id}`,
				}),
			})),
	});
}
async function Alpha(sock, from, prefix) {
	const alpha = global.db.game.werewolf[from].players.find((p) => global.db.game.werewolf[from].roles[p.id] === "AlphaWolf");
	if (!alpha) return;
	await sock.sendListMsg(alpha.id, {
		title: `*ALPHA SKILL*`,
		text: `📝 Pilih pemain yang ingin kamu kill`,
		footer: `🐺 Alpha Wolf`,
		buttons: global.db.game.werewolf[from].players
			.filter((p) => {
				const role = global.db.game.werewolf[from].roles[p.id];
				return p.id !== alpha.id && role !== "Werewolf" && role !== "AlphaWolf";
			})
			.map((p) => ({
				name: "quick_reply",
				buttonParamsJson: JSON.stringify({
					display_text: `☠️ Kill ${p.pushname}`,
					id: `${prefix}ww kill ${p.id}`,
				}),
			})),
	});
}
async function WTCH(sock, from, prefix) {
	const wtch = global.db.game.werewolf[from].players.find((p) => global.db.game.werewolf[from].roles[p.id] === "Witch");
	if (!wtch) return;
	await sock.sendListMsg(wtch.id, {
		title: `*WITCH SKILL*`,
		text: `📝 Pilih pemain yang ingin kamu kill`,
		footer: `🧙‍♀️ Witch`,
		buttons: global.db.game.werewolf[from].players
			.filter((p) => p.id !== wtch.id)
			.map((p) => ({
				name: "quick_reply",
				buttonParamsJson: JSON.stringify({
					display_text: `☠️ Kill ${p.pushname}`,
					id: `${prefix}ww kutuk ${p.id}`,
				}),
			})),
	});
}

function validateNightSkill(sock, from, sender, isGroup, m, gid) {
	if (isGroup) {
		sock.sendMessage(from, { text: "Perintah ini hanya dapat digunakan di private chat" }, { quoted: m });
		return false;
	}
	if (!global.db.game.werewolf[gid]) {
		sock.sendMessage(from, { text: "Tidak ada sesi game yg sedang berlangsung" }, { quoted: m });
		return false;
	}
	if (global.db.game.werewolf[gid].status === "vote") {
		sock.sendMessage(from, { text: "Sekarang sesi vote, tidak bisa menggunakan kemampuan" }, { quoted: m });
		return false;
	}
	if (global.db.game.werewolf[gid].status !== "start") {
		sock.sendMessage(from, { text: "Game belum dimulai" }, { quoted: m });
		return false;
	}
	if (global.db.game.werewolf[gid].eliminated.some((p) => p.id === sender)) {
		sock.sendMessage(from, { text: "Kamu sudah mati" }, { quoted: m });
		return false;
	}
	if (global.db.game.werewolf[gid].phase !== "night") {
		sock.sendMessage(from, { text: "Kemampuan ini hanya bisa digunakan malam hari!" }, { quoted: m });
		return false;
	}
	return true;
}
