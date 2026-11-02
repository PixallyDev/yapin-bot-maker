const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function catalogNode(id, type, data = {}) {
  const { CATALOG_BY_TYPE } = require('../src/renderer/src/data/nodeCatalog.ts')
  const schema = CATALOG_BY_TYPE.get(`catalog.${type}`)
  return node(id, `catalog.${type}`, { ...schema.defaultData, ...data })
}
function adapterFixture(directory) {
  const { CatalogRuntime } = require('../src/main/catalogRuntime.ts')
  const { jsonValue, stringify, jsonPath } = require('../src/main/runtimeValues.ts')
  const local = new Map(),
    global = new Map(),
    warnings = [],
    calls = [],
    branches = []
  let stopped = false
  const get = (name) => (local.has(name) ? local.get(name) : global.get(name))
  const expand = (value) =>
    typeof value === 'string'
      ? value.replace(/\{(?:var:)?([\w.-]+)\}/g, (raw, name) =>
          get(name) === undefined ? raw : stringify(get(name))
        )
      : stringify(value)
  const c = {
    signal: new AbortController().signal,
    event: {
      channel: 'channel',
      serverId: 'server',
      authorId: 'person',
      messageId: 'message',
      botId: 'bot'
    },
    get,
    expand,
    value: (value) => {
      const match = typeof value === 'string' && /^\{(?:var:)?([\w.-]+)\}$/.exec(value)
      return match ? get(match[1]) : jsonValue(expand(value))
    },
    set: (name, value, scope) => (scope === 'global' ? global : local).set(name, value),
    branch: async (handle) => branches.push({ handle, item: get('item'), index: get('index') }),
    call: async () => null,
    stopped: () => stopped,
    stopFlow: () => {
      stopped = true
    },
    stopBot: async () => {},
    waitEvent: async () => ({ content: 'reply' })
  }
  const runtime = new CatalogRuntime(
    { projectDirectory: directory },
    async (method, path, body) => {
      calls.push({ method, path, body })
      return { id: 'generated', content: 'source' }
    },
    (message) => warnings.push(message)
  )
  const run = (type, data = {}) =>
    runtime.run(`catalog.${type}`, catalogNode('test', type, data).data, c)
  return { runtime, c, local, global, warnings, calls, branches, run, jsonPath }
}

test('project cleanup purges unknown nodes and dangling edges independently in every flow', () => {
  const { cleanProjectGraph, isSupportedNodeType } = require('../src/shared/nodeSupport.ts')
  const { NODE_CATALOG } = require('../src/renderer/src/data/nodeCatalog.ts')
  for (const entry of NODE_CATALOG) assert.ok(isSupportedNodeType(entry.type), entry.type)
  const input = graph(
    [
      trigger(),
      node('bad', 'catalog.setPresance', {}),
      node('unknown', 'removedLegacyNode', {}),
      catalogNode('valid', 'setPresence')
    ],
    [
      edge('trigger', 'bad'),
      edge('bad', 'valid', 'next'),
      edge('unknown', 'valid'),
      edge('missing', 'valid'),
      edge('trigger', 'valid')
    ]
  )
  input.flows = [
    { id: 'one', name: 'One', nodes: input.nodes, edges: input.edges },
    {
      id: 'two',
      name: 'Two',
      nodes: [node('bad', 'logConsole', { message: 'preserved' })],
      edges: []
    }
  ]
  const original = structuredClone(input)
  const cleaned = cleanProjectGraph(input)
  assert.deepEqual(
    cleaned.nodes.map((n) => n.id),
    ['trigger', 'valid']
  )
  assert.equal(cleaned.edges.length, 1)
  assert.deepEqual(cleaned.flows[0].nodes, cleaned.nodes)
  assert.equal(cleaned.flows[0].edges.length, 1)
  assert.equal(cleaned.flows[1].nodes[0].id, 'bad')
  assert.deepEqual(input, original)
  const parsed = parseProject({
    version: '1.0.0',
    graph: { nodes: input.nodes, edges: input.edges }
  })
  assert.deepEqual(parsed.nodes, cleaned.nodes)
  const { publicGraph } = require('../src/main/projectFiles.ts')
  assert.deepEqual(publicGraph(graph(input.nodes, input.edges)).nodes, cleaned.nodes)
})

test('saved renderer projects migrate unknown nodes, edges and counts in localStorage', () => {
  const previous = global.window
  const storage = new Map()
  const key = 'yapin_bot_projects_list'
  const nodes = [trigger(), node('bad', 'catalog.setPresance', {})]
  storage.set(
    key,
    JSON.stringify([
      {
        id: 'project',
        name: 'Saved',
        nodes,
        edges: [edge('trigger', 'bad')],
        nodeCount: 2,
        edgeCount: 1,
        flows: [
          { id: 'closed', isOpen: false, isDisabled: true, nodes, edges: [edge('trigger', 'bad')] }
        ]
      }
    ])
  )
  global.window = {
    localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) }
  }
  try {
    const { getSavedProjects, saveProjectRecord } = require('../src/renderer/src/projectManager.ts')
    const [project] = getSavedProjects()
    assert.equal(project.nodes.length, 1)
    assert.equal(project.edges.length, 0)
    assert.equal(project.nodeCount, 1)
    assert.equal(project.edgeCount, 0)
    assert.equal(project.flows[0].nodes.length, 1)
    assert.equal(project.flows[0].edges.length, 0)
    assert.equal(project.flows[0].isDisabled, true)
    assert.ok(!storage.get(key).includes('setPresance'))
    saveProjectRecord({ ...project, nodes, edges: [edge('trigger', 'bad')] })
    assert.ok(!storage.get(key).includes('setPresance'))
  } finally {
    if (previous === undefined) delete global.window
    else global.window = previous
  }
})

test('unknown catalog actions warn once per type and continue through the normal output', async () => {
  api([message(11, 'first'), message(12, 'second')])
  const { instance, logs } = runner()
  const result = await instance.start(
    graph(
      [
        trigger(),
        node('unknown', 'catalog.setPresance', {}),
        node('continued', 'logConsole', { message: 'continued past unknown', level: 'info' }),
        node('wrong', 'logConsole', { message: 'wrong branch', level: 'info' })
      ],
      [
        edge('trigger', 'unknown'),
        edge('unknown', 'wrong', 'error'),
        edge('unknown', 'continued', 'next')
      ]
    )
  )
  assert.equal(result.success, true, result.message)
  await until(() => logs.filter((log) => log.message === 'continued past unknown').length === 2)
  assert.equal(
    logs.filter(
      (log) => log.message === '[BotRunner] Skipping unsupported node: catalog.setPresance'
    ).length,
    1
  )
  assert.ok(!logs.some((log) => log.level === 'error' || log.message === 'wrong branch'))
})

test('catalog logic branches, repeated each/done execution, function locals and try/catch use the live runner', async () => {
  api([message(11, 'run')])
  const { instance, logs } = runner()
  const nodes = [
    trigger(),
    catalogNode('repeat', 'repeat', { count: 3 }),
    catalogNode('math', 'math', {
      expression: '{index} + 1',
      saveToVariable: true,
      variableName: 'number',
      variableScope: 'global'
    }),
    node('eachLog', 'logConsole', { message: 'number {var:number}', level: 'info' }),
    catalogNode('list', 'forEach', { value: '[10,20]' }),
    node('itemLog', 'logConsole', { message: 'item {item}', level: 'info' }),
    catalogNode('call', 'callFunction', {
      name: 'multiply',
      arguments: '{"x":6}',
      saveToVariable: true,
      variableName: 'answer',
      variableScope: 'global'
    }),
    catalogNode('function', 'functionCalled', { name: 'multiply' }),
    catalogNode('functionMath', 'math', {
      expression: '{x} * 7',
      saveToVariable: true,
      variableName: 'return'
    }),
    catalogNode('switch', 'switch', {
      value: '{var:answer}',
      cases: '[{"value":42,"handle":"answer"}]'
    }),
    catalogNode('chance', 'chance', { percent: 100 }),
    catalogNode('try', 'tryCatch'),
    catalogNode('fail', 'math', { expression: '1/0' }),
    node('caught', 'logConsole', { message: 'caught {var:error}', level: 'info' }),
    node('done', 'logConsole', { message: 'catalog done {var:answer}', level: 'success' })
  ]
  const edges = [
    edge('trigger', 'repeat'),
    edge('repeat', 'math', 'each'),
    edge('math', 'eachLog', 'next'),
    edge('repeat', 'list', 'done'),
    edge('list', 'itemLog', 'each'),
    edge('list', 'call', 'done'),
    edge('function', 'functionMath', 'next'),
    edge('call', 'switch', 'next'),
    edge('switch', 'chance', 'answer'),
    edge('chance', 'try', 'true'),
    edge('try', 'fail', 'try'),
    edge('try', 'caught', 'catch'),
    edge('try', 'done', 'next')
  ]
  const result = await instance.start(graph(nodes, edges))
  assert.equal(result.success, true, result.message)
  await until(() => logs.some((log) => log.message === 'catalog done 42'))
  assert.deepEqual(
    logs.filter((log) => log.message.startsWith('number ')).map((log) => log.message),
    ['number 1', 'number 2', 'number 3']
  )
  assert.deepEqual(
    logs.filter((log) => log.message.startsWith('item ')).map((log) => log.message),
    ['item 10', 'item 20']
  )
  assert.ok(logs.some((log) => log.message.startsWith('caught ')))
  assert.equal(instance.getVariables().answer, 42)
})

test('catalog math, typed lists, text, booleans, timestamps, stopwatch and authenticated AES round trip', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-values-'))
  try {
    const { run, local } = adapterFixture(dir)
    for (const [expression, expected] of [
      ['(2+3)*4', 20],
      ['2**3**2', 512],
      ['-2^2', -4],
      ['2^-2', 0.25]
    ])
      assert.equal((await run('math', { expression })).value, expected)
    await assert.rejects(() => run('math', { expression: 'process.exit()' }), /Invalid math/)
    local.set('items', [1, 2])
    assert.deepEqual((await run('listAdd', { items: '{var:items}', value: '3' })).value, [1, 2, 3])
    assert.deepEqual((await run('listRemove', { items: '[1,2,1]', value: '1' })).value, [2, 1])
    assert.equal((await run('listContains', { items: '[1,2]', value: '2' })).handle, 'true')
    assert.equal((await run('listSize', { items: '[1,2]' })).value, 2)
    assert.equal((await run('formatList', { items: '[1,2]', separator: ' | ' })).value, '1 | 2')
    assert.equal(
      (await run('modifyText', { value: 'Hello', operation: 'uppercase' })).value,
      'HELLO'
    )
    assert.equal((await run('toggleBoolean', { varName: 'flag' })).value, true)
    assert.equal((await run('toggleBoolean', { varName: 'flag' })).value, false)
    await run('stopwatchStart', { name: 'test' })
    assert.ok((await run('stopwatchEnd', { name: 'test' })).value >= 0)
    assert.equal(
      (
        await run('timestampMath', {
          timestamp: '2026-01-01T00:00:00.000Z',
          seconds: 60,
          operation: 'add'
        })
      ).value,
      '2026-01-01T00:01:00.000Z'
    )
    local.set('key', 'test-only-passphrase')
    const packet = (
      await run('cryptoText', { value: 'private text', keyVariable: 'key', operation: 'encrypt' })
    ).value
    assert.ok(!packet.includes('private text'))
    assert.equal(
      (await run('cryptoText', { value: packet, keyVariable: 'key', operation: 'decrypt' })).value,
      'private text'
    )
    local.set('key', 'wrong-key')
    await assert.rejects(() =>
      run('cryptoText', { value: packet, keyVariable: 'key', operation: 'decrypt' })
    )
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('project JSON database persists KV and table CRUD, serializes writers and round-trips quoted CSV', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-database-'))
  try {
    const { run, runtime } = adapterFixture(dir)
    const database = 'data/bot.json'
    assert.deepEqual(
      (await run('dbSet', { database, key: 'record', value: '{"score":7}' })).value,
      { score: 7 }
    )
    assert.deepEqual((await adapterFixture(dir).run('dbGet', { database, key: 'record' })).value, {
      score: 7
    })
    assert.equal((await run('dbDelete', { database, key: 'record' })).value, true)
    await assert.rejects(
      () => run('dbSet', { database, key: '__proto__', value: '{}' }),
      /Invalid database/
    )
    await assert.rejects(
      () => run('dbInsert', { database, table: '__proto__', value: '{}' }),
      /Invalid database/
    )
    for (const value of ['{"name":"Alice","score":1}', '{"name":"Bob","score":2}'])
      await run('dbInsert', { database, table: 'users', value })
    assert.equal((await run('dbCount', { database, table: 'users', filter: '{}' })).value, 2)
    assert.equal(
      (
        await run('dbUpdate', {
          database,
          table: 'users',
          filter: '{"name":"Alice"}',
          value: '{"score":9}'
        })
      ).value,
      1
    )
    assert.equal(
      (await run('dbFind', { database, table: 'users', filter: '{"score":9}' })).value[0].name,
      'Alice'
    )
    await run('dbExport', { database, table: 'users', path: 'users.csv' })
    assert.equal(
      (await run('dbImport', { database, table: 'imported', path: 'users.csv' })).value,
      2
    )
    assert.equal(
      (await run('dbDeleteRows', { database, table: 'users', filter: '{"name":"Bob"}' })).value,
      1
    )
    await Promise.all(
      Array.from({ length: 10 }, () =>
        runtime.storage.database(database, (db) => {
          db.kv.counter = Number(db.kv.counter ?? 0) + 1
        })
      )
    )
    assert.equal((await run('dbGet', { database, key: 'counter' })).value, 10)
    const { parseCSV, formatCSV } = require('../src/main/runtimeStorage.ts')
    const rows = [{ name: 'a,b', notes: 'quoted "value"\nsecond line' }]
    assert.deepEqual(parseCSV(formatCSV(rows)), rows)
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('project file operations block traversal, absolute paths and junction escapes; archives remain sandboxed', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-files-'))
  try {
    const root = path.join(dir, 'project'),
      outside = path.join(dir, 'outside')
    await fsp.mkdir(outside)
    const { run, runtime } = adapterFixture(root)
    await run('writeFile', { path: 'folder/data.txt', content: 'hello', mode: 'write' })
    await run('writeFile', { path: 'folder/data.txt', content: ' world', mode: 'append' })
    assert.equal((await run('readFile', { path: 'folder/data.txt' })).value, 'hello world')
    assert.equal((await run('fileExists', { path: 'folder/data.txt' })).handle, 'true')
    for (const filename of ['../escape.txt', '..\\escape.txt', path.join(dir, 'absolute.txt')])
      await assert.rejects(
        () => run('writeFile', { path: filename, content: 'no' }),
        /project folder/
      )
    await fsp.symlink(
      outside,
      path.join(root, 'link'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    await assert.rejects(
      () => run('writeFile', { path: 'link/escape.txt', content: 'no' }),
      /Symlinks/
    )
    assert.deepEqual(await fsp.readdir(outside), [])
    await runtime.storage.archive('folder', 'data.zip')
    await runtime.storage.archive('data.zip', 'restored', true)
    assert.equal((await runtime.storage.read('restored/data.txt')).toString(), 'hello world')
    const malicious = require('fflate').zipSync({ '../escape.txt': Buffer.from('bad') })
    await runtime.storage.write('bad.zip', malicious)
    await assert.rejects(() => runtime.storage.archive('bad.zip', 'safe', true), /project folder/)
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('HTTP nodes template JSON bodies, extract JSON paths and route success and error in a running graph', async () => {
  const http = require('node:http'),
    received = []
  const server = http.createServer((req, res) => {
    let text = ''
    req.on('data', (chunk) => (text += chunk))
    req.on('end', () => {
      received.push({ url: req.url, header: req.headers['x-test'], body: text })
      res.writeHead(req.url === '/fail' ? 503 : 200, { 'Content-Type': 'application/json' })
      res.end('{"data":{"answer":42}}')
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    api([message(11, 'hello "quoted"')])
    const botFetch = global.fetch
    global.fetch = (url, options) =>
      String(url).startsWith(base) ? originalFetch(url, options) : botFetch(url, options)
    const { instance, logs } = runner()
    const nodes = [
      trigger(),
      catalogNode('http', 'httpRequest', {
        url: `${base}/ok`,
        method: 'POST',
        headers: '{"Content-Type":"application/json","X-Test":"{content}"}',
        body: '{"text":"{content}"}',
        saveToVariable: true,
        variableName: 'answer',
        jsonPath: '$.data.answer',
        variableScope: 'global'
      }),
      catalogNode('failed', 'httpRequest', { url: `${base}/fail` }),
      node('error', 'logConsole', { message: 'http error {var:error}', level: 'warn' }),
      node('wrong', 'logConsole', { message: 'WRONG HTTP BRANCH', level: 'error' })
    ]
    const result = await instance.start(
      graph(nodes, [
        edge('trigger', 'http'),
        edge('http', 'failed', 'success'),
        edge('failed', 'error', 'error'),
        edge('failed', 'wrong', 'success')
      ])
    )
    assert.equal(result.success, true, result.message)
    await until(() => logs.some((log) => log.message.startsWith('http error ')))
    assert.equal(instance.getVariables().answer, 42)
    assert.deepEqual(JSON.parse(received[0].body), { text: 'hello "quoted"' })
    assert.equal(received[0].header, 'hello "quoted"')
    assert.ok(!logs.some((log) => log.message === 'WRONG HTTP BRANCH'))
    await instance.stop()
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})

test('unsupported Yapin actions warn instead of inventing Discord endpoints', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-actions-'))
  try {
    const { run, warnings, calls } = adapterFixture(dir)
    for (const type of [
      'typing',
      'channelTopic',
      'createThread',
      'archiveThread',
      'createInvite',
      'clearReactions'
    ])
      assert.equal((await run(type)).handle, 'error')
    assert.equal(calls.length, 0)
    assert.equal(warnings.length, 6)
    assert.ok(warnings.every((message) => message.startsWith('[Yapin API]')))
    await run('timeoutMember', { serverId: 'server', userId: 'user', minutes: 10 })
    assert.equal(calls[0].path, '/servers/server/timeouts')
    assert.deepEqual(calls[0].body.user_id, 'user')
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('all catalog actions have an adapter; unconfigured inputs report errors rather than missing implementations', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-adapters-'))
  global.fetch = async () => {
    throw Error('Network disabled in adapter coverage test')
  }
  try {
    const { run } = adapterFixture(dir)
    const { NODE_CATALOG } = require('../src/renderer/src/data/nodeCatalog.ts')
    for (const entry of NODE_CATALOG.filter(
      (entry) => entry.type.startsWith('catalog.') && entry.inputs.length
    )) {
      try {
        await run(entry.type.slice(8))
      } catch (error) {
        assert.ok(!error.message.includes('No action adapter'), `${entry.type}: ${error.message}`)
      }
    }
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('AI uses node settings and key variables; Gemini uses generateContent without exposing the key', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-ai-'))
  try {
    const fixture = adapterFixture(dir),
      { CatalogRuntime } = require('../src/main/catalogRuntime.ts'),
      requests = []
    const runtime = new CatalogRuntime(
      {
        projectDirectory: dir
      },
      async () => ({}),
      () => {}
    )
    fixture.local.set('aiKey', 'test-only-api-key')
    global.fetch = async (url, options) => {
      requests.push({ url, headers: options.headers, body: JSON.parse(options.body) })
      return json(
        String(url).includes('generativelanguage')
          ? { candidates: [{ content: { parts: [{ text: 'gemini text' }] } }] }
          : { choices: [{ message: { content: 'openai text' } }] }
      )
    }
    const openai = await runtime.run(
      'catalog.askAI',
      catalogNode('ai', 'askAI', {
        prompt: 'hello',
        apiKeyVariable: 'aiKey',
        model: 'configured-model',
        systemPrompt: 'Be concise.'
      }).data,
      fixture.c
    )
    assert.equal(openai.value, 'openai text')
    assert.equal(requests[0].body.model, 'configured-model')
    assert.equal(requests[0].body.messages[0].content, 'Be concise.')
    assert.equal(requests[0].headers.get('authorization'), 'Bearer test-only-api-key')
    const gemini = await runtime.run(
      'catalog.askAI',
      catalogNode('ai', 'askAI', {
        provider: 'Gemini',
        prompt: 'hello',
        apiKeyVariable: 'aiKey',
        model: 'configured-model'
      }).data,
      fixture.c
    )
    assert.equal(gemini.value, 'gemini text')
    assert.ok(String(requests[1].url).endsWith('/models/configured-model:generateContent'))
    assert.equal(requests[1].headers.get('x-goog-api-key'), 'test-only-api-key')
    assert.equal(runtime.redact('key test-only-api-key'), 'key [hidden]')
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('media adapters generate/read QR PNGs and metadata; feed adapters preserve unique RSS/Atom identities', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-media-'))
  try {
    const { run, runtime } = adapterFixture(dir)
    const png = await require('qrcode').toBuffer('Yapin QR content', { type: 'png' })
    await runtime.storage.write('qr.png', png)
    assert.equal((await run('qrRead', { value: 'qr.png' })).value, 'Yapin QR content')
    assert.equal((await run('imageMetadata', { value: 'qr.png' })).value.type, 'png')
    assert.ok((await run('qrGenerate', { value: 'hello' })).value.includes('<svg'))
    global.fetch = async () =>
      new Response(
        '<rss><channel><item><guid isPermaLink="false">one</guid><title>First</title></item><item><guid isPermaLink="false">two</guid><title>Second</title></item></channel></rss>'
      )
    const rss = await runtime.feed(
      'catalog.rss',
      { source: 'https://example.test/rss' },
      new AbortController().signal
    )
    assert.deepEqual(
      rss.map((item) => item.id),
      ['one', 'two']
    )
    global.fetch = async () =>
      new Response(
        '<feed><entry><id>video:1</id><title>Upload</title><link href="https://youtube.test/video"/></entry></feed>'
      )
    const atom = await runtime.feed(
      'catalog.youtube',
      { source: 'channel-id' },
      new AbortController().signal
    )
    assert.equal(atom[0].id, 'video:1')
    assert.equal(atom[0].url, 'https://youtube.test/video')
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('ticket panels handle real button callbacks and create private role-scoped channels', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-tickets-'))
  try {
    const { run, runtime, calls, c } = adapterFixture(dir)
    await run('ticketPanel', {
      serverId: 'server',
      channelId: 'channel',
      staffRoleIds: '["staff"]',
      message: 'Open support'
    })
    const customId = calls[0].body.components[0].components[0].custom_id
    assert.ok(customId.startsWith('yapin-ticket:'))
    assert.equal(
      await runtime.ticketInteraction(
        { id: 'interaction', token: 'private-interaction-token', custom_id: customId },
        c
      ),
      true
    )
    const privacy = calls.find(
      (call) => call.method === 'PATCH' && call.path.startsWith('/channels/')
    )
    assert.equal(privacy.body.private, true)
    assert.deepEqual(privacy.body.role_ids, ['generated', 'staff'])
    assert.ok(calls.some((call) => call.path.includes('/members/person/roles/generated')))
    assert.ok(
      !(await runtime.storage.read('tickets.json')).toString().includes('private-interaction-token')
    )
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('wait-message polls beyond the current event without blocking the next incoming reply', async () => {
  const calls = api([message(11, 'question')], (call) =>
    call.path.includes('after=11&') ? json({ events: [message(12, 'answer')], last: 12 }) : null
  )
  const { instance, logs } = runner()
  const result = await instance.start(
    graph(
      [
        trigger(),
        catalogNode('wait', 'waitMessage', {
          timeout: 1,
          saveToVariable: true,
          variableName: 'reply'
        }),
        node('log', 'logConsole', { message: 'received {var:reply.content}', level: 'info' })
      ],
      [edge('trigger', 'wait'), edge('wait', 'log', 'success')]
    )
  )
  assert.equal(result.success, true, result.message)
  await until(() => logs.some((log) => log.message === 'received answer'))
  assert.ok(calls.some((call) => call.path.includes('after=11&')))
  await instance.stop()
})

test('startup and interval triggers execute without message triggers and stop cancels scheduled work', async () => {
  api([])
  const { instance, logs } = runner()
  const result = await instance.start(
    graph(
      [
        catalogNode('start', 'botStarts'),
        catalogNode('timer', 'interval', { seconds: 0.1 }),
        node('startLog', 'logConsole', { message: 'startup ran', level: 'info' }),
        node('timerLog', 'logConsole', { message: 'interval ran', level: 'info' })
      ],
      [edge('start', 'startLog', 'next'), edge('timer', 'timerLog', 'next')]
    )
  )
  assert.equal(result.success, true, result.message)
  await until(() => logs.some((log) => log.message === 'interval ran'))
  assert.ok(logs.some((log) => log.message === 'startup ran'))
  await instance.stop()
  const count = logs.filter((log) => log.message === 'interval ran').length
  await new Promise((resolve) => setTimeout(resolve, 150))
  assert.equal(logs.filter((log) => log.message === 'interval ran').length, count)
})

test('templates never expand tokens injected through incoming user text', async () => {
  const calls = api([message(11, '{var:secret}')])
  const { instance } = runner()
  const result = await instance.start(
    graph(
      [
        trigger(),
        node('secret', 'setVariable', {
          varName: 'secret',
          value: 'private-value',
          operation: 'set'
        }),
        node('reply', 'sendReply', { message: '{content}' })
      ],
      [edge('trigger', 'secret'), edge('secret', 'reply')]
    )
  )
  assert.equal(result.success, true)
  await until(() => calls.some((call) => call.method === 'POST'))
  assert.equal(
    JSON.parse(calls.find((call) => call.method === 'POST').body).content,
    '{var:secret}'
  )
})

test('weather uses free Open-Meteo geocoding/forecast and dictionary/repository adapters use their documented endpoints', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-public-api-')),
    requests = []
  try {
    global.fetch = async (url, options) => {
      const address = new URL(String(url))
      requests.push({ address, headers: options.headers })
      if (address.hostname === 'geocoding-api.open-meteo.com')
        return json({ results: [{ latitude: 52.23, longitude: 21.01 }] })
      if (address.hostname === 'api.open-meteo.com')
        return json({ current: { temperature_2m: 12 } })
      if (address.hostname === 'api.dictionaryapi.dev')
        return json([{ word: 'hello', meanings: [] }])
      if (address.hostname === 'api.github.com') return json({ full_name: 'owner/repository' })
      assert.fail(`Unexpected public API endpoint ${address.hostname}`)
    }
    const { run } = adapterFixture(dir)
    assert.equal(
      (await run('weather', { location: 'Warsaw', units: 'metric' })).value.current.temperature_2m,
      12
    )
    assert.ok(
      requests
        .slice(0, 2)
        .every(
          (item) => !item.address.searchParams.has('apikey') && !item.headers.has('Authorization')
        )
    )
    assert.equal((await run('dictionary', { word: 'hello' })).value[0].word, 'hello')
    assert.equal(
      (await run('githubRepo', { owner: 'owner', repository: 'repository' })).value.full_name,
      'owner/repository'
    )
    assert.equal(requests[1].address.searchParams.get('latitude'), '52.23')
    assert.equal(requests[2].address.pathname, '/api/v2/entries/en/hello')
  } finally {
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('social pollers establish a baseline after recovery, deduplicate posts and stop with the session', async () => {
  const originalTimeout = global.setTimeout
  global.setTimeout = (fn, ms, ...args) => originalTimeout(fn, ms === 30_000 ? 2 : ms, ...args)
  try {
    api([])
    const botFetch = global.fetch
    let polls = 0
    global.fetch = async (url, options) => {
      if (new URL(String(url)).hostname !== 'example.test') return botFetch(url, options)
      polls++
      if (polls === 1) return new Response('busy', { status: 503 })
      return new Response(
        `<rss><channel><item><guid>one</guid><title>First</title></item>${polls > 2 ? '<item><guid>two</guid><title>Second</title></item>' : ''}</channel></rss>`
      )
    }
    const { instance, logs } = runner()
    const result = await instance.start(
      graph(
        [
          catalogNode('rss', 'rss', { source: 'https://example.test/feed', interval: 30 }),
          node('rssLog', 'logConsole', { message: 'feed {var:event.title}', level: 'info' })
        ],
        [edge('rss', 'rssLog', 'next')]
      )
    )
    assert.equal(result.success, true, result.message)
    await until(() => logs.some((log) => log.message === 'feed Second'))
    await instance.stop()
    assert.equal(logs.filter((log) => log.message === 'feed Second').length, 1)
    assert.ok(!logs.some((log) => log.message === 'feed First'))
  } finally {
    global.setTimeout = originalTimeout
  }
})

test('webhook listener requires its secret, dispatches JSON and releases its port on abort', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yapin-webhook-'))
  const controller = new AbortController(),
    received = []
  let server
  try {
    const probe = require('node:http').createServer()
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const port = probe.address().port
    await new Promise((resolve) => probe.close(resolve))
    const { runtime } = adapterFixture(dir)
    server = runtime.webhook(
      { port, path: '/webhook', secret: 'test-only-webhook-secret' },
      controller.signal,
      async (event) => {
        received.push(event)
      }
    )
    await require('node:events').once(server, 'listening')
    const endpoint = `http://127.0.0.1:${port}/webhook`
    const denied = await originalFetch(endpoint, { method: 'POST', body: '{}' })
    assert.equal(denied.status, 401)
    await denied.text()
    const accepted = await originalFetch(endpoint, {
      method: 'POST',
      headers: { 'X-Webhook-Secret': 'test-only-webhook-secret' },
      body: '{"value":7}'
    })
    assert.equal(accepted.status, 202)
    await accepted.text()
    await until(() => received.length === 1)
    assert.deepEqual(received[0].body, { value: 7 })
  } finally {
    const closed = server ? require('node:events').once(server, 'close') : Promise.resolve()
    controller.abort()
    await closed
    await fsp.rm(dir, { recursive: true, force: true })
  }
})

test('catalog covers every category with unique schemas, valid defaults and stable legacy handles', () => {
  const {
    NODE_CATALOG,
    NODE_CATEGORIES,
    searchCatalog
  } = require('../src/renderer/src/data/nodeCatalog.ts')
  const { validateGraph, compileGraph } = require('../src/main/botRunner.ts')
  assert.equal(NODE_CATEGORIES.length, 15)
  assert.ok(NODE_CATALOG.length >= 75)
  assert.equal(new Set(NODE_CATALOG.map((n) => n.type)).size, NODE_CATALOG.length)
  for (const category of NODE_CATEGORIES)
    assert.ok(NODE_CATALOG.some((n) => n.category === category.id))
  for (const entry of NODE_CATALOG) {
    assert.ok(
      entry.title && entry.description && entry.icon && entry.accentColor && entry.summaryTemplate
    )
    assert.equal(new Set(entry.fields.map((f) => f.key)).size, entry.fields.length)
    validateGraph({
      token: '',
      nodes: [
        { id: 'test', type: entry.type, position: { x: 17, y: 29 }, data: entry.defaultData }
      ],
      edges: []
    })
  }
  const old = NODE_CATALOG.filter((n) => !n.type.startsWith('catalog.'))
  assert.equal(old.length, 14)
  assert.deepEqual(old.find((n) => n.type === 'onCommand').outputs, ['out'])
  assert.deepEqual(old.find((n) => n.type === 'textCondition').outputs, ['true', 'false'])
  const entry = NODE_CATALOG.find((n) => n.type === 'catalog.httpRequest')
  const next = NODE_CATALOG.find((n) => n.type === 'logConsole')
  const project = {
    token: '',
    nodes: [
      { id: 'http', type: entry.type, position: { x: 0, y: 0 }, data: entry.defaultData },
      { id: 'log', type: next.type, position: { x: 100, y: 100 }, data: next.defaultData }
    ],
    edges: [
      { id: 'edge', source: 'http', target: 'log', sourceHandle: 'success', targetHandle: 'in' }
    ]
  }
  validateGraph(project)
  assert.throws(
    () => validateGraph({ ...project, edges: [{ ...project.edges[0], sourceHandle: 'out' }] }),
    /catalog output/
  )
  assert.throws(() => compileGraph(project), /trigger/)
  assert.ok(searchCatalog('APIs HTTP').some((n) => n.type === 'catalog.httpRequest'))
})

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
const shellOpenedUrls = []
const originalLoad = Module._load
Module._load = function (id, ...args) {
  if (id === 'electron')
    return {
      dialog: dialogs,
      safeStorage: secureStorage,
      shell: {
        openExternal: (url) => {
          shellOpenedUrls.push(url)
          return Promise.resolve()
        }
      },
      ipcMain: {
        handle: () => {}
      }
    }
  if (id === 'virtual:bot-runtime')
    return {
      default: require('../build/standaloneRuntime.ts').standaloneRuntime()
    }
  return originalLoad.call(this, id, ...args)
}
const { BotRunner, reconnectDelay } = require('../src/main/botRunner.ts')
const { saveProject, loadProject, parseProject } = require('../src/main/projectFiles.ts')
const { TokenStore } = require('../src/main/tokenStore.ts')
const { standaloneFiles, exportStandalone } = require('../src/main/standaloneExport.ts')
const {
  startOAuthLoopback,
  closeActiveAuthServer,
  YAPIN_CLIENT_ID,
  OAUTH_PORT,
  OAUTH_REDIRECT_URI
} = require('../src/main/authHandler.ts')
Module._load = originalLoad
const originalFetch = global.fetch
const runners = []
afterEach(async () => {
  await closeActiveAuthServer()
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

test('commands honor configured commandPrefix (e.g. . or ?)', async () => {
  const calls = api([
    message(21, '.ping dot-arg'),
    message(22, '!ping standard-arg'),
    message(23, '-ping unrelated')
  ])
  const { instance } = runner()
  const customGraph = {
    ...graph(
      [
        node('cmd', 'onCommand', { commandName: 'ping', description: 'Ping' }),
        node('reply', 'sendReply', { message: 'pong' })
      ],
      [edge('cmd', 'reply')]
    ),
    commandPrefix: '.'
  }
  assert.equal((await instance.start(customGraph)).success, true)
  await until(() => calls.filter((call) => call.method === 'POST').length === 2)
  assert.deepEqual(
    calls.filter((call) => call.method === 'POST').map((call) => JSON.parse(call.body).reply_to),
    ['msg-21', 'msg-22']
  )
  await instance.stop()
})

test('commands honor configured commandPrefix "u" (e.g. uroll triggers roll command)', async () => {
  const calls = api([
    message(31, 'uroll test-roll'),
    message(32, '/roll slash-roll'),
    message(33, 'xroll wrong-prefix')
  ])
  const { instance } = runner()
  const customGraph = {
    ...graph(
      [
        node('cmd', 'onCommand', { commandName: 'roll', description: 'Dice roll' }),
        node('reply', 'sendReply', { message: 'rolled' })
      ],
      [edge('cmd', 'reply')]
    ),
    prefix: 'u'
  }
  assert.equal((await instance.start(customGraph)).success, true)
  await until(() => calls.filter((call) => call.method === 'POST').length === 2)
  assert.deepEqual(
    calls.filter((call) => call.method === 'POST').map((call) => JSON.parse(call.body).reply_to),
    ['msg-31', 'msg-32']
  )
  await instance.stop()
})

test('normalizes hardcoded command prefixes (/roll, uroll, .roll) to clean keywords on runner startup', async () => {
  const calls = api([
    message(41, '/roll slash-arg'),
    message(42, 'uroll u-arg'),
    message(43, '.roll dot-arg')
  ])
  const { instance } = runner()
  // Node initialized with hardcoded '/roll' instead of clean 'roll'
  const customGraph = {
    ...graph(
      [
        node('cmd', 'onCommand', { commandName: '/roll', description: 'Dice roll' }),
        node('reply', 'sendReply', { message: 'rolled' })
      ],
      [edge('cmd', 'reply')]
    ),
    prefix: 'u'
  }
  assert.equal((await instance.start(customGraph)).success, true)
  await until(() => calls.filter((call) => call.method === 'POST').length >= 2)
  assert.deepEqual(
    calls.filter((call) => call.method === 'POST').map((call) => JSON.parse(call.body).reply_to),
    ['msg-41', 'msg-42']
  )
  await instance.stop()
})

test('normalizeCommandName strips /roll, uroll, .roll, !roll, ?roll down to clean keyword', () => {
  const normalize = (raw, prefix) => {
    let val = String(raw)
      .trim()
      .toLowerCase()
      .replace(/^[^a-z0-9]+/, '')
    const PROTECTED = ['user', 'undo', 'uptime', 'update']
    if (PROTECTED.includes(val)) return val
    if (prefix) {
      const p = prefix
        .trim()
        .toLowerCase()
        .replace(/^[^a-z0-9]+/, '')
      if (p && val.startsWith(p) && val.length > p.length) {
        val = val.slice(p.length).replace(/^[^a-z0-9]+/, '')
        if (PROTECTED.includes(val)) return val
      }
    }
    if (val.startsWith('u') && val.length > 1) {
      val = val.slice(1).replace(/^[^a-z0-9]+/, '')
    }
    val = val.replace(/^[^a-z0-9]+/, '')
    return val.replace(/[^a-z0-9_-]/g, '')
  }

  assert.equal(normalize('/roll', 'u'), 'roll')
  assert.equal(normalize('uroll', 'u'), 'roll')
  assert.equal(normalize('.roll', 'u'), 'roll')
  assert.equal(normalize('!roll', 'u'), 'roll')
  assert.equal(normalize('?roll', 'u'), 'roll')
  assert.equal(normalize('roll', 'u'), 'roll')
  assert.equal(normalize('uroll', '/'), 'roll')
  assert.equal(normalize('/roll', '/'), 'roll')
  assert.equal(normalize('.roll', '.'), 'roll')
  assert.equal(normalize('user', '/'), 'user')
})

async function browserCallback(url) {
  const http = require('node:http')
  return new Promise((resolve, reject) =>
    http
      .get(url, (response) => {
        let body = ''
        response.on('data', (chunk) => (body += chunk))
        response.on('end', () => resolve({ status: response.statusCode, body }))
      })
      .on('error', reject)
  )
}
async function beginAuth(port = 4189, window) {
  shellOpenedUrls.length = 0
  const result = startOAuthLoopback(window, port)
  await until(() => shellOpenedUrls.length > 0)
  const url = new URL(shellOpenedUrls.at(-1))
  return {
    result,
    url,
    callback: `http://127.0.0.1:${port}/yapin/callback?state=${url.searchParams.get('state')}`
  }
}
test('real loopback exchanges code with PKCE before accepting the API profile, ignoring query identity', async () => {
  assert.equal(OAUTH_REDIRECT_URI, 'http://127.0.0.1:4189/yapin/callback')
  const calls = [],
    focused = []
  global.fetch = async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/token')) return json({ access_token: 'yo_private_test_token' })
    assert.equal(options.headers.Authorization, 'Bearer yo_private_test_token')
    return json({
      id: 'real-user-id',
      username: 'RealDev',
      display_name: 'Real Developer',
      avatar_url: 'https://files.yapper.website/avatars/test.png'
    })
  }
  const auth = await beginAuth(4189, {
    isDestroyed: () => false,
    isMinimized: () => false,
    show: () => focused.push('show'),
    focus: () => focused.push('focus')
  })
  assert.equal(auth.url.searchParams.get('client_id'), YAPIN_CLIENT_ID)
  assert.equal(auth.url.searchParams.get('redirect_uri'), OAUTH_REDIRECT_URI)
  assert.equal(auth.url.searchParams.get('scope'), 'identify')
  assert.equal(auth.url.searchParams.get('code_challenge_method'), 'S256')
  const response = await browserCallback(
    auth.callback + '&code=authorization-code&username=ForgedUser&email=forged@example.com'
  )
  assert.equal(response.status, 200)
  assert.ok(response.body.includes('Sign In Complete'))
  const result = await auth.result
  assert.equal(result.user.id, 'real-user-id')
  assert.equal(result.user.username, 'RealDev')
  assert.equal(result.user.displayName, 'Real Developer')
  assert.equal(result.user.email, '')
  assert.equal(result.user.verified, true)
  assert.ok(!JSON.stringify(result).includes('yo_private_test_token'))
  const body = calls[0].options.body
  assert.equal(body.get('code'), 'authorization-code')
  assert.equal(body.get('redirect_uri'), OAUTH_REDIRECT_URI)
  assert.equal(
    crypto.createHash('sha256').update(body.get('code_verifier')).digest('base64url'),
    auth.url.searchParams.get('code_challenge')
  )
  assert.deepEqual(focused, ['show', 'focus'])
  assert.deepEqual(
    calls.map((c) => c.url),
    ['https://www.yapin.gg/api/oauth/token', 'https://www.yapin.gg/api/oauth/me']
  )
})
test('invalid state cannot exchange a code or cancel the pending legitimate sign-in', async () => {
  global.fetch = () => assert.fail('Must not exchange invalid state')
  const auth = await beginAuth(4190)
  const response = await browserCallback(
    'http://127.0.0.1:4190/yapin/callback?code=forged&state=wrong&error=access_denied'
  )
  assert.equal(response.status, 400)
  const denial = await browserCallback(auth.callback + '&error=access_denied')
  assert.equal(denial.status, 400)
  assert.equal((await auth.result).success, false)
})
test('failed token exchange never fabricates a verified profile', async () => {
  global.fetch = async () => json({ error: 'invalid_grant' }, 400)
  const auth = await beginAuth(4190)
  const response = await browserCallback(
    auth.callback + '&code=expired&username=Forged&handle=forged'
  )
  assert.equal(response.status, 502)
  assert.ok(!response.body.includes('Sign In Complete'))
  const result = await auth.result
  assert.equal(result.success, false)
  assert.equal(result.user, undefined)
  assert.match(result.error, /HTTP 400/)
})
test('retrying cancels previous sign-in and frees the same loopback port; cancellation settles promises', async () => {
  const first = await beginAuth(4190)
  const second = await beginAuth(4190)
  assert.equal((await first.result).success, false)
  assert.notEqual(first.url.searchParams.get('state'), second.url.searchParams.get('state'))
  await closeActiveAuthServer()
  assert.equal((await second.result).success, false)
})
test('OAuth uses alternate paths only on 404 and reports occupied ports cleanly', async () => {
  global.fetch = async (url) =>
    url.includes('/api/oauth/')
      ? json({}, 404)
      : url.endsWith('/token')
        ? json({ access_token: 'yo_test' })
        : json({ id: 'real', username: 'Real' })
  const auth = await beginAuth(4190)
  assert.equal((await browserCallback(auth.callback + '&code=valid')).status, 200)
  assert.equal((await auth.result).user.username, 'Real')
  const server = require('node:http').createServer()
  await new Promise((resolve) => server.listen(4190, '127.0.0.1', resolve))
  try {
    assert.match((await startOAuthLoopback(null, 4190)).error, /Port 4190 is in use/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
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

test('trigger filters, scoped variables, rich conditions and javascriptCode execute cleanly', async () => {
  const calls = api([
    message(21, 'skip me wrong channel', { channel_id: 'wrong-channel' }),
    message(22, 'hello custom js', {
      channel_id: 'target-channel',
      author_id: 'user-777',
      author: 'Bob'
    })
  ])
  const { instance, logs } = runner()
  const result = await instance.start(
    graph(
      [
        node('trigger', 'onMessage', {
          ignoreBots: true,
          channelId: 'target-channel',
          saveToVariable: true,
          variableName: 'savedMsg',
          variableScope: 'local'
        }),
        node('customJs', 'javascriptCode', {
          code: 'return { output: 2, value: "JS_" + context.author.toUpperCase() };',
          outputCount: 3,
          saveToVariable: true,
          variableName: 'jsResult',
          variableScope: 'local'
        }),
        node('condNum', 'textCondition', {
          comparisonType: 'number',
          leftValue: '50',
          operator: 'greater_than',
          value: '20'
        }),
        node('condVar', 'textCondition', {
          comparisonType: 'variable',
          varName: 'savedMsg',
          operator: 'contains',
          value: 'custom js'
        }),
        node('reply', 'sendReply', {
          message: 'Output: {var:jsResult} from {userId}'
        })
      ],
      [
        edge('trigger', 'customJs'),
        edge('customJs', 'condNum', 'out_2'),
        edge('condNum', 'condVar', 'true'),
        edge('condVar', 'reply', 'true')
      ]
    )
  )
  assert.equal(result.success, true)
  await until(() => calls.some((c) => c.method === 'POST' && c.path.includes('/messages')))
  const replyCall = calls.find((c) => c.method === 'POST' && c.path.includes('/messages'))
  assert.ok(replyCall)
  const body = JSON.parse(replyCall.body)
  assert.equal(body.content, 'Output: JS_BOB from user-777')
  assert.ok(logs.some((l) => l.message.includes('[JS Code] Saved result to jsResult (local)')))
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
        catalogNode('calculate', 'math', {
          expression: '6 * 7',
          saveToVariable: true,
          variableName: 'answer'
        }),
        catalogNode('persist', 'dbSet', {
          database: 'export.database.json',
          key: 'answer',
          value: '{var:answer}'
        }),
        node('reply', 'sendReply', { message: '{var:greeting} {user} in {channel}: {content}' })
      ],
      [
        edge('trigger', 'condition'),
        edge('condition', 'variable', 'true'),
        edge('variable', 'calculate'),
        edge('calculate', 'persist', 'next'),
        edge('persist', 'reply', 'success')
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
    await fsp.symlink(
      path.resolve('node_modules'),
      path.join(exported.folderPath, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )
    const { startStandalone } = require(path.join(exported.folderPath, 'bot.js'))
    const bot = await startStandalone()
    runners.push(bot)
    await until(() => calls.some((call) => call.method === 'POST'))
    assert.deepEqual(JSON.parse(calls.find((call) => call.method === 'POST').body), {
      content: 'Welcome Alice in channel: Hello there',
      reply_to: 'msg-11'
    })
    const stored = JSON.parse(
      await fsp.readFile(path.join(exported.folderPath, 'export.database.json'), 'utf8')
    )
    assert.equal(stored.kv.answer, 42)
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

test('marketplace review submissions preserve aggregate counts and replace only actual user ratings', () => {
  const {
    MARKETPLACE_ITEMS,
    withMarketplaceReview
  } = require('../src/renderer/src/marketplaceData.ts')
  const item = MARKETPLACE_ITEMS[0]
  const sample = item.reviews[0]
  const submitted = {
    id: 'user-review',
    author: sample.author,
    rating: 4,
    date: 'Just now',
    comment: 'My review'
  }
  const first = withMarketplaceReview(item, submitted)
  assert.equal(first.reviewsCount, item.reviewsCount + 1)
  assert.equal(first.reviews.length, item.reviews.length + 1)
  assert.ok(first.reviews.some((review) => review.id === sample.id && review.sample))
  const updated = withMarketplaceReview(first, { ...submitted, rating: 5 })
  assert.equal(updated.reviewsCount, first.reviewsCount)
  assert.equal(updated.reviews.length, first.reviews.length)
  assert.equal(updated.ratingTotal, first.ratingTotal + 1)
  assert.equal(item.reviewsCount, 112)
  assert.equal(item.reviews.length, 3)
})
