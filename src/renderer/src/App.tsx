import { FlowManager } from './components/FlowManager'
import { cleanProjectGraph } from '../../shared/nodeSupport'
import { AddNodeMenu } from './components/AddNodeMenu'
import { CATALOG_BY_TYPE } from './data/nodeCatalog'
import { Flow, Folder, newFlow, defaultFolders } from './flows'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  BackgroundVariant,
  SelectionMode
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './assets/studio.css'

import { nodeTypes } from './nodes'
import { Sidebar, NavTabId } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { NodePalette } from './components/NodePalette'
import { DebugPanel } from './components/DebugPanel'
import { LiveDebugModal, LiveVariablesModal } from './components/DebugModals'
import { InfoModal } from './components/InfoModal'
import { PreferencesModal, type InfoKind } from './components/PreferencesModal'
import { PreferencesProvider } from './components/PreferencesProvider'
import { ProjectProvider } from './components/ProjectProvider'
import { normalizeCommandName } from './projectStore'
import { analyzeFlows, type FlowIssue } from './issuesAnalyzer'
import { TemplatesModal } from './components/TemplatesModal'
import { NodeInspectorDrawer } from './components/NodeInspectorDrawer'
import { NodeEditorModal } from './components/NodeEditorModal'
import { ContextMenu, ContextMenuTarget } from './components/ContextMenu'
import { AccountModal } from './components/AccountModal'
import { ProfileDropdown } from './components/ProfileDropdown'
import { InboxModal } from './components/InboxModal'
import { AccountProvider } from './components/AccountProvider'
import { usePreferences } from './preferencesStore'
import { FloatingSelectionBar } from './components/FloatingSelectionBar'
import { ShareToFriendModal } from './components/ShareToFriendModal'
import { ShareToSupportModal } from './components/ShareToSupportModal'
import { AuthGuardModal } from './components/AuthGuardModal'
import { NewProjectModal } from './components/NewProjectModal'
import { BotSettingsModal } from './components/BotSettingsModal'

import { HomeView } from './views/HomeView'
import { ProjectsView } from './views/ProjectsView'
import { MarketplaceView } from './views/MarketplaceView'
import { ThemesView } from './views/ThemesView'

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
  const [initialProject] = useState(() => getSavedProjects()[0])
  const [nodes, setNodes, onNodesChange] = useNodesState<BotNode>(
    initialProject?.flows
      ? (initialProject.flows.find((f) => f.isOpen)?.nodes ?? [])
      : (initialProject?.nodes ?? INITIAL_NODES)
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<BotEdge>(
    initialProject?.flows
      ? (initialProject.flows.find((f) => f.isOpen)?.edges ?? [])
      : (initialProject?.edges ?? INITIAL_EDGES)
  )
  const [logs, setLogs] = useState<BotLog[]>([
    {
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      level: 'info',
      message: 'Yapper Maker studio initialized. Welcome to the workspace.'
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

  const [flows, setFlows] = useState<Flow[]>(
    () => activeProject.flows ?? [newFlow('Main', activeProject.nodes, activeProject.edges)]
  )
  const [folders, setFolders] = useState<Folder[]>(activeProject.folders ?? defaultFolders)
  const [flowId, setFlowId] = useState(() => flows.find((f) => f.isOpen)?.id ?? '')
  const [toast, setToast] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const liveFlows = flows.map((f) => (f.id === flowId ? { ...f, nodes, edges } : f))
  const projectPayload = {
    projectFilePath: activeProject.filePath,
    projectId: activeProject.id,
    token,
    name: activeProject.name,
    prefix: activeProject.prefix || '/',
    commandPrefix: activeProject.prefix || '/',
    nodes,
    edges,
    flows: liveFlows,
    folders
  }
  const switchFlow = useCallback(
    (id: string, list = liveFlows): void => {
      const next = list.find((f) => f.id === id)
      setFlows(list.map((f) => (f.id === id ? { ...f, isOpen: true } : f)))
      setFlowId(id)
      setNodes(next?.nodes ?? [])
      setEdges(next?.edges ?? [])
      setSelectedNodeId(null)
    },
    [liveFlows, setNodes, setEdges, setSelectedNodeId]
  )

  const addFlow = useCallback(
    (name = 'Untitled flow', n: BotNode[] = [], e: BotEdge[] = []): void => {
      const flow = newFlow(name, n, e)
      const folder = folders.find((f) => !f.isDisabled)
      flow.folderId = folder?.id
      switchFlow(flow.id, [...liveFlows, flow])
      setActiveTab('canvas')
    },
    [folders, liveFlows, switchFlow]
  )
  const restoreFlows = (project: {
    prefix?: string
    flows?: Flow[]
    folders?: Folder[]
    nodes: BotNode[]
    edges: BotEdge[]
  }): void => {
    const projPrefix = project.prefix || activeProject.prefix || '/'
    const cleanNodes = (nds: BotNode[]): BotNode[] =>
      nds.map((n) => {
        if (n.type === 'onCommand' && n.data?.commandName) {
          return {
            ...n,
            data: {
              ...n.data,
              commandName: normalizeCommandName(n.data.commandName, projPrefix) || 'ping'
            }
          }
        }
        return n
      })

    project = cleanProjectGraph(project)
    const rawList = project.flows ?? [newFlow('Main', project.nodes, project.edges)]
    const list = rawList.map((fl) => ({
      ...fl,
      nodes: cleanNodes(fl.nodes)
    }))
    setFolders(project.folders ?? defaultFolders)
    switchFlow(list.find((f) => f.isOpen)?.id ?? list[0]?.id ?? '', list)
  }
  const { prefs } = usePreferences()
  const [editingNode, setEditingNode] = useState<BotNode | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    target: ContextMenuTarget
    position: { x: number; y: number }
  } | null>(null)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [addNodeMenu, setAddNodeMenu] = useState<{
    x: number
    y: number
    position: { x: number; y: number }
  } | null>(null)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [accountInitialMode, setAccountInitialMode] = useState<'settings' | 'signin'>('settings')
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [debugCollapsed, setDebugCollapsed] = useState(false)
  const [isLiveDebugOpen, setIsLiveDebugOpen] = useState(false)
  const [isLiveVarsOpen, setIsLiveVarsOpen] = useState(false)
  const [infoModalKind, setInfoModalKind] = useState<InfoKind | null>(null)
  const [isShareFriendOpen, setIsShareFriendOpen] = useState(false)
  const [isShareSupportOpen, setIsShareSupportOpen] = useState(false)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [isBotSettingsOpen, setIsBotSettingsOpen] = useState(false)
  const [authGuardAction, setAuthGuardAction] = useState<string | null>(null)
  const [marketplacePublishSnippet, setMarketplacePublishSnippet] = useState<{
    name: string
    nodes: BotNode[]
    edges: BotEdge[]
  } | null>(null)

  useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ nodeId: string }>).detail
      if (detail?.nodeId) {
        const target = nodes.find((n) => n.id === detail.nodeId)
        if (target) setEditingNode(target)
      }
    }
    window.addEventListener('yapin:open-node-editor', handler)
    return () => window.removeEventListener('yapin:open-node-editor', handler)
  }, [nodes])

  const [rememberToken, setRememberToken] = useState(false)
  const [tokenStorageReady, setTokenStorageReady] = useState(false)
  const [tokenStorageAvailable, setTokenStorageAvailable] = useState(false)

  const tokenEdited = useRef(false)
  const tokenSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes])
  const selectedInternalEdges = useMemo(() => {
    const selIds = new Set(selectedNodes.map((n) => n.id))
    return edges.filter((e) => selIds.has(e.source) && selIds.has(e.target))
  }, [selectedNodes, edges])

  const handleDeselectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)))
    setSelectedNodeId(null)
  }, [setNodes, setSelectedNodeId])

  const handleCreateGroup = useCallback(() => {
    if (selectedNodes.length < 2) return
    const groupName = `Group (${selectedNodes.length} nodes)`
    addFlow(groupName, selectedNodes, selectedInternalEdges)
    setToast(`Created group "${groupName}" with ${selectedNodes.length} nodes!`)
    setTimeout(() => setToast(''), 3500)
  }, [selectedNodes, selectedInternalEdges, addFlow])

  const handleShareToMarketplace = useCallback(() => {
    if (selectedNodes.length === 0) return
    setMarketplacePublishSnippet({
      name: `${String(selectedNodes[0].data.label || selectedNodes[0].type)} Subgraph`,
      nodes: selectedNodes,
      edges: selectedInternalEdges
    })
    setActiveTab('marketplace')
  }, [selectedNodes, selectedInternalEdges])

  const issues = useMemo<FlowIssue[]>(() => analyzeFlows(liveFlows, folders), [liveFlows, folders])

  const handleSelectIssue = (issue: FlowIssue): void => {
    if (issue.flowId && issue.flowId !== flowId) {
      switchFlow(issue.flowId)
    }
    if (issue.nodeId) {
      setSelectedNodeId(issue.nodeId)
      setTimeout(() => {
        fitView({ nodes: [{ id: issue.nodeId! }], duration: 450, maxZoom: 1.2 })
      }, 50)
    }
  }

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
      const result = await window.botApi.exportStandalone(projectPayload)
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
    if (typeof window === 'undefined' || !window.botApi) return

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
        const res = await window.botApi.startBot(projectPayload)

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
    if (typeof window === 'undefined' || !window.botApi) return
    try {
      const res = await window.botApi.saveProject(projectPayload)
      if (res.success && res.filePath) {
        const updatedProj: BotProjectRecord = {
          ...activeProject,
          flows: liveFlows,
          folders,
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
    if (typeof window === 'undefined' || !window.botApi) return
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
        loadedProj.flows = res.data.flows as Flow[] | undefined
        loadedProj.folders = res.data.folders as Folder[] | undefined
        restoreFlows(loadedProj)
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
    restoreFlows(project)
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

  const handleConfirmCreateProject = (data: {
    name: string
    template: 'starter' | 'blank'
    location: string
    icon: string
    iconBg: string
  }): void => {
    const newProj = createNewProjectRecord(data)
    handleOpenProjectRecord(newProj)
    setIsNewProjectOpen(false)
    setToast(`Created project "${newProj.name}"!`)
    setTimeout(() => setToast(''), 3500)
  }

  const handleSaveBotSettings = (updated: {
    name: string
    token: string
    prefix: string
    permissions?: number
    icon?: string
    iconBg?: string
  }): void => {
    const updatedProj: BotProjectRecord = {
      ...activeProject,
      name: updated.name,
      prefix: updated.prefix,
      permissions: updated.permissions,
      icon: updated.icon ?? activeProject.icon,
      iconBg: updated.iconBg ?? activeProject.iconBg,
      lastModified: Date.now()
    }
    setActiveProject(updatedProj)
    saveProjectRecord(updatedProj)
    if (updated.token !== token) {
      setToken(updated.token)
      try {
        window.sessionStorage.setItem('yapin_bot_token', updated.token)
      } catch (err) {
        void err
      }
    }
    setIsBotSettingsOpen(false)
    setToast(`Saved settings for "${updatedProj.name}"`)
    setTimeout(() => setToast(''), 3000)
  }

  // Select pre-built template
  const handleSelectTemplate = (template: BotTemplate): void => {
    addFlow(template.name, template.nodes, template.edges)
  }

  // Add node from Palette
  const handleAddNode = (item: PaletteItem, position?: { x: number; y: number }): void => {
    const newId = crypto.randomUUID()
    const newNodeData = { ...item.defaultData }
    if (item.type === 'onCommand' && newNodeData.commandName) {
      newNodeData.commandName =
        normalizeCommandName(newNodeData.commandName, activeProject.prefix) || 'ping'
    }
    const newNode: BotNode = {
      id: newId,
      type: item.type,
      position: position ?? { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 },
      data: newNodeData
    }
    if (!flowId) {
      addFlow('Untitled flow', [newNode])
      return
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
      const raw = event.dataTransfer.getData('application/yapin-node')
      if (!raw) return

      try {
        const payload: unknown = JSON.parse(raw)
        const item =
          payload && typeof payload === 'object' && 'type' in payload
            ? CATALOG_BY_TYPE.get(String(payload.type))
            : undefined
        if (!item) return
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY
        })

        const newId = crypto.randomUUID()
        const nodeData = { ...item.defaultData }
        if (item.type === 'onCommand' && nodeData.commandName) {
          nodeData.commandName =
            normalizeCommandName(nodeData.commandName, activeProject.prefix) || 'ping'
        }
        const newNode: BotNode = {
          id: newId,
          type: item.type,
          position,
          data: nodeData
        }

        setNodes((nds) => [...nds, newNode])
        setSelectedNodeId(newId)
      } catch (e) {
        console.error('Error dropping node:', e)
      }
    },
    [activeProject.prefix, screenToFlowPosition, setNodes, setSelectedNodeId]
  )

  // Node Inspector updates
  const handleUpdateNodeData = (nodeId: string, patch: Partial<CustomNodeData>): void => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updated = { ...node.data, ...patch }
          if (node.type === 'onCommand' && 'commandName' in patch) {
            updated.commandName =
              normalizeCommandName(updated.commandName, activeProject.prefix) || 'ping'
          }
          return {
            ...node,
            data: updated
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

  const handleRenameNode = (nodeId: string, newLabel: string): void => {
    handleUpdateNodeData(nodeId, { label: newLabel })
  }

  const handleChangeNodeColor = (nodeId: string, color: string | undefined): void => {
    handleUpdateNodeData(nodeId, { customColor: color })
  }

  const handleUpdateEdgeLabel = (edgeId: string, newLabel: string): void => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              label: newLabel || undefined,
              labelStyle: { fill: '#ffffff', fontWeight: 600, fontSize: 11 },
              labelBgStyle: { fill: '#182234', fillOpacity: 0.9, rx: 4, ry: 4 }
            }
          : e
      )
    )
  }

  const handleUpdateEdgeColor = (edgeId: string, color: string | undefined): void => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              style: color ? { ...e.style, stroke: color, strokeWidth: 2.5 } : undefined
            }
          : e
      )
    )
  }

  const handleDeleteEdge = (edgeId: string): void => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId))
  }

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: BotNode): void => {
    event.preventDefault()
    setContextMenu({
      target: { type: 'node', node },
      position: { x: event.clientX, y: event.clientY }
    })
  }, [])

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: BotEdge): void => {
    event.preventDefault()
    setContextMenu({
      target: { type: 'edge', edge },
      position: { x: event.clientX, y: event.clientY }
    })
  }, [])

  // Install marketplace item
  const handleInstallMarketplaceItem = (item: MarketplaceItem): void => {
    try {
      if (!item.nodes?.length) throw new Error('This item has no installable nodes.')
      const itemEdges =
        item.edges ??
        item.nodes.slice(0, -1).map((n, i) => ({
          id: crypto.randomUUID(),
          source: n.id,
          target: item.nodes![i + 1].id,
          sourceHandle: ['textCondition', 'checkUserRole', 'cooldownTimer'].includes(String(n.type))
            ? 'true'
            : 'out',
          targetHandle: 'in'
        }))
      addFlow(item.name, item.nodes, itemEdges)
      setToast(`Installed ${item.name}`)
      setTimeout(() => setToast(''), 3500)
    } catch (error) {
      reportError(error instanceof Error ? error.message : 'Invalid marketplace item')
    }
  }

  return (
    <ProjectProvider project={activeProject} commandPrefix={activeProject.prefix || '/'}>
      <div className="app-root-suite">
        {/* 1. Left Vertical Sidebar Rail (#1e1f22) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isRunning={isRunning}
          onOpenSettings={() => setIsPreferencesOpen(true)}
          onOpenAccount={() => {
            setAccountInitialMode('settings')
            setIsAccountOpen(true)
          }}
          onOpenInbox={() => setIsInboxOpen(true)}
          onOpenProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
        />

        {/* Sidebar Profile Popup Menu (Image 6) */}
        <ProfileDropdown
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
          onOpenAccountSettings={() => {
            setAccountInitialMode('settings')
            setIsAccountOpen(true)
          }}
          onSwitchAccount={() => {
            setAccountInitialMode('signin')
            setIsAccountOpen(true)
          }}
        />

        {/* 2. Main Suite Viewport */}
        <main className="app-main-viewport">
          {activeTab === 'home' && (
            <HomeView
              onNavigate={setActiveTab}
              onNewProject={() => setIsNewProjectOpen(true)}
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
                onOpenBotSettings={() => setIsBotSettingsOpen(true)}
                projectName={activeProject.name}
              />

              <div className="studio-main-body">
                <NodePalette onAddNode={handleAddNode} />

                <div className="studio-canvas-wrapper" ref={reactFlowWrapper}>
                  <FlowManager
                    flows={liveFlows}
                    folders={folders}
                    active={flowId}
                    select={(id) => switchFlow(id)}
                    create={() => addFlow()}
                    change={(list, groups) => {
                      setFolders(groups)
                      const next =
                        list.find((f) => f.id === flowId && f.isOpen) ?? list.find((f) => f.isOpen)
                      switchFlow(next?.id ?? '', list)
                    }}
                  />
                  {toast && (
                    <div className="flow-toast" role="status">
                      {toast}
                    </div>
                  )}
                  <FloatingSelectionBar
                    selectedNodes={selectedNodes}
                    onCreateGroup={handleCreateGroup}
                    onShareToFriend={() => setIsShareFriendOpen(true)}
                    onShareToSupport={() => setIsShareSupportOpen(true)}
                    onShareToMarketplace={handleShareToMarketplace}
                    onDeselect={handleDeselectAll}
                  />
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onPaneContextMenu={(event) => {
                      event.preventDefault()
                      setContextMenu(null)
                      setAddNodeMenu({
                        x: event.clientX,
                        y: event.clientY,
                        position: screenToFlowPosition({ x: event.clientX, y: event.clientY })
                      })
                    }}
                    selectionKeyCode={['Control', 'Meta']}
                    multiSelectionKeyCode={['Control', 'Meta', 'Shift']}
                    selectionMode={SelectionMode.Partial}
                    onNodeClick={(_event, node) => {
                      setSelectedNodeId(node.id)
                      setContextMenu(null)
                      if (prefs.propertiesInModal) setEditingNode(node)
                    }}
                    onNodeDoubleClick={(_event, node) => {
                      setContextMenu(null)
                      setEditingNode(node)
                    }}
                    onNodeContextMenu={handleNodeContextMenu}
                    onEdgeContextMenu={handleEdgeContextMenu}
                    onPaneClick={() => {
                      setSelectedNodeId(null)
                      setContextMenu(null)
                      setNodes((nds) =>
                        nds.map((n) => (n.selected ? { ...n, selected: false } : n))
                      )
                    }}
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
                      pannable
                      zoomable
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

                {!prefs.propertiesInModal && selectedNode && (
                  <NodeInspectorDrawer
                    selectedNode={selectedNode}
                    onClose={() => setSelectedNodeId(null)}
                    onUpdateData={handleUpdateNodeData}
                    onDuplicateNode={handleDuplicateNode}
                    onDeleteNode={handleDeleteNode}
                    onOpenFullEditor={(nodeToEdit) => setEditingNode(nodeToEdit)}
                  />
                )}

                <DebugPanel
                  issues={issues}
                  activeFlowId={flowId}
                  onSelectIssue={handleSelectIssue}
                  logs={logs}
                  onClearLogs={() => setLogs([])}
                  isRunning={isRunning}
                  collapsed={debugCollapsed}
                  onToggleCollapsed={() => setDebugCollapsed((prev) => !prev)}
                  onOpenLiveDebug={() => setIsLiveDebugOpen(true)}
                  onOpenLiveVariables={() => setIsLiveVarsOpen(true)}
                />
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              activeProject={activeProject}
              onOpenProject={handleOpenProjectRecord}
              onActivateProject={handleOpenProjectRecord}
              onOpenNewProjectModal={() => setIsNewProjectOpen(true)}
              onImportFromFile={handleLoadProject}
              onExportStandalone={(proj) => {
                handleOpenProjectRecord(proj)
                if (window.botApi)
                  void window.botApi
                    .exportStandalone({
                      token,
                      nodes: proj.nodes,
                      edges: proj.edges,
                      flows: proj.flows,
                      folders: proj.folders
                    })
                    .then((r) => {
                      if (r.error) reportError(r.error)
                    })
              }}
            />
          )}

          {activeTab === 'marketplace' && (
            <MarketplaceView
              onInstallItem={handleInstallMarketplaceItem}
              onApplyTheme={(themeId) => applyTheme(themeId)}
              onOpenAccount={(mode) => {
                setAccountInitialMode(mode ?? 'signin')
                setIsAccountOpen(true)
              }}
              initialPublishItem={marketplacePublishSnippet}
              onClearInitialPublish={() => setMarketplacePublishSnippet(null)}
            />
          )}

          {activeTab === 'themes' && (
            <ThemesView onThemeChanged={(themeId) => applyTheme(themeId)} />
          )}
        </main>

        {/* Canvas Context Menu */}
        {addNodeMenu && (
          <AddNodeMenu
            key={`${addNodeMenu.x}-${addNodeMenu.y}`}
            x={addNodeMenu.x}
            y={addNodeMenu.y}
            onClose={() => setAddNodeMenu(null)}
            onSelect={(entry) => handleAddNode(entry, addNodeMenu.position)}
          />
        )}
        <ContextMenu
          target={contextMenu?.target ?? null}
          position={contextMenu?.position ?? null}
          onClose={() => setContextMenu(null)}
          onEditNode={(node) => setEditingNode(node)}
          onRenameNode={handleRenameNode}
          onChangeNodeColor={handleChangeNodeColor}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onEditLinkLabel={handleUpdateEdgeLabel}
          onChangeLinkColor={handleUpdateEdgeColor}
          onDeleteLink={handleDeleteEdge}
        />

        {/* Global Modals */}
        <NodeEditorModal
          node={editingNode}
          isOpen={Boolean(editingNode)}
          onClose={() => setEditingNode(null)}
          onSave={(nodeId, updatedData) => {
            handleUpdateNodeData(nodeId, updatedData)
          }}
          onDeleteNode={(nodeId) => {
            handleDeleteNode(nodeId)
          }}
          onDuplicateNode={(nodeToDup) => {
            handleDuplicateNode(nodeToDup)
          }}
        />
        <PreferencesModal
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          onViewInfo={(kind) => setInfoModalKind(kind)}
        />

        <InfoModal kind={infoModalKind} onClose={() => setInfoModalKind(null)} />

        {isLiveDebugOpen && (
          <LiveDebugModal logs={logs} onClose={() => setIsLiveDebugOpen(false)} />
        )}

        {isLiveVarsOpen && (
          <LiveVariablesModal isRunning={isRunning} onClose={() => setIsLiveVarsOpen(false)} />
        )}

        <InboxModal isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} />

        <AccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          initialMode={accountInitialMode}
        />

        <TemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          onSelectTemplate={handleSelectTemplate}
        />

        <ShareToFriendModal
          isOpen={isShareFriendOpen}
          nodes={selectedNodes}
          edges={selectedInternalEdges}
          onClose={() => setIsShareFriendOpen(false)}
          onSuccess={(msg) => {
            setToast(msg)
            setTimeout(() => setToast(''), 3500)
          }}
          onRequireAuth={() => {
            setAuthGuardAction('share flow snippets to friends')
            setIsShareFriendOpen(false)
          }}
        />

        <ShareToSupportModal
          isOpen={isShareSupportOpen}
          nodes={selectedNodes}
          edges={selectedInternalEdges}
          onClose={() => setIsShareSupportOpen(false)}
          onSuccess={(msg) => {
            setToast(msg)
            setTimeout(() => setToast(''), 3500)
          }}
          onRequireAuth={() => {
            setAuthGuardAction('submit diagnostic flows to Yapin Support')
            setIsShareSupportOpen(false)
          }}
        />

        <AuthGuardModal
          isOpen={Boolean(authGuardAction)}
          actionName={authGuardAction ?? undefined}
          onClose={() => setAuthGuardAction(null)}
          onSignIn={() => {
            setAuthGuardAction(null)
            setAccountInitialMode('signin')
            setIsAccountOpen(true)
          }}
        />

        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          onCreateProject={handleConfirmCreateProject}
        />

        <BotSettingsModal
          isOpen={isBotSettingsOpen}
          project={activeProject}
          token={token}
          onClose={() => setIsBotSettingsOpen(false)}
          onSave={handleSaveBotSettings}
        />
      </div>
    </ProjectProvider>
  )
}

export default function App(): React.JSX.Element {
  useEffect(() => {
    // Retire settings left by earlier releases; no feature reads these keys anymore.
    try {
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index)
        if (key === 'yapin_active_plugins_state' || key?.startsWith('yapin_plugin_settings_'))
          localStorage.removeItem(key)
      }
    } catch {
      // The studio still works when local storage is unavailable.
    }
  }, [])
  return (
    <PreferencesProvider>
      <AccountProvider>
        <ReactFlowProvider>
          <StudioCanvas />
        </ReactFlowProvider>
      </AccountProvider>
    </PreferencesProvider>
  )
}
