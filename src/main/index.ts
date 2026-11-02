import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, isAbsolute } from 'path'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isRecord } from '../shared/graph'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { BotRunner, type BotLogPayload } from './botRunner'
import { saveProject, loadProject } from './projectFiles'
import { TokenStore } from './tokenStore'
import { exportStandalone } from './standaloneExport'
import { setupAuthHandlers, closeActiveAuthServer } from './authHandler'
import { showStartupUpdate } from './updateChecker'

let mainWindow: BrowserWindow | null = null
let botRunner: BotRunner | null = null
let updateCheckStarted = false

// Preserve existing projects and preferences when upgrading from the previous app name.
const existingUserData = [
  app.getPath('userData'),
  join(app.getPath('appData'), 'Yapin Bot Maker'),
  join(app.getPath('appData'), 'ybm')
].find((path) => existsSync(path))
app.setName('Yapper Maker')
if (existingUserData) app.setPath('userData', existingUserData)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    title: 'Yapper Maker',
    backgroundColor: '#0b0f19',
    autoHideMenuBar: true,
    icon,
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

  mainWindow.webContents.once('did-finish-load', () => {
    if (app.isPackaged && !updateCheckStarted && mainWindow) {
      updateCheckStarted = true
      void showStartupUpdate(mainWindow)
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

  botRunner = new BotRunner(emitLog, emitStatus, {
    projectDirectory: join(app.getPath('userData'), 'projects', 'default')
  })
  setupAuthHandlers(() => mainWindow)

  const tokens = new TokenStore(app.getPath('userData'))
  ipcMain.handle('bot:get-token-settings', () => tokens.get())
  ipcMain.handle('bot:set-token-settings', (_event, token: unknown, remember: unknown) =>
    tokens.set(token, remember)
  )
  ipcMain.handle('bot:export-standalone', async (_event, graph: unknown, liveDir?: unknown) => {
    const result = await exportStandalone(mainWindow, graph, liveDir)
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
    const projectFile =
      isRecord(graph) && typeof graph.projectFilePath === 'string' ? graph.projectFilePath : ''
    const projectId = isRecord(graph)
      ? String(graph.projectId ?? graph.name ?? 'default')
      : 'default'
    const projectDirectory =
      projectFile &&
      isAbsolute(projectFile) &&
      projectFile.endsWith('.yapbot.json') &&
      existsSync(projectFile)
        ? dirname(projectFile)
        : join(
            app.getPath('userData'),
            'projects',
            createHash('sha256').update(projectId).digest('hex').slice(0, 24)
          )
    botRunner.configureRuntime({ projectDirectory })
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

  ipcMain.handle('bot:save-project', async (_event, graph: unknown, defaultDir?: unknown) => {
    const result = await saveProject(mainWindow, graph, defaultDir)
    if (result.success)
      emitLog({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Project saved to ${result.filePath}`
      })
    return result
  })

  ipcMain.handle('bot:get-variables', () => (botRunner ? botRunner.getVariables() : {}))

  ipcMain.handle('bot:clear-variables', () => {
    botRunner?.clearVariables()
    return { success: true }
  })

  ipcMain.handle('bot:set-options', (_event, options: unknown) => {
    botRunner?.setOptions(options)
    return { success: true }
  })

  ipcMain.handle('app:choose-folder', async (_event, current?: unknown) => {
    const options: Electron.OpenDialogOptions = {
      title: 'Choose default project folder',
      defaultPath: typeof current === 'string' && current ? current : undefined,
      properties: ['openDirectory', 'createDirectory']
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths.length) return { success: false }
    return { success: true, folderPath: result.filePaths[0] }
  })

  ipcMain.handle('bot:load-project', async (_event, defaultDir?: unknown) => {
    const result = await loadProject(mainWindow, defaultDir)
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
  void closeActiveAuthServer()
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
