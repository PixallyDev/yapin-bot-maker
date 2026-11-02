import { ElectronAPI } from '@electron-toolkit/preload'

export interface BotLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

export interface BotGraph {
  projectFilePath?: string
  projectId?: string
  flows?: {
    id: string
    name: string
    color: string
    folderId?: string
    isOpen: boolean
    isDisabled: boolean
    nodes: unknown[]
    edges: unknown[]
  }[]
  folders?: import('../shared/graph').BotGraphPayload['folders']
  token: string
  nodes: unknown[]
  edges: unknown[]
  name?: string
  version?: string
  prefix?: string
  commandPrefix?: string
}

export interface TokenSettings {
  success: boolean
  available: boolean
  remember: boolean
  token?: string
  error?: string
}

export interface YapinUserProfile {
  displayName: string
  verified: true
  id: string
  username: string
  handle: string
  email: string
  avatar?: string
  isVerified: boolean
}

export interface YapinAuthResult {
  success: boolean
  error?: string
  user?: YapinUserProfile
}

export interface BotApi {
  getTokenSettings: () => Promise<TokenSettings>
  setTokenSettings: (token: string, remember: boolean) => Promise<TokenSettings>
  loginWithYapin: () => Promise<YapinAuthResult>
  cancelYapinLogin: () => Promise<void>
  exportStandalone: (
    data: BotGraph,
    liveDir?: string
  ) => Promise<{ success: boolean; folderPath?: string; error?: string }>
  getVariables: () => Promise<Record<string, string | number>>
  clearVariables: () => Promise<{ success: boolean }>
  setRunnerOptions: (options: { emptyVariableText?: string }) => Promise<{ success: boolean }>
  chooseFolder: (current?: string) => Promise<{ success: boolean; folderPath?: string }>

  startBot: (graph: BotGraph) => Promise<{ success: boolean; message?: string }>
  stopBot: () => Promise<{ success: boolean; message?: string }>
  getBotStatus: () => Promise<{ running: boolean }>
  saveProject: (
    data: BotGraph,
    defaultDir?: string
  ) => Promise<{ success: boolean; filePath?: string; error?: string }>
  loadProject: (defaultDir?: string) => Promise<{
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
