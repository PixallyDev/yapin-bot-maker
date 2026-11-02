import { CATALOG_BY_TYPE, catalogOutputs } from '../renderer/src/data/nodeCatalog'

export interface BotLogPayload {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

export interface NodeGraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface NodeGraphNode {
  id: string
  type: string
  data: Record<string, unknown>
  position: { x: number; y: number }
}

export interface BotGraphPayload {
  flows?: {
    id: string
    name: string
    folderId?: string
    color: string
    isOpen: boolean
    isDisabled: boolean
    nodes: NodeGraphNode[]
    edges: NodeGraphEdge[]
  }[]
  folders?: { id: string; name: string; color: string; isOpen: boolean; isDisabled: boolean }[]
  token: string
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
  name?: string
  prefix?: string
  commandPrefix?: string
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const CONDITION_TYPES = new Set(['textCondition', 'checkUserRole', 'cooldownTimer'])

export function isConditionNode(type: string): boolean {
  return CONDITION_TYPES.has(type)
}

/** Validate untrusted IPC and project data before it reaches React Flow or the runner. */
export function validateGraph(
  value: unknown,
  allowUnknownCatalog = false
): asserts value is BotGraphPayload {
  if (
    !isRecord(value) ||
    typeof value.token !== 'string' ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    (value.name !== undefined && typeof value.name !== 'string') ||
    (value.prefix !== undefined && typeof value.prefix !== 'string') ||
    (value.commandPrefix !== undefined && typeof value.commandPrefix !== 'string')
  ) {
    throw new Error('Project must contain a token string, nodes array and edges array.')
  }
  if (value.flows !== undefined) {
    if (!Array.isArray(value.flows) || !Array.isArray(value.folders))
      throw new Error('Invalid flows or folders.')
    const ids = new Set<string>()
    for (const folder of value.folders) {
      if (
        !isRecord(folder) ||
        typeof folder.id !== 'string' ||
        ids.has(folder.id) ||
        typeof folder.name !== 'string' ||
        typeof folder.color !== 'string' ||
        typeof folder.isOpen !== 'boolean' ||
        typeof folder.isDisabled !== 'boolean'
      )
        throw new Error('Invalid folder.')
      ids.add(folder.id)
    }
    const flowIds = new Set<string>()
    for (const flow of value.flows) {
      if (
        !isRecord(flow) ||
        typeof flow.id !== 'string' ||
        flowIds.has(flow.id) ||
        typeof flow.name !== 'string' ||
        typeof flow.color !== 'string' ||
        typeof flow.isOpen !== 'boolean' ||
        typeof flow.isDisabled !== 'boolean' ||
        (flow.folderId !== undefined && !ids.has(String(flow.folderId)))
      )
        throw new Error('Invalid flow.')
      flowIds.add(flow.id)
      validateGraph({ token: '', nodes: flow.nodes, edges: flow.edges }, allowUnknownCatalog)
    }
  }
  const nodes = new Map<string, Record<string, unknown>>()
  for (const node of value.nodes) {
    if (
      !isRecord(node) ||
      typeof node.id !== 'string' ||
      !node.id ||
      nodes.has(node.id) ||
      !isRecord(node.data) ||
      !isRecord(node.position) ||
      typeof node.position.x !== 'number' ||
      !Number.isFinite(node.position.x) ||
      typeof node.position.y !== 'number' ||
      !Number.isFinite(node.position.y)
    ) {
      throw new Error('Each node needs a unique ID, data and a finite canvas position.')
    }
    const data = node.data
    switch (node.type) {
      case 'onMessage':
        if (typeof data.ignoreBots !== 'boolean') throw new Error('On Message needs ignoreBots.')
        if (data.userId !== undefined && typeof data.userId !== 'string')
          throw new Error('Invalid user ID.')
        if (data.channelId !== undefined && typeof data.channelId !== 'string')
          throw new Error('Invalid channel ID.')
        if (data.serverId !== undefined && typeof data.serverId !== 'string')
          throw new Error('Invalid server ID.')
        if (data.saveToVariable !== undefined && typeof data.saveToVariable !== 'boolean')
          throw new Error('Invalid saveToVariable.')
        if (data.variableName !== undefined && typeof data.variableName !== 'string')
          throw new Error('Invalid variableName.')
        if (
          data.variableScope !== undefined &&
          !['local', 'global'].includes(String(data.variableScope))
        )
          throw new Error('Invalid variableScope.')
        break
      case 'onCommand':
        if (typeof data.commandName === 'string') {
          let cName = data.commandName
            .trim()
            .toLowerCase()
            .replace(/^[^a-z0-9]+/, '')
          const pfx = (value.prefix ?? value.commandPrefix ?? '')
            .trim()
            .toLowerCase()
            .replace(/^[^a-z0-9]+/, '')
          if (
            pfx &&
            cName.startsWith(pfx) &&
            cName.length > pfx.length &&
            !['user', 'undo', 'uptime', 'update'].includes(cName)
          ) {
            cName = cName.slice(pfx.length).replace(/^[^a-z0-9]+/, '')
          }
          if (
            cName.startsWith('u') &&
            cName.length > 1 &&
            !['user', 'undo', 'uptime', 'update'].includes(cName)
          ) {
            cName = cName.slice(1).replace(/^[^a-z0-9]+/, '')
          }
          cName = cName.replace(/[^a-z0-9_-]/g, '')
          data.commandName = cName
        }
        if (
          typeof data.commandName !== 'string' ||
          !/^[a-z0-9_-]{1,32}$/.test(data.commandName) ||
          typeof data.description !== 'string' ||
          data.description.length > 100
        ) {
          throw new Error(
            'Commands need a 1–32 character lowercase name and description up to 100 characters.'
          )
        }
        if (data.userId !== undefined && typeof data.userId !== 'string')
          throw new Error('Invalid user ID.')
        if (data.channelId !== undefined && typeof data.channelId !== 'string')
          throw new Error('Invalid channel ID.')
        if (data.serverId !== undefined && typeof data.serverId !== 'string')
          throw new Error('Invalid server ID.')
        if (data.saveToVariable !== undefined && typeof data.saveToVariable !== 'boolean')
          throw new Error('Invalid saveToVariable.')
        if (data.variableName !== undefined && typeof data.variableName !== 'string')
          throw new Error('Invalid variableName.')
        if (
          data.variableScope !== undefined &&
          !['local', 'global'].includes(String(data.variableScope))
        )
          throw new Error('Invalid variableScope.')
        break
      case 'textCondition':
        if (
          typeof data.value !== 'string' ||
          (data.caseSensitive !== undefined && typeof data.caseSensitive !== 'boolean')
        ) {
          throw new Error('Invalid text condition settings.')
        }
        break
      case 'checkUserRole':
        if (
          !['username', 'user_id', 'is_bot'].includes(String(data.checkType)) ||
          !['equals', 'not_equals', 'contains'].includes(String(data.operator)) ||
          typeof data.value !== 'string'
        ) {
          throw new Error('Invalid check user/role settings.')
        }
        break
      case 'cooldownTimer':
        if (
          typeof data.seconds !== 'number' ||
          !Number.isFinite(data.seconds) ||
          data.seconds <= 0 ||
          (data.scope !== undefined && !['user', 'channel', 'global'].includes(String(data.scope)))
        ) {
          throw new Error('Cooldown timer requires a positive number of seconds.')
        }
        break
      case 'setVariable':
        if (
          typeof data.varName !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,64}$/.test(data.varName) ||
          typeof data.value !== 'string' ||
          (data.operation !== undefined &&
            !['set', 'increment', 'decrement'].includes(String(data.operation)))
        ) {
          throw new Error('Invalid set variable settings.')
        }
        break
      case 'getVariable':
        if (
          typeof data.varName !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,64}$/.test(data.varName) ||
          (data.fallback !== undefined && typeof data.fallback !== 'string')
        ) {
          throw new Error('Invalid get variable settings.')
        }
        break
      case 'sendReply':
        if (typeof data.message !== 'string') throw new Error('Send Reply needs message text.')
        break
      case 'sendRichMessage':
        if (
          (data.title !== undefined && typeof data.title !== 'string') ||
          (data.description !== undefined && typeof data.description !== 'string') ||
          (data.color !== undefined && typeof data.color !== 'string')
        ) {
          throw new Error('Invalid rich message settings.')
        }
        if (!data.title && !data.description) {
          throw new Error('Send Rich Message requires a title or description.')
        }
        break
      case 'randomReply':
        if (!Array.isArray(data.replies) && typeof data.replies !== 'string') {
          throw new Error('Random Reply requires a list of replies.')
        }
        break
      case 'waitDelay':
        if (
          typeof data.seconds !== 'number' ||
          !Number.isFinite(data.seconds) ||
          data.seconds <= 0
        ) {
          throw new Error('Wait delay requires a positive number of seconds.')
        }
        break
      case 'moderateMessage':
        if (!['delete', 'timeout', 'kick'].includes(String(data.actionType))) {
          throw new Error('Invalid moderation action settings.')
        }
        break
      case 'logConsole':
        if (
          typeof data.message !== 'string' ||
          !['info', 'warn', 'error', 'success'].includes(String(data.level))
        ) {
          throw new Error('Invalid console action settings.')
        }
        break
      case 'javascriptCode':
        if (typeof data.code !== 'string') throw new Error('JavaScript Code requires code.')
        if (
          data.outputCount !== undefined &&
          (typeof data.outputCount !== 'number' || data.outputCount < 1 || data.outputCount > 5)
        ) {
          throw new Error('JavaScript Code outputCount must be between 1 and 5.')
        }
        if (data.saveToVariable !== undefined && typeof data.saveToVariable !== 'boolean') {
          throw new Error('Invalid saveToVariable.')
        }
        if (data.variableName !== undefined && typeof data.variableName !== 'string') {
          throw new Error('Invalid variableName.')
        }
        if (
          data.variableScope !== undefined &&
          !['local', 'global'].includes(String(data.variableScope))
        ) {
          throw new Error('Invalid variableScope.')
        }
        break
      default:
        if (!CATALOG_BY_TYPE.has(String(node.type))) {
          if (
            allowUnknownCatalog &&
            typeof node.type === 'string' &&
            node.type.startsWith('catalog.')
          )
            break
          throw new Error(`Unsupported node type: ${String(node.type)}`)
        }
        for (const field of CATALOG_BY_TYPE.get(String(node.type))!.fields) {
          const val = data[field.key]
          if (val === undefined) continue
          const valid =
            field.kind === 'number'
              ? typeof val === 'number' && Number.isFinite(val)
              : field.kind === 'toggle'
                ? typeof val === 'boolean'
                : typeof val === 'string'
          if (!valid || (field.options && !field.options.includes(String(val))))
            throw new Error(`Invalid catalog field: ${field.key}`)
        }
        break
    }
    nodes.set(node.id, node)
  }
  const edgeIds = new Set<string>()
  for (const edge of value.edges) {
    if (
      !isRecord(edge) ||
      typeof edge.id !== 'string' ||
      !edge.id ||
      edgeIds.has(edge.id) ||
      typeof edge.source !== 'string' ||
      typeof edge.target !== 'string' ||
      !nodes.has(edge.source) ||
      !nodes.has(edge.target)
    ) {
      throw new Error('Each connection needs a unique ID and existing source and target nodes.')
    }
    const source = nodes.get(edge.source)!
    const target = nodes.get(edge.target)!
    const sourceSchema = CATALOG_BY_TYPE.get(String(source.type))
    const targetSchema = CATALOG_BY_TYPE.get(String(target.type))
    if (
      sourceSchema &&
      sourceSchema.type.startsWith('catalog.') &&
      !catalogOutputs(sourceSchema, source.data as Record<string, unknown>).includes(
        String(edge.sourceHandle)
      ) &&
      !(
        sourceSchema.type === 'catalog.tryCatch' &&
        ['success', 'error', 'try', 'catch', 'next'].includes(String(edge.sourceHandle))
      )
    )
      throw new Error('Invalid catalog output handle.')
    if (
      targetSchema &&
      targetSchema.type.startsWith('catalog.') &&
      (!targetSchema.inputs.length || edge.targetHandle !== 'in')
    )
      throw new Error('Invalid catalog input handle.')
    const isCondition = isConditionNode(String(source.type))
    const isJsCode = source.type === 'javascriptCode'
    const sourceHandle = typeof edge.sourceHandle === 'string' ? edge.sourceHandle : null
    const validJsHandle =
      sourceHandle == null || sourceHandle === 'out' || /^out_[1-5]$/.test(sourceHandle)

    if (
      target.type === 'onMessage' ||
      target.type === 'onCommand' ||
      (edge.targetHandle != null && edge.targetHandle !== 'in') ||
      ((sourceSchema && sourceSchema.type.startsWith('catalog.')) ||
      (allowUnknownCatalog && String(source.type).startsWith('catalog.'))
        ? false
        : isCondition
          ? edge.sourceHandle !== 'true' && edge.sourceHandle !== 'false'
          : isJsCode
            ? !validJsHandle
            : edge.sourceHandle != null && edge.sourceHandle !== 'out')
    ) {
      throw new Error('Invalid connection handles. Conditions require true or false outputs.')
    }
    edgeIds.add(edge.id)
  }
}

export function compileGraph(input: unknown): {
  graph: BotGraphPayload
  outgoing: Map<string, NodeGraphEdge[]>
  commands: { name: string; description: string }[]
} {
  validateGraph(input, true)
  const graph = structuredClone(input)
  if (graph.flows) {
    const enabled = graph.flows.filter(
      (f) =>
        !f.isDisabled &&
        !graph.folders?.some((folder) => folder.id === f.folderId && folder.isDisabled)
    )
    graph.nodes = enabled.flatMap((f) =>
      f.nodes.map((n) => ({ ...n, id: JSON.stringify([f.id, n.id]) }))
    )
    graph.edges = enabled.flatMap((f) =>
      f.edges.map((e) => ({
        ...e,
        id: JSON.stringify([f.id, e.id]),
        source: JSON.stringify([f.id, e.source]),
        target: JSON.stringify([f.id, e.target])
      }))
    )
  }
  graph.token = graph.token.trim()
  graph.nodes = graph.nodes.filter((node) => node.type !== 'catalog.stickyNote')
  const outgoing = new Map<string, NodeGraphEdge[]>()
  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]))
  for (const edge of graph.edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    indegree.set(edge.target, indegree.get(edge.target)! + 1)
  }
  // Reject cycles before executing any actions, including cycles in disconnected sections.
  const ready = graph.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id)
  for (let i = 0; i < ready.length; i++) {
    for (const edge of outgoing.get(ready[i]) ?? []) {
      const count = indegree.get(edge.target)! - 1
      indegree.set(edge.target, count)
      if (count === 0) ready.push(edge.target)
    }
  }
  if (ready.length !== graph.nodes.length)
    throw new Error('The bot graph contains a cycle. Remove looping connections.')
  const commands = graph.nodes
    .filter((node) => node.type === 'onCommand' || node.type === 'catalog.slashCommand')
    .map((node) => ({
      name: String(node.data.commandName).replace(/^[!/]/, '').trim().toLowerCase(),
      description: String(node.data.description ?? `Run ${node.data.commandName}`).slice(0, 100)
    }))
  if (
    commands.some((command) => !/^[a-z0-9_-]{1,32}$/.test(command.name)) ||
    commands.length > 100 ||
    new Set(commands.map((command) => command.name)).size !== commands.length
  ) {
    throw new Error('Use at most 100 commands, each with a unique name.')
  }
  const functions = graph.nodes
    .filter((node) => node.type === 'catalog.functionCalled')
    .map((node) => String(node.data.name ?? ''))
  if (functions.some((name) => !name.trim()) || new Set(functions).size !== functions.length)
    throw Error('Functions need unique non-empty names.')
  if (
    !graph.nodes.some(
      (node) =>
        node.type === 'onMessage' ||
        node.type === 'onCommand' ||
        (CATALOG_BY_TYPE.get(node.type)?.inputs.length === 0 && node.type !== 'catalog.stickyNote')
    )
  ) {
    throw new Error('Add an On Message or On Command trigger before starting.')
  }
  return { graph, outgoing, commands }
}
