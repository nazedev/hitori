<div align="center">
  <img src="src/media/hitori.webp" alt="Hitori Goto" width="180" />
  <h1>Hitori Bot</h1>
  <p>A feature-rich WhatsApp bot built with Node.js and <a href="https://github.com/WhiskeySockets/Baileys">Baileys</a>.<br/>
  Comes with an interactive CLI, web dashboard, and a full suite of commands out of the box.</p>

  <a href="https://github.com/nazedev/hitori/stargazers"><img src="https://img.shields.io/github/stars/nazedev/hitori?style=flat-square&color=yellow" alt="Stars" /></a>
  <a href="https://github.com/nazedev/hitori/network/members"><img src="https://img.shields.io/github/forks/nazedev/hitori?style=flat-square&color=blue" alt="Forks" /></a>
  <a href="https://github.com/nazedev/hitori/issues"><img src="https://img.shields.io/github/issues/nazedev/hitori?style=flat-square&color=green" alt="Issues" /></a>
  <a href="https://github.com/nazedev/hitori/pulls"><img src="https://img.shields.io/github/issues-pr/nazedev/hitori?style=flat-square&color=orange" alt="Pull Requests" /></a>
</div>

<br />

> [!CAUTION]
> **UNOFFICIAL API & ACCOUNT SANCTIONS RISK (DISCLAIMER)**  
> This project uses `@whiskeysockets/baileys`, an unofficial WhatsApp Web API. Automated bots and unofficial third-party clients violate **WhatsApp's Terms of Service**.  
> - **Account Sanctions & Restrictions:** Your WhatsApp account/number may face **sanctions, feature restrictions, or bans (temporary/permanent)** by Meta's automated anti-spam systems.  
> - **Zero Liability:** The author and maintainers of **Hitori Bot (`Nazedev`)** assume **no liability or responsibility** for any account sanctions, banned numbers, data loss, or damages resulting from the use of this software. **USE AT YOUR OWN RISK.**

> [!WARNING]
> **COMMON CAUSES OF WHATSAPP BANS:**  
> 1. **New / Fresh SIM Cards:** Never use newly registered numbers immediately for bots or `jadibot`. WhatsApp's AI flags fresh numbers immediately.  
> 2. **Public Spam & User Reports:** Adding the bot to multiple public groups or allowing unverified users to spam will lead to user blocks/reports (`Report/Block`), triggering instant permanent bans.  
> 3. **Datacenter VPS / IP Blacklisting:** Even in *"Self Mode"* with an old number, running on flagged cloud VPS IP ranges (AWS, DigitalOcean, Heroku, Railway) or frequent socket reconnections can trigger automated integrity bans.  
> 4. **Read our full [Disclaimer & Anti-Ban Guide](#disclaimer--anti-ban-guide) before deploying!**

[![WhatsApp Group](https://img.shields.io/badge/Join_Community-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/DCEHKeGRbE5F349Kj0tNYn?s=cl&p=a&mlu=0)

---

## Table of Contents

- [Disclaimer & Anti-Ban Guide](#disclaimer--anti-ban-guide)
- [Requirements](#requirements)
- [Installation](#installation)
- [CLI Interface](#cli-interface)
- [Running the Bot](#running-the-bot)
- [Web Dashboard](#web-dashboard)
- [API Integration](#api-integration)
- [Configuration](#configuration)
- [Adding Features](#adding-features)
- [Core Architecture](#core-architecture)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Features](#features)
- [Contributors](#contributors)

---

## Requirements

| Dependency | Minimum Version | Notes |
|------------|-----------------|-------|
| **Node.js** | v20+ | Required |
| **Git** | any | Required |
| **FFmpeg** | any | Auto-installed by `install.sh` / `install.bat` |
| **PM2** | any | Auto-installed — used for process management |
| **yarn** or **npm** | any | yarn is recommended for Termux |

> [!TIP]
> You don't need to install FFmpeg or PM2 manually. The install scripts handle everything for you.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/nazedev/hitori
cd hitori
```

### 2. Automatic setup (recommended)

**Linux / Termux:**
```bash
bash install.sh
```

**Windows:**
```bat
install.bat
```

Both scripts will:
- Detect your package manager and install system dependencies
- Install PM2 globally for process management
- Run `npm install` to set up Node.js packages
- Register the global `hitori` command via `npm link`
- Launch the first-time setup wizard automatically

> [!IMPORTANT]
> After running the install script, the `hitori` command becomes available globally.
> You can run it from any directory — no need to `cd` into the project folder each time.

---

## Platform-Specific Guides

### Termux (Android)

```bash
pkg update && pkg upgrade
pkg install git nodejs ffmpeg yarn
git clone https://github.com/nazedev/hitori
cd hitori
yarn install
```

> [!TIP]
> Using **yarn** on Termux is recommended over npm for better compatibility and faster installs.

### Desktop / Ubuntu / VPS

1. Install [Git](https://git-scm.com/downloads)
2. Install [Node.js](https://nodejs.org/en/download) (v20 or higher)
3. Install [FFmpeg](https://ffmpeg.org/download.html)

> [!WARNING]
> On Windows, make sure FFmpeg is added to your **system PATH** environment variable.
> Without this, media processing commands will fail silently.

Then run:

```bash
npm install
npm start
```

---

## CLI Interface

Hitori includes a full interactive CLI tool for managing the bot without editing files manually.

### Usage

```
hitori                    Open the interactive main menu
hitori start              Start the bot directly
hitori settings           Open the settings manager
hitori status             Show system health dashboard
hitori report             View logs and diagnostics
hitori --setup            Run the first-time setup wizard
hitori --help, -h         Show help
```

### Interactive Main Menu

Running `hitori` without arguments opens the main menu with the following options:

| Option | Description |
|--------|-------------|
| **Start Bot** | Launch the WhatsApp bot process |
| **Settings** | Open the interactive settings manager |
| **Status / Health** | View system readiness and bot process info |
| **Report** | Access logs, error reports, and diagnostics |
| **Exit** | Close the CLI |

### Setup Wizard

On first run, the CLI automatically launches a guided setup wizard that walks you through:

- **Owner number(s)** — phone number(s) with admin privileges
- **Author name** — displayed in bot info and stickers
- **Bot name** — the display name for your bot
- **Naze API Key** — required for API-powered features
- **Bot WhatsApp number** — used for pairing code

> [!NOTE]
> You can re-run the setup wizard at any time with `hitori --setup`.
> All values can also be changed individually via `hitori settings`.

### Settings Manager

The settings menu provides an organized interface divided into categories:

| Category | What you can configure |
|----------|----------------------|
| **General** | Bot name, bot number, author, pack name, timezone, locale, prefix |
| **Owner** | Add or remove owner phone numbers |
| **API Keys** | View and update API keys (masked for security) |
| **Limits** | Free, premium, and VIP usage limits |

All changes are written directly to `settings.js` and take effect immediately (hot-reloaded).

### Status Dashboard

The `hitori status` command displays a health overview:

- **System dependencies** — Node.js, npm, FFmpeg, PM2, Git (with version checks)
- **Bot process** — PM2 status, uptime, memory usage, CPU, restart count
- **Database** — File size and last modified time
- **System resources** — Platform, CPU model, memory usage, hostname

### Report Viewer

The `hitori report` command provides access to diagnostics:

| Report | Description |
|--------|-------------|
| **Recent Logs** | Last 30 lines of bot output from PM2 |
| **Error Logs** | Filtered error lines from recent logs |
| **Database Check** | JSON integrity validation for `database.json` and `baileys_store.json` |
| **Dependency Audit** | Runs `npm audit` to check for known vulnerabilities |

---

## Running the Bot

There are several ways to start the bot:

```bash
# Via the CLI (recommended)
hitori start

# Via npm
npm start

# Via yarn
yarn start

# Development mode with auto-reload
npm run dev
```

Once started, scan the QR code or use the pairing code to connect your WhatsApp account.

> [!CAUTION]
> The bot will auto-restart on crashes when started through `start.js`.
> If the bot keeps crashing in a loop, check your logs with `hitori report` to diagnose the issue.

---

## Web Dashboard

Hitori connects to a relay-based web dashboard at `bot.naze.biz.id` via Socket.IO. Once connected, the bot automatically registers itself and provides a dashboard URL in the console output.

The dashboard allows you to:
- View real-time bot stats (uptime, memory, CPU)
- Browse and edit database entries (users, groups, premium, etc.)
- Modify settings remotely
- Send messages and commands through the panel

> [!NOTE]
> The dashboard is secured with an auto-generated admin key.
> The access URL (including the key) is printed in the console when the bot starts.

---

## API Integration

Many bot features rely on the **Naze API Service** for downloaders, AI tools, utilities, and media processing.

**API endpoint:** https://naze.biz.id

### Setting up your API key

You can set the API key in two ways:

**Option A — via CLI (recommended):**
```bash
hitori --setup
# or navigate to: hitori > Settings > API Keys
```

**Option B — manual edit in `settings.js`:**
```js
global.APIKeys = {
  "https://api.naze.biz.id": "YOUR_API_KEY_HERE",
  "https://api.neosantara.xyz/v1": "API_KEY_NEOSANTARA_AI",
};
```

> [!WARNING]
> Without a valid API key, commands that depend on external APIs will fail or return errors.
> Register at the official website to obtain your key before using the bot.

### Using the `fetchApi` Helper (GET & POST Methods)

Hitori Bot provides a built-in, globally available helper function—`global.fetchApi(endpoint, data, options)`—defined in `index.js`. This helper automatically handles endpoint resolution, API key injection, header formatting, and JSON parsing according to the official [Naze API Documentation](https://api.naze.biz.id/docs/json).

#### Function Signature & Parameters
```ts
await global.fetchApi(endpoint: string, data?: Object | FormData, options?: FetchOptions)
```
- **`endpoint`**: The API route starting with `/` (e.g., `/ai/chat` or `/tools/translate`).
- **`data`**: An object containing your request parameters or payload.
  - For **GET** requests: Transformed into URL query string parameters (`?key=value&apikey=...`).
  - For **POST** requests: Serialized as a JSON body (`application/json`) or sent as `FormData` (when `options.form = true`).
- **`options`**: Additional configuration options:
  - `method`: HTTP method (`"GET"` by default, or `"POST"`).
  - `stream`: Set to `true` to save audio/video/image responses directly to a temporary file path.
  - `buffer`: Set to `true` to return raw Buffer data (e.g., for media processing).
  - `api`: Target API provider index (`1` for default Naze API, `2` for Neosantara AI, etc.).

---

#### Complete Example: Implementing a Feature with GET and POST
Many endpoints on `https://api.naze.biz.id` support both **GET** (query parameters) and **POST** (JSON body / Form payload). Below is a practical implementation of an **AI Chat Feature** demonstrating how to call the same endpoint using either method inside `handler.js`:

##### 1. Using GET Method (Default Query Parameters)
When using **GET**, `fetchApi` automatically encodes the `data` object into the URL query string along with your API key:

```js
case 'aichat-get': {
	if (!text) return m.reply(`Example: ${prefix + command} Hello bot, who are you?`);
	try {
		// Method defaults to "GET" — parameters are appended as ?query=...&apikey=YOUR_KEY
		const response = await global.fetchApi("/ai/chat", {
			query: text
		});

		// The Naze API returns a standardized JSON structure: { status: true, result: { message: "..." } }
		await m.reply(response.result.message);
	} catch (err) {
		await m.reply(`[API Error] Failed to fetch response: ${err.message}`);
	}
}
break;
```

##### 2. Using POST Method (JSON Payload)
When sending longer prompts, structured data, or complex payloads, using **POST** with `application/json` is recommended:

```js
case 'aichat-post': {
	if (!text) return m.reply(`Example: ${prefix + command} Write a poem about coding.`);
	try {
		// Explicitly specify { method: "POST" } in the third argument
		const response = await global.fetchApi(
			"/ai/chat",
			{
				query: text,
				model: "default" // Optional additional POST body parameters
			},
			{
				method: "POST"
			}
		);

		await m.reply(response.result.message);
	} catch (err) {
		await m.reply(`[API Error] Failed to fetch response: ${err.message}`);
	}
}
break;
```

> [!TIP]
> **Handling Media Streams (TTS / Images):**  
> If an endpoint returns audio or image bytes (such as `/tools/tts` or `/create/qc`), pass `{ stream: true }` in `options`. The function will save the stream to a temporary file and return its local file path ready for sending via `sock.sendMessage()`.

---

## Configuration

All bot settings are managed in [`settings.js`](https://github.com/nazedev/hitori/blob/master/settings.js). Changes are **hot-reloaded** automatically — no restart needed.

> [!TIP]
> Use `hitori settings` for a guided, menu-driven way to edit configuration
> instead of modifying `settings.js` by hand.

### Key options

**Owner number**
```js
global.owner = ["628xxxxxxxxxx"];
```

**Bot identity**
```js
global.botname = "Hitori Bot";
global.author = "Nazedev";
global.packname = "Bot WhatsApp";
```

**Command prefixes**
```js
global.listprefix = ["+", "!", "."];
```

**Timezone and locale**
```js
global.timezone = "Asia/Jakarta";
global.locale = "en";
```

**User limits and balance**
```js
global.limit = { free: 20, premium: 999, vip: 900 };
global.money = { free: 10000, premium: 1000000, vip: 10000000 };
```

**Pairing code and bot number**
```js
global.pairing_code = true;
global.number_bot = "628xxxxxxxxxx";
```

---

## Database & Storage

Hitori Bot features a highly flexible, enterprise-grade database architecture. The system divides data into three distinct layers, each of which can be configured independently to use a different database engine, local filesystem path, or cloud endpoint.

### 1. The Three Data Layers
- **Session Auth (`global.database.path`)**: Stores cryptographic signal keys, pre-keys, and WhatsApp credentials required to maintain an authenticated connection. This layer writes almost in real-time via an asynchronous FIFO queue (`writeQueue`) backed by an in-memory LRU cache (`keyCache`).
- **Message Store (`global.database.options.store`)**: Stores Baileys' internal caching for messages, contacts, group metadata, and WhatsApp state.
- **Bot Database (`global.database.options.database`)**: Stores bot-specific user data, economy (RPG stats), limits, prefixes, and custom group settings.

### 2. Supported Database Engines & SSL Configuration
The bot dynamically detects the connection URL prefix and automatically routes traffic to the appropriate database driver. All SQL and MongoDB implementations use isolated **Connection Pools** with automatic reconnection and zero-downtime hot-reloading.

| Engine | Prefix | SSL Support | Notes |
|---|---|---|---|
| **Local JSON** | *(Default / Folder Name)* | N/A | Best for low-traffic bots or saving cloud bandwidth. Files are stored as local `.json` files. |
| **MongoDB** | `mongodb://` or `mongodb+srv://` | Auto-detected / `ssl: true` | Excellent for scalable NoSQL document storage (e.g., MongoDB Atlas). |
| **PostgreSQL** | `postgres://` or `postgresql://` | Auto-detected / `sslmode=require` | Advanced relational database (e.g., Aiven, Supabase, Neon, RDS). |
| **MySQL** | `mysql://` | Auto-detected / `ssl: true` | High-performance relational database (e.g., TiDB Cloud, PlanetScale, AWS RDS). |

#### SSL / TLS Security
When connecting to managed cloud providers (such as **Aiven**, **MongoDB Atlas**, **Supabase**, **TiDB Cloud**, or **Neon**), SSL is automatically detected and configured securely.
- For **PostgreSQL**, you can include `?sslmode=require` directly in your URL. The connection pool automatically handles SSL negotiation (`rejectUnauthorized: false`) without requiring manual CA certificate downloads.
- For **MongoDB** or **MySQL**, you can pass `ssl: true` in the layer options or include SSL query parameters in the connection string.

---

### 3. Comprehensive Configuration Examples

All database configurations are managed inside `settings.js` under the `global.database` object. Below are four production-ready patterns:

#### Example 1: Single Connector (All-in-One Cloud or All-Local)
If you want all three layers (Session Auth, Store, and Bot Database) to share a single database server or local folder, set `store` and `database` to `true`. They will automatically inherit the connection URL from `path`.

**All-in-One Cloud (PostgreSQL on Aiven):**
```js
global.database = {
	// Primary Connection URL (PostgreSQL with SSL enabled)
	path: "postgres://avnadmin:password@pg-xxx.aivencloud.com:16474/defaultdb?sslmode=require",
	options: {
		// Setting to 'true' automatically shares the primary PostgreSQL connection pool
		store: true,
		database: true,
		ssl: true
	}
};
```

**All-in-One Local Filesystem (JSON):**
```js
global.database = {
	// Saves all data inside a local folder named 'nazedev'
	path: "nazedev",
	options: {
		store: true,     // -> Saves to nazedev/bot_store.json
		database: true   // -> Saves to nazedev/bot_database.json
	}
};
```

---

#### Example 2: Hybrid Combo (Cloud Database + Local Store)
To save cloud storage and bandwidth, a common best practice is to store high-priority data (Session Auth and User Database) in the cloud, while keeping the high-frequency Message Store locally on your server's disk.

```js
global.database = {
	// Session Auth stored securely in PostgreSQL Cloud
	path: "postgres://avnadmin:password@pg-xxx.aivencloud.com:16474/defaultdb?sslmode=require",
	options: {
		// Store high-frequency message caching locally as a JSON file
		store: {
			path: "local_store.json"
		},
		// Bot Database inherits the PostgreSQL Cloud connection from 'path'
		database: true,
		ssl: true
	}
};
```

---

#### Example 3: Multi-Cloud / Dedicated Engines (Different Cloud Providers)
For enterprise workloads, you can assign different database engines to different layers. Each engine operates its own independent connection pool.

```js
global.database = {
	// Session Auth on PostgreSQL (Aiven) for fast, transactional upserts
	path: "postgres://avnadmin:password@pg-xxx.aivencloud.com:16474/defaultdb?sslmode=require",
	options: {
		// Message Store on MongoDB Atlas for large-scale document caching
		store: {
			path: "mongodb+srv://db_user:password@cluster0.mongodb.net/?appName=Cluster0",
			ssl: true
		},
		// Bot Database on a separate MySQL / TiDB Cloud instance
		database: {
			path: "mysql://root:password@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/hitori",
			ssl: true
		}
	}
};
```

---

#### Example 4: Custom Object Configuration per Layer
You can also specify explicit database names, SSL overrides, or custom folder paths for each individual layer:

```js
global.database = {
	path: "postgres://user:pass@cloud-host:5432/primary_db?sslmode=require",
	options: {
		store: {
			path: "mongodb+srv://user:pass@atlas-host/store_db",
			ssl: true
		},
		database: {
			path: "postgres://user:pass@cloud-host:5432/analytics_db?sslmode=require",
			ssl: true
		}
	}
};
```

---

## Adding Features

All bot commands live in [`handler.js`](https://github.com/nazedev/hitori/blob/master/handler.js), inside the `switch (command)` block.

To add a new command, insert a new `case`:

```js
case 'ping': {
  reply('pong')
}
break
```

> [!CAUTION]
> Do not remove or restructure the main `switch` block.
> Always add new commands as `case` entries within the existing structure.

---

## Core Architecture

| File | Role |
|------|------|
| `start.js` | Entry point — spawns `index.js` as a child process with IPC. Handles auto-restart on crash and graceful shutdown. |
| `index.js` | Core connector — initializes Baileys, handles WhatsApp events, loads `settings.js`, dispatches messages to `handler.js`. |
| `handler.js` | Command handler — contains all bot commands inside a `switch (command)` block. |
| `settings.js` | Configuration — all global settings, hot-reloaded on save. |
| `cli.js` | CLI entry point — interactive menu, routes to setup, settings, status, and report modules. |

> [!WARNING]
> Modifying `index.js` or `start.js` is not recommended unless you fully understand the bot's internal flow.
> Incorrect changes can break the auto-restart mechanism or WhatsApp connection.

---

## Project Structure

```
hitori/
├── index.js                  # Core connector and event handler
├── handler.js                # All bot commands and features
├── settings.js               # Bot configuration (hot-reloaded)
├── start.js                  # Entry point with auto-restart
├── cli.js                    # CLI entry point
├── install.sh                # Auto-installer (Linux/Termux)
├── install.bat               # Auto-installer (Windows)
├── lib/
│   ├── converter.js          # Media conversion utilities
│   ├── exif.js               # EXIF metadata handling
│   ├── function.js           # Shared helper functions
│   ├── game.js               # Game logic (chess, quiz, etc.)
│   ├── math.js               # Math quiz generator
│   ├── scraper.js            # Web scraping utilities
│   ├── template_menu.js      # Menu templates
│   ├── tictactoe.js          # Tic-tac-toe game
│   └── uploader.js           # File upload utilities
├── src/
│   ├── auth.js               # Baileys custom authentication adapter
│   ├── database.js           # Database adapter (JSON / MongoDB / SQL)
│   ├── clonebot.js           # Sub-bot (clonebot) handler
│   ├── message.js            # Message parser and serializer
│   ├── server.js             # Web dashboard (Socket.IO relay)
│   ├── cli/
│   │   ├── helpers.js        # CLI theme, banners, logging
│   │   ├── setup.js          # First-time setup wizard
│   │   ├── settings-menu.js  # Interactive settings manager
│   │   ├── settings-parser.js # Read/write settings.js programmatically
│   │   ├── status.js         # System health dashboard
│   │   └── report.js         # Log viewer and diagnostics
│   ├── media/                # Static assets (images, fonts)
│   └── nulis/                # Handwriting image generator assets
├── database/                 # Runtime data storage
├── Dockerfile
├── docker-compose.yml
├── Procfile
├── heroku.yml
├── app.json
├── railway.json
└── package.json
```

---

## Deployment

### Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/nazedev/hitori)

**Required buildpacks:**

| Buildpack | Value |
|-----------|-------|
| Node.js | `heroku/nodejs` |
| FFmpeg | [heroku-buildpack-ffmpeg-latest](https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest) |

### Railway / Docker

Deployment configs for Railway (`railway.json`) and Docker (`Dockerfile`, `docker-compose.yml`) are included in the repository. No additional setup is required — just deploy and set your environment variables.

---

## Features

| Category | Status | Description |
|----------|--------|-------------|
| Menu & Help | Available | Command list, help text, info display |
| Bot Management | Available | Restart, broadcast, join/leave groups |
| Group Tools | Available | Kick, promote, demote, mute, anti-spam |
| Search | Available | Google, YouTube, Wikipedia, and more |
| Downloader | Available | YouTube, TikTok, Instagram, Facebook |
| Utilities | Available | Stickers, QR codes, translate, TTS |
| AI Tools | Available | ChatGPT, image generation, and others |
| Games | Available | Tic-tac-toe, chess, math quiz, trivia |
| Fun | Available | Memes, quotes, random media |
| Owner Commands | Available | Eval, exec, ban, settings control |

---

## Contributors

| [![NazeDev](https://github.com/nazedev.png?size=80)](https://github.com/nazedev) | [![Zaynn](https://github.com/ZaynRcK.png?size=80)](https://github.com/ZaynRcK) | [![Dani](https://github.com/nazedev.png?size=80)](https://github.com/nazedev) | [![WhiskeySockets](https://github.com/WhiskeySockets.png?size=80)](https://github.com/WhiskeySockets) |
|:---:|:---:|:---:|:---:|
| **NazeDev** | **Zaynn** | **Dani** | **WhiskeySockets** |
| Creator | API Service Provider | Code Contributor | Baileys Library |

---

## Support

If you find this project useful, consider supporting the development:

- [Saweria](https://saweria.co/naze)

---

## Disclaimer & Anti-Ban Guide

> [!CAUTION]
> **PLEASE READ CAREFULLY BEFORE DEPLOYING OR USING THIS SCRIPT**

### 1. Unofficial API Notice & Legal Disclaimer
**Hitori Bot** is an independent open-source project built on top of `@whiskeysockets/baileys`, which implements an **unofficial WhatsApp Web Multi-Device protocol**.
- **Not Affiliated with Meta / WhatsApp:** This project is **not** endorsed, certified, or authorized by WhatsApp Inc., Meta Platforms, Inc., or any of their affiliates.
- **Terms of Service Violation:** Using third-party clients, automation scripts, or bots is a violation of WhatsApp's Terms of Service.
- **Zero Liability Clause:** By downloading, installing, or running **Hitori Bot**, **you explicitly acknowledge and accept all risks**. The creator (`Nazedev`), contributors, and maintainers **SHALL NOT BE HELD LIABLE OR RESPONSIBLE** for:
  - Any **temporarily or permanently banned WhatsApp numbers/accounts**.
  - Any loss of personal or business messages, contacts, or data.
  - Any damages, complaints, or legal actions arising from automated messaging.

---

### 2. Why WhatsApp Accounts Get Banned (Technical Explanation)
Many users blame the script when their account gets banned, but bans are almost always caused by WhatsApp/Meta's automated **Integrity & AI Anti-Spam Systems** detecting anomalous usage patterns:

1. **Fresh / Newly Registered SIM Cards (`#1 Ban Cause`)**
   - **Why it happens:** Meta's anti-spam algorithms flag new numbers with zero or low normal chat history. If a newly registered SIM card immediately connects via an unofficial Web API or spawns a `jadibot` session, it is instantly classified as a spam bot and banned permanently.
   - **Solution:** Never use fresh numbers. Always warm up an account for at least 2–4 weeks with normal human messaging on a physical phone before connecting it to a bot.

2. **User Reports & Public Group Spam**
   - **Why it happens:** If your bot is added to multiple public groups or allows strangers in private chats to trigger commands, even **2–3 users clicking "Report & Block"** will trigger an automatic instant ban by Meta's servers.
   - **Solution:** Restrict bot usage to private/trusted groups, enable anti-spam command cooldowns, and never broadcast unsolicited messages.

3. **Datacenter VPS IP Flagging & ASN Reputation (*"Why Self-Mode / Old Numbers Get Banned"*)**
   - **Why it happens:** Some users report that even an old number used in *"Self Mode"* by only 1 person in a private group gets banned. **Why?** Because Meta's security engine monitors the **IP Address ASN (Autonomous System Number)**. Traffic originating from commercial Cloud/VPS datacenter ranges (AWS, DigitalOcean, Heroku, Railway, Linode) is treated with high suspicion compared to residential Wi-Fi or mobile carrier IPs. Furthermore, frequent WebSocket reconnects or handshake resets on a headless session increase the risk score until an automated ban occurs.
   - **Solution:** Avoid frequent restarting/reconnecting, use stable residential proxies if hosting on cloud VPS, and keep messaging volume realistic.

---

### 3. Maintainer Policy for GitHub Issues
- **No Ban Support:** Any GitHub Issues, Pull Requests, or community tickets complaining about *"banned numbers"*, *"number blocked"*, or asking *"why did my number get banned?"* will be **immediately closed without action**.
- **User Responsibility:** Account safety is **100% the responsibility of the user operating the bot**.

---

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/).
