import {
  dialog,
  type BrowserWindow,
  type SaveDialogOptions,
  type OpenDialogOptions
} from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { isRecord, validateGraph, type BotGraphPayload } from './botRunner'

export function parseProject(value: unknown): BotGraphPayload {
  if (!isRecord(value)) throw new Error('Invalid project file.')
  if (value.version !== undefined && value.version !== '1.0.0') {
    throw new Error(`Unsupported project version: ${String(value.version)}`)
  }
  let graph: unknown = value
  if (value.graph !== undefined) {
    if (!isRecord(value.graph)) throw new Error('Project graph must be an object.')
    graph = {
      token: value.token,
      name: value.name,
      nodes: value.graph.nodes,
      edges: value.graph.edges
    }
  }
  validateGraph(graph)
  return graph
}

export async function saveProject(
  window: BrowserWindow | null,
  input: unknown
): Promise<{
  success: boolean
  filePath?: string
  error?: string
}> {
  try {
    validateGraph(input)
    const graph = structuredClone(input)
    const options: SaveDialogOptions = {
      title: 'Save Yapin Bot Project',
      defaultPath: 'my-bot.yapbot.json',
      filters: [{ name: 'Yapin Bot Project (*.yapbot.json)', extensions: ['yapbot.json'] }]
    }
    const result = await (window
      ? dialog.showSaveDialog(window, options)
      : dialog.showSaveDialog(options))
    if (result.canceled || !result.filePath) return { success: false }
    // The native dialog supplies the default extension; also handle explicitly typed names.
    const filePath = result.filePath.toLowerCase().endsWith('.yapbot.json')
      ? result.filePath
      : `${result.filePath}.yapbot.json`
    await writeFile(
      filePath,
      JSON.stringify(
        {
          version: '1.0.0',
          name: graph.name ?? 'My Yapin Bot',
          savedAt: new Date().toISOString(),
          token: graph.token,
          graph: { nodes: graph.nodes, edges: graph.edges }
        },
        null,
        2
      ),
      { encoding: 'utf8', flag: filePath === result.filePath ? 'w' : 'wx' }
    )
    return { success: true, filePath }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function loadProject(window: BrowserWindow | null): Promise<{
  success: boolean
  data?: BotGraphPayload
  filePath?: string
  error?: string
}> {
  try {
    const options: OpenDialogOptions = {
      title: 'Open Yapin Bot Project',
      properties: ['openFile'],
      filters: [{ name: 'Yapin Bot Project (*.yapbot.json)', extensions: ['yapbot.json'] }]
    }
    const result = await (window
      ? dialog.showOpenDialog(window, options)
      : dialog.showOpenDialog(options))
    if (result.canceled || result.filePaths.length === 0) return { success: false }
    const filePath = result.filePaths[0]
    const data = parseProject(JSON.parse(await readFile(filePath, 'utf8')) as unknown)
    return { success: true, data, filePath }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
