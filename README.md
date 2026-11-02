# Yapper Maker

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://yapin.gg)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Yapin Community](https://img.shields.io/badge/community-Developer%20Yapin-indigo)](https://yapin.gg/invite/cQNDdPFZcW)

**Yapper Maker** is a desktop visual node-based bot studio for creating, testing, and running chatbots on the Yapin platform (reference: `YAPPER_DOCS.md`). Built with Electron, React 19, TypeScript, and `@xyflow/react`.

---

## 🌟 Key Features

- **Multi-Tab Studio Suite:**
  - 🏠 **Home Dashboard:** Quick actions, recent projects, and community links.
  - ⚡ **Flow Editor:** Full-featured `@xyflow/react` node canvas with grid, minimap, controls, and compact cards.
  - 📁 **Projects Manager:** Organize, activate, duplicate, and export bot projects with custom icons and settings.
  - 🛒 **Creator Marketplace:** Browse, download, rate, and publish community flows, templates, and studio themes.
  - 🎨 **Theme Engine:** Built-in dark themes (Dark Studio, Neon Purple, Midnight OLED, Ice Phoenix, GTA VI).

- **Visual Node Ecosystem:**
  - **Triggers:** `On Command` (with slash command routing & filters), `On Message` (regex, keyword & bot author filtering).
  - **Conditions:** `Text Condition` (dual output True/False handles with 8 operators), `Check User/Role` (admin & moderator checks), `Cooldown Timer` (user/channel rate limits).
  - **Variables:** `Set Variable`, `Get Variable` (global, session, and user scoped memory), with inline `{var:...}` pill insertion.
  - **Actions:** `Send Reply`, `Send Rich Message / Card`, `Random Reply` (picker), `Wait / Delay`, `Moderate Message` (delete, timeout, warn), `Log to Console`.

- **Canvas Multi-Selection & Sharing:**
  - **Ctrl + Left Click & Drag** lasso selection.
  - **Floating Action Bar:** "+ Create group" and multi-option "Share" dropdown.
  - **Share to Friend:** Deliver flow snippets straight to a creator's developer inbox with variables CSV.
  - **Share to Support:** One-click diagnostic bundle submission.
  - **Share to Marketplace:** Instant publishing with custom community tags.

- **Developer Inbox & Notifications:**
  - Marketplace ratings, installation tracking, shared flow imports, and platform update changelogs.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22.18 or higher (v24 recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/PixallyDev/yapin-bot-maker.git

# Navigate into project directory
cd yapin-bot-maker

# Install dependencies
npm install
```

### Running in Development

```bash
npm run dev
```

### Running Tests & Linting

```bash
# Typecheck TypeScript
npm run typecheck

# Run ESLint
npm run lint

# Run Node test suite
npm run test
```

### Building for Production

```bash
# Production bundle
npm run build

# Windows Installer
npm run build:win
```

---

## 🛡️ Architecture & Security

- **Strict Sandbox Isolation:** `src/renderer` communicates exclusively with the Electron main process via secure `contextBridge` (`window.botApi`).
- **Encrypted Token Vault:** Bot tokens are encrypted locally with machine credentials and never committed to `.yapbot.json` project files.
- **Cycle & Limit Protection:** Bot graph topologies are pre-validated before network polling to prevent infinite execution loops.

---

## 🤝 Community & Support

- **Official Server:** [https://yapin.gg/invite/cQNDdPFZcW](https://yapin.gg/invite/cQNDdPFZcW)
- **API Documentation:** [https://bots.yapper.website/api/bot/v1](https://bots.yapper.website/api/bot/v1)

---

## 📄 License

MIT &copy; 2026 Yapper Maker Team

## Yapin browser sign in

Continue with Yapin opens the system browser and uses an IPv4 loopback callback:
http://127.0.0.1:4189/yapin/callback
Register this exact redirect URI on the Yapin OAuth application. The default
client ID is 2012d842-7d7e-466c-aef3-d78c89d1016e. Development configuration is
read from the project .env; packaged apps read .env from Electron's userData
directory. Process environment variables take precedence. Neither file is bundled.

Set YAPIN_CLIENT_ID to override the app ID. YAPIN_CLIENT_SECRET is optional for
public desktop clients using PKCE; the replace_me placeholder is ignored. Never
ship a confidential client secret in the installer. The flow uses identify only,
exchanges the code at /api/oauth/token, then fetches /api/oauth/me. Alternate
/oauth/token and /oauth/me paths are attempted only for HTTP 404 responses.
Access tokens and the verifier remain in main-process memory during sign in;
only the returned public profile is saved locally. No email or server roles are
provided by the identify scope. The legacy email form cannot authenticate because
no email/password endpoint is documented; use browser sign in instead.

## Catalog runtime

The desktop runner and standalone export execute enabled flows using the same
backend. Switch cases select named output handles; loops run `each` for every
item and then `done`. Loop bodies can use `{item}` and `{index}`. Try/Catch runs
`try`, routes failures to `catch`, then continues through `next`. Named functions
receive local parameters and return their local `return` or `result` variable.
All branches, functions and loop bodies share the 50-node execution budget for
an event. Variables can hold JSON objects, lists, numbers and booleans; math uses
an arithmetic parser, and encryption uses authenticated AES-256-GCM.

Saved projects store runtime files relative to their project folder. Unsaved
projects use Electron userData; standalone bots use their export folder. Database
nodes use JSON KV/table files (not SQLite), with serialized atomic writes and CSV
import/export. File paths reject parent traversal, absolute paths and existing
symlinks/junctions. Files, HTTP responses and expanded archives are limited to
16 MB. Back up runtime data and avoid sharing private databases or ticket files.

HTTP nodes support templated JSON headers/bodies, success/error branches and
result extraction such as `$.results[0].id`. Redirects are rejected: use the final
endpoint URL. AI nodes accept a key variable or environment settings.
Environment fallbacks are `OPENAI_API_KEY`,
`OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL` and `AI_SYSTEM_PROMPT`. Custom
OpenAI-compatible endpoints can omit authentication. Configure the model and
provider endpoint appropriate to your account. Weather uses the free
[Open-Meteo forecast](https://open-meteo.com/en/docs) and
[geocoding](https://open-meteo.com/en/docs/geocoding-api) services; definitions use
the [Free Dictionary API](https://dictionaryapi.dev/).

Social triggers establish a baseline on the first successful poll and emit only
new entries afterward. YouTube accepts a channel ID or feed URL; RSS accepts an
RSS/Atom URL. GitHub supports optional `GITHUB_TOKEN`; Reddit supports optional
`REDDIT_ACCESS_TOKEN` and may require approved API access. Twitch requires
`TWITCH_CLIENT_ID` and `TWITCH_ACCESS_TOKEN`. Webhook listeners bind to loopback
and check their configured secret. Translation and URL shortening require a
service URL. QR decoding accepts PNG images.

Supported Yapin actions use the documented Bot API. Unavailable operations
(typing, channel topics, threads, invites and bulk reaction clearing) log a
`[Yapin API]` warning and follow their error output rather than calling invented
endpoints. Undocumented gateway event types produce a startup warning. Ticket
panels use interaction callbacks and private role-scoped channels; the bot needs
Manage Roles/Manage Channels permissions. Configure staff role IDs on the panel.

Standalone exports require Node.js 22+ and runtime dependencies. The Windows
launcher installs dependencies on first use; on other hosts run
`npm install --omit=dev` before starting. Put credentials in the private `.env`,
using `.env.example` as a guide.
