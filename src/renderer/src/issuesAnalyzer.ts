import type { Flow, Folder } from './flows'
import type { BotEdge, BotNode } from './types'

export type IssueSeverity = 'error' | 'warning'

export interface FlowIssue {
  id: string
  severity: IssueSeverity
  message: string
  flowId: string
  flowName: string
  nodeId?: string
  nodeLabel?: string
}

const TRIGGERS = new Set(['onMessage', 'onCommand'])
const CONDITIONS = new Set(['textCondition', 'checkUserRole', 'cooldownTimer'])

function field(node: BotNode, key: string): unknown {
  return (node.data as Record<string, unknown>)[key]
}

function blank(value: unknown): boolean {
  if (Array.isArray(value)) return value.every((item) => String(item).trim() === '')
  return value === undefined || value === null || String(value).trim() === ''
}

/** Returns the human-readable name of a missing required setting, or null when complete. */
function missingSetting(node: BotNode): string | null {
  switch (node.type) {
    case 'onCommand':
      return blank(field(node, 'commandName')) ? 'command name' : null
    case 'textCondition':
      return blank(field(node, 'value')) ? 'text to match' : null
    case 'checkUserRole':
      return field(node, 'checkType') !== 'is_bot' && blank(field(node, 'value'))
        ? 'value to check'
        : null
    case 'cooldownTimer':
      return Number(field(node, 'seconds')) > 0 ? null : 'cooldown seconds'
    case 'setVariable':
    case 'getVariable':
      return blank(field(node, 'varName')) ? 'variable name' : null
    case 'sendReply':
    case 'logConsole':
      return blank(field(node, 'message')) ? 'message' : null
    case 'sendRichMessage':
      return blank(field(node, 'title')) && blank(field(node, 'description'))
        ? 'title or description'
        : null
    case 'randomReply':
      return blank(field(node, 'replies')) ? 'reply list' : null
    case 'javascriptCode':
      return blank(field(node, 'code')) ? 'JavaScript code' : null
    default:
      return null
  }
}

function findLoopNodes(nodes: BotNode[], edges: BotEdge[]): Set<string> {
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }
  const state = new Map<string, 1 | 2>()
  const loops = new Set<string>()
  const visit = (id: string): void => {
    state.set(id, 1)
    for (const next of outgoing.get(id) ?? []) {
      if (state.get(next) === 1) loops.add(next)
      else if (!state.has(next)) visit(next)
    }
    state.set(id, 2)
  }
  for (const node of nodes) if (!state.has(node.id)) visit(node.id)
  return loops
}

export function analyzeFlows(flows: Flow[], folders: Folder[]): FlowIssue[] {
  const issues: FlowIssue[] = []
  const commands = new Map<string, { flow: Flow; node: BotNode }>()

  for (const flow of flows) {
    const folderDisabled = folders.some(
      (folder) => folder.id === flow.folderId && folder.isDisabled
    )
    if (flow.isDisabled || folderDisabled || flow.nodes.length === 0) continue

    const base = { flowId: flow.id, flowName: flow.name }
    const label = (node: BotNode): string => String(field(node, 'label') || node.type)
    const push = (
      severity: IssueSeverity,
      message: string,
      node: BotNode | undefined,
      key: string
    ): void => {
      issues.push({
        ...base,
        id: `${flow.id}:${node?.id ?? 'flow'}:${key}`,
        severity,
        message,
        nodeId: node?.id,
        nodeLabel: node ? label(node) : undefined
      })
    }

    const incoming = new Set(flow.edges.map((edge) => edge.target))
    const outgoing = new Set(flow.edges.map((edge) => edge.source))
    const loops = findLoopNodes(flow.nodes, flow.edges)

    if (!flow.nodes.some((node) => TRIGGERS.has(String(node.type)))) {
      push('warning', 'Flow has no trigger, so it will never run', undefined, 'no-trigger')
    }

    for (const node of flow.nodes) {
      const type = String(node.type)
      if (loops.has(node.id)) push('error', 'Flow contains a loop', node, 'loop')
      if (!TRIGGERS.has(type) && !incoming.has(node.id)) {
        push(
          'warning',
          CONDITIONS.has(type) ? 'Condition is disconnected' : 'Action is disconnected',
          node,
          'disconnected'
        )
      }
      if ((TRIGGERS.has(type) || CONDITIONS.has(type)) && !outgoing.has(node.id)) {
        push('warning', 'No outgoing path', node, 'no-outgoing')
      }
      const missing = missingSetting(node)
      if (missing) push('error', `Missing required setting: ${missing}`, node, 'missing')

      if (type === 'onCommand' && !blank(field(node, 'commandName'))) {
        const name = String(field(node, 'commandName')).trim().toLowerCase()
        const first = commands.get(name)
        if (first)
          push('error', `Duplicate command "${name}" (also in ${first.flow.name})`, node, 'dup')
        else commands.set(name, { flow, node })
      }
    }
  }
  return issues
}
