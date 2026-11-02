import { BotNode, BotEdge } from './types'
import { PRESET_TEMPLATES } from './templates'

export interface BotProjectRecord {
  flows?: import('./flows').Flow[]
  folders?: import('./flows').Folder[]
  id: string
  name: string
  description: string
  lastModified: number
  nodeCount: number
  edgeCount: number
  filePath?: string
  nodes: BotNode[]
  edges: BotEdge[]
  token?: string
}

const PROJECTS_STORAGE_KEY = 'yapin_bot_projects_list'

const DEFAULT_PROJECTS: BotProjectRecord[] = [
  {
    id: 'proj-ping-faq',
    name: 'Default Ping & FAQ Bot',
    description:
      'Standard multi-command bot responding to /ping, /help, and community greeting keywords.',
    lastModified: Date.now() - 3600000 * 2,
    nodeCount: PRESET_TEMPLATES[0].nodes.length,
    edgeCount: PRESET_TEMPLATES[0].edges.length,
    nodes: PRESET_TEMPLATES[0].nodes,
    edges: PRESET_TEMPLATES[0].edges
  },
  {
    id: 'proj-auto-mod',
    name: 'Shield Auto-Moderator',
    description: 'Word filter, spam shield, and role permission enforcement graph.',
    lastModified: Date.now() - 3600000 * 24,
    nodeCount: PRESET_TEMPLATES[1].nodes.length,
    edgeCount: PRESET_TEMPLATES[1].edges.length,
    nodes: PRESET_TEMPLATES[1].nodes,
    edges: PRESET_TEMPLATES[1].edges
  },
  {
    id: 'proj-counter-fun',
    name: 'Fun & Games Companion',
    description: 'Dice rolls, 8-ball answers, and persistent global counter variables.',
    lastModified: Date.now() - 3600000 * 48,
    nodeCount: PRESET_TEMPLATES[2].nodes.length,
    edgeCount: PRESET_TEMPLATES[2].edges.length,
    nodes: PRESET_TEMPLATES[2].nodes,
    edges: PRESET_TEMPLATES[2].edges
  }
]

export function getSavedProjects(): BotProjectRecord[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS
  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!raw) {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS))
      return DEFAULT_PROJECTS
    }
    const parsed = JSON.parse(raw) as BotProjectRecord[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROJECTS
  } catch {
    return DEFAULT_PROJECTS
  }
}

export function saveProjectRecord(project: BotProjectRecord): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getSavedProjects()
    const index = existing.findIndex((p) => p.id === project.id)
    let updated: BotProjectRecord[]
    if (index >= 0) {
      updated = [...existing]
      updated[index] = { ...project, lastModified: Date.now() }
    } else {
      updated = [{ ...project, lastModified: Date.now() }, ...existing]
    }
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage quota error
  }
}

export function deleteProjectRecord(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getSavedProjects()
    const updated = existing.filter((p) => p.id !== id)
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore
  }
}

export function renameProjectRecord(id: string, newName: string): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getSavedProjects()
    const updated = existing.map((p) =>
      p.id === id ? { ...p, name: newName.trim(), lastModified: Date.now() } : p
    )
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore
  }
}

export function duplicateProjectRecord(id: string): BotProjectRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = getSavedProjects()
    const found = existing.find((p) => p.id === id)
    if (!found) return null
    const newId = `proj-${Date.now().toString(36)}`
    const duplicated: BotProjectRecord = {
      ...found,
      id: newId,
      name: `${found.name} (Copy)`,
      lastModified: Date.now()
    }
    const updated = [duplicated, ...existing]
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated))
    return duplicated
  } catch {
    return null
  }
}

export function createNewProjectRecord(name?: string): BotProjectRecord {
  const newId = `proj-${Date.now().toString(36)}`
  const starter = PRESET_TEMPLATES[0]
  const newProj: BotProjectRecord = {
    id: newId,
    name: name?.trim() || 'Untitled Bot Project',
    description: 'Fresh visual workflow canvas.',
    lastModified: Date.now(),
    nodeCount: starter.nodes.length,
    edgeCount: starter.edges.length,
    nodes: starter.nodes,
    edges: starter.edges
  }
  saveProjectRecord(newProj)
  return newProj
}
