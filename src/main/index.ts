import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { BotRunner, type BotLogPayload } from './botRunner'
import { saveProject, loadProject } from './projectFiles'
import { TokenStore } from './tokenStore'
import { exportStandalone } from './standaloneExport'

let mainWindow: BrowserWindow | null = null
let botRunner: BotRunner | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    title: 'Yapin Bot Maker',
    backgroundColor: '#0b0f19',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.yapin.botmaker')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const emitLog = (log: BotLogPayload): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:log', log)
    }
  }

  const emitStatus = (running: boolean): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:status-change', running)
    }
  }

  botRunner = new BotRunner(emitLog, emitStatus)

  const tokens = new TokenStore(app.getPath('userData'))
  ipcMain.handle('bot:get-token-settings', () => tokens.get())
  ipcMain.handle('bot:set-token-settings', (_event, token: unknown, remember: unknown) =>
    tokens.set(token, remember)
  )
  ipcMain.handle('bot:export-standalone', async (_event, graph: unknown) => {
    const result = await exportStandalone(mainWindow, graph)
    if (result.success)
      emitLog({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Standalone bot exported to ${result.folderPath}`
      })
    return result
  })

  // IPC Handlers
  ipcMain.handle('bot:start', async (_event, graph: unknown) => {
    if (!botRunner) {
      return { success: false, message: 'Bot runner not initialized' }
    }
    return await botRunner.start(graph)
  })

  ipcMain.handle('bot:stop', async () => {
    if (!botRunner) {
      return { success: false, message: 'Bot runner not initialized' }
    }
    return await botRunner.stop()
  })

  ipcMain.handle('bot:get-status', () => {
    return botRunner ? botRunner.getStatus() : { running: false }
  })

  ipcMain.handle('bot:save-project', async (_event, graph: unknown) => {
    const result = await saveProject(mainWindow, graph)
    if (result.success)
      emitLog({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Project saved to ${result.filePath}`
      })
    return result
  })

  ipcMain.handle('bot:load-project', async () => {
    const result = await loadProject(mainWindow)
    if (result.success)
      emitLog({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Loaded project from ${result.filePath}`
      })
    return result
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (botRunner) {
    botRunner.stop().catch(() => {})
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void botRunner?.stop()
})
