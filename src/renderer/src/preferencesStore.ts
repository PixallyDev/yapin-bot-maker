import { createContext, useContext } from 'react'

export type StartupPage = 'home' | 'canvas' | 'projects'
export type ConnectionLineType = 'smooth' | 'straight' | 'step'
export type AutoSaveInterval = 'off' | '1' | '5'
export type CommandPrefix = '/' | '!' | '.'

export interface Preferences {
  defaultProjectFolder: string
  autoLoadLastProject: boolean
  runBotOnLoad: boolean
  regenerateOnRun: boolean
  startupPage: StartupPage
  promptBeforeOverwrite: boolean
  disableConfirmations: boolean
  hideUsernameInPaths: boolean
  hideProjectThumbnails: boolean
  dpiScale: number
  reduceMotion: boolean
  enableTooltips: boolean
  showNodeDescriptions: boolean
  showActiveTabIndicator: boolean
  useGlassNodes: boolean
  connectionLineType: ConnectionLineType
  snapToGrid: boolean
  interactiveDotGrid: boolean
  panOnWheel: boolean
  showMiniMap: boolean
  hideGraphControls: boolean
  propertiesInModal: boolean
  autoSaveInterval: AutoSaveInterval
  defaultCommandPrefix: CommandPrefix
  emptyVariableText: string
  playSounds: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultProjectFolder: '',
  autoLoadLastProject: true,
  runBotOnLoad: false,
  regenerateOnRun: false,
  startupPage: 'home',
  promptBeforeOverwrite: true,
  disableConfirmations: false,
  hideUsernameInPaths: false,
  hideProjectThumbnails: false,
  dpiScale: 100,
  reduceMotion: false,
  enableTooltips: true,
  showNodeDescriptions: true,
  showActiveTabIndicator: true,
  useGlassNodes: false,
  connectionLineType: 'smooth',
  snapToGrid: false,
  interactiveDotGrid: true,
  panOnWheel: false,
  showMiniMap: true,
  hideGraphControls: false,
  propertiesInModal: true,
  autoSaveInterval: '5',
  defaultCommandPrefix: '/',
  emptyVariableText: 'undefined',
  playSounds: true
}

const STORAGE_KEY = 'yapin_preferences_v2'

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Merge untrusted stored JSON with defaults so a corrupt value can never break the studio. */
export function sanitizePreferences(raw: unknown): Preferences {
  const input = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const bool = (key: keyof Preferences): boolean =>
    typeof input[key] === 'boolean'
      ? (input[key] as boolean)
      : (DEFAULT_PREFERENCES[key] as boolean)
  const dpi = Number(input.dpiScale)
  return {
    defaultProjectFolder:
      typeof input.defaultProjectFolder === 'string'
        ? input.defaultProjectFolder.slice(0, 500)
        : '',
    autoLoadLastProject: bool('autoLoadLastProject'),
    runBotOnLoad: bool('runBotOnLoad'),
    regenerateOnRun: bool('regenerateOnRun'),
    startupPage: pick(input.startupPage, ['home', 'canvas', 'projects'], 'home'),
    promptBeforeOverwrite: bool('promptBeforeOverwrite'),
    disableConfirmations: bool('disableConfirmations'),
    hideUsernameInPaths: bool('hideUsernameInPaths'),
    hideProjectThumbnails: bool('hideProjectThumbnails'),
    dpiScale: Number.isFinite(dpi) ? Math.min(130, Math.max(80, Math.round(dpi))) : 100,
    reduceMotion: bool('reduceMotion'),
    enableTooltips: bool('enableTooltips'),
    showNodeDescriptions: bool('showNodeDescriptions'),
    showActiveTabIndicator: bool('showActiveTabIndicator'),
    useGlassNodes: bool('useGlassNodes'),
    connectionLineType: pick(input.connectionLineType, ['smooth', 'straight', 'step'], 'smooth'),
    snapToGrid: bool('snapToGrid'),
    interactiveDotGrid: bool('interactiveDotGrid'),
    panOnWheel: bool('panOnWheel'),
    showMiniMap: bool('showMiniMap'),
    hideGraphControls: bool('hideGraphControls'),
    propertiesInModal: bool('propertiesInModal'),
    autoSaveInterval: pick(input.autoSaveInterval, ['off', '1', '5'], '5'),
    defaultCommandPrefix: pick(input.defaultCommandPrefix, ['/', '!', '.'], '/'),
    emptyVariableText:
      typeof input.emptyVariableText === 'string'
        ? input.emptyVariableText.slice(0, 100)
        : DEFAULT_PREFERENCES.emptyVariableText,
    playSounds: bool('playSounds')
  }
}

export function loadPreferences(): Preferences {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    return sanitizePreferences(stored ? (JSON.parse(stored) as unknown) : {})
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* Storage may be unavailable; settings then last for this session only. */
  }
}

export interface PreferencesContextValue {
  prefs: Preferences
  update: (patch: Partial<Preferences>) => void
  setAll: (next: Preferences) => void
  reset: () => void
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider')
  return value
}

/** Replaces the OS account name in Windows/macOS/Linux home paths when privacy is on. */
export function maskPath(path: string, hide: boolean): string {
  if (!hide) return path
  return path
    .replace(/([A-Za-z]:[\\/]+Users[\\/]+)[^\\/]+/i, '$1***')
    .replace(/(\/Users\/|\/home\/)[^/]+/, '$1***')
}

let audio: AudioContext | null = null

/** Tiny synthesized cues so no audio assets are needed. */
export function playTone(kind: 'start' | 'stop' | 'error', enabled: boolean): void {
  if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) return
  try {
    audio = audio ?? new AudioContext()
    const notes = kind === 'start' ? [523, 784] : kind === 'stop' ? [784, 523] : [220, 196]
    const now = audio.currentTime
    notes.forEach((frequency, index) => {
      const osc = audio!.createOscillator()
      const gain = audio!.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, now + index * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.08, now + index * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.18)
      osc.connect(gain).connect(audio!.destination)
      osc.start(now + index * 0.12)
      osc.stop(now + index * 0.12 + 0.2)
    })
  } catch {
    /* Audio can be blocked until the first user gesture; ignore. */
  }
}
