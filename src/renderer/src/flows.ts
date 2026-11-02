import { BotNode, BotEdge } from './types'
import { validateGraph } from '../../main/botRunner'
export interface Folder {
  id: string
  name: string
  color: string
  isOpen: boolean
  isDisabled: boolean
}
export interface Flow {
  id: string
  name: string
  color: string
  folderId?: string
  isOpen: boolean
  isDisabled: boolean
  nodes: BotNode[]
  edges: BotEdge[]
}
export const defaultFolders: Folder[] = [
  { id: 'main', name: 'Main', color: '#5865f2', isOpen: true, isDisabled: false },
  { id: 'disabled', name: 'Disabled', color: '#ed4245', isOpen: true, isDisabled: true }
]
export function newFlow(name: string, nodes: BotNode[] = [], edges: BotEdge[] = []): Flow {
  validateGraph({ token: '', nodes, edges })
  const ids = new Map(nodes.map((n) => [n.id, crypto.randomUUID()]))
  return {
    id: crypto.randomUUID(),
    name,
    color: '#5865f2',
    folderId: 'main',
    isOpen: true,
    isDisabled: false,
    nodes: structuredClone(nodes).map((n) => ({ ...n, id: ids.get(n.id)! })),
    edges: edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: ids.get(e.source)!,
      target: ids.get(e.target)!
    }))
  }
}
