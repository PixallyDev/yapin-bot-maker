import * as fs from 'node:fs/promises'
import { resolve, relative, isAbsolute, dirname, join, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import { zipSync, unzipSync } from 'fflate'

export const MAX_BYTES = 16 * 1024 * 1024
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(cell)
      cell = ''
      if (c !== ',') {
        if (c === '\r' && text[i + 1] === '\n') i++
        rows.push(row)
        row = []
      }
    } else cell += c
  }
  if (quoted) throw Error('CSV contains an unclosed quoted field.')
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const headers = rows.shift() ?? []
  if (new Set(headers).size !== headers.length) throw Error('CSV headers must be unique.')
  return rows
    .filter((r) => r.length > 1 || r[0] !== '')
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
}
export function formatCSV(rows: Record<string, unknown>[]): string {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const escape = (value: unknown): string => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [headers, ...rows.map((row) => headers.map((h) => row[h]))]
    .map((row) => row.map(escape).join(','))
    .join('\r\n')
}
type Database = { kv: Record<string, unknown>; tables: Record<string, Record<string, unknown>[]> }
const locks = new Map<string, Promise<unknown>>()
/** Every ancestor is checked, including existing junctions. Absolute paths and traversal are denied. */
export class ProjectStorage {
  constructor(public readonly root: string) {}
  async path(name: string, createParent = false, allowRoot = false): Promise<string> {
    if (
      !name ||
      name.includes('\0') ||
      isAbsolute(name) ||
      /^[a-z]:|^[/\\]|(^|[/\\])\.\.([/\\]|$)|:/.test(name.toLowerCase())
    )
      throw Error('Path must stay inside the project folder.')
    await fs.mkdir(this.root, { recursive: true })
    const root = await fs.realpath(this.root)
    const target = resolve(root, name)
    const rel = relative(root, target)
    if ((!rel && !allowRoot) || rel.startsWith(`..${sep}`) || isAbsolute(rel))
      throw Error('Path must name a file inside the project folder.')
    let current = root
    for (const part of rel.split(sep)) {
      current = join(current, part)
      try {
        if ((await fs.lstat(current)).isSymbolicLink())
          throw Error('Symlinks and junctions are not allowed in project file paths.')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
    if (createParent) await fs.mkdir(dirname(target), { recursive: true })
    return target
  }
  async read(name: string): Promise<Buffer> {
    const file = await this.path(name)
    if ((await fs.stat(file)).size > MAX_BYTES) throw Error('File exceeds the 16 MB limit.')
    return fs.readFile(file)
  }
  async write(name: string, value: string | Uint8Array, append = false): Promise<void> {
    if (Buffer.byteLength(value) > MAX_BYTES) throw Error('File exceeds the 16 MB limit.')
    const file = await this.path(name, true)
    if (append) {
      let size = 0
      try {
        size = (await fs.stat(file)).size
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      if (size + Buffer.byteLength(value) > MAX_BYTES)
        throw Error('Appended file exceeds the 16 MB limit.')
      await fs.appendFile(file, value)
    } else {
      const temp = `${file}.${randomUUID()}.tmp`
      try {
        await fs.writeFile(temp, value, { flag: 'wx' })
        await fs.rename(temp, file)
      } finally {
        await fs.rm(temp, { force: true }).catch(() => {})
      }
    }
  }
  async exists(name: string): Promise<boolean> {
    const file = await this.path(name)
    try {
      await fs.stat(file)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
      throw error
    }
  }
  async remove(name: string): Promise<void> {
    await fs.unlink(await this.path(name))
  }
  async list(name: string): Promise<string[]> {
    const dir = await this.path(name, false, true)
    return fs.readdir(dir)
  }
  async database<T>(name: string, operation: (db: Database) => T | Promise<T>): Promise<T> {
    const key = await this.path(name, true)
    const previous = locks.get(key) ?? Promise.resolve()
    const next = previous
      .catch(() => {})
      .then(async () => {
        let db: Database = { kv: Object.create(null), tables: Object.create(null) }
        try {
          const parsed = JSON.parse((await this.read(name)).toString('utf8'))
          if (
            !parsed ||
            typeof parsed.kv !== 'object' ||
            !parsed.kv ||
            Array.isArray(parsed.kv) ||
            typeof parsed.tables !== 'object' ||
            !parsed.tables ||
            Array.isArray(parsed.tables)
          )
            throw Error('Invalid JSON database file.')
          // Treat arbitrary user keys (including __proto__) as data after reload too.
          db = {
            kv: Object.assign(Object.create(null), parsed.kv),
            tables: Object.assign(Object.create(null), parsed.tables)
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        const value = await operation(db)
        await this.write(name, JSON.stringify(db, null, 2))
        return value
      })
    locks.set(key, next)
    try {
      return await next
    } finally {
      if (locks.get(key) === next) locks.delete(key)
    }
  }
  async archive(source: string, destination: string, unzip = false): Promise<void> {
    if (unzip) {
      const bytes = await this.read(source)
      let declaredSize = 0,
        count = 0
      const data = unzipSync(bytes, {
        filter: (entry) => {
          declaredSize += entry.originalSize
          if (++count > 4096 || declaredSize > MAX_BYTES || entry.originalSize > MAX_BYTES)
            throw Error('Archive entry is too large.')
          return true
        }
      })
      let total = 0
      for (const [name, value] of Object.entries(data)) {
        total += value.length
        if (total > MAX_BYTES) throw Error('Archive exceeds the 16 MB limit.')
        if (name.endsWith('/')) continue
        await this.write(`${destination}/${name}`, value)
      }
      return
    }
    const files: Record<string, Uint8Array> = {}
    let total = 0
    const walk = async (base: string, rel = ''): Promise<void> => {
      for (const item of await fs.readdir(await this.path(base, false, true), {
        withFileTypes: true
      })) {
        if (item.isSymbolicLink()) throw Error('Cannot archive symlinks.')
        const sub = rel ? `${rel}/${item.name}` : item.name
        const file = `${source}/${sub}`
        if (item.isDirectory()) await walk(file, sub)
        else {
          const value = await this.read(file)
          total += value.length
          if (total > MAX_BYTES) throw Error('Archive exceeds the 16 MB limit.')
          files[sub] = value
        }
      }
    }
    await walk(source)
    await this.write(destination, zipSync(files))
  }
}
