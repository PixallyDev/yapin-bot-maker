import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  useReactFlow,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './assets/studio.css'

import { nodeTypes } from './nodes'
import { Toolbar } from './components/Toolbar'
import { NodePalette } from './components/NodePalette'
import { ConsoleDrawer } from './components/ConsoleDrawer'
import { TemplatesModal } from './components/TemplatesModal'
import { BotTemplate } from './templates'
import { BotNode, BotEdge, PaletteItem, BotLog } from './types'

const INITIAL_NODES: BotNode[] = [
  // Workflow 1: /ping command
  {
    id: 'cmd-1',
    type: 'onCommand',
    position: { x: 80, y: 80 },
    data: {
      label: 'On Command',
      commandName: 'ping',
      description: 'Replies with pong'
    }
  },
  {
    id: 'reply-1',
    type: 'sendReply',
    position: { x: 420, y: 80 },
    data: {
      label: 'Send Reply',
      message: 'Pong! 🏓 Yapin bot is online and working.'
    }
  },
  {
    id: 'log-1',
    type: 'logConsole',
    position: { x: 760, y: 80 },
    data: {
      label: 'Log Console',
      level: 'success',
      message: 'Replied to /ping from @{user}'
    }
  },

  // Workflow 2: On Message with condition filter
  {
    id: 'msg-1',
    type: 'onMessage',
    position: { x: 80, y: 320 },
    data: {
      label: 'On Message',
      ignoreBots: true
    }
  },
  {
    id: 'cond-1',
    type: 'textCondition',
    position: { x: 420, y: 320 },
    data: {
      label: 'If Message Contains',
      operator: 'contains',
      value: 'yap',
      caseSensitive: false
    }
  },
  {
    id: 'reply-2',
    type: 'sendReply',
    position: { x: 760, y: 280 },
    data: {
      label: 'Send Reply',
      message: 'Did someone say yap? 🗣️ Welcome to our Yapin server, @{user}!'
    }
  }
]

const INITIAL_EDGES: BotEdge[] = [
  {
    id: 'e-cmd-reply',
    source: 'cmd-1',
    target: 'reply-1',
    sourceHandle: 'out',
    targetHandle: 'in'
  },
  {
    id: 'e-reply-log',
    source: 'reply-1',
    target: 'log-1',
    sourceHandle: 'out',
    targetHandle: 'in'
  },
  {
    id: 'e-msg-cond',
    source: 'msg-1',
    target: 'cond-1',
    sourceHandle: 'out',
    targetHandle: 'in'
  },
  {
    id: 'e-cond-reply',
    source: 'cond-1',
    target: 'reply-2',
    sourceHandle: 'true',
    targetHandle: 'in'
  }
]

function StudioCanvas(): React.JSX.Element {
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('yapin_bot_token') || ''
  })
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isStarting, setIsStarting] = useState<boolean>(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false)
  const [logs, setLogs] = useState<BotLog[]>([
    {
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level: 'info',
      message: 'Yapin Bot Maker Studio initialized. Ready to build bots.'
    }
  ])

  const [nodes, setNodes, onNodesChange] = useNodesState<BotNode>(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BotEdge>(INITIAL_EDGES)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  // Save token to localStorage
  const handleTokenChange = (newToken: string): void => {
    setToken(newToken)
    localStorage.setItem('yapin_bot_token', newToken)
  }

  // Connect edges
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  )

  // Listen to IPC logs and status changes from main process
  useEffect(() => {
    if (typeof window !== 'undefined' && window.botApi) {
      const unsubLog = window.botApi.onLog((log) => {
        setLogs((prev) => [...prev.slice(-499), log])
      })

      const unsubStatus = window.botApi.onStatusChange((running) => {
        setIsRunning(running)
      })

      // Query current status
      window.botApi.getBotStatus().then((res) => {
        setIsRunning(res.running)
      })

      return (): void => {
        unsubLog()
        unsubStatus()
      }
    }
    return undefined
  }, [])

  // Start / Stop Bot
  const handleToggleBot = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.botApi) return

    if (isRunning) {
      await window.botApi.stopBot()
      setIsRunning(false)
    } else {
      setIsStarting(true)
      try {
        const payload = {
          token: token.trim(),
          nodes: nodes as unknown[],
          edges: edges as unknown[]
        }
        const res = await window.botApi.startBot(payload)
        if (res.success) {
          setIsRunning(true)
        } else {
          setLogs((prev) => [
            ...prev,
            {
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              level: 'error',
              message: `Failed to start bot: ${res.message || 'Unknown error'}`
            }
          ])
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            level: 'error',
            message: `Bot execution error: ${errMsg}`
          }
        ])
      } finally {
        setIsStarting(false)
      }
    }
  }

  // Save Project
  const handleSaveProject = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.botApi) return
    const res = await window.botApi.saveProject({
      token,
      nodes: nodes as unknown[],
      edges: edges as unknown[]
    })
    if (!res.success && res.error) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'error',
          message: `Save error: ${res.error}`
        }
      ])
    }
  }

  // Load Project
  const handleLoadProject = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.botApi) return
    const res = await window.botApi.loadProject()
    if (res.success && res.data) {
      if (res.data.token) {
        handleTokenChange(res.data.token)
      }
      if (res.data.nodes) {
        setNodes(res.data.nodes as BotNode[])
      }
      if (res.data.edges) {
        setEdges(res.data.edges as BotEdge[])
      }
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    } else if (res.error) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'error',
          message: `Load error: ${res.error}`
        }
      ])
    }
  }

  // Reset to default canvas
  const handleNewCanvas = (): void => {
    setNodes(INITIAL_NODES)
    setEdges(INITIAL_EDGES)
    setTimeout(() => fitView({ padding: 0.2 }), 50)
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'info',
        message: 'Canvas reset to default example workflows.'
      }
    ])
  }

  // Load starter template
  const handleSelectTemplate = (template: BotTemplate): void => {
    setNodes(template.nodes)
    setEdges(template.edges)
    setTimeout(() => fitView({ padding: 0.2 }), 50)
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Loaded template: "${template.name}" with ${template.nodes.length} nodes.`
      }
    ])
  }

  // Add node from Palette click
  const handleAddNode = (item: PaletteItem): void => {
    const newId = `${item.type}-${Date.now().toString(36)}`
    const newNode: BotNode = {
      id: newId,
      type: item.type,
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: { ...item.defaultData }
    }
    setNodes((nds) => [...nds, newNode])
  }

  // Drag and drop onto canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const rawData = event.dataTransfer.getData('application/yapin-node')
      if (!rawData) return

      try {
        const item: PaletteItem = JSON.parse(rawData)
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        })

        const newId = `${item.type}-${Date.now().toString(36)}`
        const newNode: BotNode = {
          id: newId,
          type: item.type,
          position,
          data: { ...item.defaultData }
        }

        setNodes((nds) => [...nds, newNode])
      } catch (e) {
        console.error('Error dropping node:', e)
      }
    },
    [screenToFlowPosition, setNodes]
  )

  return (
    <div className="studio-container">
      <Toolbar
        token={token}
        onTokenChange={handleTokenChange}
        isRunning={isRunning}
        isStarting={isStarting}
        onToggleBot={handleToggleBot}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onNewCanvas={handleNewCanvas}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
      />

      <div className="studio-main-body">
        <NodePalette onAddNode={handleAddNode} />

        <div className="studio-canvas-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{ animated: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#223249" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'onMessage' || node.type === 'onCommand') return '#a855f7'
                if (
                  node.type === 'textCondition' ||
                  node.type === 'checkUserRole' ||
                  node.type === 'cooldownTimer'
                )
                  return '#06b6d4'
                if (node.type === 'setVariable' || node.type === 'getVariable') return '#f59e0b'
                return '#10b981'
              }}
              maskColor="rgba(11, 15, 25, 0.75)"
            />
          </ReactFlow>
        </div>
      </div>

      <ConsoleDrawer logs={logs} onClearLogs={() => setLogs([])} isRunning={isRunning} />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <StudioCanvas />
    </ReactFlowProvider>
  )
}
