# ybm

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Running a bot

Paste a bot-account token (`yb_...`), connect an On Message or On Command trigger
through conditions and actions, then click Start Bot. The main process authenticates
at `/me`, replaces the registered slash commands with the graph's On Command nodes,
and initializes `/events?after=0&wait=0` before listening for new events. Messages
sent before startup are skipped. Stop Bot cancels polling, pending requests and
retry waits. Changes to the canvas take effect the next time the bot starts.

Text conditions follow their true or false connection. Reply and console templates
support `{author}`, `{content}` and `{channel}`. Replies quote the triggering
message. Cyclic graphs and duplicate command names are rejected before startup.
Failed actions stop their branch; other branches may continue. Writes with an
ambiguous network failure are not retried, to avoid sending duplicate replies.

Save and Load use native dialogs for versioned `.yapbot.json` files containing the
node settings, positions and connections. Tokens are excluded from project files; legacy
project tokens are ignored on load. Loading a file replaces the canvas;
it does not replace an already running bot's graph.

Run `npm run typecheck` and `npm run test:main` to verify the main-process behavior.
The tests use mocked API responses and Electron dialogs with real temporary project
files; an authenticated end-to-end session requires your own Yapin bot token.

## Reliability and credentials

Execution is capped at 50 connected node hops per incoming event, shared across
matching triggers and branches. Remaining branches are skipped with a warning.
Cyclic graphs are rejected before startup. After a connection drop, long polling
resumes from the last event cursor with exponential delays of roughly 1, 2, 4, 8,
16 and 30 seconds, with jitter. A successful poll resets the backoff. Longer API
Retry-After values take precedence. Stop cancels requests and reconnect waits.
Invalid authentication or polling permissions stop the bot instead of retrying forever.

Tokens stay in memory by default. Remember token on this PC explicitly enables
Electron safeStorage encryption under the app's user data directory (Windows uses
OS-backed protection). No plaintext fallback is allowed when encryption is
unavailable. Clearing the checkbox removes the saved credential. Old localStorage
credentials are removed on launch and kept only in the current session. Existing
project files containing tokens must be resaved to remove them from disk.

## Standalone export

Click Export Standalone Bot and choose a folder. Each export creates a separate
Yapin-Bot-* subfolder containing bot.js, package.json, .env.example, README.txt,
Start-Bot.bat and a .gitignore for private .env files. It never overwrites existing
exports or includes the studio token. Node settings containing a bot token must be
cleared before saving or exporting.

Install Node.js 22 or newer, copy .env.example to .env, enter YAPPER_BOT_TOKEN, then
double-click Start-Bot.bat or run node bot.js. No npm dependencies are required.
The generated JavaScript includes the same runner as the studio, compiled during
the app build, so it supports all current node types and reconnect behavior.
Keep the host online for continuous operation. A process supervisor is needed for
unattended restart after a machine reboot or process exit. Run only one instance
per token. Variables and cooldowns are in memory and reset on process restart.
