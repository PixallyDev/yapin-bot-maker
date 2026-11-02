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
token, node settings, positions and connections. Loading a file replaces the canvas;
it does not replace an already running bot's graph.

Run `npm run typecheck` and `npm run test:main` to verify the main-process behavior.
The tests use mocked API responses and Electron dialogs with real temporary project
files; an authenticated end-to-end session requires your own Yapin bot token.
