import { ElectronAPI } from '@electron-toolkit/preload'

export interface BotLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

export interface BotGraph {
  token: string
  nodes: unknown[]
  edges: unknown[]
  name?: string
  version?: string
}

export interface BotApi {
  startBot: (graph: BotGraph) => Promise<{ success: boolean; message?: string }>
  stopBot: () => Promise<{ success: boolean; message?: string }>
  getBotStatus: () => Promise<{ running: boolean }>
  saveProject: (data: BotGraph) => Promise<{ success: boolean; filePath?: string; error?: string }>
  loadProject: () => Promise<{
    success: boolean
    data?: BotGraph
    filePath?: string
    error?: string
  }>
  onLog: (callback: (log: BotLog) => void) => () => void
  onStatusChange: (callback: (running: boolean) => void) => () => void
}

declare global {
  interface Window {
    botApi: BotApi
    electron: ElectronAPI
    api: unknown
  }
}
