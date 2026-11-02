const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

// Load the actual TypeScript main-process modules without starting Electron.
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  module._compile(outputText, filename)
}
const dialogs = {}
const crypto = require('node:crypto')
const encryptionKey = crypto.randomBytes(32)
let encryptionAvailable = true
const secureStorage = {
  isEncryptionAvailable: () => encryptionAvailable,
  getSelectedStorageBackend: () => 'gnome_libsecret',
  encryptString: (text) => {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
  },
  decryptString: (data) => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, data.subarray(0, 12))
    decipher.setAuthTag(data.subarray(12, 28))
    return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')
  }
}
const originalLoad = Module._load
Module._load = function (id, ...args) {
  if (id === 'electron') return { dialog: dialogs, safeStorage: secureStorage }
  if (id === 'virtual:bot-runtime')
    return {
      default: ts.transpileModule(
        fs.readFileSync(path.join(__dirname, '../src/main/botRunner.ts'), 'utf8'),
        {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
        }
      ).outputText
    }
  return originalLoad.call(this, id, ...args)
}
const { BotRunner, reconnectDelay } = require('../src/main/botRunner.ts')
const { saveProject, loadProject, parseProject } = require('../src/main/projectFiles.ts')
const { TokenStore } = require('../src/main/tokenStore.ts')
const { standaloneFiles, exportStandalone } = require('../src/main/standaloneExport.ts')
Module._load = originalLoad
const originalFetch = global.fetch
const runners = []
afterEach(async () => {
  for (const runner of runners.splice(0)) await runner.stop()
  global.fetch = originalFetch
  encryptionAvailable = true
})
const json = (data, status = 200, headers) =>
  new Response(JSON.stringify(data), { status, headers })
const node = (id, type, data) => ({ id, type, data, position: { x: 0, y: 0 } })
const edge = (source, target, sourceHandle = 'out') => ({
  id: `${source}-${target}-${sourceHandle}`,
  source,
  target,
  sourceHandle,
  targetHandle: 'in'
})
const graph = (nodes, edges = []) => ({ token: 'yb_test_token', nodes, edges })
const trigger = () => node('trigger', 'onMessage', { ignoreBots: true })
const message = (id, content, extra = {}) => ({
  id,
  type: 'message',
  data: {
    id: `msg-${id}`,
    channel_id: 'channel',
    author_id: 'person',
    author: 'Alice',
    content,
    ...extra
  }
})
function runner() {
  const logs = [],
    statuses = []
  const instance = new BotRunner(
    (log) => logs.push(log),
    (status) => statuses.push(status)
  )
  runners.push(instance)
  return { instance, logs, statuses }
}
function pending(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}
async function until(predicate) {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > 3000) assert.fail('Timed out waiting for runner')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
function api(events, overrides) {
  const calls = []
  let delivered = false
  global.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bot yb_test_token')
    assert.ok(url.startsWith('https://bots.yapper.website/api/bot/v1/'))
    const call = { path: url.split('/api/bot/v1')[1], ...options }
    calls.push(call)
    const response = await overrides?.(call, calls)
    if (response) return response
    if (call.path === '/me')
      return json({ id: 'self', username: 'TestBot', bot: { name: 'TestBot' } })
    if (call.path === '/commands') return json({ commands: [] })
    if (call.path === '/events?after=0&wait=0') return json({ events: [], last: 10 })
    if (call.path.startsWith('/events')) {
      if (!delivered) {
        delivered = true
        return json({ events, last: 20 })
      }
      return pending(options.signal)
    }
    return json({ id: 'sent-message' })
  }
  return calls
}

test('executes the chosen condition branch, replies, templates and chained actions', async () => {
  const calls = api([message(11, 'Hello YAP')])
  const { instance, logs, statuses } = runner()
  const result = await instance.start(
    graph(
      [
        trigger(),
        node('condition', 'textCondition', {
          operator: 'contains',
          value: 'yap',
          caseSensitive: false
        }),
        node('reply', 'sendReply', { message: '{author}: {content} in {channel}' }),
        node('done', 'logConsole', { message: 'done {channel}', level: 'success' }),
        node('wrong', 'logConsole', { message: 'WRONG', level: 'error' })
      ],
      [
        edge('trigger', 'condition'),
        edge('condition', 'reply', 'true'),
        edge('condition', 'wrong', 'false'),
        edge('reply', 'done')
      ]
    )
  )
  assert.equal(result.success, true)
  await until(() => logs.some((log) => log.message === 'done channel'))
  assert.deepEqual(JSON.parse(calls.find((call) => call.method === 'POST').body), {
    content: 'Alice: Hello YAP in channel',
    reply_to: 'msg-11'
  })
  assert.ok(!logs.some((log) => log.message === 'WRONG'))
  assert.deepEqual(statuses, [true])
  await instance.stop()
  assert.deepEqual(statuses, [true, false])
})

test('all operators respect whitespace, case sensitivity and false output', async () => {
  for (const [operator, value, content, caseSensitive, expected] of [
    ['equals', ' Yap ', ' Yap ', true, true],
    ['equals', 'yap', 'Yap', true, false],
    ['starts_with', 'yap', 'YAP hello', false, true],
    ['ends_with', 'yap', 'hello YAP', false, true],
    ['contains', 'xyz', 'hello', false, false]
  ]) {
    api([message(11, content)])
    const { instance, logs } = runner()
    assert.equal(
      (
        await instance.start(
          graph(
            [
              trigger(),
              node('condition', 'textCondition', { operator, value, caseSensitive }),
              node('yes', 'logConsole', { message: 'YES', level: 'info' }),
              node('no', 'logConsole', { message: 'NO', level: 'info' })
            ],
            [
              edge('trigger', 'condition'),
              edge('condition', 'yes', 'true'),
              edge('condition', 'no', 'false')
            ]
          )
        )
      ).success,
      true
    )
    await until(() => logs.some((log) => log.message === (expected ? 'YES' : 'NO')))
    assert.ok(!logs.some((log) => log.message === (expected ? 'NO' : 'YES')))
    await instance.stop()
  }
})

test('commands honor routing, bot authors, command metadata and / or ! text', async () => {
  const calls = api([
    message(11, '/ping', { command_for: 'someone-else' }),
    message(12, '/ping', { author_bot: true }),
    message(13, 'a routed command', { command: 'ping', command_for: 'self' }),
    message(14, '!ping argument'),
    message(15, '/ping argument'),
    message(16, '/pingpong')
  ])
  const { instance } = runner()
  assert.equal(
    (
      await instance.start(
        graph(
          [
            node('cmd', 'onCommand', { commandName: 'ping', description: 'Ping' }),
            node('reply', 'sendReply', { message: 'pong' })
          ],
          [edge('cmd', 'reply')]
        )
      )
    ).success,
    true
  )
  await until(() => calls.filter((call) => call.method === 'POST').length === 3)
  assert.deepEqual(
    calls.filter((call) => call.method === 'POST').map((call) => JSON.parse(call.body).reply_to),
    ['msg-13', 'msg-14', 'msg-15']
  )
  assert.deepEqual(JSON.parse(calls.find((call) => call.path === '/commands').body), {
    commands: [{ name: 'ping', description: 'Ping' }]
  })
})

test('onMessage uses author_bot and skips own messages even with ignoreBots disabled', async () => {
  api([message(11, 'bot', { author_bot: true }), message(12, 'own', { author_id: 'self' })])
  const { instance, logs } = runner()
  await instance.start(
    graph(
      [
        trigger(),
        node('all', 'onMessage', { ignoreBots: false }),
        node('ignored', 'logConsole', { message: 'IGNORED', level: 'info' }),
        node('accepted', 'logConsole', { message: '{content}', level: 'info' })
      ],
      [edge('trigger', 'ignored'), edge('all', 'accepted')]
    )
  )
  await until(() => logs.some((log) => log.message === 'bot'))
  assert.ok(!logs.some((log) => ['IGNORED', 'own'].includes(log.message)))
})

test('startup failures leave stopped state and redact API errors', async () => {
  api([], (call) => (call.path === '/me' ? json({ error: 'bad yb_test_token' }, 401) : null))
  const { instance, logs, statuses } = runner()
  const result = await instance.start(graph([trigger()]))
  assert.equal(result.success, false)
  assert.equal(instance.getStatus().running, false)
  assert.ok(!result.message.includes('yb_test_token'))
  assert.ok(!logs.some((log) => log.message.includes('yb_test_token')))
  assert.deepEqual(statuses, [false])
  assert.equal((await instance.start({ token: '', nodes: [], edges: [] })).success, false)
})

test('rejects cycles, invalid handles, dangling edges and duplicate commands before network I/O', async () => {
  global.fetch = () => assert.fail('Invalid graph must not call API')
  const { instance } = runner()
  const log = (id) => node(id, 'logConsole', { message: id, level: 'info' })
  const badGraphs = [
    graph([trigger(), log('a'), log('b')], [edge('trigger', 'a'), edge('a', 'b'), edge('b', 'a')]),
    graph([trigger()], [edge('trigger', 'missing')]),
    graph(
      [
        trigger(),
        node('c', 'textCondition', { operator: 'equals', value: '', caseSensitive: false }),
        log('a')
      ],
      [edge('trigger', 'c'), edge('c', 'a')]
    ),
    graph([
      node('a', 'onCommand', { commandName: 'ping', description: '' }),
      node('b', 'onCommand', { commandName: 'ping', description: '' })
    ]),
    graph([node('a', 'unknown', {})])
  ]
  for (const input of badGraphs) assert.equal((await instance.start(input)).success, false)
})

test('Stop cancels authentication; an old startup cannot stop the next session', async () => {
  let signal
  api([], (call) => {
    if (call.path === '/me') {
      signal = call.signal
      return pending(signal)
    }
  })
  const { instance } = runner()
  const starting = instance.start(graph([trigger()]))
  await until(() => signal)
  assert.equal((await instance.start(graph([trigger()]))).success, false)
  await instance.stop()
  assert.equal(signal.aborted, true)
  api([])
  const next = await instance.start(graph([trigger()]))
  assert.equal(next.success, true)
  assert.equal((await starting).success, false)
  assert.equal(instance.getStatus().running, true)
})

test('retries documented throttles, advances cursor, ignores duplicate events and cancels poll', async () => {
  let attempts = 0
  const calls = api([message(11, 'hello'), message(11, 'duplicate')], (call) => {
    if (call.method === 'POST' && attempts++ === 0)
      return json({ error: 'slow down' }, 429, { 'Retry-After': '0' })
  })
  const { instance } = runner()
  await instance.start(
    graph([trigger(), node('r', 'sendReply', { message: '{content}' })], [edge('trigger', 'r')])
  )
  await until(() => calls.some((call) => call.path === '/events?after=20&wait=20'))
  assert.equal(attempts, 2)
  const polling = calls.at(-1).signal
  await instance.stop()
  assert.equal(polling.aborted, true)
})

test('does not retry ambiguous writes, stops the failed branch and runs siblings', async () => {
  const calls = api([message(11, 'hello')], (call) => {
    if (call.method === 'POST') throw new Error('Connection lost after sending')
  })
  const { instance, logs } = runner()
  await instance.start(
    graph(
      [
        trigger(),
        node('r', 'sendReply', { message: 'hello' }),
        node('after', 'logConsole', { message: 'AFTER FAILED REPLY', level: 'info' }),
        node('sibling', 'logConsole', { message: 'SIBLING', level: 'info' })
      ],
      [edge('trigger', 'r'), edge('r', 'after'), edge('trigger', 'sibling')]
    )
  )
  await until(() => logs.some((log) => log.message === 'SIBLING'))
  assert.equal(calls.filter((call) => call.method === 'POST').length, 1)
  assert.ok(!logs.some((log) => log.message === 'AFTER FAILED REPLY'))
})

test('fatal polling authentication errors reset status', async () => {
  api([], (call) => (call.path.includes('wait=20') ? json({ error: 'token revoked' }, 401) : null))
  const { instance, statuses } = runner()
  await instance.start(graph([trigger()]))
  await until(() => statuses.includes(false))
  assert.equal(instance.getStatus().running, false)
  assert.equal(instance.getBotInfo(), null)
})

test('native dialogs save and reopen versioned projects, handle cancellation and malformed files', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapbot-test-'))
  try {
    const parent = { id: 'window' }
    const basePath = path.join(dir, 'my-project')
    dialogs.showSaveDialog = async (window, options) => {
      assert.equal(window, parent)
      assert.deepEqual(options.filters[0].extensions, ['yapbot.json'])
      return { canceled: false, filePath: basePath }
    }
    const input = { ...graph([trigger()]), name: 'My workflow' }
    const saved = await saveProject(parent, input)
    assert.equal(saved.success, true)
    assert.equal(saved.filePath, `${basePath}.yapbot.json`)
    const disk = JSON.parse(await fsp.readFile(saved.filePath, 'utf8'))
    assert.equal(disk.version, '1.0.0')
    assert.ok(disk.savedAt)
    assert.deepEqual(disk.graph.nodes, input.nodes)
    dialogs.showOpenDialog = async (window, options) => {
      assert.equal(window, parent)
      assert.deepEqual(options.properties, ['openFile'])
      return { canceled: false, filePaths: [saved.filePath] }
    }
    const loaded = await loadProject(parent)
    assert.equal(loaded.success, true)
    assert.deepEqual(loaded.data, { ...input, token: '' })
    assert.equal('token' in disk, false)
    assert.ok(!JSON.stringify(disk).includes(input.token))
    assert.equal(parseProject({ ...disk, token: input.token }).token, '')
    // Legacy files never import a raw credential into the renderer.
    assert.equal(parseProject({ ...input, token: '' }).token, '')
    assert.throws(() => parseProject({ ...disk, version: '99' }), /version/)
    assert.throws(() => parseProject({ ...disk, graph: { nodes: {}, edges: [] } }), /arrays|array/)
    await fsp.writeFile(saved.filePath, '{ invalid json')
    assert.equal((await loadProject(parent)).success, false)
    dialogs.showSaveDialog = async () => ({ canceled: true })
    dialogs.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
    assert.deepEqual(await saveProject(null, input), { success: false })
    assert.deepEqual(await loadProject(null), { success: false })
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('polling recovers from a dropped connection using the same cursor', async () => {
  let polls = 0
  const calls = api([message(11, 'recovered')], (call) => {
    if (call.path.includes('wait=20') && polls++ === 0) throw new Error('Network disconnected')
  })
  const { instance, logs } = runner()
  await instance.start(
    graph(
      [trigger(), node('log', 'logConsole', { message: '{content}', level: 'info' })],
      [edge('trigger', 'log')]
    )
  )
  // Allow the runner's documented three-second reconnect interval.
  await new Promise((resolve) => setTimeout(resolve, 3100))
  await until(() => logs.some((log) => log.message === 'recovered'))
  assert.deepEqual(
    calls
      .filter((call) => call.path.includes('wait=20'))
      .slice(0, 2)
      .map((call) => call.path),
    ['/events?after=10&wait=20', '/events?after=10&wait=20']
  )
})

test('Stop interrupts a rate-limit wait without executing queued nodes', async () => {
  let sending = false
  api([message(11, 'hello')], (call) => {
    if (call.method === 'POST') {
      sending = true
      return json({ error: 'slow down' }, 429, { 'Retry-After': '20' })
    }
  })
  const { instance, logs } = runner()
  await instance.start(
    graph(
      [
        trigger(),
        node('r', 'sendReply', { message: 'hello' }),
        node('after', 'logConsole', { message: 'SHOULD NOT RUN', level: 'info' })
      ],
      [edge('trigger', 'r'), edge('r', 'after')]
    )
  )
  await until(() => sending)
  await instance.stop()
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(instance.getStatus().running, false)
  assert.ok(!logs.some((log) => log.message === 'SHOULD NOT RUN'))
})

test('checkUserRole, cooldownTimer, setVariable, sendRichMessage and moderateMessage execute cleanly', async () => {
  const calls = api([
    message(11, 'admin test', { author: 'AdminUser' }),
    message(12, 'spam test', { author: 'Spammer' })
  ])
  const { instance } = runner()
  const result = await instance.start(
    graph(
      [
        trigger(),
        node('roleCheck', 'checkUserRole', {
          checkType: 'username',
          operator: 'equals',
          value: 'adminuser'
        }),
        node('adminCard', 'sendRichMessage', {
          title: 'Admin Alert',
          description: 'Welcome {user}',
          color: '#10b981'
        }),
        node('setVar', 'setVariable', {
          varName: 'spam_count',
          value: '1',
          operation: 'increment'
        }),
        node('cooldown', 'cooldownTimer', { seconds: 10, scope: 'user' }),
        node('deleteMsg', 'moderateMessage', { actionType: 'delete' }),
        node('warnReply', 'randomReply', { replies: ['Warning {user}! Count: {var:spam_count}'] }),
        node('onCooldown', 'logConsole', { message: 'On cooldown {user}', level: 'warn' })
      ],
      [
        edge('trigger', 'roleCheck'),
        edge('roleCheck', 'adminCard', 'true'),
        edge('roleCheck', 'setVar', 'false'),
        edge('setVar', 'cooldown'),
        edge('cooldown', 'deleteMsg', 'true'),
        edge('deleteMsg', 'warnReply'),
        edge('cooldown', 'onCooldown', 'false')
      ]
    )
  )
  assert.equal(result.success, true)
  await until(() => calls.some((c) => c.method === 'DELETE'))
  assert.ok(
    calls.some(
      (c) =>
        c.method === 'POST' &&
        c.path.includes('/messages') &&
        JSON.parse(c.body).embeds?.[0]?.title === 'Admin Alert'
    )
  )
  assert.ok(calls.some((c) => c.method === 'DELETE' && c.path.includes('/msg-12')))
  assert.ok(
    calls.some((c) => c.method === 'POST' && JSON.parse(c.body).content?.includes('Count: 1'))
  )
  await instance.stop()
})

test('50-hop budget covers every matching trigger and resets for each event', async () => {
  api([message(11, 'first'), message(12, 'second')])
  const { instance, logs } = runner()
  const nodes = [trigger(), node('another', 'onMessage', { ignoreBots: true })]
  const edges = []
  for (let i = 0; i < 30; i++) {
    nodes.push(node(`hop${i}`, 'logConsole', { message: 'HOP {content}', level: 'info' }))
    if (i) edges.push(edge(`hop${i - 1}`, `hop${i}`))
  }
  edges.push(edge('trigger', 'hop0'), edge('another', 'hop0'))
  assert.equal((await instance.start(graph(nodes, edges))).success, true)
  await until(() => logs.filter((log) => log.message.includes('50 node-hop limit')).length === 2)
  assert.equal(logs.filter((log) => log.message === 'HOP first').length, 50)
  assert.equal(logs.filter((log) => log.message === 'HOP second').length, 50)
  assert.ok(
    logs
      .filter((log) => log.message.includes('50 node-hop limit'))
      .every((log) => log.level === 'warn')
  )
})

test('exponential reconnect delay doubles with bounded jitter and caps at 30 seconds', () => {
  for (let attempt = 1; attempt <= 12; attempt++) {
    const base = Math.min(30_000, 1000 * 2 ** (attempt - 1))
    for (let i = 0; i < 20; i++) {
      const delay = reconnectDelay(attempt)
      assert.ok(delay >= base && delay <= Math.min(30_000, base * 1.2))
    }
  }
})

test('reconnect backoff increases, resets after success and Stop cancels it', async () => {
  // Accelerate only runner retry sleeps; AbortSignal request deadlines remain untouched.
  const originalTimeout = global.setTimeout
  const delays = []
  global.setTimeout = (fn, ms, ...args) => {
    if (ms >= 1000 && ms <= 30_000) {
      delays.push(ms)
      return originalTimeout(fn, 1, ...args)
    }
    return originalTimeout(fn, ms, ...args)
  }
  try {
    let polls = 0
    api([], (call) => {
      if (call.path.includes('wait=20')) {
        polls++
        if ([1, 2, 4].includes(polls)) throw new Error('Connection dropped')
        if (polls === 3) return json({ events: [], last: 20 })
      }
    })
    const { instance, logs } = runner()
    await instance.start(graph([trigger()]))
    await until(() => delays.length >= 3)
    assert.ok(delays[0] >= 1000 && delays[0] <= 1200)
    assert.ok(delays[1] >= 2000 && delays[1] <= 2400)
    assert.ok(delays[2] >= 1000 && delays[2] <= 1200)
    assert.ok(logs.some((log) => log.message.includes('Connection restored')))
    await instance.stop()
    const count = polls
    await new Promise((resolve) => originalTimeout(resolve, 30))
    assert.equal(polls, count)
  } finally {
    global.setTimeout = originalTimeout
  }
})

test('secure local token storage is opt-in, encrypted, serializes updates and can be cleared', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapbot-vault-'))
  try {
    const store = new TokenStore(dir)
    assert.deepEqual(await store.get(), { success: true, available: true, remember: false })
    assert.deepEqual(await fsp.readdir(dir), [])
    assert.equal((await store.set('yb_private_token', true)).success, true)
    const disk = await fsp.readFile(path.join(dir, 'bot-token.enc'))
    assert.ok(!disk.toString().includes('yb_private_token'))
    assert.equal((await new TokenStore(dir).get()).token, 'yb_private_token')
    await Promise.all([store.set('yb_latest_token', true), store.set('', false)])
    assert.equal((await store.get()).remember, false)
    assert.deepEqual(await fsp.readdir(dir), [])
    encryptionAvailable = false
    assert.equal((await store.set('yb_no_plaintext_fallback', true)).success, false)
    assert.deepEqual(await fsp.readdir(dir), [])
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('corrupt encrypted credentials return a generic error without exposing data', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapbot-vault-'))
  try {
    await fsp.writeFile(path.join(dir, 'bot-token.enc'), 'yb_secret_corrupt_data')
    const result = await new TokenStore(dir).get()
    assert.equal(result.success, false)
    assert.equal(result.token, undefined)
    assert.ok(!result.error.includes('yb_secret'))
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('standalone export creates all files without credentials and executes the exported graph', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapbot-export-'))
  const oldToken = process.env.YAPPER_BOT_TOKEN
  try {
    const input = graph(
      [
        trigger(),
        node('condition', 'textCondition', {
          operator: 'contains',
          value: 'hello',
          caseSensitive: false
        }),
        node('variable', 'setVariable', {
          varName: 'greeting',
          value: 'Welcome',
          operation: 'set'
        }),
        node('reply', 'sendReply', { message: '{var:greeting} {user} in {channel}: {content}' })
      ],
      [
        edge('trigger', 'condition'),
        edge('condition', 'variable', 'true'),
        edge('variable', 'reply')
      ]
    )
    dialogs.showOpenDialog = async (options) => {
      assert.ok(options.properties.includes('openDirectory'))
      return { canceled: false, filePaths: [dir] }
    }
    const exported = await exportStandalone(null, input)
    assert.equal(exported.success, true, exported.error)
    const files = await fsp.readdir(exported.folderPath)
    for (const required of [
      'bot.js',
      'package.json',
      '.env.example',
      'README.txt',
      'Start-Bot.bat'
    ]) {
      assert.ok(files.includes(required))
      assert.ok(
        !(await fsp.readFile(path.join(exported.folderPath, required), 'utf8')).includes(
          input.token
        )
      )
    }
    const syntax = require('node:child_process').spawnSync(
      process.execPath,
      ['--check', path.join(exported.folderPath, 'bot.js')],
      { encoding: 'utf8' }
    )
    assert.equal(syntax.status, 0, syntax.stderr)
    const missingToken = require('node:child_process').spawnSync(process.execPath, ['bot.js'], {
      cwd: exported.folderPath,
      env: { ...process.env, YAPPER_BOT_TOKEN: '' },
      encoding: 'utf8'
    })
    assert.equal(missingToken.status, 1)
    assert.ok(!missingToken.stderr.includes(input.token))
    const calls = api([message(11, 'Hello there')])
    // Exercise Node's built-in .env loading; no npm install and no Electron runtime.
    delete process.env.YAPPER_BOT_TOKEN
    await fsp.writeFile(path.join(exported.folderPath, '.env'), 'YAPPER_BOT_TOKEN=yb_test_token\n')
    const { startStandalone } = require(path.join(exported.folderPath, 'bot.js'))
    const bot = await startStandalone()
    runners.push(bot)
    await until(() => calls.some((call) => call.method === 'POST'))
    assert.deepEqual(JSON.parse(calls.find((call) => call.method === 'POST').body), {
      content: 'Welcome Alice in channel: Hello there',
      reply_to: 'msg-11'
    })
    await bot.stop()
    // Another export creates a distinct folder and preserves the configured .env.
    const next = await exportStandalone(null, input)
    assert.notEqual(next.folderPath, exported.folderPath)
    assert.equal(
      await fsp.readFile(path.join(exported.folderPath, '.env'), 'utf8'),
      'YAPPER_BOT_TOKEN=yb_test_token\n'
    )
    dialogs.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
    assert.deepEqual(await exportStandalone(null, input), { success: false })
  } finally {
    if (oldToken === undefined) delete process.env.YAPPER_BOT_TOKEN
    else process.env.YAPPER_BOT_TOKEN = oldToken
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('export refuses invalid executable graphs and secrets pasted into node settings', () => {
  const secretGraph = graph([
    trigger(),
    node('log', 'logConsole', { message: 'yb_test_token', level: 'info' })
  ])
  assert.throws(() => standaloneFiles(secretGraph), /Remove bot tokens/)
  assert.throws(() => standaloneFiles(graph([])), /trigger/)
  assert.throws(
    () =>
      standaloneFiles(
        graph(
          [trigger(), node('log', 'logConsole', { message: 'safe', level: 'info' })],
          [edge('trigger', 'log'), edge('log', 'log')]
        )
      ),
    /cycle/
  )
})

test('long server Retry-After takes precedence over exponential delay and is cancellable', async () => {
  let delay
  const originalTimeout = global.setTimeout
  global.setTimeout = (fn, ms, ...args) => {
    if (ms >= 60_000) delay = ms
    return originalTimeout(fn, ms, ...args)
  }
  try {
    api([], (call) =>
      call.path.includes('wait=20') ? json({ error: 'busy' }, 503, { 'Retry-After': '60' }) : null
    )
    const { instance } = runner()
    await instance.start(graph([trigger()]))
    await until(() => delay)
    assert.equal(delay, 60_000)
    await instance.stop()
    assert.equal(instance.getStatus().running, false)
  } finally {
    global.setTimeout = originalTimeout
  }
})

test('multi-flow projects namespace IDs, skip disabled flows and folders, and preserve project metadata', async () => {
  const { compileGraph } = require('../src/main/botRunner.ts')
  const { publicGraph } = require('../src/main/projectFiles.ts')
  const folder = {
    id: 'folder',
    name: 'Disabled',
    color: '#ff0000',
    isOpen: false,
    isDisabled: true
  }
  const flow = (id, isDisabled = false, folderId) => ({
    id,
    name: id,
    color: '#5865f2',
    isOpen: true,
    isDisabled,
    folderId,
    nodes: [trigger(), node('log', 'logConsole', { message: id, level: 'info' })],
    edges: [edge('trigger', 'log')]
  })
  const input = {
    ...graph([]),
    flows: [flow('one'), flow('two'), flow('off', true), flow('folder-off', false, 'folder')],
    folders: [folder]
  }
  const compiled = compileGraph(input)
  assert.equal(compiled.graph.nodes.length, 4)
  assert.equal(new Set(compiled.graph.nodes.map((n) => n.id)).size, 4)
  const restored = parseProject({ version: '1.0.0', graph: publicGraph(input) })
  assert.deepEqual(restored.flows, input.flows)
  api([message(11, 'hello')])
  const { instance, logs } = runner()
  assert.equal((await instance.start(input)).success, true)
  await until(() => logs.some((l) => l.message === 'two'))
  assert.ok(!logs.some((l) => l.message === 'off' || l.message === 'folder-off'))
})

test('every marketplace graph validates and installation assigns fresh IDs preserving handles', () => {
  const { MARKETPLACE_ITEMS } = require('../src/renderer/src/marketplaceData.ts')
  const { newFlow } = require('../src/renderer/src/flows.ts')
  for (const item of MARKETPLACE_ITEMS.filter((i) => i.type !== 'theme')) {
    assert.ok(item.nodes?.length, item.name)
    const first = newFlow(item.name, item.nodes, item.edges)
    const second = newFlow(item.name, item.nodes, item.edges)
    assert.ok(first.nodes.every((n) => !second.nodes.some((m) => m.id === n.id)))
    assert.equal(first.edges.length, item.edges.length)
    for (let i = 0; i < first.edges.length; i++)
      assert.equal(first.edges[i].sourceHandle, item.edges[i].sourceHandle)
  }
})
