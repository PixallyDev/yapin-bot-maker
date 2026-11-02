import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import runtime from 'virtual:bot-runtime'
import { publicGraph } from './projectFiles'
import { compileGraph } from './botRunner'

export function standaloneFiles(input: unknown): Record<string, string> {
  const graph = publicGraph(input)
  compileGraph({ ...graph, token: '' })
  const script = `// Generated from Yapin Bot Maker. No Electron or npm dependencies required.
'use strict';
const { BotRunner } = (() => {
  const exports = {};
${runtime}
  return exports;
})();
const graph = ${JSON.stringify(graph, null, 2)};
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const isCLI = require.main === module;
let stopping = false;
let started = false;
async function startStandalone() {
  const envFile = join(__dirname, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const token = (process.env.YAPPER_BOT_TOKEN || '').trim();
  if (!token || token === 'yb_replace_with_your_bot_token') {
    throw new Error('Set YAPPER_BOT_TOKEN in .env or your environment. See README.txt.');
  }
  const runner = new BotRunner(
    (log) => console.log('[' + log.timestamp + '] [' + log.level + '] ' + log.message),
    (running) => { if (isCLI && started && !running && !stopping) process.exitCode = 1; }
  );
  if (isCLI) {
    const stop = () => { stopping = true; void runner.stop(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  }
  const result = await runner.start({ ...graph, token });
  if (stopping) return runner;
  if (!result.success || !runner.getStatus().running) throw new Error(result.message || 'Bot failed to start.');
  started = true;
  return runner;
}
module.exports = { startStandalone };
if (isCLI) {
  startStandalone().catch(() => {
    console.error('Bot could not start. Check your token, Node.js version and connection.');
    process.exitCode = 1;
  });
}
`
  return {
    'bot.js': script,
    'package.json':
      JSON.stringify(
        {
          name: 'yapin-standalone-bot',
          version: '1.0.0',
          private: true,
          description: 'Exported Yapin visual bot',
          type: 'commonjs',
          main: 'bot.js',
          engines: { node: '>=22' },
          scripts: { start: 'node bot.js' }
        },
        null,
        2
      ) + '\n',
    '.env.example': 'YAPPER_BOT_TOKEN=yb_replace_with_your_bot_token\n',
    '.gitignore': '.env\n*.log\n',
    'README.txt': `Yapin Standalone Bot

1. Install Node.js 22 or newer on the computer that will run the bot.
2. Copy .env.example to .env and replace the example with your bot account token.
   You may instead set YAPPER_BOT_TOKEN in the process environment.
3. Double-click Start-Bot.bat on Windows, or run: node bot.js
   No npm install is required. Press Ctrl+C to stop.

Keep this computer or server running and connected to the internet for 24/7 use.
The app can be closed. This launcher does not install an operating-system service.
For unattended restarts, run node bot.js under your hosting provider's supervisor.
Use one running instance per bot token; stop the studio runner before starting it.

The exported graph uses the same runner as the studio, including variables,
cooldowns, conditions, actions, the 50-hop-per-event limit and automatic long-poll
reconnection (exponential backoff up to 30 seconds). Authentication failures stop
it; correct the token/permissions and restart. Startup listens for new events.
Variables and cooldowns are kept in memory and reset after restarting the process.
Commands are replaced with the commands in this exported graph at startup.

No bot token is included in these files. Keep .env private; do not share it.
Re-export from the studio to apply canvas changes to this bot.
`,
    'Start-Bot.bat': [
      '@echo off',
      'setlocal',
      'cd /d "%~dp0"',
      'where node >nul 2>nul',
      'if errorlevel 1 (',
      '  echo Install Node.js 22 or newer, then run this file again.',
      '  pause',
      '  exit /b 1',
      ')',
      'node -e "if (Number(process.versions.node.split(\'.\')[0]) < 22) process.exit(1)"',
      'if errorlevel 1 (',
      '  echo Node.js 22 or newer is required.',
      '  pause',
      '  exit /b 1',
      ')',
      'node bot.js',
      'if errorlevel 1 (',
      '  echo Bot stopped with an error. See the message above and README.txt.',
      '  pause',
      ')',
      ''
    ].join('\r\n')
  }
}

export async function exportStandalone(
  window: BrowserWindow | null,
  input: unknown
): Promise<{
  success: boolean
  folderPath?: string
  error?: string
}> {
  try {
    const files = standaloneFiles(input)
    const options: OpenDialogOptions = {
      title: 'Choose folder for standalone bot export',
      properties: ['openDirectory', 'createDirectory']
    }
    const selected = await (window
      ? dialog.showOpenDialog(window, options)
      : dialog.showOpenDialog(options))
    if (selected.canceled || !selected.filePaths.length) return { success: false }
    // A unique child folder protects previous exports and private .env files from overwrite.
    const folderPath = await mkdtemp(join(selected.filePaths[0], 'Yapin-Bot-'))
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(folderPath, name), content, { encoding: 'utf8', flag: 'wx' })
    }
    return { success: true, folderPath }
  } catch {
    return {
      success: false,
      error:
        'Could not export bot. Check graph settings, remove any tokens from nodes, and choose a writable folder.'
    }
  }
}
