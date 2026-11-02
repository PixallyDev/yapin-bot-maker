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
  token: string
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
  name?: string
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
      case 'sendReply':
        if (typeof data.message !== 'string') throw new Error('Send Reply needs message text.')
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
    if (
      target.type === 'onMessage' ||
      target.type === 'onCommand' ||
      (edge.targetHandle != null && edge.targetHandle !== 'in') ||
      (source.type === 'textCondition'
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
}

type MessageContext = { author: string; content: string; channel: string; messageId: string }

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
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
      validateGraph(input)
      const graph = structuredClone(input)
      graph.token = graph.token.trim()
      if (!/^yb_\S+$/.test(graph.token))
        throw new Error('Enter a valid bot token beginning with yb_.')
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
      session = {
        graph,
        controller: new AbortController(),
        botId: '',
        last: 0,
        nodes: new Map(graph.nodes.map((node) => [node.id, node])),
        outgoing
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
        `${method} ${path.split('?')[0]} returned HTTP ${response.status}${detail}`
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
    while (!signal.aborted) {
      try {
        const body = await this.request(
          session,
          'GET',
          `/events?after=${encodeURIComponent(session.last)}&wait=20`
        )
        this.readPoll(body)
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
        session.last = body.last
        // Protect against an endpoint returning empty long polls immediately.
        await wait(250, signal)
      } catch (error: unknown) {
        if (signal.aborted) return
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error
        this.log('warn', `[Runner] ${errorMessage(error)}. Reconnecting in 3s.`)
        await wait(3000, signal)
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
    const context: MessageContext = {
      author:
        typeof data.author === 'string'
          ? data.author
          : isRecord(data.author) && typeof data.author.username === 'string'
            ? data.author.username
            : 'Unknown',
      content: data.content,
      channel: data.channel_id,
      messageId: data.id
    }
    const authorBot = data.author_bot === true
    const command =
      typeof data.command === 'string'
        ? data.command.toLowerCase()
        : /^[!/]([a-z0-9_-]+)(?:\s|$)/i.exec(data.content.trim())?.[1].toLowerCase()
    for (const node of session.graph.nodes) {
      session.controller.signal.throwIfAborted()
      const matches =
        node.type === 'onMessage'
          ? !(node.data.ignoreBots && authorBot)
          : node.type === 'onCommand' &&
            !authorBot &&
            (!data.command_for || data.command_for === session.botId) &&
            command === node.data.commandName
      if (!matches) continue
      this.log('info', `[Trigger] ${String(node.data.label ?? node.id)}`)
      await this.execute(session, node.id, context)
    }
  }

  private template(text: string, context: MessageContext): string {
    return text.replace(
      /\{(author|content|channel)\}/gi,
      (_, key: string) => context[key.toLowerCase() as 'author' | 'content' | 'channel']
    )
  }

  private async execute(
    session: Session,
    triggerId: string,
    context: MessageContext
  ): Promise<void> {
    const stack = [...(session.outgoing.get(triggerId) ?? [])].reverse().map((edge) => edge.target)
    let steps = 0
    while (stack.length) {
      session.controller.signal.throwIfAborted()
      if (++steps > 10_000) {
        this.log('error', '[Runner] Execution exceeded 10000 steps; simplify graph branching.')
        return
      }
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
        } else if (node.type === 'sendReply') {
          const content = this.template(String(node.data.message), context)
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
        } else if (node.type === 'logConsole') {
          this.log(
            node.data.level as BotLogPayload['level'],
            this.template(String(node.data.message), context)
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
