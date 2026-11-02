import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BotApi, BotGraph, BotLog } from './index.d'

const botApi: BotApi = {
  getTokenSettings: () => ipcRenderer.invoke('bot:get-token-settings'),
  setTokenSettings: (token, remember) =>
    ipcRenderer.invoke('bot:set-token-settings', token, remember),
  cancelYapinLogin: () => ipcRenderer.invoke('auth:cancel-yapin'),
  loginWithYapin: () => ipcRenderer.invoke('auth:login-yapin'),
  exportStandalone: (graph, liveDir) => ipcRenderer.invoke('bot:export-standalone', graph, liveDir),
  getVariables: () => ipcRenderer.invoke('bot:get-variables'),
  clearVariables: () => ipcRenderer.invoke('bot:clear-variables'),
  setRunnerOptions: (options) => ipcRenderer.invoke('bot:set-options', options),
  chooseFolder: (current) => ipcRenderer.invoke('app:choose-folder', current),
  startBot: (graph: BotGraph): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('bot:start', graph)
  },
  stopBot: (): Promise<{ success: boolean; message?: string }> => {
    return ipcRenderer.invoke('bot:stop')
  },
  getBotStatus: (): Promise<{ running: boolean }> => {
    return ipcRenderer.invoke('bot:get-status')
  },
  saveProject: (
    data: BotGraph,
    defaultDir?: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    return ipcRenderer.invoke('bot:save-project', data, defaultDir)
  },
  loadProject: (
    defaultDir?: string
  ): Promise<{
    success: boolean
    data?: BotGraph
    filePath?: string
    error?: string
  }> => {
    return ipcRenderer.invoke('bot:load-project', defaultDir)
  },
  onLog: (callback: (log: BotLog) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, log: BotLog): void => {
      callback(log)
    }
    ipcRenderer.on('bot:log', handler)
    return (): void => {
      ipcRenderer.removeListener('bot:log', handler)
    }
  },
  onStatusChange: (callback: (running: boolean) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, running: boolean): void => {
      callback(running)
    }
    ipcRenderer.on('bot:status-change', handler)
    return (): void => {
      ipcRenderer.removeListener('bot:status-change', handler)
    }
  }
}

// Custom APIs for renderer
const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('botApi', botApi)
  } catch (error) {
    console.error('Error exposing contextBridge APIs:', error)
  }
} else {
  // Fallback for non-isolated contexts
  window.electron = electronAPI
  window.api = api
  window.botApi = botApi
}
