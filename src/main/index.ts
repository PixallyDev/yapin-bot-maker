import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { BotRunner, BotGraphPayload, BotLogPayload } from './botRunner'

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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
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

  // IPC Handlers
  ipcMain.handle('bot:start', async (_event, graph: BotGraphPayload) => {
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

  ipcMain.handle('bot:save-project', async (_event, graph: BotGraphPayload) => {
    try {
      const windowToAttach = mainWindow ?? undefined
      const saveResult = await (windowToAttach
        ? dialog.showSaveDialog(windowToAttach, {
            title: 'Save Yapin Bot Project',
            defaultPath: 'my-bot.yapbot.json',
            filters: [
              { name: 'Yapin Bot Project (*.yapbot.json)', extensions: ['yapbot.json'] },
              { name: 'JSON Document (*.json)', extensions: ['json'] },
              { name: 'All Files (*.*)', extensions: ['*'] }
            ]
          })
        : dialog.showSaveDialog({
            title: 'Save Yapin Bot Project',
            defaultPath: 'my-bot.yapbot.json',
            filters: [
              { name: 'Yapin Bot Project (*.yapbot.json)', extensions: ['yapbot.json'] },
              { name: 'JSON Document (*.json)', extensions: ['json'] },
              { name: 'All Files (*.*)', extensions: ['*'] }
            ]
          }))

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, message: 'Save cancelled' }
      }

      const projectData = {
        version: '1.0.0',
        name: graph.name || 'Yapin Bot',
        savedAt: new Date().toISOString(),
        token: graph.token || '',
        graph: {
          nodes: graph.nodes || [],
          edges: graph.edges || []
        }
      }

      await fs.writeFile(saveResult.filePath, JSON.stringify(projectData, null, 2), 'utf-8')
      emitLog({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Project successfully saved to ${saveResult.filePath}`
      })

      return { success: true, filePath: saveResult.filePath }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return { success: false, error: errMsg }
    }
  })

  ipcMain.handle('bot:load-project', async () => {
    try {
      const windowToAttach = mainWindow ?? undefined
      const openResult = await (windowToAttach
        ? dialog.showOpenDialog(windowToAttach, {
            title: 'Open Yapin Bot Project',
            filters: [
              {
                name: 'Yapin Bot Project (*.yapbot.json, *.json)',
                extensions: ['yapbot.json', 'json']
              },
              { name: 'All Files (*.*)', extensions: ['*'] }
            ],
            properties: ['openFile']
          })
        : dialog.showOpenDialog({
            title: 'Open Yapin Bot Project',
            filters: [
              {
                name: 'Yapin Bot Project (*.yapbot.json, *.json)',
                extensions: ['yapbot.json', 'json']
              },
              { name: 'All Files (*.*)', extensions: ['*'] }
            ],
            properties: ['openFile']
          }))

      if (openResult.canceled || !openResult.filePaths || openResult.filePaths.length === 0) {
        return { success: false, message: 'Open cancelled' }
      }

      const filePath = openResult.filePaths[0]
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const parsed = JSON.parse(fileContent)

      let graph: BotGraphPayload
      if (parsed.graph && (parsed.graph.nodes || parsed.graph.edges)) {
        graph = {
          token: parsed.token || '',
          name: parsed.name || 'Loaded Bot',
          nodes: parsed.graph.nodes || [],
          edges: parsed.graph.edges || []
        }
      } else {
        graph = {
          token: parsed.token || '',
          name: parsed.name || 'Loaded Bot',
          nodes: parsed.nodes || [],
          edges: parsed.edges || []
        }
      }

      emitLog({
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Loaded project from ${filePath} (${graph.nodes.length} nodes, ${graph.edges.length} connections)`
      })

      return { success: true, data: graph, filePath }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return { success: false, error: errMsg }
    }
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
