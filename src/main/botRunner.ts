import { CatalogRuntime, regexMatch, type RuntimeOptions } from './catalogRuntime'
import { jsonValue, jsonPath, stringify, record } from './runtimeValues'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { CATALOG_BY_TYPE } from '../renderer/src/data/nodeCatalog'
import { isSupportedNodeType } from '../shared/nodeSupport'
import {
  compileGraph,
  isRecord,
  type BotGraphPayload,
  type BotLogPayload,
  type NodeGraphNode,
  type NodeGraphEdge
} from '../shared/graph'
export * from '../shared/graph'

export type LogEmitter = (log: BotLogPayload) => void
export type StatusEmitter = (running: boolean) => void

type Session = {
  graph: BotGraphPayload
  controller: AbortController
  botId: string
  last: string | number
  nodes: Map<string, NodeGraphNode>
  outgoing: Map<string, NodeGraphEdge[]>
  variables: Map<string, unknown>
  runtime: CatalogRuntime | null
  queue: Promise<unknown>
  cooldowns: Map<string, number>
  unsupportedWarnings: Set<string>
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
  eventId: string | number
  raw: Record<string, unknown>
  stopped: boolean
  localVariables: Map<string, unknown>
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

export class BotRunner {
  private session: Session | null = null
  private isRunning = false
  private botInfo: { id: string; name: string } | null = null
  private emptyVariableText = ''

  constructor(
    private emitLog: LogEmitter,
    private emitStatus: StatusEmitter,
    private runtimeOptions: RuntimeOptions = { projectDirectory: resolve('.yapin-data') }
  ) {}

  public configureRuntime(options: RuntimeOptions): void {
    this.runtimeOptions = options
  }

  public getStatus(): { running: boolean } {
    return { running: this.isRunning }
  }

  public getVariables(): Record<string, string | number> {
    return this.session
      ? Object.fromEntries(
          [...this.session.variables].map(([key, value]) => [
            key,
            typeof value === 'string' || typeof value === 'number' ? value : stringify(value)
          ])
        )
      : {}
  }

  public clearVariables(): void {
    this.session?.variables.clear()
  }

  public setOptions(options: unknown): void {
    if (isRecord(options) && typeof options.emptyVariableText === 'string') {
      this.emptyVariableText = options.emptyVariableText.slice(0, 100)
    }
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
        variables: new Map<string, unknown>(),
        runtime: null,
        queue: Promise.resolve(),
        cooldowns: new Map<string, number>(),
        unsupportedWarnings: new Set<string>()
      }
      const runtimeSession = session
      session.runtime = new CatalogRuntime(
        this.runtimeOptions,
        (method, path, body) => this.request(runtimeSession, method, path, body),
        (message) => this.log('warn', message)
      )
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
      this.startCatalogTriggers(activeSession)
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
    message = this.session?.runtime?.redact(message) ?? message
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
          const eventType = event.type,
            eventData = event.data,
            eventId = event.id
          await this.enqueue(session, () =>
            this.handleEvent(session, eventType, eventData, eventId)
          )
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

  private enqueue(session: Session, action: () => Promise<void>): Promise<void> {
    const next = session.queue
      .catch(() => {})
      .then(async () => {
        session.controller.signal.throwIfAborted()
        await action()
      })
    session.queue = next.catch(() => {})
    return next
  }

  private async handleEvent(
    session: Session,
    type: string,
    data: Record<string, unknown>,
    eventId: string | number = session.last,
    onlyNode?: string
  ): Promise<void> {
    if (type === 'message' && data.author_id === session.botId) return
    if (
      type === 'message' &&
      (typeof data.content !== 'string' ||
        typeof data.channel_id !== 'string' ||
        typeof data.id !== 'string')
    ) {
      this.log('warn', '[Runner] Skipped a malformed message event.')
      return
    }
    const content = typeof data.content === 'string' ? data.content : ''
    const rawPrefix = (session.graph.commandPrefix || session.graph.prefix || '/').trim() || '/'
    const escapedPrefix = rawPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const prefixPattern =
      escapedPrefix === '/' || escapedPrefix === '!' ? '[!/]' : `(?:${escapedPrefix}|[!/])`
    const cmdMatch = new RegExp(`^${prefixPattern}([a-z0-9_-]+)(?:\\s+([\\s\\S]*))?$`, 'i').exec(
      content.trim()
    )
    const command =
      typeof data.command === 'string' ? data.command.toLowerCase() : cmdMatch?.[1]?.toLowerCase()
    const context: MessageContext = {
      author:
        typeof data.author === 'string'
          ? data.author
          : isRecord(data.author) && typeof data.author.username === 'string'
            ? data.author.username
            : String(data.username ?? ''),
      authorId: String(data.author_id ?? data.user_id ?? ''),
      content,
      channel: String(data.channel_id ?? ''),
      messageId: String(data.message_id ?? data.id ?? ''),
      serverId: String(data.server_id ?? ''),
      authorBot: data.author_bot === true || (isRecord(data.author) && data.author.bot === true),
      args: typeof data.args === 'string' ? data.args : (cmdMatch?.[2] ?? ''),
      localVariables: new Map(),
      eventId,
      raw: data,
      stopped: false
    }
    const budget: EventBudget = { hops: 0, warned: false }
    if (
      type === 'interaction' &&
      (await session.runtime!.ticketInteraction(
        data,
        this.catalogContext(
          session,
          {
            id: 'ticket-interaction',
            type: 'catalog.ticketOpen',
            position: { x: 0, y: 0 },
            data: {}
          },
          context,
          budget
        )
      ))
    )
      return
    const eventNames: Record<string, string> = {
      messageEdited: 'message_edit',
      messageDeleted: 'message_delete',
      directMessage: 'dm_message',
      memberJoin: 'member_join',
      memberLeave: 'member_leave',
      memberBanned: 'member_ban',
      reactionAdded: 'reaction_add',
      reactionRemoved: 'reaction_remove',
      botStarts: 'bot_start'
    }
    for (const node of session.graph.nodes) {
      session.controller.signal.throwIfAborted()
      if (onlyNode && onlyNode !== node.id) continue
      let matches =
        !onlyNode &&
        type === 'message' &&
        (node.type === 'onMessage'
          ? !(node.data.ignoreBots && context.authorBot)
          : node.type === 'onCommand' &&
            !context.authorBot &&
            (!data.command_for || data.command_for === session.botId) &&
            command === node.data.commandName)
      if (node.type.startsWith('catalog.')) {
        const id = node.type.slice(8),
          schema = CATALOG_BY_TYPE.get(node.type)
        if (!schema || schema.inputs.length || id === 'stickyNote' || id === 'functionCalled')
          continue
        if (onlyNode) matches = true
        else if (eventNames[id]) matches = type === eventNames[id]
        else if (type === 'message' && !context.authorBot) {
          if (id === 'slashCommand')
            matches =
              content.trim().startsWith('/') &&
              command === String(node.data.commandName).replace(/^\//, '').toLowerCase() &&
              (!data.command_for || data.command_for === session.botId)
          else if (id === 'messageContains')
            matches = content.includes(String(node.data.text ?? ''))
          else if (id === 'messageRegex') {
            try {
              matches = regexMatch(
                String(node.data.pattern ?? ''),
                String(node.data.flags ?? ''),
                content
              )
            } catch (error) {
              this.log('warn', `[Trigger] ${errorMessage(error)}`)
            }
          } else if (id === 'messageAttachment')
            matches =
              !!data.attachment || (Array.isArray(data.attachments) && data.attachments.length > 0)
          else if (id === 'botMentioned')
            matches = data.mentioned === true || content.includes(`<@${session.botId}>`)
        }
      }
      if (!matches) continue
      if (
        node.data.userId &&
        String(node.data.userId) !== context.authorId &&
        String(node.data.userId).toLowerCase() !== context.author.toLowerCase()
      )
        continue
      if (node.data.channelId && String(node.data.channelId) !== context.channel) continue
      if (node.data.serverId && String(node.data.serverId) !== context.serverId) continue
      if (node.data.emoji && String(node.data.emoji) !== String(data.emoji ?? '')) continue
      if (
        node.data.fileType &&
        data.attachment &&
        !String(data.attachment).endsWith(String(node.data.fileType))
      )
        continue
      context.stopped = false
      if (node.data.saveToVariable && node.data.variableName) {
        const map = node.data.variableScope === 'local' ? context.localVariables : session.variables
        map.set(
          String(node.data.variableName),
          node.type === 'onCommand'
            ? context.args
            : node.type.startsWith('catalog.')
              ? data
              : content
        )
      }
      context.localVariables.set('event', data)
      this.log('info', `[Trigger] ${String(node.data.label ?? node.id)}`)
      await this.execute(session, node.id, context, budget)
      if (budget.warned) break
    }
  }

  private startCatalogTriggers(session: Session): void {
    const signal = session.controller.signal
    const job = (node: NodeGraphNode, data: Record<string, unknown>): Promise<void> =>
      this.enqueue(session, () =>
        this.handleEvent(session, 'scheduled', data, session.last, node.id)
      )
    for (const node of session.graph.nodes.filter((node) => node.type === 'catalog.botStarts'))
      void job(node, {}).catch((error) => {
        if (!signal.aborted) this.log('error', `[Startup] ${errorMessage(error)}`)
      })
    for (const node of session.graph.nodes) {
      const id = node.type.replace('catalog.', '')
      if (['messageEdited', 'messageDeleted', 'memberBanned'].includes(id))
        this.log(
          'warn',
          `[Yapin API] ${id} events are not listed in the public event reference; this trigger will run only if the gateway delivers them.`
        )
      if (node.type === 'catalog.webhookListener') {
        void this.enqueue(session, async () => {
          const secretName = String(node.data.secretVariable ?? '')
          const secret = process.env[secretName] ?? session.variables.get(secretName)
          if (!secret) {
            this.log(
              'warn',
              '[Webhook] Set the signing secret environment variable or startup variable before starting the bot.'
            )
            return
          }
          try {
            session.runtime!.webhook({ ...node.data, secret }, signal, (data) => job(node, data))
          } catch (error) {
            this.log('warn', `[Webhook] ${errorMessage(error)}`)
          }
        }).catch(() => {})
      }
      const social = ['rss', 'youtube', 'reddit', 'twitch', 'githubRelease'].includes(id)
      if (!social && node.type !== 'catalog.interval') continue
      const seconds = Math.max(
        social ? 30 : 0.1,
        Number(node.data.interval ?? node.data.seconds ?? 60)
      )
      if (!Number.isFinite(seconds)) {
        this.log('warn', '[Schedule] Invalid interval.')
        continue
      }
      void (async () => {
        let first = true,
          attempted = false
        while (!signal.aborted) {
          if (!social || attempted) await wait(seconds * 1000, signal)
          attempted = true
          try {
            if (social) {
              const items = await session.runtime!.feed(node.type, node.data, signal)
              const previous = session.runtime!.seen.get(node.id) ?? new Set<string>()
              const ids = items.map((item) =>
                createHash('sha256')
                  .update(
                    String(item.id ?? item.guid ?? item.url ?? item.link ?? JSON.stringify(item))
                  )
                  .digest('hex')
              )
              if (!first)
                for (let i = items.length - 1; i >= 0; i--)
                  if (!previous.has(ids[i]))
                    await job(node, {
                      ...items[i],
                      content: String(items[i].title ?? items[i].text ?? ''),
                      source: String(node.data.source)
                    })
              session.runtime!.seen.set(node.id, new Set([...ids, ...previous].slice(0, 1000)))
            } else await job(node, { timestamp: new Date().toISOString() })
            first = false
          } catch (error) {
            if (signal.aborted) throw error
            this.log(
              'warn',
              `[Social/Schedule] ${errorMessage(error)}; retrying after the configured interval.`
            )
          }
        }
      })().catch(() => {})
    }
  }

  private template(text: string, context: MessageContext, session: Session): string {
    const builtins: Record<string, unknown> = {
      ...context.raw,
      user: context.author,
      author: context.author,
      authorId: context.authorId,
      userId: context.authorId,
      channel: context.channel,
      channelId: context.channel,
      serverId: context.serverId,
      messageId: context.messageId,
      content: context.content,
      args: context.args,
      command: { args: context.args },
      event: context.raw,
      item: context.localVariables.get('item'),
      index: context.localVariables.get('index')
    }
    // One replacement pass: text supplied by a user is never reinterpreted as a variable template.
    return text.replace(
      /\{(var:)?([a-zA-Z0-9_.[\]-]+)\}/g,
      (original, prefix: string | undefined, name: string) => {
        const [first, ...rest] = name.replace(/\[(\d+)\]/g, '.$1').split('.')
        let value: unknown
        if (!prefix && Object.hasOwn(builtins, first))
          value = rest.length ? jsonPath(builtins[first], rest.join('.')) : builtins[first]
        else if (context.localVariables.has(name)) value = context.localVariables.get(name)
        else if (session.variables.has(name)) value = session.variables.get(name)
        else {
          const base = context.localVariables.has(first)
            ? context.localVariables.get(first)
            : session.variables.get(first)
          value = rest.length ? jsonPath(base, rest.join('.')) : base
        }
        return value === undefined ? (prefix ? this.emptyVariableText : original) : stringify(value)
      }
    )
  }

  private catalogContext(
    session: Session,
    node: NodeGraphNode,
    context: MessageContext,
    budget: EventBudget
  ): import('./catalogRuntime').RuntimeContext {
    const builtins: Record<string, unknown> = {
      ...context.raw,
      author: context.author,
      user: context.author,
      authorId: context.authorId,
      userId: context.authorId,
      content: context.content,
      channel: context.channel,
      channelId: context.channel,
      serverId: context.serverId,
      messageId: context.messageId,
      args: context.args,
      botId: session.botId,
      event: context.raw
    }
    const get = (name: string): unknown => {
      if (context.localVariables.has(name)) return context.localVariables.get(name)
      if (session.variables.has(name)) return session.variables.get(name)
      const [first, ...rest] = name.replace(/\[(\d+)\]/g, '.$1').split('.')
      const value = context.localVariables.has(first)
        ? context.localVariables.get(first)
        : session.variables.has(first)
          ? session.variables.get(first)
          : builtins[first]
      return rest.length ? jsonPath(value, rest.join('.')) : value
    }
    const expand = (raw: unknown): string => {
      if (typeof raw !== 'string') return stringify(raw)
      return this.template(raw, context, session)
    }
    const value = (raw: unknown): unknown => {
      if (typeof raw !== 'string') return raw
      const exact = /^\{(?:var:)?([a-zA-Z0-9_.[\]-]+)\}$/.exec(raw)
      if (exact) return get(exact[1])
      return jsonValue(expand(raw))
    }
    return {
      signal: session.controller.signal,
      event: builtins,
      expand,
      value,
      get,
      set: (name, value, scope = 'local') => {
        if (!/^[a-zA-Z0-9_.-]{1,128}$/.test(name)) throw Error('Invalid variable name.')
        ;(scope === 'global' ? session.variables : context.localVariables).set(name, value)
      },
      stopped: () => context.stopped,
      stopFlow: () => {
        context.stopped = true
      },
      stopBot: () => this.stop(),
      branch: (handle) => this.execute(session, node.id, context, budget, handle, true),
      call: async (name, args) => {
        const fn = session.graph.nodes.find(
          (n) => n.type === 'catalog.functionCalled' && n.data.name === name
        )
        if (!fn) throw Error(`Function ${name} was not found.`)
        const locals = new Map(context.localVariables)
        locals.set('arguments', args)
        if (record(args)) for (const [key, value] of Object.entries(args)) locals.set(key, value)
        const child = { ...context, localVariables: locals }
        await this.execute(session, fn.id, child, budget, undefined, true)
        if (child.stopped) context.stopped = true
        return child.localVariables.get('return') ?? child.localVariables.get('result')
      },
      waitEvent: async (kind, data) => {
        const timeout = Number(data.timeout ?? 60)
        if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 3600)
          throw Error('Event wait timeout must be between 0 and 3600 seconds.')
        const deadline = Date.now() + timeout * 1000
        let cursor = context.eventId
        while (Date.now() < deadline) {
          session.controller.signal.throwIfAborted()
          const response = await this.request(
            session,
            'GET',
            `/events?after=${encodeURIComponent(cursor)}&wait=${Math.max(1, Math.min(20, Math.ceil((deadline - Date.now()) / 1000)))}`
          )
          this.readPoll(response)
          for (const event of response.events) {
            if (!isRecord(event) || event.type !== kind || !isRecord(event.data)) continue
            const incoming = event.data
            if (String(incoming.channel_id ?? '') !== expand(data.channelId || context.channel))
              continue
            if (
              data.userId &&
              String(incoming.author_id ?? incoming.user_id ?? '') !== expand(data.userId)
            )
              continue
            if (kind === 'message' && incoming.author_id === session.botId) continue
            if (
              data.messageId &&
              kind === 'reaction_add' &&
              String(incoming.message_id ?? '') !== expand(data.messageId)
            )
              continue
            if (data.emoji && kind === 'reaction_add' && incoming.emoji !== expand(data.emoji))
              continue
            return incoming
          }
          cursor = response.last
          await wait(250, session.controller.signal)
        }
        throw Error(`Timed out waiting for ${kind}.`)
      }
    }
  }

  private async execute(
    session: Session,
    triggerId: string,
    context: MessageContext,
    budget: EventBudget,
    output?: string,
    strict = false
  ): Promise<void> {
    const stack = [...(session.outgoing.get(triggerId) ?? [])]
      .filter(
        (edge) =>
          output === undefined ||
          edge.sourceHandle === output ||
          (output === 'try' && edge.sourceHandle === 'success') ||
          (output === 'catch' && edge.sourceHandle === 'error')
      )
      .reverse()
      .map((edge) => edge.target)
    while (stack.length && !context.stopped) {
      session.controller.signal.throwIfAborted()
      if (budget.hops >= 50) {
        if (!budget.warned)
          this.log(
            'warn',
            '[Runner] Event reached the 50 node-hop limit; remaining branches skipped.'
          )
        budget.warned = true
        context.stopped = true
        return
      }
      budget.hops++
      const node = session.nodes.get(stack.pop()!)!
      let handle = 'out'
      try {
        if (node.type.startsWith('catalog.')) {
          if (!isSupportedNodeType(node.type)) {
            if (!session.unsupportedWarnings.has(node.type)) {
              session.unsupportedWarnings.add(node.type)
              this.log('warn', `[BotRunner] Skipping unsupported node: ${node.type}`)
            }
            const edges = session.outgoing.get(node.id) ?? []
            // Prefer the normal continuation; never fan out into mutually exclusive branches.
            handle =
              ['next', 'out', 'success'].find((output) =>
                edges.some((edge) => (edge.sourceHandle ?? 'out') === output)
              ) ??
              edges[0]?.sourceHandle ??
              'out'
          } else {
            const result = await session.runtime!.run(
              node.type,
              node.data,
              this.catalogContext(session, node, context, budget)
            )
            handle = result.handle
          }
        } else if (node.type === 'textCondition') {
          const compType = String(node.data.comparisonType ?? 'text')
          let match = false

          if (compType === 'number') {
            const rawLeft =
              node.data.leftValue !== undefined
                ? this.template(String(node.data.leftValue), context, session)
                : context.args
            const numA = Number(rawLeft) || 0
            const numB = Number(this.template(String(node.data.value ?? 0), context, session)) || 0
            const op = String(node.data.operator ?? 'equals')
            if (op === 'greater_than' || op === '>') match = numA > numB
            else if (op === 'less_than' || op === '<') match = numA < numB
            else if (op === 'greater_or_equal' || op === '>=') match = numA >= numB
            else if (op === 'less_or_equal' || op === '<=') match = numA <= numB
            else if (op === 'not_equals' || op === '!=') match = numA !== numB
            else match = numA === numB
          } else if (compType === 'user_role') {
            const checkType = String(node.data.checkType ?? 'username')
            const op = String(node.data.operator ?? 'equals')
            const targetVal = String(node.data.value ?? '')
              .toLowerCase()
              .trim()
            if (checkType === 'is_bot') {
              match = context.authorBot === true
            } else if (checkType === 'user_id') {
              match =
                op === 'equals'
                  ? context.authorId.toLowerCase() === targetVal
                  : op === 'not_equals'
                    ? context.authorId.toLowerCase() !== targetVal
                    : context.authorId.toLowerCase().includes(targetVal)
            } else {
              match =
                op === 'equals'
                  ? context.author.toLowerCase() === targetVal
                  : op === 'not_equals'
                    ? context.author.toLowerCase() !== targetVal
                    : context.author.toLowerCase().includes(targetVal)
            }
          } else if (compType === 'variable') {
            const varName = String(node.data.varName ?? '')
            const valA = String(
              context.localVariables.get(varName) ?? session.variables.get(varName) ?? ''
            )
            const valB = this.template(String(node.data.value ?? ''), context, session)
            const op = String(node.data.operator ?? 'equals')
            const caseSensitive = Boolean(node.data.caseSensitive)
            const left = caseSensitive ? valA : valA.toLowerCase()
            const right = caseSensitive ? valB : valB.toLowerCase()
            if (op === 'not_equals') match = left !== right
            else if (op === 'contains') match = left.includes(right)
            else if (op === 'greater_than') match = Number(left) > Number(right)
            else if (op === 'less_than') match = Number(left) < Number(right)
            else match = left === right
          } else {
            const rawContent =
              node.data.leftValue !== undefined
                ? this.template(String(node.data.leftValue), context, session)
                : context.content
            const content = node.data.caseSensitive ? rawContent : rawContent.toLowerCase()
            const rawVal = this.template(String(node.data.value ?? ''), context, session)
            const value = node.data.caseSensitive ? rawVal : rawVal.toLowerCase()
            match =
              node.data.operator === 'equals'
                ? content === value
                : node.data.operator === 'not_equals'
                  ? content !== value
                  : node.data.operator === 'starts_with'
                    ? content.startsWith(value)
                    : node.data.operator === 'ends_with'
                      ? content.endsWith(value)
                      : content.includes(value)
          }

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
          const scope = String(node.data.scope ?? 'global')
          const varMap = scope === 'local' ? context.localVariables : session.variables
          const expandedVal = this.template(String(node.data.value ?? ''), context, session)

          if (operation === 'increment') {
            const current = Number(varMap.get(varName) ?? 0)
            const add = Number(expandedVal) || 1
            varMap.set(varName, current + add)
          } else if (operation === 'decrement') {
            const current = Number(varMap.get(varName) ?? 0)
            const sub = Number(expandedVal) || 1
            varMap.set(varName, current - sub)
          } else {
            varMap.set(varName, expandedVal)
          }
          this.log('info', `[Variable (${scope})] ${varName} = ${varMap.get(varName)}`)
        } else if (node.type === 'getVariable') {
          const varName = String(node.data.varName)
          const fallback = String(node.data.fallback ?? '')
          const val =
            context.localVariables.get(varName) ?? session.variables.get(varName) ?? fallback
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
        } else if (node.type === 'javascriptCode') {
          const code = String(node.data.code ?? '')
          const maxOutputs = Math.min(5, Math.max(1, Number(node.data.outputCount ?? 1)))
          const sandbox = {
            context: {
              author: context.author,
              authorId: context.authorId,
              content: context.content,
              channel: context.channel,
              messageId: context.messageId,
              serverId: context.serverId,
              args: context.args,
              authorBot: context.authorBot
            },
            variables: Object.fromEntries(session.variables),
            localVariables: Object.fromEntries(context.localVariables),
            console: {
              log: (...args: unknown[]) =>
                this.log('info', `[JS Code] ${args.map(String).join(' ')}`),
              warn: (...args: unknown[]) =>
                this.log('warn', `[JS Code] ${args.map(String).join(' ')}`),
              error: (...args: unknown[]) =>
                this.log('error', `[JS Code] ${args.map(String).join(' ')}`)
            },
            args: context.args,
            content: context.content,
            author: context.author,
            authorId: context.authorId,
            channel: context.channel,
            serverId: context.serverId
          }

          let result: unknown
          try {
            const fn = new Function(
              'context',
              'variables',
              'localVariables',
              'console',
              'args',
              'content',
              'author',
              'authorId',
              'channel',
              'serverId',
              code
            )
            result = fn(
              sandbox.context,
              sandbox.variables,
              sandbox.localVariables,
              sandbox.console,
              sandbox.args,
              sandbox.content,
              sandbox.author,
              sandbox.authorId,
              sandbox.channel,
              sandbox.serverId
            )
          } catch (err: unknown) {
            throw new Error(`JavaScript execution failed: ${errorMessage(err)}`, { cause: err })
          }

          if (
            node.data.saveToVariable &&
            typeof node.data.variableName === 'string' &&
            node.data.variableName.trim()
          ) {
            const varName = node.data.variableName.trim()
            const scope = node.data.variableScope === 'local' ? 'local' : 'global'
            const valToSave =
              result !== undefined
                ? typeof result === 'object' && result !== null && 'value' in result
                  ? (result as { value: unknown }).value
                  : result
                : ''
            if (scope === 'local') {
              context.localVariables.set(varName, valToSave)
            } else {
              session.variables.set(varName, String(valToSave))
            }
            this.log('info', `[JS Code] Saved result to ${varName} (${scope})`)
          }

          if (maxOutputs > 1) {
            if (
              typeof result === 'number' &&
              Number.isInteger(result) &&
              result >= 1 &&
              result <= maxOutputs
            ) {
              handle = `out_${result}`
            } else if (typeof result === 'string' && result.startsWith('out_')) {
              handle = result
            } else if (typeof result === 'object' && result !== null && 'output' in result) {
              handle = `out_${(result as { output: unknown }).output}`
            } else {
              handle = 'out_1'
            }
          } else {
            handle = 'out'
          }
          this.log('success', `[JS Code] Executed successfully (routing to ${handle})`)
        }
      } catch (error: unknown) {
        if (
          session.controller.signal.aborted ||
          (error instanceof ApiError && error.status === 401)
        )
          throw error
        this.log('error', `[Node ${node.id}] ${errorMessage(error)}`)
        const errorHandle = 'error'
        const canRoute =
          node.type !== 'catalog.tryCatch' &&
          (session.outgoing.get(node.id) ?? []).some((edge) => edge.sourceHandle === errorHandle)
        if (canRoute) {
          context.localVariables.set('error', session.runtime!.redact(errorMessage(error)))
          handle = errorHandle
        } else {
          if (strict) throw error
          continue
        }
      }
      for (const edge of [...(session.outgoing.get(node.id) ?? [])].reverse()) {
        const edgeHandle = edge.sourceHandle ?? 'out'
        if (edgeHandle === handle || (handle === 'out' && edgeHandle === 'out_1')) {
          stack.push(edge.target)
        }
      }
    }
  }
}
