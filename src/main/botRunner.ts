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
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const CONDITION_TYPES = new Set(['textCondition', 'checkUserRole', 'cooldownTimer'])

export function isConditionNode(type: string): boolean {
  return CONDITION_TYPES.has(type)
}

/** Validate untrusted IPC and project data before it reaches React Flow or the runner. */
export function validateGraph(value: unknown): asserts value is BotGraphPayload {
  if (
    !isRecord(value) ||
    typeof value.token !== 'string' ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    (value.name !== undefined && typeof value.name !== 'string')
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
      validateGraph({ token: '', nodes: flow.nodes, edges: flow.edges })
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
        break
      case 'onCommand':
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
        break
      case 'textCondition':
        if (
          !['contains', 'equals', 'starts_with', 'ends_with'].includes(String(data.operator)) ||
          typeof data.value !== 'string' ||
          typeof data.caseSensitive !== 'boolean'
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
      default:
        throw new Error(`Unsupported node type: ${String(node.type)}`)
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
    const isCondition = isConditionNode(String(source.type))
    if (
      target.type === 'onMessage' ||
      target.type === 'onCommand' ||
      (edge.targetHandle != null && edge.targetHandle !== 'in') ||
      (isCondition
        ? edge.sourceHandle !== 'true' && edge.sourceHandle !== 'false'
        : edge.sourceHandle != null && edge.sourceHandle !== 'out')
    ) {
      throw new Error('Invalid connection handles. Conditions require true or false outputs.')
    }
    edgeIds.add(edge.id)
  }
}

export type LogEmitter = (log: BotLogPayload) => void
export type StatusEmitter = (running: boolean) => void

type Session = {
  graph: BotGraphPayload
  controller: AbortController
  botId: string
  last: string | number
  nodes: Map<string, NodeGraphNode>
  outgoing: Map<string, NodeGraphEdge[]>
  variables: Map<string, string | number>
  cooldowns: Map<string, number>
}

type EventBudget = { hops: number; warned: boolean }

export function reconnectDelay(failures: number): number {
  const base = Math.min(30_000, 1000 * 2 ** Math.min(5, Math.max(0, failures - 1)))
  return Math.min(30_000, Math.round(base * (1 + Math.random() * 0.2)))
}

type MessageContext = {
  author: string
  authorId: string
  content: string
  channel: string
  messageId: string
  serverId: string
  authorBot: boolean
  args: string
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterMs = 0
  ) {
    super(message)
  }
}

const BASE_URL = 'https://bots.yapper.website/api/bot/v1'
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export function compileGraph(input: unknown): {
  graph: BotGraphPayload
  outgoing: Map<string, NodeGraphEdge[]>
  commands: { name: string; description: string }[]
} {
  validateGraph(input)
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
    .filter((node) => node.type === 'onCommand')
    .map((node) => ({
      name: String(node.data.commandName),
      description: String(node.data.description)
    }))
  if (
    commands.length > 100 ||
    new Set(commands.map((command) => command.name)).size !== commands.length
  ) {
    throw new Error('Use at most 100 commands, each with a unique name.')
  }
  if (!graph.nodes.some((node) => node.type === 'onMessage' || node.type === 'onCommand')) {
    throw new Error('Add an On Message or On Command trigger before starting.')
  }
  return { graph, outgoing, commands }
}

export class BotRunner {
  private session: Session | null = null
  private isRunning = false
  private botInfo: { id: string; name: string } | null = null

  constructor(
    private emitLog: LogEmitter,
    private emitStatus: StatusEmitter
  ) {}

  public getStatus(): { running: boolean } {
    return { running: this.isRunning }
  }

  public getBotInfo(): { id: string; name: string } | null {
    return this.botInfo
  }

  public async start(input: unknown): Promise<{ success: boolean; message?: string }> {
    if (this.session)
      return { success: false, message: 'Bot is already starting or running. Stop it first.' }
    let session: Session | null = null
    try {
      const { graph, outgoing, commands } = compileGraph(input)
      if (!/^yb_\S+$/.test(graph.token))
        throw new Error('Enter a valid bot token beginning with yb_.')
      session = {
        graph,
        controller: new AbortController(),
        botId: '',
        last: 0,
        nodes: new Map(graph.nodes.map((node) => [node.id, node])),
        outgoing,
        variables: new Map<string, string | number>(),
        cooldowns: new Map<string, number>()
      }
      this.session = session
      this.log(
        'info',
        `Bot graph received with ${graph.nodes.length} nodes and ${graph.edges.length} edges`
      )
      this.log('info', '[Yapin API] Authenticating with GET /me...')
      const me = await this.request(session, 'GET', '/me')
      if (!isRecord(me) || typeof me.id !== 'string')
        throw new Error('Invalid /me response: missing bot ID.')
      session.botId = me.id
      const name = String(me.username ?? (isRecord(me.bot) ? me.bot.name : '') ?? me.id)
      await this.request(session, 'PUT', '/commands', { commands })
      // The documented bootstrap avoids replying to messages sent before Start Bot.
      const initial = await this.request(session, 'GET', '/events?after=0&wait=0')
      this.readPoll(initial)
      session.last = initial.last
      session.controller.signal.throwIfAborted()
      this.botInfo = { id: me.id, name }
      this.isRunning = true
      this.emitStatus(true)
      this.log('success', `[Yapin API] Connected as @${name}. Listening for new events.`)
      const activeSession = session
      void this.poll(activeSession).catch((error: unknown) => {
        if (!activeSession.controller.signal.aborted) {
          this.log('error', `[Runner] ${errorMessage(error)}`)
          this.finish(activeSession)
        }
      })
      return { success: true }
    } catch (error: unknown) {
      const message = session?.controller.signal.aborted
        ? 'Bot startup cancelled.'
        : errorMessage(error)
            .split(session?.graph.token ?? '\0')
            .join('[hidden]')
      if (session) this.finish(session)
      this.log('error', message)
      return { success: false, message }
    }
  }

  public async stop(): Promise<{ success: boolean; message?: string }> {
    if (this.session) {
      this.finish(this.session)
      this.log('info', '[Runner] Bot stopped.')
    }
    return { success: true }
  }

  private finish(session: Session): void {
    session.controller.abort()
    if (this.session !== session) return
    this.session = null
    this.isRunning = false
    this.botInfo = null
    this.emitStatus(false)
  }

  private log(level: BotLogPayload['level'], message: string): void {
    // Never forward a token, including one echoed in an API error or template.
    const token = this.session?.graph.token
    if (token) message = message.split(token).join('[hidden]')
    this.emitLog({
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level,
      message
    })
  }

  private async request(
    session: Session,
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const signal = session.controller.signal
    let waited = 0
    for (let attempt = 0; ; attempt++) {
      signal.throwIfAborted()
      const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bot ${session.graph.token}`,
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)])
      })
      signal.throwIfAborted()
      const text = await response.text()
      let data: unknown
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        data = null
      }
      if (response.ok) return data
      const retryHeader = response.headers.get('Retry-After')
      const retrySeconds = retryHeader === null ? NaN : Number(retryHeader)
      // Only these documented responses guarantee that a write is safe to retry.
      if (
        (response.status === 429 || response.status === 503) &&
        Number.isFinite(retrySeconds) &&
        retrySeconds >= 0 &&
        attempt < 3
      ) {
        const delay = Math.max(250, retrySeconds * 1000)
        if (waited + delay <= 30_000) {
          waited += delay
          this.log('warn', `[Yapin API] HTTP ${response.status}; retrying in ${delay / 1000}s.`)
          await wait(delay, signal)
          continue
        }
      }
      const detail = isRecord(data) && typeof data.error === 'string' ? `: ${data.error}` : ''
      throw new ApiError(
        response.status,
        `${method} ${path.split('?')[0]} returned HTTP ${response.status}${detail}`,
        (response.status === 429 || response.status === 503) &&
          Number.isFinite(retrySeconds) &&
          retrySeconds >= 0
          ? retrySeconds * 1000
          : 0
      )
    }
  }

  private readPoll(body: unknown): asserts body is { events: unknown[]; last: number | string } {
    if (
      !isRecord(body) ||
      !Array.isArray(body.events) ||
      !(
        (typeof body.last === 'number' && Number.isSafeInteger(body.last) && body.last >= 0) ||
        (typeof body.last === 'string' && /^\d+$/.test(body.last))
      )
    ) {
      throw new Error('Invalid /events response.')
    }
  }

  private async poll(session: Session): Promise<void> {
    const signal = session.controller.signal
    let failures = 0
    while (!signal.aborted) {
      try {
        const body = await this.request(
          session,
          'GET',
          `/events?after=${encodeURIComponent(session.last)}&wait=20`
        )
        this.readPoll(body)
        if (failures) this.log('success', '[Runner] Connection restored; resuming events.')
        failures = 0
        for (const event of body.events) {
          signal.throwIfAborted()
          if (
            !isRecord(event) ||
            !isRecord(event.data) ||
            typeof event.type !== 'string' ||
            !(
              (typeof event.id === 'number' && Number.isSafeInteger(event.id) && event.id >= 0) ||
              (typeof event.id === 'string' && /^\d+$/.test(event.id))
            )
          ) {
            this.log('warn', '[Runner] Skipped a malformed event.')
            continue
          }
          if (BigInt(event.id) <= BigInt(session.last)) continue
          await this.handleEvent(session, event.type, event.data)
          session.last = event.id
        }
        if (BigInt(body.last) > BigInt(session.last)) session.last = body.last
        // Protect against an endpoint returning empty long polls immediately.
        await wait(250, signal)
      } catch (error: unknown) {
        if (signal.aborted) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error
        const delay = Math.max(
          reconnectDelay(++failures),
          error instanceof ApiError ? error.retryAfterMs : 0
        )
        this.log(
          'warn',
          `[Runner] ${errorMessage(error)}. Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${failures}).`
        )
        await wait(delay, signal)
      }
    }
  }

  private async handleEvent(
    session: Session,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (type !== 'message') {
      this.log('info', `[Event] ${type}`)
      return
    }
    if (data.author_id === session.botId) return
    if (
      typeof data.content !== 'string' ||
      typeof data.channel_id !== 'string' ||
      typeof data.id !== 'string'
    ) {
      this.log('warn', '[Runner] Skipped a message without content, channel ID or message ID.')
      return
    }

    const cmdMatch = /^[!/]([a-z0-9_-]+)(?:\s+(.*))?$/i.exec(data.content.trim())
    const command =
      typeof data.command === 'string' ? data.command.toLowerCase() : cmdMatch?.[1]?.toLowerCase()

    const context: MessageContext = {
      author:
        typeof data.author === 'string'
          ? data.author
          : isRecord(data.author) && typeof data.author.username === 'string'
            ? data.author.username
            : 'Unknown',
      authorId:
        typeof data.author_id === 'string'
          ? data.author_id
          : isRecord(data.author) && typeof data.author.id === 'string'
            ? data.author.id
            : '',
      content: data.content,
      channel: data.channel_id,
      messageId: data.id,
      serverId: typeof data.server_id === 'string' ? data.server_id : '',
      authorBot: data.author_bot === true || (isRecord(data.author) && data.author.bot === true),
      args: typeof data.args === 'string' ? data.args : (cmdMatch?.[2] ?? '')
    }

    const budget: EventBudget = { hops: 0, warned: false }
    for (const node of session.graph.nodes) {
      session.controller.signal.throwIfAborted()
      const matches =
        node.type === 'onMessage'
          ? !(node.data.ignoreBots && context.authorBot)
          : node.type === 'onCommand' &&
            !context.authorBot &&
            (!data.command_for || data.command_for === session.botId) &&
            command === node.data.commandName
      if (!matches) continue
      this.log('info', `[Trigger] ${String(node.data.label ?? node.id)}`)
      await this.execute(session, node.id, context, budget)
      if (budget.warned) break
    }
  }

  private template(text: string, context: MessageContext, session: Session): string {
    return text
      .replace(/\{(author|user)\}/gi, () => context.author)
      .replace(/\{content\}/gi, () => context.content)
      .replace(/\{channel\}/gi, () => context.channel)
      .replace(/\{args\}/gi, () => context.args)
      .replace(/\{var:([a-zA-Z0-9_-]+)\}/gi, (_, varName: string) => {
        const val = session.variables.get(varName)
        return val !== undefined ? String(val) : ''
      })
  }

  private async execute(
    session: Session,
    triggerId: string,
    context: MessageContext,
    budget: EventBudget
  ): Promise<void> {
    const stack = [...(session.outgoing.get(triggerId) ?? [])].reverse().map((edge) => edge.target)
    while (stack.length) {
      session.controller.signal.throwIfAborted()
      if (budget.hops >= 50) {
        if (!budget.warned)
          this.log(
            'warn',
            '[Runner] Event reached the 50 node-hop limit; remaining branches skipped.'
          )
        budget.warned = true
        return
      }
      budget.hops++
      const node = session.nodes.get(stack.pop()!)!
      let handle = 'out'
      try {
        if (node.type === 'textCondition') {
          const content = node.data.caseSensitive ? context.content : context.content.toLowerCase()
          const value = node.data.caseSensitive
            ? String(node.data.value)
            : String(node.data.value).toLowerCase()
          const match =
            node.data.operator === 'equals'
              ? content === value
              : node.data.operator === 'starts_with'
                ? content.startsWith(value)
                : node.data.operator === 'ends_with'
                  ? content.endsWith(value)
                  : content.includes(value)
          handle = match ? 'true' : 'false'
          this.log('info', `[Condition] ${node.id}: ${handle}`)
        } else if (node.type === 'checkUserRole') {
          const checkType = String(node.data.checkType ?? 'username')
          const operator = String(node.data.operator ?? 'equals')
          const targetValue = String(node.data.value ?? '')
            .toLowerCase()
            .trim()

          let match = false
          if (checkType === 'is_bot') {
            match = context.authorBot === true
          } else if (checkType === 'username') {
            const author = context.author.toLowerCase()
            match =
              operator === 'equals'
                ? author === targetValue
                : operator === 'not_equals'
                  ? author !== targetValue
                  : author.includes(targetValue)
          } else if (checkType === 'user_id') {
            const authorId = context.authorId.toLowerCase()
            match =
              operator === 'equals'
                ? authorId === targetValue
                : operator === 'not_equals'
                  ? authorId !== targetValue
                  : authorId.includes(targetValue)
          }
          handle = match ? 'true' : 'false'
          this.log('info', `[Check User] ${node.id}: ${handle}`)
        } else if (node.type === 'cooldownTimer') {
          const seconds = Math.max(0.1, Number(node.data.seconds ?? 5))
          const scope = String(node.data.scope ?? 'user')
          const key = `${node.id}:${
            scope === 'user'
              ? context.authorId || context.author
              : scope === 'channel'
                ? context.channel
                : 'global'
          }`
          const lastTime = session.cooldowns.get(key) ?? 0
          const now = Date.now()
          const elapsed = (now - lastTime) / 1000

          if (elapsed >= seconds) {
            session.cooldowns.set(key, now)
            handle = 'true'
          } else {
            handle = 'false'
          }
          this.log(
            'info',
            `[Cooldown] ${node.id}: ${handle} (${elapsed.toFixed(1)}s / ${seconds}s)`
          )
        } else if (node.type === 'setVariable') {
          const varName = String(node.data.varName)
          const operation = String(node.data.operation ?? 'set')
          const expandedVal = this.template(String(node.data.value ?? ''), context, session)

          if (operation === 'increment') {
            const current = Number(session.variables.get(varName) ?? 0)
            const add = Number(expandedVal) || 1
            session.variables.set(varName, current + add)
          } else if (operation === 'decrement') {
            const current = Number(session.variables.get(varName) ?? 0)
            const sub = Number(expandedVal) || 1
            session.variables.set(varName, current - sub)
          } else {
            session.variables.set(varName, expandedVal)
          }
          this.log('info', `[Variable] ${varName} = ${session.variables.get(varName)}`)
        } else if (node.type === 'getVariable') {
          const varName = String(node.data.varName)
          const fallback = String(node.data.fallback ?? '')
          const val = session.variables.get(varName) ?? fallback
          this.log('info', `[Get Variable] ${varName} = ${val}`)
        } else if (node.type === 'sendReply') {
          const content = this.template(String(node.data.message), context, session)
          if (!content.trim() || content.length > 2000)
            throw new Error('Reply must contain 1–2000 characters after template expansion.')
          await this.request(
            session,
            'POST',
            `/channels/${encodeURIComponent(context.channel)}/messages`,
            {
              content,
              reply_to: context.messageId
            }
          )
          this.log('success', `[Send Reply] Delivered to channel ${context.channel}`)
        } else if (node.type === 'sendRichMessage') {
          const title = node.data.title
            ? this.template(String(node.data.title), context, session)
            : undefined
          const description = node.data.description
            ? this.template(String(node.data.description), context, session)
            : undefined
          const color = node.data.color ? String(node.data.color) : '#3b82f6'
          const footer = node.data.footer
            ? this.template(String(node.data.footer), context, session)
            : undefined
          const imageUrl = node.data.imageUrl
            ? this.template(String(node.data.imageUrl), context, session)
            : undefined

          const embed: Record<string, unknown> = {}
          if (title) embed.title = title
          if (description) embed.description = description
          if (color) embed.color = color
          if (footer) embed.footer = { text: footer }
          if (imageUrl) embed.image = { url: imageUrl }

          await this.request(
            session,
            'POST',
            `/channels/${encodeURIComponent(context.channel)}/messages`,
            {
              embeds: [embed],
              reply_to: context.messageId
            }
          )
          this.log('success', `[Send Rich Message] Delivered card to channel ${context.channel}`)
        } else if (node.type === 'randomReply') {
          let lines: string[]
          if (Array.isArray(node.data.replies)) {
            lines = node.data.replies.map(String).filter((s) => s.trim().length > 0)
          } else {
            lines = String(node.data.replies ?? '')
              .split('\n')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          }
          if (lines.length === 0) lines = ['Hello!']
          const chosen = lines[Math.floor(Math.random() * lines.length)]
          const content = this.template(chosen, context, session)

          await this.request(
            session,
            'POST',
            `/channels/${encodeURIComponent(context.channel)}/messages`,
            {
              content,
              reply_to: context.messageId
            }
          )
          this.log('success', `[Random Reply] Picked & sent: "${content}"`)
        } else if (node.type === 'waitDelay') {
          const seconds = Math.min(30, Math.max(0.1, Number(node.data.seconds ?? 1)))
          this.log('info', `[Wait] Pausing for ${seconds}s...`)
          await wait(seconds * 1000, session.controller.signal)
        } else if (node.type === 'moderateMessage') {
          const actionType = String(node.data.actionType ?? 'delete')
          if (actionType !== 'delete' && (!context.serverId || !context.authorId)) {
            throw new Error('Server moderation requires a server ID and author ID.')
          }
          if (actionType === 'delete') {
            await this.request(
              session,
              'DELETE',
              `/channels/${encodeURIComponent(context.channel)}/messages/${encodeURIComponent(context.messageId)}`
            )
            this.log('success', `[Moderate] Deleted message ${context.messageId}`)
          } else if (actionType === 'timeout') {
            const minutes = Number(node.data.minutes ?? 10)
            const reason = node.data.reason ? String(node.data.reason) : 'Automated rule moderation'
            await this.request(
              session,
              'POST',
              `/servers/${encodeURIComponent(context.serverId)}/timeouts`,
              {
                user_id: context.authorId,
                minutes,
                reason
              }
            )
            this.log('success', `[Moderate] Timed out @${context.author} for ${minutes}m`)
          } else if (actionType === 'kick') {
            await this.request(
              session,
              'POST',
              `/servers/${encodeURIComponent(context.serverId)}/kick`,
              {
                user_id: context.authorId
              }
            )
            this.log('success', `[Moderate] Kicked @${context.author}`)
          }
        } else if (node.type === 'logConsole') {
          this.log(
            node.data.level as BotLogPayload['level'],
            this.template(String(node.data.message), context, session)
          )
        }
      } catch (error: unknown) {
        if (
          session.controller.signal.aborted ||
          (error instanceof ApiError && error.status === 401)
        )
          throw error
        this.log('error', `[Node ${node.id}] ${errorMessage(error)}`)
        // A failed action stops its branch, while other trigger branches can still run.
        continue
      }
      for (const edge of [...(session.outgoing.get(node.id) ?? [])].reverse()) {
        if ((edge.sourceHandle ?? 'out') === handle) stack.push(edge.target)
      }
    }
  }
}
