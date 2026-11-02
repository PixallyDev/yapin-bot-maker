import { createContext, useContext } from 'react'
import { BotProjectRecord } from './projectManager'

export interface ProjectContextValue {
  activeProject?: BotProjectRecord | null
  commandPrefix: string
}

export const ProjectContext = createContext<ProjectContextValue>({
  activeProject: null,
  commandPrefix: '/'
})

export const useProjectContext = (): ProjectContextValue => useContext(ProjectContext)

export const useProjectPrefix = (): string => {
  const ctx = useContext(ProjectContext)
  return ctx.commandPrefix || ctx.activeProject?.prefix || '/'
}

/**
 * Normalizes command names by stripping any leading prefix characters:
 * e.g. '/roll', 'uroll', '.roll', '!roll', '?roll', 'roll' -> 'roll'.
 * Stores only the clean keyword matching [a-z0-9_-].
 */
export function normalizeCommandName(raw: unknown, activePrefix?: string): string {
  if (raw === null || raw === undefined) return ''
  let val = String(raw).trim().toLowerCase()
  if (!val) return ''

  // 1. Strip all leading non-alphanumeric symbols (/ . ! ? ~ - $ # % & > < : ; etc.)
  val = val.replace(/^[^a-z0-9]+/, '')

  // 2. If it's a known protected keyword, preserve it intact
  const PROTECTED_KEYWORDS = ['user', 'undo', 'uptime', 'update']
  if (PROTECTED_KEYWORDS.includes(val)) {
    return val
  }

  // 3. Strip activePrefix if present at start (e.g. user-configured 'u', '.', '!', '/')
  if (activePrefix) {
    const p = activePrefix
      .trim()
      .toLowerCase()
      .replace(/^[^a-z0-9]+/, '')
    if (p && val.startsWith(p) && val.length > p.length) {
      val = val.slice(p.length).replace(/^[^a-z0-9]+/, '')
      if (PROTECTED_KEYWORDS.includes(val)) {
        return val
      }
    }
  }

  // 4. Known bot prefix 'u' (e.g. 'uroll', 'uping', 'ubalance')
  if (val.startsWith('u') && val.length > 1) {
    val = val.slice(1).replace(/^[^a-z0-9]+/, '')
  }

  // 5. Strip any further leading non-alphanumerics (e.g. 'u/roll' -> 'roll')
  val = val.replace(/^[^a-z0-9]+/, '')

  // 6. Keep only valid identifier characters [a-z0-9_-]
  val = val.replace(/[^a-z0-9_-]/g, '')

  return val
}
