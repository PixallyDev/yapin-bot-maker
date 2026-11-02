import type { BotLog } from './types'

export type LogCategory = 'errors' | 'warnings' | 'status' | 'commands' | 'node' | 'info'

export const LOG_FILTERS: { value: 'all' | LogCategory; label: string }[] = [
  { value: 'all', label: 'All messages' },
  { value: 'errors', label: 'Errors' },
  { value: 'warnings', label: 'Warnings' },
  { value: 'status', label: 'Status' },
  { value: 'commands', label: 'Commands' },
  { value: 'node', label: 'Node activity' },
  { value: 'info', label: 'Info' }
]

const STATUS_TAGS = /^\[(Runner|Yapin API|Event)\]/
const NODE_TAGS =
  /^\[(Condition|Check User|Variable|Get Variable|Send Reply|Send Rich Message|Random Reply|Wait|Moderate|Log|Cooldown|Node [^\]]+)\]/

export function classifyLog(log: BotLog): LogCategory {
  if (log.level === 'error') return 'errors'
  if (log.level === 'warn') return 'warnings'
  if (/^\[Trigger\]/.test(log.message)) return 'commands'
  if (STATUS_TAGS.test(log.message) || /^Bot graph received/.test(log.message)) return 'status'
  if (NODE_TAGS.test(log.message)) return 'node'
  return 'info'
}

export interface TraceStep {
  timestamp: string
  level: BotLog['level']
  message: string
}

export interface ExecutionTrace {
  id: number
  timestamp: string
  trigger: string
  steps: TraceStep[]
}

/** Groups the node-activity log lines that follow each [Trigger] line into one execution trace. */
export function buildTraces(logs: BotLog[], limit = 25): ExecutionTrace[] {
  const traces: ExecutionTrace[] = []
  let current: ExecutionTrace | null = null
  logs.forEach((log, index) => {
    const trigger = /^\[Trigger\]\s*(.*)$/.exec(log.message)
    if (trigger) {
      current = { id: index, timestamp: log.timestamp, trigger: trigger[1], steps: [] }
      traces.push(current)
      return
    }
    if (!current) return
    const category = classifyLog(log)
    if (category === 'node' || category === 'errors' || category === 'warnings') {
      current.steps.push({ timestamp: log.timestamp, level: log.level, message: log.message })
    } else if (category === 'status' && /Runner\] Bot stopped/.test(log.message)) {
      current = null
    }
  })
  return traces.slice(-limit).reverse()
}
