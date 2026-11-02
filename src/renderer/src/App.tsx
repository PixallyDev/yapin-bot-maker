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
import { Sidebar, NavTabId } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { NodePalette } from './components/NodePalette'
import { ConsoleDrawer } from './components/ConsoleDrawer'
import { TemplatesModal } from './components/TemplatesModal'
import { NodeInspectorDrawer } from './components/NodeInspectorDrawer'
import { PreferencesModal } from './components/PreferencesModal'
import { AccountModal } from './components/AccountModal'

import { HomeView } from './views/HomeView'
import { ProjectsView } from './views/ProjectsView'
import { MarketplaceView } from './views/MarketplaceView'
import { ThemesView } from './views/ThemesView'
import { PluginsView } from './views/PluginsView'

import { BotTemplate, PRESET_TEMPLATES } from './templates'
import { MarketplaceItem } from './marketplaceData'
import {
  BotProjectRecord,
  getSavedProjects,
  saveProjectRecord,
  createNewProjectRecord
} from './projectManager'
import { applyTheme, getActiveThemeId } from './themes'
import { BotNode, BotEdge, PaletteItem, BotLog, CustomNodeData } from './types'

const INITIAL_NODES: BotNode[] = PRESET_TEMPLATES[0].nodes
const INITIAL_EDGES: BotEdge[] = PRESET_TEMPLATES[0].edges

function StudioCanvas(): React.JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState<BotNode>(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState<BotEdge>(INITIAL_EDGES)
  const [logs, setLogs] = useState<BotLog[]>([
    {
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level: 'info',
      message: 'Yapin Bot Maker studio initialized. Welcome to the workspace.'
    }
  ])
  const [isRunning, setIsRunning] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [token, setToken] = useState<string>(() => {
    try {
      return (
        (typeof window !== 'undefined' && window.sessionStorage.getItem('yapin_bot_token')) || ''
      )
    } catch {
      return ''
    }
  })

  // Multi-Tab Navigation & Modals
  const [activeTab, setActiveTab] = useState<NavTabId>('home')
  const [activeProject, setActiveProject] = useState<BotProjectRecord>(() => {
    const list = getSavedProjects()
    return (
      list[0] || {
        id: 'proj-default',
        name: 'Default Ping & FAQ Bot',
        description: 'Standard multi-command bot.',
        lastModified: Date.now(),
        nodeCount: INITIAL_NODES.length,
        edgeCount: INITIAL_EDGES.length,
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES
      }
    )
  })

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)

  const [rememberToken, setRememberToken] = useState(false)
  const [tokenStorageReady, setTokenStorageReady] = useState(false)
  const [tokenStorageAvailable, setTokenStorageAvailable] = useState(false)

  const tokenEdited = useRef(false)
  const tokenSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  // Initialize Active Theme on startup
  useEffect(() => {
    applyTheme(getActiveThemeId())
  }, [])

  const reportError = useCallback((message: string): void => {
    setLogs((prev) => [
      ...prev.slice(-499),
      {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'error',
        message
      }
    ])
  }, [])

  const handleTokenChange = (newToken: string): void => {
    tokenEdited.current = true
    setToken(newToken)
  }

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem('yapin_bot_token')
    } catch {
      /* Storage may be disabled. */
    }
    if (typeof window === 'undefined' || !window.botApi) return
    let active = true
    void window.botApi
      .getTokenSettings()
      .then((settings) => {
        if (!active) return
        setTokenStorageAvailable(settings.available)
        setRememberToken(settings.remember)
        if (!tokenEdited.current && settings.token) setToken(settings.token)
        setTokenStorageReady(true)
        if (settings.error) reportError(settings.error)
      })
      .catch(() => {
        if (active) reportError('Could not read secure token settings.')
      })
    return () => {
      active = false
    }
  }, [reportError])

  useEffect(() => {
    if (
      !rememberToken ||
      !tokenStorageReady ||
      !tokenStorageAvailable ||
      typeof window === 'undefined' ||
      !window.botApi
    )
      return
    const api = window.botApi
    tokenSaveTimer.current = setTimeout(() => {
      void api
        .setTokenSettings(token, true)
        .then((result) => {
          if (!result.success) reportError(result.error ?? 'Could not remember token securely.')
        })
        .catch(() => reportError('Could not remember token securely.'))
    }, 400)
    return () => {
      if (tokenSaveTimer.current) clearTimeout(tokenSaveTimer.current)
    }
  }, [token, rememberToken, tokenStorageReady, tokenStorageAvailable, reportError])

  const handleRememberToken = async (remember: boolean): Promise<void> => {
    if (typeof window === 'undefined' || !window.botApi) return
    if (tokenSaveTimer.current) clearTimeout(tokenSaveTimer.current)
    setRememberToken(remember)
    const result = await window.botApi.setTokenSettings(token, remember).catch(() => null)
    if (!result?.success) {
      setRememberToken(false)
      reportError(result?.error ?? 'Could not update secure token settings.')
    }
  }

  const handleExportStandalone = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.botApi || isExporting) return
    setIsExporting(true)
    try {
      const result = await window.botApi.exportStandalone({ token, nodes, edges })
      if (result.error) reportError(result.error)
    } catch {
      reportError('Standalone export failed.')
    } finally {
      setIsExporting(false)
    }
  }

  // Connect edges
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds))
    },
    [setEdges]
  )

  // Listen to IPC status change and logs
  useEffect(() => {
    if (typeof window === 'undefined' || !window.botApi) return

    const unsubLog = window.botApi.onLog((log: BotLog) => {
      setLogs((prev) => [...prev.slice(-499), log])
    })

    const unsubStatus = window.botApi.onStatusChange((running: boolean) => {
      setIsRunning(running)
      setIsStarting(false)
    })

    window.botApi
      .getBotStatus()
      .then((res) => setIsRunning(res.running))
      .catch((err) => console.error('Failed to get status:', err))

    return () => {
      unsubLog()
      unsubStatus()
    }
  }, [])

  // Start / Stop Bot
  const handleToggleBot = async (): Promise<void> => {
    if (!window.botApi) {
      alert('Bot API unavailable. Please launch inside Yapin Bot Maker desktop app.')
      return
    }

    if (isRunning) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'info',
          message: 'Stopping bot session...'
        }
      ])
      try {
        await window.botApi.stopBot()
      } catch (err: unknown) {
        reportError((err as Error).message || 'Failed to stop bot')
      }
    } else {
      if (!token.trim()) {
        alert('Please enter your Yapin Bot Token first.')
        return
      }

      setIsStarting(true)
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'info',
          message: 'Initiating bot startup sequence with configured graph...'
        }
      ])

      try {
        const res = await window.botApi.startBot({
          token: token.trim(),
          nodes,
          edges
        })

        if (!res.success) {
          setIsStarting(false)
          reportError(res.message || 'Failed to start bot')
        }
      } catch (err: unknown) {
        setIsStarting(false)
        reportError((err as Error).message || 'Unexpected startup error')
      }
    }
  }

  // Save Project to Disk
  const handleSaveProject = async (): Promise<void> => {
    if (!window.botApi) return
    try {
      const res = await window.botApi.saveProject({
        token: token.trim(),
        nodes,
        edges
      })
      if (res.success && res.filePath) {
        const updatedProj: BotProjectRecord = {
          ...activeProject,
          filePath: res.filePath,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodes,
          edges,
          lastModified: Date.now()
        }
        setActiveProject(updatedProj)
        saveProjectRecord(updatedProj)

        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            level: 'success',
            message: `Project saved successfully to ${res.filePath}`
          }
        ])
      } else if (res.error) {
        reportError(res.error)
      }
    } catch (err: unknown) {
      reportError((err as Error).message || 'Failed to save project')
    }
  }

  // Load Project from Disk
  const handleLoadProject = async (): Promise<void> => {
    if (!window.botApi) return
    try {
      const res = await window.botApi.loadProject()
      if (res.success && res.data) {
        if (res.data.token) {
          setToken(res.data.token)
        }
        if (res.data.nodes) {
          setNodes(res.data.nodes as BotNode[])
        }
        if (res.data.edges) {
          setEdges(res.data.edges as BotEdge[])
        }
        const loadedProj: BotProjectRecord = {
          id: `proj-${Date.now().toString(36)}`,
          name: res.filePath
            ? res.filePath.split(/[/\\]/).pop()?.replace('.yapbot.json', '') || 'Imported Bot'
            : 'Imported Bot',
          description: 'Loaded from local .yapbot.json file.',
          filePath: res.filePath,
          nodeCount: res.data.nodes?.length || 0,
          edgeCount: res.data.edges?.length || 0,
          nodes: (res.data.nodes as BotNode[]) || [],
          edges: (res.data.edges as BotEdge[]) || [],
          lastModified: Date.now()
        }
        setActiveProject(loadedProj)
        saveProjectRecord(loadedProj)
        setSelectedNodeId(null)
        setActiveTab('canvas')
        setTimeout(() => fitView({ padding: 0.2 }), 80)
      } else if (res.error) {
        setLogs((prev) => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            level: 'warn',
            message: `Load canceled or failed: ${res.error}`
          }
        ])
      }
    } catch (err: unknown) {
      reportError((err as Error).message || 'Failed to load project')
    }
  }

  // Clear / New Canvas
  const handleNewCanvas = (): void => {
    setNodes(INITIAL_NODES)
    setEdges(INITIAL_EDGES)
    setSelectedNodeId(null)
    setTimeout(() => fitView({ padding: 0.2 }), 50)
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'info',
        message: 'Canvas cleared and reset to initial starter nodes.'
      }
    ])
  }

  // Switch to specific project from Home or ProjectsView
  const handleOpenProjectRecord = (project: BotProjectRecord): void => {
    setActiveProject(project)
    setNodes(project.nodes)
    setEdges(project.edges)
    setSelectedNodeId(null)
    setActiveTab('canvas')
    setTimeout(() => fitView({ padding: 0.2 }), 80)
    setLogs((prev) => [
      ...prev.slice(-499),
      {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'info',
        message: `Switched active project to "${project.name}".`
      }
    ])
  }

  const handleCreateNewProject = (): void => {
    const newProj = createNewProjectRecord('Untitled Bot Flow')
    handleOpenProjectRecord(newProj)
  }

  // Select pre-built template
  const handleSelectTemplate = (template: BotTemplate): void => {
    setNodes(template.nodes)
    setEdges(template.edges)
    setSelectedNodeId(null)
    const newProj: BotProjectRecord = {
      id: `proj-${Date.now().toString(36)}`,
      name: template.name,
      description: template.description,
      nodeCount: template.nodes.length,
      edgeCount: template.edges.length,
      nodes: template.nodes,
      edges: template.edges,
      lastModified: Date.now()
    }
    setActiveProject(newProj)
    saveProjectRecord(newProj)
    setActiveTab('canvas')
    setTimeout(() => fitView({ padding: 0.2 }), 80)
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level: 'success',
        message: `Loaded template: "${template.name}".`
      }
    ])
  }

  // Add node from Palette
  const handleAddNode = (item: PaletteItem): void => {
    const newId = `${item.type}-${Date.now().toString(36)}`
    const newNode: BotNode = {
      id: newId,
      type: item.type,
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: { ...item.defaultData }
    }
    setNodes((nds) => [...nds, newNode])
    setSelectedNodeId(newId)
  }

  // Drag and drop onto canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return

      try {
        const item: PaletteItem = JSON.parse(raw)
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
        setSelectedNodeId(newId)
      } catch (e) {
        console.error('Error dropping node:', e)
      }
    },
    [screenToFlowPosition, setNodes]
  )

  // Node Inspector updates
  const handleUpdateNodeData = (nodeId: string, patch: Partial<CustomNodeData>): void => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...patch
            } as CustomNodeData
          }
        }
        return node
      })
    )
  }

  const handleDuplicateNode = (nodeToDup: BotNode): void => {
    const newId = `${nodeToDup.type}-${Date.now().toString(36)}`
    const duplicated: BotNode = {
      ...nodeToDup,
      id: newId,
      position: { x: nodeToDup.position.x + 30, y: nodeToDup.position.y + 30 },
      data: { ...nodeToDup.data, label: `${String(nodeToDup.data.label || nodeToDup.type)} (Copy)` }
    }
    setNodes((nds) => [...nds, duplicated])
    setSelectedNodeId(newId)
  }

  const handleDeleteNode = (nodeId: string): void => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }

  // Install marketplace item
  const handleInstallMarketplaceItem = (item: MarketplaceItem): void => {
    if (item.type === 'template' && item.nodes) {
      setNodes(item.nodes)
      setEdges(item.edges || [])
      setSelectedNodeId(null)
      const newProj: BotProjectRecord = {
        id: `proj-${Date.now().toString(36)}`,
        name: item.name,
        description: item.description,
        nodeCount: item.nodes.length,
        edgeCount: item.edges?.length || 0,
        nodes: item.nodes,
        edges: item.edges || [],
        lastModified: Date.now()
      }
      setActiveProject(newProj)
      saveProjectRecord(newProj)
      setActiveTab('canvas')
      setTimeout(() => fitView({ padding: 0.2 }), 80)
      setLogs((prev) => [
        ...prev.slice(-499),
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'success',
          message: `Installed template "${item.name}" from Marketplace.`
        }
      ])
    } else if (item.nodes && item.nodes.length > 0) {
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0)
      const startY = maxY > 0 ? maxY + 160 : 100
      const originY = item.nodes[0].position.y
      const adjustedNodes: BotNode[] = item.nodes.map((n, idx) => ({
        ...n,
        id: `${n.type}-${Date.now().toString(36)}-${idx}`,
        position: { x: n.position.x, y: startY + (n.position.y - originY) }
      }))

      const newEdges: BotEdge[] = []
      for (let i = 0; i < adjustedNodes.length - 1; i++) {
        const src = adjustedNodes[i]
        const tgt = adjustedNodes[i + 1]
        const isCond =
          src.type === 'textCondition' ||
          src.type === 'checkUserRole' ||
          src.type === 'cooldownTimer'
        newEdges.push({
          id: `e-${src.id}-${tgt.id}`,
          source: src.id,
          target: tgt.id,
          sourceHandle: isCond ? 'true' : 'out',
          targetHandle: 'in'
        })
      }

      setNodes((nds) => [...nds, ...adjustedNodes])
      setEdges((eds) => [...eds, ...newEdges])
      setActiveTab('canvas')
      setTimeout(() => fitView({ padding: 0.2 }), 80)
      setLogs((prev) => [
        ...prev.slice(-499),
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'success',
          message: `Installed community package "${item.name}" (${adjustedNodes.length} nodes) onto canvas.`
        }
      ])
    }
  }

  return (
    <div className="app-root-suite">
      {/* 1. Left Vertical Sidebar Rail (#1e1f22) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isRunning={isRunning}
        onOpenSettings={() => setIsPreferencesOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
      />

      {/* 2. Main Suite Viewport */}
      <main className="app-main-viewport">
        {activeTab === 'home' && (
          <HomeView
            onNavigate={setActiveTab}
            onNewProject={handleCreateNewProject}
            onOpenProjectFile={handleLoadProject}
            onLoadProjectRecord={handleOpenProjectRecord}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            isRunning={isRunning}
          />
        )}

        {activeTab === 'canvas' && (
          <div className="studio-container">
            <Toolbar
              token={token}
              rememberToken={rememberToken}
              tokenStorageAvailable={tokenStorageReady && tokenStorageAvailable}
              onRememberToken={handleRememberToken}
              onExportStandalone={handleExportStandalone}
              isExporting={isExporting}
              onTokenChange={handleTokenChange}
              isRunning={isRunning}
              isStarting={isStarting}
              onToggleBot={handleToggleBot}
              onSaveProject={handleSaveProject}
              onLoadProject={handleLoadProject}
              onNewCanvas={handleNewCanvas}
              onOpenTemplates={() => setIsTemplatesOpen(true)}
              projectName={activeProject.name}
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
                  onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
                  onPaneClick={() => setSelectedNodeId(null)}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  defaultEdgeOptions={{ animated: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1.5}
                    color="#223249"
                  />
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
                      if (node.type === 'setVariable' || node.type === 'getVariable')
                        return '#f59e0b'
                      return '#10b981'
                    }}
                    maskColor="rgba(11, 15, 25, 0.75)"
                  />
                </ReactFlow>
              </div>

              <NodeInspectorDrawer
                selectedNode={selectedNode}
                onClose={() => setSelectedNodeId(null)}
                onUpdateData={handleUpdateNodeData}
                onDuplicateNode={handleDuplicateNode}
                onDeleteNode={handleDeleteNode}
              />
            </div>

            <ConsoleDrawer logs={logs} onClearLogs={() => setLogs([])} isRunning={isRunning} />
          </div>
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            onOpenProject={handleOpenProjectRecord}
            onImportFromFile={handleLoadProject}
            onExportStandalone={(proj) => {
              handleOpenProjectRecord(proj)
              void handleExportStandalone()
            }}
          />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceView
            onInstallItem={handleInstallMarketplaceItem}
            onApplyTheme={(themeId) => applyTheme(themeId)}
          />
        )}

        {activeTab === 'themes' && <ThemesView onThemeChanged={(themeId) => applyTheme(themeId)} />}

        {activeTab === 'plugins' && <PluginsView />}
      </main>

      {/* Global Modals */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onThemeChanged={(themeId) => applyTheme(themeId)}
      />

      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />

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
