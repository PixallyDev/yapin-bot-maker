export interface ThemeDefinition {
  id: string
  name: string
  description: string
  previewColors: string[]
  vars: {
    '--bg-primary': string
    '--bg-secondary': string
    '--bg-card': string
    '--bg-card-hover': string
    '--bg-input': string
    '--border-color': string
    '--border-hover': string
    '--color-primary': string
    '--color-primary-hover': string
    '--trigger-accent': string
    '--condition-accent': string
    '--variable-accent': string
    '--action-accent': string
  }
}

export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Dark Studio (Default)',
    description:
      'The standard Deep Slate & Indigo interface designed for long bot-building sessions.',
    previewColors: ['#0b0f19', '#182234', '#3b82f6', '#a855f7'],
    vars: {
      '--bg-primary': '#0b0f19',
      '--bg-secondary': '#111827',
      '--bg-card': '#182234',
      '--bg-card-hover': '#1e293b',
      '--bg-input': '#0d1522',
      '--border-color': '#27354a',
      '--border-hover': '#3b82f6',
      '--color-primary': '#3b82f6',
      '--color-primary-hover': '#2563eb',
      '--trigger-accent': '#a855f7',
      '--condition-accent': '#06b6d4',
      '--variable-accent': '#f59e0b',
      '--action-accent': '#10b981'
    }
  },
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    description: 'Cyberpunk inspired glowing violet accents on deep dark plum surfaces.',
    previewColors: ['#0d0b18', '#201b3d', '#a855f7', '#ec4899'],
    vars: {
      '--bg-primary': '#0d0b18',
      '--bg-secondary': '#17132b',
      '--bg-card': '#201b3d',
      '--bg-card-hover': '#2d2654',
      '--bg-input': '#131024',
      '--border-color': '#392d63',
      '--border-hover': '#a855f7',
      '--color-primary': '#a855f7',
      '--color-primary-hover': '#9333ea',
      '--trigger-accent': '#c084fc',
      '--condition-accent': '#38bdf8',
      '--variable-accent': '#fbbf24',
      '--action-accent': '#34d399'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'True OLED pitch black backgrounds with electric sapphire and cyan wire glows.',
    previewColors: ['#030712', '#111827', '#0284c7', '#38bdf8'],
    vars: {
      '--bg-primary': '#030712',
      '--bg-secondary': '#0b0f19',
      '--bg-card': '#111827',
      '--bg-card-hover': '#1e293b',
      '--bg-input': '#070b14',
      '--border-color': '#1f293d',
      '--border-hover': '#0284c7',
      '--color-primary': '#0284c7',
      '--color-primary-hover': '#0369a1',
      '--trigger-accent': '#818cf8',
      '--condition-accent': '#06b6d4',
      '--variable-accent': '#f59e0b',
      '--action-accent': '#10b981'
    }
  },
  {
    id: 'ice-phoenix',
    name: 'Ice-Phoenix',
    description: 'Frosted cyan and glacier blue styling inspired by modern high-tech dashboards.',
    previewColors: ['#08131e', '#162f49', '#06b6d4', '#67e8f9'],
    vars: {
      '--bg-primary': '#08131e',
      '--bg-secondary': '#0f2133',
      '--bg-card': '#162f49',
      '--bg-card-hover': '#1f4063',
      '--bg-input': '#0b1b2b',
      '--border-color': '#234970',
      '--border-hover': '#06b6d4',
      '--color-primary': '#06b6d4',
      '--color-primary-hover': '#0891b2',
      '--trigger-accent': '#a78bfa',
      '--condition-accent': '#22d3ee',
      '--variable-accent': '#fbbf24',
      '--action-accent': '#2dd4bf'
    }
  },
  {
    id: 'gta-vi',
    name: 'GTA VI Vice City',
    description:
      'Hot Miami sunsets, neon hot pink, tropical turquoise and vibrant night-club glow.',
    previewColors: ['#160b1e', '#321844', '#ec4899', '#06b6d4'],
    vars: {
      '--bg-primary': '#160b1e',
      '--bg-secondary': '#231230',
      '--bg-card': '#321844',
      '--bg-card-hover': '#45205e',
      '--bg-input': '#1b0d26',
      '--border-color': '#552572',
      '--border-hover': '#ec4899',
      '--color-primary': '#ec4899',
      '--color-primary-hover': '#db2777',
      '--trigger-accent': '#f472b6',
      '--condition-accent': '#22d3ee',
      '--variable-accent': '#fb923c',
      '--action-accent': '#4ade80'
    }
  }
]

const THEME_STORAGE_KEY = 'yapin_active_theme_id'
const CUSTOM_COLORS_KEY = 'yapin_custom_theme_colors'

export function getActiveThemeId(): string {
  if (typeof window === 'undefined') return 'dark'
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

export function getCustomThemeColors(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CUSTOM_COLORS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function applyTheme(themeId: string, customOverrides?: Record<string, string>): void {
  if (typeof document === 'undefined') return

  const theme = BUILTIN_THEMES.find((t) => t.id === themeId) || BUILTIN_THEMES[0]
  const root = document.documentElement

  // Apply base theme variables
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
    if (key === '--color-primary') {
      root.style.setProperty('--accent-primary', value)
    }
    if (key === '--color-primary-hover') {
      root.style.setProperty('--accent-primary-hover', value)
    }
  })

  // Apply custom overrides if any
  const overrides = customOverrides ?? getCustomThemeColors()
  Object.entries(overrides).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(key, value)
      if (key === '--color-primary' || key === '--accent-primary') {
        root.style.setProperty('--color-primary', value)
        root.style.setProperty('--accent-primary', value)
      }
      if (key === '--color-primary-hover' || key === '--accent-primary-hover') {
        root.style.setProperty('--color-primary-hover', value)
        root.style.setProperty('--accent-primary-hover', value)
      }
    }
  })

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme.id)
    if (customOverrides) {
      window.localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(customOverrides))
    }
  } catch {
    // Ignore localStorage write error
  }
}

export function resetThemeToDefault(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CUSTOM_COLORS_KEY)
  } catch {
    // Ignore
  }
  applyTheme('dark', {})
}
