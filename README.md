## Information

<div align="center">
<a href="https://github.com/nazedev/hitori/watchers"><img title="Watchers" src="https://img.shields.io/github/watchers/nazedev/hitori?label=Watchers&color=green&style=flat-square"></a>
<a href="https://github.com/nazedev/hitori/network/members"><img title="Forks" src="https://img.shields.io/github/forks/nazedev/hitori?label=Forks&color=blue&style=flat-square"></a>
<a href="https://github.com/nazedev/hitori/stargazers"><img title="Stars" src="https://img.shields.io/github/stars/nazedev/hitori?label=Stars&color=yellow&style=flat-square"></a>
<a href="https://github.com/nazedev/hitori/issues"><img title="Issues" src="https://img.shields.io/github/issues/nazedev/hitori?label=Issues&color=success&style=flat-square"></a>
<a href="https://github.com/nazedev/hitori/issues?q=is%3Aissue+is%3Aclosed"><img title="Issues" src="https://img.shields.io/github/issues-closed/nazedev/hitori?label=Issues&color=red&style=flat-square"></a>
<a href="https://github.com/nazedev/hitori/pulls"><img title="Pull Request" src="https://img.shields.io/github/issues-pr/nazedev/hitori?label=PullRequest&color=success&style=flat-square"></a>
<a href="https://github.com/nazedev/hitori/pulls?q=is%3Apr+is%3Aclosed"><img title="Pull Request" src="https://img.shields.io/github/issues-pr-closed/nazedev/hitori?label=PullRequest&color=red&style=flat-square"></a>
</div>

This script is created by [Nazedev](https://github.com/nazedev) using Node.js and the [WhiskeySocket/Baileys](https://github.com/WhiskeySockets/Baileys) library. The script is currently in the development phase (BETA), so there may still be some errors that can be ignored. If errors persist even after debugging, please contact the owner for assistance. ~ By Naze

#### Join Group
[![Grup WhatsApp](https://img.shields.io/badge/WhatsApp%20Group-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/DPUC3uuqYZI9FNLdgtMp4n?mode=gi_t) 

---
## 📦 Requirements

Minimum requirements:
- **Node.js** v20 or higher
- **Git**

System dependencies (handled automatically by `install.sh`):
- ffmpeg
- imagemagick
- yarn / npm

---
## 🚀 Installation
### 1️⃣ Clone Repository
```bash
git clone https://github.com/nazedev/hitori
cd hitori
```
---
### 2️⃣ Automatic Installation (Recommended)

```bash
bash install.sh
```

This script will:
- Detect your package manager (`pkg`, `apt`, `dnf`, etc.)
- Install required system dependencies
- Install Node.js packages
- Start the bot automatically

---
## 📱 Termux (Android)
```bash
pkg update && pkg upgrade
pkg install git
pkg install nodejs
pkg install ffmpeg
pkg install imagemagick
git clone https://github.com/nazedev/hitori
cd hitori
npm install
```
[ RECOMMENDED INSTALL ON TERMUX ]
```bash
pkg install yarn
yarn
```
Use **yarn**:

```bash
yarn install
yarn start
```

> Make sure `nodejs` and `yarn` are installed. The `install.sh` script already handles this.

---
## 💻 Laptop / Ubuntu / VPS / SSH
* Download And Install Git [`Click Here`](https://git-scm.com/downloads)
* Download And Install NodeJS [`Click Here`](https://nodejs.org/en/download)
* Download And Install FFmpeg [`Click Here`](https://ffmpeg.org/download.html) (**Don't Forget Add FFmpeg to PATH enviroment variables**)
* Download And Install ImageMagick [`Click Here`](https://imagemagick.org/script/download.php)

Use **npm**:

```bash
npm install
npm start
```
---
## ▶️ Running the Bot

```bash
npm start
# or
yarn start
```

Scan the QR Code or use Pairing Code, and the bot is ready to use.

---

## 🌐 API Integration

This bot is fully integrated with the **Naze API Service**:

🔗 https://naze.biz.id

Many features (such as downloader, AI tools, utilities, and media processing) rely on this external API.

### API Key Requirement

To use all features properly, you **must provide your own API key**.

The API key is configured in:

📁 **[settings.js](https://github.com/nazedev/hitori/blob/master/settings.js)**  

Example configuration:

```js
global.APIKeys = {
  'https://api.naze.biz.id': 'YOUR_API_KEY_HERE'
}
```

⚠️ If the API key is invalid or not set:
- Some commands will not work
- API-based features may return errors

Make sure you register and obtain a valid API key from the official website before using the bot.

---
## ⚙️ Bot Configuration

All main configurations are located in:

📁 **[settings.js](https://github.com/nazedev/hitori/blob/master/settings.js)**

### Editable Settings

#### Owner Number
```js
global.owner = ['628xxxxxxxxxx']
```

#### Bot Identity
```js
global.botname = 'Hitori Bot'
global.author = 'Nazedev'
```

#### Command Prefix
```js
global.listprefix = ['!', '.', '+']
```

#### User Limits & Balance
```js
global.limit.free = 20
global.money.free = 10000
```

#### Pairing Code / Bot Number
```js
global.pairing_code = true
global.number_bot = '628xxxxxxxxxx'
```

> Any change in [settings.js](https://github.com/nazedev/hitori/blob/master/settings.js) will be **auto-reloaded** without restarting the bot.

---

## 🧩 Editing & Adding Features

All bot features are implemented in:

📁 **[naze.js](https://github.com/nazedev/hitori/blob/master/naze.js)**

Look for the **[switch (command)](https://github.com/nazedev/hitori/blob/61052a01ea8e8975a99f0db7f5d40bad5ee39a5b/naze.js#L742)** section.

### Where to Add New Features

Add or edit commands inside the [switch (command)](https://github.com/nazedev/hitori/blob/61052a01ea8e8975a99f0db7f5d40bad5ee39a5b/naze.js#L742) block.

### Example: Adding a New Command

```js
case 'ping': {
  reply('pong 🏓')
}
break
```

Guidelines:
- Always add new commands using `case`
- Do not remove the main switch structure
- Place feature logic inside each `case`

---

## 🔌 Connector & Core Handler

To understand the WhatsApp connection flow and event handling, see:

📁 **[index.js](https://github.com/nazedev/hitori/blob/master/index.js)**
This file is responsible for:
- Initializing Baileys connection
- Handling WhatsApp events
- Loading [settings.js](https://github.com/nazedev/hitori/blob/master/settings.js)
- Dispatching messages to [naze.js](https://github.com/nazedev/hitori/blob/master/naze.js)

⚠️ **Editing [index.js](https://github.com/nazedev/hitori/blob/master/index.js) is not recommended unless you fully understand the bot flow.**

---
## 🗂 Structure Project
```
├── Dockerfile
├── LICENSE
├── Procfile
├── README.md
├── app.json
├── database
│   ├── jadibot
│   │   └── Naze
│   └── temp
│       └── A
├── docker-compose.yml
├── heroku.yml
├── index.js
├── install.sh
├── lib
│   ├── converter.js
│   ├── exif.js
│   ├── function.js
│   ├── game.js
│   ├── math.js
│   ├── template_menu.js
│   ├── tictactoe.js
│   └── uploader.js
├── naze.js
├── nodemon.json
├── package.json
├── railway.json
├── replit.nix
├── settings.js
├── speed.py
├── src
│   ├── antispam.js
│   ├── database.js
│   ├── jadibot.js
│   ├── media
│   │   ├── fake.pdf
│   │   └── naze.png
│   ├── message.js
│   └── server.js
└── start.js
```
---
#### Deploy to Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/nazedev/hitori)

#### Heroku Buildpack
| Build Pack | LINK |
|--------|--------|
| **NODEJS** | heroku/nodejs |
| **FFMPEG** | [here](https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest) |
| **IMAGEMAGICK** | [here](https://github.com/DuckyTeam/heroku-buildpack-imagemagick) |

---
### Features
| Menu     | Bot | Group | Search | Download | Tools | Ai | Game | Fun | Owner |
| -------- | --- | ----- | ------ | -------- | ----- | -- | ---- | --- | ----- |
| Work     |  ✅  |   ✅   |    ✅    |     ✅     |   ✅   | ✅ |   ✅   |  ✅  |    ✅    |


License: [MIT](https://choosealicense.com/licenses/mit/)

#### Support Me
- [Saweria](https://saweria.co/naze)

## Contributor

- [NazeDev](https://github.com/nazedev) (Pembuat)
- [Zaynn](https://github.com/ZaynRcK) (Penyedia Layanan API)
- [Dani](https://github.com/nazedev) (Penyumbang Code)

## Thanks to

| [![Nazedev](https://github.com/nazedev.png?size=100)](https://github.com/nazedev) | [![Zaynn](https://github.com/ZaynRcK.png?size=100)](https://github.com/ZaynRcK) | [![Dani](https://github.com/nazedev.png?size=100)](https://github.com/nazedev) | [![WhiskeySockets](https://github.com/WhiskeySockets.png?size=100)](https://github.com/WhiskeySockets) |
| --- | --- | --- | --- |

| [NazeDev](https://github.com/nazedev) | [Zaynn](https://github.com/ZaynRcK) | [Dani](https://github.com/dani) | [WhiskeySockets](https://github.com/WhiskeySockets) |
