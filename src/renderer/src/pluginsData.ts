export interface BotPlugin {
  id: string
  name: string
  version: string
  author: string
  category: 'Integration' | 'Visual' | 'Network' | 'Diagnostics' | 'AI' | 'Database'
  description: string
  icon: string
  enabled: boolean
  hasSettings: boolean
}

export const INITIAL_PLUGINS: BotPlugin[] = [
  {
    id: 'plugin-webhook-bridge',
    name: 'Discord & Yapin Webhook Bridge',
    version: '1.2.0',
    author: 'Yapin Core Team',
    category: 'Integration',
    description:
      'Relays messages and notifications from Yapin channels to external Discord webhooks in real time.',
    icon: '🌉',
    enabled: true,
    hasSettings: true
  },
  {
    id: 'plugin-rich-card-designer',
    name: 'Rich Embed Visual Designer',
    version: '2.0.1',
    author: 'StudioFX',
    category: 'Visual',
    description:
      'Enables interactive drag-and-drop live preview rendering for custom bot cards and buttons.',
    icon: '🎨',
    enabled: true,
    hasSettings: false
  },
  {
    id: 'plugin-gateway-guard',
    name: 'Auto-Reconnecting Gateway Guard',
    version: '1.0.4',
    author: 'NetworkLabs',
    category: 'Network',
    description:
      'Monitors polling heartbeats, mitigates socket drops, and automates exponential jittered reconnects.',
    icon: '🛡️',
    enabled: true,
    hasSettings: true
  },
  {
    id: 'plugin-command-analytics',
    name: 'Analytics & Command Heatmap',
    version: '1.1.0',
    author: 'MetricsPlus',
    category: 'Diagnostics',
    description:
      'Tracks most active commands, peak user interaction hours, and average response latency in memory.',
    icon: '📈',
    enabled: false,
    hasSettings: true
  },
  {
    id: 'plugin-ai-llm-assistant',
    name: 'AI Prompt Node (LLM Yap Bot)',
    version: '0.9.0-beta',
    author: 'NeuralWorks',
    category: 'AI',
    description:
      'Adds smart conversational responses and dynamic text generation using local or API-backed LLMs.',
    icon: '🤖',
    enabled: false,
    hasSettings: true
  },
  {
    id: 'plugin-sqlite-storage',
    name: 'Database Storage Engine (SQLite)',
    version: '1.0.2',
    author: 'DataGuild',
    category: 'Database',
    description:
      'Replaces volatile in-memory session variables with durable local SQLite key-value persistence.',
    icon: '🗄️',
    enabled: true,
    hasSettings: false
  }
]

const PLUGINS_STORAGE_KEY = 'yapin_active_plugins_state'

export function getPluginsList(): BotPlugin[] {
  if (typeof window === 'undefined') return INITIAL_PLUGINS
  try {
    const raw = window.localStorage.getItem(PLUGINS_STORAGE_KEY)
    if (!raw) return INITIAL_PLUGINS
    const storedState = JSON.parse(raw) as Record<string, boolean>
    return INITIAL_PLUGINS.map((plugin) => ({
      ...plugin,
      enabled: storedState[plugin.id] !== undefined ? storedState[plugin.id] : plugin.enabled
    }))
  } catch {
    return INITIAL_PLUGINS
  }
}

export function togglePluginState(pluginId: string, enabled: boolean): BotPlugin[] {
  if (typeof window === 'undefined') return INITIAL_PLUGINS
  try {
    const current = getPluginsList()
    const updated = current.map((p) => (p.id === pluginId ? { ...p, enabled } : p))
    const stateMap = updated.reduce<Record<string, boolean>>((acc, p) => {
      acc[p.id] = p.enabled
      return acc
    }, {})
    window.localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(stateMap))
    return updated
  } catch {
    return INITIAL_PLUGINS
  }
}
