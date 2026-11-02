import {
  dialog,
  type BrowserWindow,
  type SaveDialogOptions,
  type OpenDialogOptions
} from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { isRecord, validateGraph, type BotGraphPayload } from './botRunner'
import { cleanProjectGraph } from '../shared/nodeSupport'

export function parseProject(value: unknown): BotGraphPayload {
  if (!isRecord(value)) throw new Error('Invalid project file.')
  if (value.version !== undefined && value.version !== '1.0.0') {
    throw new Error(`Unsupported project version: ${String(value.version)}`)
  }
  const source = value.graph === undefined ? value : value.graph
  if (!isRecord(source)) throw new Error('Project graph must be an object.')
  const prefix =
    (typeof value.commandPrefix === 'string' && value.commandPrefix) ||
    (typeof value.prefix === 'string' && value.prefix) ||
    (isRecord(source) && typeof source.commandPrefix === 'string' && source.commandPrefix) ||
    (isRecord(source) && typeof source.prefix === 'string' && source.prefix) ||
    undefined
  const graph: unknown = cleanProjectGraph({
    token: '',
    name: value.name,
    ...(prefix ? { prefix, commandPrefix: prefix } : {}),
    nodes: source.nodes,
    edges: source.edges,
    ...(source.flows ? { flows: source.flows, folders: source.folders } : {})
  })
  validateGraph(graph)
  return graph
}

/** Only graph fields are shareable; reject credentials pasted into node settings as well. */
export function publicGraph(input: unknown): {
  nodes: BotGraphPayload['nodes']
  edges: BotGraphPayload['edges']
  flows?: BotGraphPayload['flows']
  folders?: BotGraphPayload['folders']
  prefix?: string
  commandPrefix?: string
} {
  input = cleanProjectGraph(input)
  validateGraph(input)
  const result = {
    nodes: input.nodes,
    edges: input.edges,
    ...(input.flows ? { flows: input.flows, folders: input.folders } : {}),
    ...(input.prefix ? { prefix: input.prefix } : {}),
    ...(input.commandPrefix ? { commandPrefix: input.commandPrefix } : {})
  }
  const text = JSON.stringify({ ...result, name: input.name })
  if (
    (input.token.trim() && text.includes(input.token.trim())) ||
    /yb_[a-zA-Z0-9_-]{8,}/.test(text)
  ) {
    throw new Error('Remove bot tokens from node settings before saving or exporting.')
  }
  return structuredClone(result)
}

export async function saveProject(
  window: BrowserWindow | null,
  input: unknown,
  defaultDir?: unknown
): Promise<{
  success: boolean
  filePath?: string
  error?: string
}> {
  try {
    input = cleanProjectGraph(input)
    validateGraph(input)
    const graph = structuredClone(input)
    const options: SaveDialogOptions = {
      title: 'Save Yapin Bot Project',
      defaultPath: folderOrNothing(defaultDir, 'my-bot.yapbot.json'),
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
          ...(graph.prefix ? { prefix: graph.prefix } : {}),
          ...(graph.commandPrefix ? { commandPrefix: graph.commandPrefix } : {}),
          savedAt: new Date().toISOString(),
          graph: publicGraph(graph)
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

function folderOrNothing(dir: unknown, fileName: string): string {
  return typeof dir === 'string' && dir.trim() && existsSync(dir) ? join(dir, fileName) : fileName
}

export async function loadProject(
  window: BrowserWindow | null,
  defaultDir?: unknown
): Promise<{
  success: boolean
  data?: BotGraphPayload
  filePath?: string
  error?: string
}> {
  try {
    const options: OpenDialogOptions = {
      title: 'Open Yapin Bot Project',
      defaultPath:
        typeof defaultDir === 'string' && existsSync(defaultDir) ? defaultDir : undefined,
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
