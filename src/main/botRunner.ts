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
  position?: { x: number; y: number }
}

export interface BotGraphPayload {
  token: string
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
  name?: string
}

export interface YapinRawEvent {
  id: number | string
  type: string
  data: Record<string, unknown>
  created_at?: string
}

export interface YapinMessageData {
  id?: string
  content?: string
  author?: { username?: string; bot?: boolean }
  author_username?: string
  is_bot?: boolean
  channel_id?: string
  channelId?: string
}

export type LogEmitter = (log: BotLogPayload) => void
export type StatusEmitter = (running: boolean) => void

export class BotRunner {
  private isRunning: boolean = false
  private activeGraph: BotGraphPayload | null = null
  private abortController: AbortController | null = null
  private emitLog: LogEmitter
  private emitStatus: StatusEmitter
  private lastEventId: number | string = 0
  private botInfo: { id?: string; name?: string; username?: string } | null = null

  constructor(emitLog: LogEmitter, emitStatus: StatusEmitter) {
    this.emitLog = emitLog
    this.emitStatus = emitStatus
  }

  public getStatus(): { running: boolean } {
    return { running: this.isRunning }
  }

  public getBotInfo(): { id?: string; name?: string; username?: string } | null {
    return this.botInfo
  }

  public async start(graph: BotGraphPayload): Promise<{ success: boolean; message?: string }> {
    if (this.isRunning) {
      await this.stop()
    }

    this.isRunning = true
    this.activeGraph = graph
    this.abortController = new AbortController()
    this.emitStatus(true)

    const nodeCount = graph.nodes?.length ?? 0
    const edgeCount = graph.edges?.length ?? 0

    this.log(
      'info',
      `Bot graph received (${nodeCount} node${nodeCount === 1 ? '' : 's'}, ${edgeCount} connection${edgeCount === 1 ? '' : 's'})`
    )

    const token = (graph.token || '').trim()

    if (!token) {
      this.log(
        'warn',
        '[Runner] No bot token provided. Bot graph loaded in offline simulation mode.'
      )
      return { success: true, message: 'Bot started in offline simulation mode' }
    }

    const maskedToken = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : '****'
    this.log('info', `[Runner] Initializing Yapin bot session (Token: ${maskedToken})...`)

    // Start background worker for Yapin API
    this.runBotLoop(token, this.abortController.signal).catch((err: unknown) => {
      if (!this.abortController?.signal.aborted) {
        this.log('error', `[Runner Error] ${err instanceof Error ? err.message : String(err)}`)
      }
    })

    return { success: true }
  }

  public async stop(): Promise<{ success: boolean; message?: string }> {
    if (!this.isRunning) {
      return { success: true, message: 'Bot already stopped' }
    }

    this.isRunning = false
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    this.emitStatus(false)
    this.log('info', '[Runner] Bot stopped.')
    return { success: true }
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', message: string): void {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    this.emitLog({ timestamp, level, message })
  }

  private async runBotLoop(token: string, signal: AbortSignal): Promise<void> {
    const BASE_URL = 'https://bots.yapper.website/api/bot/v1'

    try {
      this.log('info', '[Yapin API] Authenticating with GET /me...')
      const meRes = await fetch(`${BASE_URL}/me`, {
        headers: {
          Authorization: `Bot ${token}`,
          Accept: 'application/json'
        },
        signal
      })

      if (!meRes.ok) {
        const errorText = await meRes.text().catch(() => '')
        this.log(
          'warn',
          `[Yapin API] Auth check returned HTTP ${meRes.status} (${meRes.statusText}): ${errorText || 'Check your Bot Token'}`
        )
        this.log('info', '[Runner] Bot graph is active and standing by for triggers.')
        return
      }

      const meData = (await meRes.json()) as {
        bot?: { id?: string; name?: string }
        username?: string
        name?: string
        id?: string
      }
      const botName = meData?.bot?.name || meData?.username || meData?.name || 'YapinBot'
      const botId = meData?.bot?.id || meData?.id || 'unknown'
      this.botInfo = { id: botId, name: botName }

      this.log('success', `[Yapin API] Connected as @${botName} (ID: ${botId})`)

      // Sync slash commands if any onCommand triggers are in graph
      await this.syncCommands(token, signal)

      // Start long-poll loop
      this.log('info', '[Runner] Long-polling events from Yapin Gateway (/events)...')
      this.lastEventId = 0

      while (this.isRunning && !signal.aborted) {
        try {
          const pollUrl = `${BASE_URL}/events?after=${this.lastEventId}&wait=20`
          const pollRes = await fetch(pollUrl, {
            headers: {
              Authorization: `Bot ${token}`,
              Accept: 'application/json'
            },
            signal
          })

          if (!pollRes.ok) {
            if (pollRes.status === 429) {
              this.log('warn', '[Yapin API] Rate limited (429). Backing off for 5s...')
              await new Promise((r) => setTimeout(r, 5000))
              continue
            }
            this.log('warn', `[Yapin API] Poll returned HTTP ${pollRes.status}. Retrying in 3s...`)
            await new Promise((r) => setTimeout(r, 3000))
            continue
          }

          const body = (await pollRes.json()) as {
            events?: YapinRawEvent[]
            last?: number | string
          }

          if (body.last !== undefined) {
            this.lastEventId = body.last
          }

          if (body.events && Array.isArray(body.events)) {
            for (const event of body.events) {
              if (this.lastEventId === 0 || Number(event.id) > Number(this.lastEventId)) {
                this.lastEventId = event.id
              }
              await this.handleYapinEvent(event, token)
            }
          }
        } catch (pollErr: unknown) {
          if (signal.aborted) break
          const errMsg = pollErr instanceof Error ? pollErr.message : String(pollErr)
          this.log('warn', `[Runner Poll] ${errMsg}. Reconnecting in 3s...`)
          await new Promise((r) => setTimeout(r, 3000))
        }
      }
    } catch (err: unknown) {
      if (!signal.aborted) {
        const errMsg = err instanceof Error ? err.message : String(err)
        this.log('error', `[Runner Network Error] ${errMsg}`)
      }
    }
  }

  private async syncCommands(token: string, signal: AbortSignal): Promise<void> {
    if (!this.activeGraph) return

    const commandNodes = this.activeGraph.nodes.filter((n) => n.type === 'onCommand')
    if (commandNodes.length === 0) return

    const commandsPayload = commandNodes.map((node) => {
      const name = String(node.data?.commandName || 'ping')
        .toLowerCase()
        .trim()
      const description = String(node.data?.description || `Trigger for /${name}`)
      return { name, description }
    })

    try {
      this.log('info', `[Yapin API] Registering ${commandsPayload.length} slash command(s)...`)
      const res = await fetch('https://bots.yapper.website/api/bot/v1/commands', {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commands: commandsPayload }),
        signal
      })

      if (res.ok) {
        this.log(
          'success',
          `[Yapin API] Successfully synced slash commands: ${commandsPayload.map((c) => '/' + c.name).join(', ')}`
        )
      }
    } catch (err: unknown) {
      this.log('warn', `[Yapin API] Could not sync slash commands: ${String(err)}`)
    }
  }

  private async handleYapinEvent(event: YapinRawEvent, token: string): Promise<void> {
    if (!this.activeGraph) return

    this.log('info', `[Event Received] Type: ${event.type}`)

    if (event.type === 'message') {
      const msg = event.data as YapinMessageData
      const author = msg?.author?.username || msg?.author_username || 'Unknown'
      const content = msg?.content || ''
      const channelId = msg?.channel_id || msg?.channelId || ''

      this.log('info', `[Message from @${author}]: "${content}"`)

      // Check On Command triggers
      const commandNodes = this.activeGraph.nodes.filter((n) => n.type === 'onCommand')
      for (const cmdNode of commandNodes) {
        const cmdName = String(cmdNode.data?.commandName || 'ping')
          .toLowerCase()
          .trim()
        const isMatch =
          content.trim().toLowerCase() === `/${cmdName}` ||
          content.trim().toLowerCase().startsWith(`/${cmdName} `) ||
          content.trim().toLowerCase() === `!${cmdName}` ||
          content.trim().toLowerCase().startsWith(`!${cmdName} `)

        if (isMatch) {
          this.log('success', `[Trigger Activated] Command /${cmdName} matched!`)
          await this.executeGraphFromNode(cmdNode.id, {
            author,
            content,
            channelId,
            messageId: msg?.id,
            token
          })
        }
      }

      // Check On Message triggers
      const messageNodes = this.activeGraph.nodes.filter((n) => n.type === 'onMessage')
      for (const msgNode of messageNodes) {
        const ignoreBots = msgNode.data?.ignoreBots !== false
        if (ignoreBots && (msg?.author?.bot || msg?.is_bot)) {
          continue
        }
        this.log(
          'info',
          `[Trigger Activated] On Message trigger matched for node "${String(msgNode.data?.label || msgNode.id)}"`
        )
        await this.executeGraphFromNode(msgNode.id, {
          author,
          content,
          channelId,
          messageId: msg?.id,
          token
        })
      }
    }
  }

  private async executeGraphFromNode(
    startNodeId: string,
    context: {
      author: string
      content: string
      channelId: string
      messageId?: string
      token: string
    }
  ): Promise<void> {
    if (!this.activeGraph) return

    // Find outgoing edges from this node
    const outgoingEdges = this.activeGraph.edges.filter((e) => e.source === startNodeId)

    for (const edge of outgoingEdges) {
      const targetNode = this.activeGraph.nodes.find((n) => n.id === edge.target)
      if (!targetNode) continue

      await this.processNode(targetNode, edge, context)
    }
  }

  private async processNode(
    node: NodeGraphNode,
    _incomingEdge: NodeGraphEdge,
    context: {
      author: string
      content: string
      channelId: string
      messageId?: string
      token: string
    }
  ): Promise<void> {
    if (!this.isRunning || !this.activeGraph) return

    switch (node.type) {
      case 'textCondition': {
        const op = String(node.data?.operator || 'contains')
        const targetValue = String(node.data?.value || '').trim()
        const caseSensitive = Boolean(node.data?.caseSensitive)

        const msgContent = caseSensitive ? context.content : context.content.toLowerCase()
        const checkValue = caseSensitive ? targetValue : targetValue.toLowerCase()

        let isMatch = false
        if (op === 'contains') {
          isMatch = msgContent.includes(checkValue)
        } else if (op === 'equals') {
          isMatch = msgContent === checkValue
        } else if (op === 'starts_with') {
          isMatch = msgContent.startsWith(checkValue)
        } else if (op === 'ends_with') {
          isMatch = msgContent.endsWith(checkValue)
        }

        this.log(
          'info',
          `[Condition Check] "${context.content}" ${op} "${targetValue}" => ${isMatch ? 'TRUE (Match)' : 'FALSE (No Match)'}`
        )

        // Find edges matching the result:
        // 'true' handle for matches, 'false' handle for non-matches
        const conditionEdges = this.activeGraph.edges.filter(
          (e) =>
            e.source === node.id &&
            (e.sourceHandle === (isMatch ? 'true' : 'false') || !e.sourceHandle)
        )

        for (const nextEdge of conditionEdges) {
          const nextNode = this.activeGraph.nodes.find((n) => n.id === nextEdge.target)
          if (nextNode) {
            await this.processNode(nextNode, nextEdge, context)
          }
        }
        break
      }

      case 'sendReply': {
        const rawTemplate = String(node.data?.message || 'Hello from Yapin Bot Maker!')
        // Replace variables
        const replyText = rawTemplate
          .replace(/\{author\}/gi, context.author)
          .replace(/\{content\}/gi, context.content)
          .replace(/\{channel\}/gi, context.channelId || '')

        this.log('info', `[Action: Send Reply] Dispatching reply: "${replyText}"`)

        if (context.token && context.channelId) {
          try {
            const sendUrl = `https://bots.yapper.website/api/bot/v1/channels/${context.channelId}/messages`
            const res = await fetch(sendUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bot ${context.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                content: replyText,
                reply_to: context.messageId
              })
            })

            if (res.ok) {
              this.log(
                'success',
                `[Action: Send Reply] Message delivered to channel ${context.channelId}`
              )
            } else {
              this.log('warn', `[Action: Send Reply] Yapin returned HTTP ${res.status}`)
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            this.log('error', `[Action: Send Reply Failed] ${msg}`)
          }
        } else {
          this.log('info', `[Action: Send Reply (Simulated)] "${replyText}"`)
        }

        // Chain to any subsequent connected action nodes
        await this.executeGraphFromNode(node.id, context)
        break
      }

      case 'logConsole': {
        const levelVal = String(node.data?.level || 'info')
        const level: 'info' | 'warn' | 'error' | 'success' =
          levelVal === 'warn' || levelVal === 'error' || levelVal === 'success' ? levelVal : 'info'
        const rawTemplate = String(
          node.data?.message || 'Message processed from {author}: {content}'
        )
        const logMsg = rawTemplate
          .replace(/\{author\}/gi, context.author)
          .replace(/\{content\}/gi, context.content)

        this.log(level, `[Bot Action: Log] ${logMsg}`)

        // Chain to any subsequent connected action nodes
        await this.executeGraphFromNode(node.id, context)
        break
      }

      default:
        this.log('warn', `[Runner] Unrecognized node type: ${node.type}`)
    }
  }
}
