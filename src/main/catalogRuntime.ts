import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { toString as qrString } from 'qrcode'
import { PNG } from 'pngjs'
import jsQR from 'jsqr'
import { imageSize } from 'image-size'
import { createServer, type Server } from 'node:http'
import { timingSafeEqual, randomUUID } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { ProjectStorage, parseCSV, formatCSV, MAX_BYTES } from './runtimeStorage'
import {
  calculate,
  cryptText,
  jsonPath,
  jsonValue,
  listValue,
  record,
  stringify
} from './runtimeValues'

export interface RuntimeContext {
  signal: AbortSignal
  event: Record<string, unknown>
  expand: (value: unknown) => string
  value: (value: unknown) => unknown
  get: (name: string) => unknown
  set: (name: string, value: unknown, scope?: string) => void
  branch: (handle: string) => Promise<void>
  call: (name: string, args: unknown) => Promise<unknown>
  stopped: () => boolean
  stopFlow: () => void
  stopBot: () => Promise<unknown>
  waitEvent: (kind: string, data: Record<string, unknown>) => Promise<unknown>
}
export interface RuntimeResult {
  handle: string
  value?: unknown
}
export interface RuntimeOptions {
  projectDirectory: string
}
export type YapinRequest = (method: string, path: string, body?: unknown) => Promise<unknown>
export function regexMatch(pattern: string, flags: string, value: string): boolean {
  if (pattern.length > 1000 || value.length > 1024 * 1024)
    throw Error('Regex input exceeds limits.')
  return runInNewContext(
    'new RegExp(pattern, flags).test(value)',
    { pattern, flags, value },
    { timeout: 50 }
  ) as boolean
}
export class CatalogRuntime {
  readonly storage: ProjectStorage
  readonly stopwatches = new Map<string, number>()
  readonly seen = new Map<string, Set<string>>()
  private knownSecrets = new Set<string>()
  constructor(
    options: RuntimeOptions,
    private api: YapinRequest,
    private warn: (message: string) => void
  ) {
    this.storage = new ProjectStorage(options.projectDirectory)
  }
  redact(message: string): string {
    for (const secret of this.knownSecrets)
      if (secret) message = message.split(secret).join('[hidden]')
    return message
  }
  secret(value: unknown): string {
    const text = String(value ?? '')
    if (text) this.knownSecrets.add(text)
    return text
  }
  async http(
    url: string,
    options: RequestInit,
    signal: AbortSignal,
    timeout = 30,
    mode: 'auto' | 'text' | 'bytes' = 'auto'
  ): Promise<unknown> {
    const address = new URL(url)
    if (!['https:', 'http:'].includes(address.protocol) || address.username || address.password)
      throw Error('Only HTTP(S) URLs without embedded credentials are allowed.')
    if (record(options.headers))
      for (const [key, value] of Object.entries(options.headers))
        if (/authorization|key|token|secret/i.test(key)) this.secret(value)
    const headers = new Headers(options.headers)
    headers.forEach((value, key) => {
      if (/authorization|key|token|secret/i.test(key)) this.secret(value)
    })
    const combined = AbortSignal.any([
      signal,
      AbortSignal.timeout(Math.max(100, Math.min(120_000, timeout * 1000)))
    ])
    let response: Response
    try {
      response = await fetch(address, { ...options, headers, redirect: 'error', signal: combined })
    } catch {
      combined.throwIfAborted()
      throw Error('HTTP request failed. Check the URL, connection or redirect policy.')
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw Error(`HTTP request returned status ${response.status}.`)
    }
    if (Number(response.headers.get('Content-Length')) > MAX_BYTES) {
      await response.body?.cancel()
      throw Error('HTTP response exceeds the 16 MB limit.')
    }
    const reader = response.body?.getReader()
    let size = 0
    const chunks: Uint8Array[] = []
    if (reader)
      try {
        for (;;) {
          combined.throwIfAborted()
          const part = await reader.read()
          if (part.done) break
          size += part.value.byteLength
          if (size > MAX_BYTES) throw Error('HTTP response exceeds the 16 MB limit.')
          chunks.push(part.value)
        }
      } finally {
        await reader.cancel().catch(() => {})
      }
    const bytes = Buffer.concat(chunks)
    if (mode === 'bytes') return bytes
    const text = bytes.toString('utf8')
    if (mode === 'text') return text
    return jsonValue(text)
  }
  private async jsonHttp(
    url: string,
    signal: AbortSignal,
    options: RequestInit = {},
    timeout = 30
  ): Promise<unknown> {
    return this.http(url, options, signal, timeout)
  }
  async run(
    type: string,
    data: Record<string, unknown>,
    c: RuntimeContext
  ): Promise<RuntimeResult> {
    const id = type.replace(/^catalog\./, '')
    const s = (key: string, fallback: unknown = ''): string => c.expand(data[key] ?? fallback)
    const v = (key: string, fallback: unknown = ''): unknown => c.value(data[key] ?? fallback)
    const num = (key: string, fallback = 0): number => {
      const result = Number(v(key, fallback))
      if (!Number.isFinite(result)) throw Error(`Invalid numeric field: ${key}`)
      return result
    }
    const expandJSON = (value: unknown, depth = 0): unknown => {
      if (depth > 32) throw Error('JSON template is too deeply nested.')
      if (Array.isArray(value)) return value.map((item) => expandJSON(item, depth + 1))
      if (record(value))
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, expandJSON(item, depth + 1)])
        )
      if (typeof value === 'string')
        return /^\{(?:var:)?[a-zA-Z0-9_.[\]-]+\}$/.test(value) ? c.value(value) : c.expand(value)
      return value
    }
    const save = (value: unknown, handle = 'next'): RuntimeResult => {
      if (data.saveToVariable && s('variableName'))
        c.set(
          s('variableName'),
          data.jsonPath ? jsonPath(value, s('jsonPath')) : value,
          String(data.variableScope ?? 'local')
        )
      return { value, handle }
    }
    const unsupported = (message: string): RuntimeResult => {
      this.warn(`[Yapin API] ${message}`)
      return { handle: 'error', value: { unsupported: true, message } }
    }
    const urlRequest = async (url: string, options: RequestInit = {}): Promise<unknown> =>
      this.jsonHttp(url, c.signal, options, num('timeout', 30))
    const encode = encodeURIComponent
    const channel = s('channelId', c.event.channel),
      server = s('serverId', c.event.serverId),
      user = s('userId', c.event.authorId),
      message = s('messageId', c.event.messageId)
    const ch = `/channels/${encode(channel)}`,
      srv = `/servers/${encode(server)}`,
      msg = `${ch}/messages/${encode(message)}`
    const yapin = async (method: string, path: string, body?: unknown): Promise<RuntimeResult> =>
      save(await this.api(method, path, body), 'success')
    switch (id) {
      case 'stickyNote':
      case 'merge':
        return save(undefined)
      case 'stopFlow':
        c.stopFlow()
        return save(undefined)
      case 'stopBot':
        await c.stopBot()
        return save(undefined)
      case 'switch': {
        const cases = jsonValue(v('cases', '[]')),
          value = v('value')
        if (Array.isArray(cases)) {
          const found = cases.find(
            (item) => JSON.stringify(record(item) ? item.value : item) === JSON.stringify(value)
          )
          return save(
            value,
            found === undefined
              ? 'default'
              : record(found)
                ? String(found.handle ?? found.output ?? 'match')
                : 'match'
          )
        }
        if (record(cases)) {
          const match = cases[String(value)]
          return save(value, typeof match === 'string' ? match : 'default')
        }
        throw Error('Switch cases must be an array or object.')
      }
      case 'chance':
        return save(
          undefined,
          Math.random() * 100 < Math.max(0, Math.min(100, num('percent', 50))) ? 'true' : 'false'
        )
      case 'repeat':
      case 'forEach':
      case 'dbEach': {
        let items: unknown[]
        if (id === 'repeat') {
          const count = num('count', 1)
          if (!Number.isInteger(count) || count < 0 || count > 10000)
            throw Error('Repeat count must be an integer between 0 and 10000.')
          items = Array.from({ length: count }, (_, i) => i)
        } else if (id === 'dbEach') items = await this.rows(data, c)
        else items = listValue(v('value', data.items ?? '[]'))
        if (items.length > 10000) throw Error('Loop input exceeds the 10000-item limit.')
        const priorItem = c.get('item'),
          priorIndex = c.get('index')
        try {
          for (let i = 0; i < items.length; i++) {
            c.signal.throwIfAborted()
            if (c.stopped()) break
            c.set('item', items[i], 'local')
            c.set('index', i, 'local')
            if (data.saveToVariable)
              c.set(s('variableName', 'item'), items[i], String(data.variableScope ?? 'local'))
            await c.branch('each')
          }
        } finally {
          c.set('item', priorItem, 'local')
          c.set('index', priorIndex, 'local')
        }
        return save(items, 'done')
      }
      case 'tryCatch':
        try {
          await c.branch('try')
          return save(undefined, 'next')
        } catch (error) {
          if (c.signal.aborted) throw error
          c.set(
            'error',
            this.redact(error instanceof Error ? error.message : 'Action failed.'),
            'local'
          )
          await c.branch('catch')
          return save(undefined, 'next')
        }
      case 'callFunction':
        return save(await c.call(s('name'), v('arguments', '{}')))
      case 'math':
        return save(calculate(s('expression', data.value ?? '0')))
      case 'randomNumber': {
        const low = num('minimum', 0),
          high = num('maximum', 100)
        if (high < low || (data.integer !== false && Math.ceil(low) > Math.floor(high)))
          throw Error('The requested random-number range is empty.')
        return save(
          data.integer === false
            ? low + Math.random() * (high - low)
            : Math.floor(Math.random() * (Math.floor(high) - Math.ceil(low) + 1)) + Math.ceil(low)
        )
      }
      case 'editVariable': {
        const left = Number(c.get(s('varName')) ?? 0),
          right = Number(v('operand', data.value ?? 1))
        const op = s('operation', 'add')
        const result =
          op === 'subtract'
            ? left - right
            : op === 'multiply'
              ? left * right
              : op === 'divide'
                ? left / right
                : left + right
        if (!Number.isFinite(result)) throw Error('Variable math produced a non-finite result.')
        c.set(s('varName'), result, String(data.variableScope ?? 'global'))
        return save(result)
      }
      case 'toggleBoolean': {
        const previous = jsonValue(c.get(s('varName')))
        const result = !(previous === true || previous === 'true' || previous === 1)
        c.set(s('varName'), result, String(data.variableScope ?? 'global'))
        return save(result)
      }
      case 'modifyText': {
        const value = s('value'),
          op = s('operation', 'trim')
        const result =
          op === 'uppercase'
            ? value.toUpperCase()
            : op === 'lowercase'
              ? value.toLowerCase()
              : op === 'replace'
                ? value.replaceAll(s('find'), s('replacement'))
                : op === 'regex'
                  ? runInNewContext(
                      'value.replace(new RegExp(pattern, flags), replacement)',
                      {
                        value,
                        pattern: s('pattern', data.find),
                        flags: s('flags', 'g'),
                        replacement: s('replacement')
                      },
                      { timeout: 50 }
                    )
                  : value.trim()
        return save(result)
      }
      case 'translate': {
        const endpoint = s('endpoint')
        if (!endpoint) throw Error('Configure a translation endpoint.')
        const key = this.secret(c.get(s('apiKeyVariable')))
        const result = await urlRequest(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: s('value'),
            source: 'auto',
            target: s('language', 'en'),
            ...(key ? { api_key: key } : {})
          })
        })
        return save(jsonPath(result, 'translatedText') ?? result)
      }
      case 'createList':
        return save(listValue(v('items', '[]')))
      case 'listAdd':
      case 'listRemove':
      case 'listContains':
      case 'listSize':
      case 'formatList': {
        const items = [...listValue(v('items', '[]'))],
          value = v('value')
        if (id === 'listContains')
          return save(
            items.some((item) => JSON.stringify(item) === JSON.stringify(value)),
            items.some((item) => JSON.stringify(item) === JSON.stringify(value)) ? 'true' : 'false'
          )
        if (id === 'listSize') return save(items.length)
        if (id === 'formatList') return save(items.map(stringify).join(s('separator', ', ')))
        if (id === 'listAdd') items.push(value)
        else {
          const index = items.findIndex((item) => JSON.stringify(item) === JSON.stringify(value))
          if (index >= 0) items.splice(index, 1)
        }
        return save(items)
      }
      case 'timestamp': {
        const now = Date.now(),
          format = s('format', 'ISO')
        return save(
          format === 'unixSeconds'
            ? Math.floor(now / 1000)
            : format === 'unixMilliseconds'
              ? now
              : new Date(now).toISOString()
        )
      }
      case 'timestampMath': {
        const raw = v('timestamp', Date.now())
        const numeric =
          typeof raw === 'number' ||
          (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw)))
        const time = numeric
          ? Number(raw) * (s('inputUnit') === 'seconds' ? 1000 : 1)
          : Date.parse(String(raw))
        const result = time + num('seconds') * 1000 * (s('operation') === 'subtract' ? -1 : 1)
        if (!Number.isFinite(result)) throw Error('Invalid timestamp.')
        return save(new Date(result).toISOString())
      }
      case 'stopwatchStart':
        this.stopwatches.set(s('name', 'timer'), performance.now())
        return save(0)
      case 'stopwatchEnd': {
        const name = s('name', 'timer'),
          start = this.stopwatches.get(name)
        if (start === undefined) throw Error('Stopwatch has not been started.')
        this.stopwatches.delete(name)
        return save(performance.now() - start)
      }
      case 'cryptoText':
        return save(
          cryptText(
            s('value'),
            this.secret(c.get(s('keyVariable'))),
            s('operation') === 'decrypt',
            s('encoding') === 'hex' ? 'hex' : 'base64'
          )
        )
      case 'dbSet':
      case 'dbGet':
      case 'dbDelete':
      case 'dbInsert':
      case 'dbFind':
      case 'dbUpdate':
      case 'dbDeleteRows':
      case 'dbCount':
      case 'dbExport':
      case 'dbImport': {
        const value = await this.database(id, data, c)
        return save(value, 'success')
      }
      case 'readFile':
        return save((await this.storage.read(s('path'))).toString('utf8'), 'success')
      case 'writeFile':
        await this.storage.write(s('path'), s('content'), s('mode') === 'append')
        return save(s('path'), 'success')
      case 'fileExists': {
        const exists = await this.storage.exists(s('path'))
        return save(exists, exists ? 'true' : 'false')
      }
      case 'deleteFile':
        await this.storage.remove(s('path'))
        return save(true, 'success')
      case 'listFiles':
        return save(await this.storage.list(s('path')), 'success')
      case 'downloadFile': {
        const bytes = (await this.http(
          s('url'),
          {},
          c.signal,
          num('timeout', 30),
          'bytes'
        )) as Buffer
        await this.storage.write(s('path'), bytes)
        return save(s('path'), 'success')
      }
      case 'zipFolder':
        await this.storage.archive(
          s('path'),
          s('destination', s('mode') === 'unzip' ? 'extracted' : 'archive.zip'),
          s('mode') === 'unzip'
        )
        return save(true, 'success')
      case 'httpRequest': {
        const headers = expandJSON(jsonValue(data.headers ?? '{}'))
        if (!record(headers)) throw Error('HTTP headers must be a JSON object.')
        const method = s('method', 'GET').toUpperCase()
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(method))
          throw Error('Unsupported HTTP method.')
        const payload = expandJSON(jsonValue(data.body ?? '')),
          jsonBody = record(payload) || Array.isArray(payload)
        const requestHeaders = Object.fromEntries(
          Object.entries(headers).map(([key, value]) => [key, stringify(value)])
        )
        if (
          jsonBody &&
          !Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type')
        )
          requestHeaders['Content-Type'] = 'application/json'
        const result = await urlRequest(s('url'), {
          method,
          headers: requestHeaders,
          ...(!['GET', 'HEAD'].includes(method)
            ? { body: jsonBody ? JSON.stringify(payload) : stringify(payload) }
            : {})
        })
        return save(result, 'success')
      }
      case 'askAI': {
        const provider = s('provider', 'OpenAI')
        const key = this.secret(
          c.get(s('apiKeyVariable')) ||
            (provider === 'Gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)
        )
        const model =
            s('model') ||
            String(
              (provider === 'Gemini' ? process.env.GEMINI_MODEL : process.env.OPENAI_MODEL) || ''
            ),
          system = s('systemPrompt') || String(process.env.AI_SYSTEM_PROMPT || '')
        if (!key && provider !== 'Custom')
          throw Error('Configure an AI API key in a variable or environment.')
        if (!model) throw Error('Configure an AI model.')
        if (provider === 'Gemini') {
          const result = await urlRequest(
            s('url') ||
              `https://generativelanguage.googleapis.com/v1beta/models/${encode(model)}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: s('prompt') }] }],
                ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {})
              })
            }
          )
          const parts = jsonPath(result, 'candidates[0].content.parts')
          if (!Array.isArray(parts)) throw Error('Gemini returned no content.')
          return save(
            parts.map((part) => (record(part) ? String(part.text ?? '') : '')).join(''),
            'success'
          )
        }
        const endpoint =
          s('url') || (provider === 'Custom' ? '' : 'https://api.openai.com/v1/chat/completions')
        if (!endpoint) throw Error('Configure a custom LLM endpoint.')
        const result = await urlRequest(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(key ? { Authorization: `Bearer ${key}` } : {})
          },
          body: JSON.stringify({
            model,
            messages: [
              ...(system ? [{ role: 'system', content: system }] : []),
              { role: 'user', content: s('prompt') }
            ]
          })
        })
        const output = jsonPath(result, 'choices[0].message.content')
        if (typeof output !== 'string') throw Error('AI endpoint returned no text.')
        return save(output, 'success')
      }
      case 'weather': {
        const location = s('location', data.query),
          coordinates = location.split(',').map(Number)
        let latitude: number, longitude: number
        if (coordinates.length === 2 && coordinates.every(Number.isFinite)) {
          ;[latitude, longitude] = coordinates
        } else {
          const geo = await urlRequest(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encode(location)}&count=1`
          )
          latitude = Number(jsonPath(geo, 'results[0].latitude'))
          longitude = Number(jsonPath(geo, 'results[0].longitude'))
        }
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        )
          throw Error('Weather location was not found.')
        return save(
          await urlRequest(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=${s('units') === 'imperial' ? 'fahrenheit' : 'celsius'}`
          ),
          'success'
        )
      }
      case 'dictionary':
        return save(
          await urlRequest(
            `https://api.dictionaryapi.dev/api/v2/entries/${encode(s('language', 'en'))}/${encode(s('word', data.query))}`
          ),
          'success'
        )
      case 'githubRepo': {
        const key = this.secret(c.get(s('apiKeyVariable')) || process.env.GITHUB_TOKEN)
        return save(
          await urlRequest(
            `https://api.github.com/repos/${encode(s('owner'))}/${encode(s('repository'))}`,
            {
              headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'Yapin-Bot-Maker',
                ...(key ? { Authorization: `Bearer ${key}` } : {})
              }
            }
          ),
          'success'
        )
      }
      case 'websiteMetadata': {
        const content = String(await this.http(s('url'), {}, c.signal, 30, 'text'))
        return save(
          {
            url: s('url'),
            title: content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '',
            description:
              content.match(
                /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
              )?.[1] ?? ''
          },
          'success'
        )
      }
      case 'shortUrl': {
        if (!s('endpoint')) throw Error('Configure a URL-shortener endpoint.')
        const key = this.secret(c.get(s('apiKeyVariable')))
        return save(
          await urlRequest(s('endpoint'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(key ? { Authorization: `Bearer ${key}` } : {})
            },
            body: JSON.stringify({ url: s('url') })
          }),
          'success'
        )
      }
      case 'qrGenerate': {
        const svg = await qrString(s('value'), { type: 'svg', width: num('width', 512) })
        if (s('path')) await this.storage.write(s('path'), svg)
        return save(svg, 'success')
      }
      case 'qrRead': {
        const input = s('value')
        const bytes = /^https?:/.test(input)
          ? ((await this.http(input, {}, c.signal, 30, 'bytes')) as Buffer)
          : await this.storage.read(input)
        if (bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > 16_000_000)
          throw Error('QR image exceeds pixel limit.')
        const png = PNG.sync.read(bytes)
        const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
        if (!qr) throw Error('No QR code found in PNG image.')
        return save(qr.data, 'success')
      }
      case 'chartImage':
        return save(
          `https://quickchart.io/chart?c=${encode(JSON.stringify(v('chart', '{}')))}`,
          'success'
        )
      case 'imageMetadata': {
        const input = s('value')
        const bytes = /^https?:/.test(input)
          ? ((await this.http(input, {}, c.signal, 30, 'bytes')) as Buffer)
          : await this.storage.read(input)
        return save(imageSize(bytes), 'success')
      }
      case 'sendMessage':
        return yapin('POST', `${ch}/messages`, { content: s('message') })
      case 'interactiveButtons':
        return yapin('POST', `${ch}/messages`, {
          content: s('message'),
          components: v('buttons', '[]')
        })
      case 'editMessage':
        return yapin('PATCH', msg, { content: s('message') })
      case 'deleteMessage':
        return yapin('DELETE', msg)
      case 'pinMessage':
        return yapin('PUT', `${msg}/pin`)
      case 'unpinMessage':
        return yapin('DELETE', `${msg}/pin`)
      case 'cloneMessage': {
        const original = await this.api('GET', msg)
        if (!record(original)) throw Error('Invalid source message.')
        return yapin('POST', `${ch}/messages`, {
          content: original.content,
          embeds: original.embeds
        })
      }
      case 'sendPoll': {
        const choices = s('choices', 'Yes\nNo')
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10)
        const result = await this.api('POST', `${ch}/messages`, {
          content: `${s('message')}\n${choices.map((choice, i) => `${i + 1}. ${choice}`).join('\n')}`
        })
        if (record(result) && typeof result.id === 'string') {
          for (const emoji of ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'].slice(
            0,
            choices.length
          ))
            await this.api('PUT', `${ch}/messages/${encode(result.id)}/reactions/${encode(emoji)}`)
        }
        return save(result, 'success')
      }
      case 'waitMessage':
        return save(await c.waitEvent('message', data), 'success')
      case 'waitReaction':
        return save(await c.waitEvent('reaction_add', data), 'success')
      case 'kickMember':
        return yapin('POST', `${srv}/kick`, { user_id: user })
      case 'banMember':
        return yapin('POST', `${srv}/bans`, { user_id: user })
      case 'unbanMember':
        return yapin('DELETE', `${srv}/bans/${encode(user)}`)
      case 'timeoutMember':
        return yapin('POST', `${srv}/timeouts`, {
          user_id: user,
          minutes: num('minutes', 10),
          reason: s('reason')
        })
      case 'addRole':
      case 'removeRole':
        return yapin(
          id === 'addRole' ? 'PUT' : 'DELETE',
          `${srv}/members/${encode(user)}/roles/${encode(s('roleId'))}`
        )
      case 'nickname':
      case 'serverNickname':
        return yapin(
          'PATCH',
          `${srv}/members/${encode(id === 'nickname' ? user : String(c.event.botId))}`,
          { nickname: s('name', data.nickname) }
        )
      case 'createRole':
        return yapin('POST', `${srv}/roles`, { name: s('name'), color: s('color', '#5865f2') })
      case 'deleteRole':
        return yapin('DELETE', `${srv}/roles/${encode(s('roleId'))}`)
      case 'createChannel':
        return yapin('POST', `${srv}/channels`, { name: s('name'), kind: s('kind', 'text') })
      case 'deleteChannel':
        return yapin('DELETE', ch)
      case 'renameChannel':
        return yapin('PATCH', ch, { name: s('name') })
      case 'slowmode':
        return yapin('PATCH', ch, { slowmode: num('seconds') })
      case 'createWebhook':
        return yapin('POST', `${ch}/webhooks`, { name: s('name') })
      case 'setPresence':
      case 'clearPresence':
        return yapin('PUT', '/me/status', {
          status: id === 'clearPresence' ? 'online' : s('status', 'online'),
          activity: id === 'clearPresence' ? '' : s('activity')
        })
      case 'setBio':
        return yapin('PATCH', '/me', { bio: s('bio') })
      case 'addReaction':
      case 'removeReaction':
        return yapin(
          id === 'addReaction' ? 'PUT' : 'DELETE',
          `${msg}/reactions/${encode(s('emoji', '👍'))}`
        )
      case 'clearReactions':
        return unsupported(
          'Clearing all reactions is not exposed by the documented public API. Remove individual bot reactions instead.'
        )
      case 'typing':
      case 'channelTopic':
      case 'createThread':
      case 'archiveThread':
      case 'createInvite':
        return unsupported(`${id} is not exposed by the documented public API.`)
      case 'ticketPanel': {
        const customId = `yapin-ticket:${randomUUID()}`
        const result = await this.api('POST', `${ch}/messages`, {
          content: s('message', 'Open a support ticket.'),
          components: [
            {
              type: 1,
              components: [{ type: 2, style: 1, label: 'Open ticket', custom_id: customId }]
            }
          ]
        })
        await this.storage.database('tickets.json', (db) => {
          db.kv[`panel:${customId}`] = { ...data, serverId: server }
        })
        return save(result, 'success')
      }
      case 'ticketOpen':
      case 'ticketClaim':
      case 'ticketAdd':
      case 'ticketRemove':
      case 'ticketClose':
        return save(await this.ticket(id, data, c), 'success')
      default:
        throw Error(`No action adapter for ${type}.`)
    }
  }
  private async rows(
    data: Record<string, unknown>,
    c: RuntimeContext
  ): Promise<Record<string, unknown>[]> {
    return this.database('dbFind', data, c) as Promise<Record<string, unknown>[]>
  }
  private async database(
    id: string,
    data: Record<string, unknown>,
    c: RuntimeContext
  ): Promise<unknown> {
    const name = c.expand(data.database || 'bot.database.json'),
      table = c.expand(data.table || 'records'),
      key = c.expand(data.key ?? ''),
      filter = c.value(data.filter ?? '{}')
    if (!record(filter)) throw Error('Database filter must be a JSON object.')
    if (
      ['__proto__', 'prototype', 'constructor'].includes(table) ||
      ['__proto__', 'prototype', 'constructor'].includes(key)
    )
      throw Error('Invalid database key or table name.')
    let imported: Record<string, string>[] = []
    if (id === 'dbImport')
      imported = parseCSV((await this.storage.read(c.expand(data.path))).toString('utf8'))
    return this.storage.database(name, async (db) => {
      if (id === 'dbSet') {
        db.kv[key] = c.value(data.value)
        return db.kv[key]
      }
      if (id === 'dbGet') return Object.hasOwn(db.kv, key) ? db.kv[key] : null
      if (id === 'dbDelete') {
        const existed = Object.hasOwn(db.kv, key)
        delete db.kv[key]
        return existed
      }
      const rows = Object.hasOwn(db.tables, table) ? db.tables[table] : []
      if (!Array.isArray(rows)) throw Error('Invalid database table.')
      const match = (row: Record<string, unknown>): boolean =>
        Object.entries(filter).every(
          ([key, value]) => JSON.stringify(row[key]) === JSON.stringify(value)
        )
      if (id === 'dbImport') {
        rows.push(...imported)
        db.tables[table] = rows
        return imported.length
      }
      if (id === 'dbInsert') {
        const row = c.value(data.value)
        if (!record(row)) throw Error('Inserted row must be a JSON object.')
        rows.push(row)
        db.tables[table] = rows
        return row
      }
      const found = rows.filter(match)
      if (id === 'dbCount') return found.length
      if (id === 'dbDeleteRows') {
        db.tables[table] = rows.filter((row) => !match(row))
        return found.length
      }
      if (id === 'dbUpdate') {
        const patch = c.value(data.value)
        if (!record(patch)) throw Error('Updated row must be a JSON object.')
        db.tables[table] = rows.map((row) => (match(row) ? { ...row, ...patch } : row))
        return found.length
      }
      if (id === 'dbExport') {
        await this.storage.write(c.expand(data.path || 'records.csv'), formatCSV(found))
        return found.length
      }
      return found
    })
  }
  private async ticket(
    id: string,
    data: Record<string, unknown>,
    c: RuntimeContext
  ): Promise<unknown> {
    const server = c.expand(data.serverId || c.event.serverId),
      user = c.expand(data.userId || c.event.authorId),
      ticketId = c.expand(data.ticketId || c.event.channel)
    const enc = encodeURIComponent
    if (id === 'ticketOpen') {
      if (!server || !user) throw Error('Opening a ticket requires a server ID and user ID.')
      const role = await this.api('POST', `/servers/${enc(server)}/roles`, {
        name: `Ticket ${Date.now()}`
      })
      if (!record(role) || typeof role.id !== 'string')
        throw Error('Create ticket role returned no role ID.')
      let channelId: string | undefined
      try {
        const channel = await this.api('POST', `/servers/${enc(server)}/channels`, {
          name: c.expand(data.name || 'support-{user}'),
          kind: 'text'
        })
        if (!record(channel) || typeof channel.id !== 'string')
          throw Error('Create ticket channel returned no channel ID.')
        channelId = channel.id
        const staff = listValue(c.value(data.staffRoleIds || '[]')).map(String)
        await this.api('PATCH', `/channels/${enc(channelId)}`, {
          private: true,
          role_ids: [role.id, ...staff]
        })
        await this.api('PUT', `/servers/${enc(server)}/members/${enc(user)}/roles/${enc(role.id)}`)
        const ticket = {
          channelId,
          roleId: role.id,
          serverId: server,
          ownerId: user,
          claimedBy: null
        }
        await this.storage.database('tickets.json', (db) => {
          db.kv[channelId!] = ticket
        })
        return ticket
      } catch (error) {
        if (channelId) await this.api('DELETE', `/channels/${enc(channelId)}`).catch(() => {})
        await this.api('DELETE', `/servers/${enc(server)}/roles/${enc(role.id)}`).catch(() => {})
        throw error
      }
    }
    return this.storage.database('tickets.json', async (db) => {
      const ticket = db.kv[ticketId]
      if (!record(ticket)) throw Error('Ticket was not found in this project.')
      const srv = `/servers/${enc(String(ticket.serverId))}`
      if (id === 'ticketClose') {
        await this.api('DELETE', `/channels/${enc(String(ticket.channelId))}`)
        await this.api('DELETE', `${srv}/roles/${enc(String(ticket.roleId))}`)
        delete db.kv[ticketId]
        return true
      }
      if (id === 'ticketClaim') {
        ticket.claimedBy = user
        return ticket
      }
      await this.api(
        id === 'ticketAdd' ? 'PUT' : 'DELETE',
        `${srv}/members/${enc(user)}/roles/${enc(String(ticket.roleId))}`
      )
      return true
    })
  }
  async feed(
    type: string,
    data: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<Record<string, unknown>[]> {
    const source = String(data.source ?? '').trim(),
      id = type.replace('catalog.', '')
    if (id === 'reddit') {
      const token = this.secret(process.env.REDDIT_ACCESS_TOKEN)
      const url = source.startsWith('https://')
        ? source
        : `https://${token ? 'oauth' : 'www'}.reddit.com/r/${encodeURIComponent(source.replace(/^r\//, ''))}/new.json?limit=25`
      const body = await this.jsonHttp(url, signal, {
        headers: {
          'User-Agent': 'Yapin-Bot-Maker/1.0',
          ...(token && new URL(url).hostname === 'oauth.reddit.com'
            ? { Authorization: `Bearer ${token}` }
            : {})
        }
      })
      const children = jsonPath(body, 'data.children')
      return Array.isArray(children)
        ? children
            .slice(0, 100)
            .flatMap((item) => (record(item) && record(item.data) ? [item.data] : []))
        : []
    }
    if (id === 'githubRelease') {
      const body = await this.jsonHttp(
        `https://api.github.com/repos/${source}/releases/latest`,
        signal,
        { headers: { 'User-Agent': 'Yapin-Bot-Maker', Accept: 'application/vnd.github+json' } }
      )
      return record(body) ? [body] : []
    }
    if (id === 'twitch') {
      const client = String(data.clientId || process.env.TWITCH_CLIENT_ID || ''),
        token = this.secret(data.accessToken || process.env.TWITCH_ACCESS_TOKEN)
      if (!client || !token)
        throw Error('Twitch polling requires TWITCH_CLIENT_ID and TWITCH_ACCESS_TOKEN.')
      const result = await this.jsonHttp(
        `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(source)}`,
        signal,
        { headers: { 'Client-ID': client, Authorization: `Bearer ${token}` } }
      )
      return Array.isArray(jsonPath(result, 'data'))
        ? (jsonPath(result, 'data') as Record<string, unknown>[])
        : []
    }
    const url =
      id === 'youtube' && !source.startsWith('https://')
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(source)}`
        : source
    const xml = String(await this.http(url, {}, signal, 30, 'text'))
    if (XMLValidator.validate(xml) !== true) throw Error('Invalid RSS/Atom feed.')
    const body = new XMLParser({ ignoreAttributes: false, processEntities: false }).parse(xml)
    const items = jsonPath(body, 'rss.channel.item') ?? jsonPath(body, 'feed.entry') ?? []
    const xmlText = (value: unknown): string =>
      record(value)
        ? String(value['#text'] ?? value['@_href'] ?? stringify(value))
        : String(value ?? '')
    return (Array.isArray(items) ? items : [items])
      .slice(0, 100)
      .filter(record)
      .map((item) => ({
        ...item,
        id: xmlText(item.id ?? item.guid ?? item.link ?? item.title),
        title: xmlText(item.title),
        url: xmlText(Array.isArray(item.link) ? item.link[0] : item.link)
      }))
  }
  async ticketInteraction(data: Record<string, unknown>, c: RuntimeContext): Promise<boolean> {
    const id = String(data.custom_id ?? '')
    if (!id.startsWith('yapin-ticket:')) return false
    const panel = await this.storage.database('tickets.json', (db) => db.kv[`panel:${id}`])
    if (!record(panel)) return false
    const token = this.secret(data.token)
    if (!token || !data.id) throw Error('Ticket interaction is missing its response token.')
    const path = `/interactions/${encodeURIComponent(String(data.id))}/${encodeURIComponent(token)}/callback`
    await this.api('POST', path, {
      type: 'ephemeral',
      content: 'Creating your private support channel…'
    })
    try {
      const result = await this.ticket('ticketOpen', { ...panel, userId: c.event.authorId }, c)
      await this.api('POST', path, {
        type: 'ephemeral',
        content: `Ticket created: <#${record(result) ? result.channelId : ''}>`
      })
    } catch (error) {
      this.warn(
        '[Yapin API] Ticket creation failed. Check Manage Roles and Manage Channels permissions.'
      )
      await this.api('POST', path, {
        type: 'ephemeral',
        content: 'Could not create a ticket. Please contact a server moderator.'
      }).catch(() => {})
      if (c.signal.aborted) throw error
    }
    return true
  }
  webhook(
    data: Record<string, unknown>,
    signal: AbortSignal,
    onEvent: (data: Record<string, unknown>) => Promise<void>
  ): Server {
    const port = Number(data.port ?? 8080),
      path = String(data.path ?? '/webhook'),
      secret = this.secret(data.secret)
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw Error('Webhook port must be between 1024 and 65535.')
    const server = createServer((req, res) => {
      void (async () => {
        if (req.method !== 'POST' || req.url?.split('?')[0] !== path) {
          res.writeHead(404).end()
          return
        }
        const received = Buffer.from(String(req.headers['x-webhook-secret'] ?? '')),
          expected = Buffer.from(secret)
        if (
          !secret ||
          received.length !== expected.length ||
          !timingSafeEqual(received, expected)
        ) {
          res.writeHead(401).end()
          return
        }
        const chunks: Buffer[] = []
        let size = 0
        try {
          for await (const chunk of req) {
            size += chunk.length
            if (size > 1024 * 1024) {
              res.writeHead(413).end()
              req.destroy()
              return
            }
            chunks.push(Buffer.from(chunk))
          }
          const body = jsonValue(Buffer.concat(chunks).toString('utf8'))
          res.writeHead(202, { 'Content-Type': 'application/json' }).end('{"accepted":true}')
          void onEvent({ body }).catch(() => {})
        } catch {
          if (!res.headersSent) res.writeHead(400).end()
        }
      })()
    })
    server.on('error', () =>
      this.warn('[Webhook] Listener could not start. Check the configured port.')
    )
    server.listen(port, '127.0.0.1')
    signal.addEventListener(
      'abort',
      () => {
        server.close()
        server.closeAllConnections()
      },
      { once: true }
    )
    return server
  }
}
