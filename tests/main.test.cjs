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
const originalLoad = Module._load
Module._load = function (id, ...args) {
  return id === 'electron' ? { dialog: dialogs } : originalLoad.call(this, id, ...args)
}
const { BotRunner } = require('../src/main/botRunner.ts')
const { saveProject, loadProject, parseProject } = require('../src/main/projectFiles.ts')
Module._load = originalLoad
const originalFetch = global.fetch
const runners = []
afterEach(async () => {
  for (const runner of runners.splice(0)) await runner.stop()
  global.fetch = originalFetch
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
    assert.deepEqual(loaded.data, input)
    // A blank token must round-trip and replace the previous token in the UI.
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
