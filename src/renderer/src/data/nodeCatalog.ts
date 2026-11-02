export type FieldKind =
  'text' | 'textarea' | 'number' | 'select' | 'toggle' | 'variable-save' | 'code'
export interface CatalogField {
  key: string
  label: string
  kind: FieldKind
  defaultValue: string | number | boolean
  options?: string[]
}
export interface CatalogEntry {
  type: string
  category: string
  title: string
  description: string
  icon: string
  accentColor: string
  inputs: string[]
  outputs: string[]
  defaultData: Record<string, unknown> & { label: string }
  summaryTemplate: string
  fields: CatalogField[]
  runtimeSupported: boolean
}
export const NODE_CATEGORIES = [
  ['events', 'Yapin Events', 'Zap', '#a855f7'],
  ['messaging', 'Messaging', 'MessageSquare', '#38bdf8'],
  ['moderation', 'Moderation', 'Shield', '#ef4444'],
  ['channels', 'Channels', 'Hash', '#22d3ee'],
  ['database', 'Database', 'Database', '#f59e0b'],
  ['files', 'Files', 'Folder', '#eab308'],
  ['logic', 'Logic', 'GitBranch', '#818cf8'],
  ['media', 'Media', 'Image', '#f472b6'],
  ['presence', 'Presence', 'Activity', '#4ade80'],
  ['reactions', 'Reactions', 'Smile', '#fbbf24'],
  ['social', 'Social Events', 'Rss', '#fb923c'],
  ['tickets', 'Tickets', 'Ticket', '#2dd4bf'],
  ['utility', 'Utility', 'Wrench', '#94a3b8'],
  ['variables', 'Variables', 'Braces', '#c084fc'],
  ['apis', 'APIs', 'Globe', '#60a5fa']
].map(([id, title, icon, color]) => ({ id, title, icon, color }))

const field = (
  key: string,
  label: string,
  kind: FieldKind = 'text',
  defaultValue: string | number | boolean = '',
  options?: string[]
): CatalogField => ({ key, label, kind, defaultValue, options })
const text = (key: string, label: string, value = ''): CatalogField =>
  field(key, label, 'text', value)
const number = (key: string, label: string, value = 1): CatalogField =>
  field(key, label, 'number', value)
const select = (key: string, label: string, options: string[]): CatalogField =>
  field(key, label, 'select', options[0], options)
const message = [field('message', 'Message', 'textarea', 'Hello {user}!')]
const channel = text('channelId', 'Channel ID', '{channel}')
const user = text('userId', 'User ID', '{authorId}')
const server = text('serverId', 'Server ID', '{serverId}')
const save = field('variableName', 'Save result to variable', 'variable-save', 'result')
const json = (key: string, label: string, value = '{}'): CatalogField =>
  field(key, label, 'code', value)
const entries: CatalogEntry[] = []
function variableFields(id: string): CatalogField[] {
  const value = text('value', 'Value', '{content}')
  const source = text('varName', 'Source variable', 'counter')
  const list = field('items', 'List JSON', 'code', '[]')
  switch (id) {
    case 'editVariable':
      return [
        source,
        select('operation', 'Operation', ['add', 'subtract', 'multiply', 'divide']),
        text('operand', 'Operand', '1')
      ]
    case 'math':
      return [text('expression', 'Math expression', '(2 + 3) * 4')]
    case 'randomNumber':
      return [
        number('minimum', 'Minimum', 0),
        number('maximum', 'Maximum', 100),
        field('integer', 'Integer only', 'toggle', true)
      ]
    case 'toggleBoolean':
      return [source]
    case 'modifyText':
      return [
        value,
        select('operation', 'Operation', ['uppercase', 'lowercase', 'trim', 'replace', 'regex']),
        text('find', 'Find'),
        text('pattern', 'Regex pattern'),
        text('flags', 'Regex flags', 'g'),
        text('replacement', 'Replacement')
      ]
    case 'translate':
      return [
        value,
        text('language', 'Target language', 'en'),
        text('endpoint', 'Translation endpoint'),
        text('apiKeyVariable', 'API key variable')
      ]
    case 'createList':
      return [list]
    case 'listAdd':
    case 'listRemove':
    case 'listContains':
      return [list, value]
    case 'listSize':
      return [list]
    case 'formatList':
      return [list, text('separator', 'Separator', ', ')]
    case 'timestamp':
      return [select('format', 'Format', ['ISO', 'unixSeconds', 'unixMilliseconds'])]
    case 'timestampMath':
      return [
        text('timestamp', 'Timestamp', '{timestamp}'),
        select('inputUnit', 'Numeric input unit', ['milliseconds', 'seconds']),
        select('operation', 'Operation', ['add', 'subtract']),
        number('seconds', 'Seconds', 60)
      ]
    case 'stopwatchStart':
    case 'stopwatchEnd':
      return [text('name', 'Stopwatch name', 'timer')]
    case 'cryptoText':
      return [
        value,
        select('operation', 'Operation', ['encrypt', 'decrypt']),
        text('keyVariable', 'Encryption key variable'),
        select('encoding', 'Encoding', ['base64', 'hex'])
      ]
    default:
      return [value]
  }
}
function apiFields(id: string): CatalogField[] {
  switch (id) {
    case 'httpRequest':
      return [
        text('url', 'Endpoint URL'),
        select('method', 'HTTP method', ['GET', 'POST', 'PUT', 'DELETE']),
        json('headers', 'Headers JSON'),
        json('body', 'Request body')
      ]
    case 'askAI':
      return [
        select('provider', 'AI provider', ['OpenAI', 'Gemini', 'Custom']),
        text('url', 'Custom endpoint URL'),
        text('model', 'Model'),
        field('systemPrompt', 'System prompt', 'textarea', ''),
        field('prompt', 'Prompt', 'textarea', '{content}'),
        text('apiKeyVariable', 'API key variable')
      ]
    case 'weather':
      return [
        text('location', 'City or coordinates'),
        select('units', 'Units', ['metric', 'imperial']),
        text('apiKeyVariable', 'API key variable')
      ]
    case 'dictionary':
      return [text('word', 'Word'), text('language', 'Language', 'en')]
    case 'githubRepo':
      return [
        text('owner', 'Owner'),
        text('repository', 'Repository'),
        text('apiKeyVariable', 'API key variable')
      ]
    case 'shortUrl':
      return [
        text('url', 'URL to shorten'),
        text('endpoint', 'Shortener endpoint'),
        text('apiKeyVariable', 'API key variable')
      ]
    default:
      return [text('url', 'Website URL')]
  }
}
function add(
  category: string,
  type: string,
  title: string,
  description: string,
  fields: CatalogField[] = [],
  outputs = ['next'],
  trigger = false,
  legacy = false
): void {
  const group = NODE_CATEGORIES.find((c) => c.id === category)!
  entries.push({
    type: legacy ? type : `catalog.${type}`,
    category,
    title,
    description,
    icon: group.icon,
    accentColor: group.color,
    inputs: trigger || type === 'stickyNote' ? [] : ['in'],
    outputs,
    fields: fields.some((field) => field.kind === 'variable-save')
      ? [...fields, text('jsonPath', 'JSON path (optional)')]
      : fields,
    runtimeSupported: true,
    defaultData: {
      label: title,
      ...Object.fromEntries(fields.map((f) => [f.key, f.defaultValue])),
      ...(fields.some((f) => f.kind === 'variable-save')
        ? { saveToVariable: false, variableScope: 'local' }
        : {})
    },
    summaryTemplate: fields.length ? `{${fields[0].key}}` : title
  })
}
// The existing identifiers and handles are permanent public project-file contracts.
add(
  'events',
  'onCommand',
  'Prefix command triggered',
  'Run a registered command using the project prefix.',
  [
    text('commandName', 'Command name', 'ping'),
    text('description', 'Description', 'Replies with pong')
  ],
  ['out'],
  true,
  true
)
add(
  'events',
  'onMessage',
  'When a message is sent',
  'Receive messages from the bot’s servers.',
  [field('ignoreBots', 'Ignore bots', 'toggle', true)],
  ['out'],
  true,
  true
)
add(
  'logic',
  'textCondition',
  'Condition: Text / Number / Variable',
  'Compare message text and choose a branch.',
  [
    select('operator', 'Operator', ['contains', 'equals', 'starts_with', 'ends_with']),
    text('value', 'Value', 'hello'),
    field('caseSensitive', 'Case sensitive', 'toggle', false)
  ],
  ['true', 'false'],
  false,
  true
)
add(
  'logic',
  'checkUserRole',
  'Condition: User',
  'Check the author username, user ID or bot flag.',
  [
    select('checkType', 'Check', ['username', 'user_id', 'is_bot']),
    select('operator', 'Operator', ['equals', 'not_equals', 'contains']),
    text('value', 'Value')
  ],
  ['true', 'false'],
  false,
  true
)
add(
  'logic',
  'cooldownTimer',
  'Cooldown timer',
  'Limit repeated execution per user or channel.',
  [number('seconds', 'Seconds', 5), select('scope', 'Scope', ['user', 'channel', 'global'])],
  ['true', 'false'],
  false,
  true
)
add(
  'messaging',
  'sendReply',
  'Send a reply',
  'Quote the triggering message with a reply.',
  message,
  ['out'],
  false,
  true
)
add(
  'messaging',
  'sendRichMessage',
  'Send rich card / embed',
  'Send a rich message with a title and description.',
  [
    text('title', 'Title', 'Hello'),
    field('description', 'Description', 'textarea', 'Welcome {user}'),
    text('color', 'Colour', '#5865f2'),
    text('footer', 'Footer'),
    text('imageUrl', 'Image URL')
  ],
  ['out'],
  false,
  true
)
add(
  'messaging',
  'randomReply',
  'Random reply',
  'Choose one reply from newline-separated choices.',
  [field('replies', 'Replies', 'textarea', 'Hello!\nWelcome!')],
  ['out'],
  false,
  true
)
add(
  'moderation',
  'moderateMessage',
  'Delete / Moderate message',
  'Delete a message, timeout or kick its author.',
  [
    select('actionType', 'Action', ['delete', 'timeout', 'kick']),
    number('minutes', 'Minutes', 10),
    text('reason', 'Reason')
  ],
  ['out'],
  false,
  true
)
add(
  'logic',
  'waitDelay',
  'Wait for duration',
  'Pause the connected branch for a duration.',
  [number('seconds', 'Seconds', 1)],
  ['out'],
  false,
  true
)
add(
  'variables',
  'setVariable',
  'Set variable',
  'Store or increment a session value.',
  [
    text('varName', 'Variable name', 'counter'),
    text('value', 'Value', '1'),
    select('operation', 'Operation', ['set', 'increment', 'decrement'])
  ],
  ['out'],
  false,
  true
)
add(
  'variables',
  'getVariable',
  'Get variable',
  'Read a session variable with a fallback.',
  [text('varName', 'Variable name', 'counter'), text('fallback', 'Fallback', '0')],
  ['out'],
  false,
  true
)
add(
  'utility',
  'logConsole',
  'Log to console',
  'Write a timestamped entry to the bot console.',
  [
    field('message', 'Message', 'textarea', 'Processed {content}'),
    select('level', 'Level', ['info', 'warn', 'error', 'success'])
  ],
  ['out'],
  false,
  true
)
add(
  'utility',
  'javascriptCode',
  'Run custom JavaScript code',
  'Run custom code with context and session variables.',
  [
    field('code', 'JavaScript', 'code', 'return context.content;'),
    number('outputCount', 'Outputs', 1),
    save
  ],
  ['out'],
  false,
  true
)

const events = [
  ['slashCommand', 'Slash command triggered', 'commandName'],
  ['messageContains', 'When a message contains text', 'text'],
  ['messageRegex', 'When a message matches regex', 'pattern'],
  ['messageAttachment', 'When a message has attachment', 'fileType'],
  ['messageEdited', 'When a message is edited', 'channelId'],
  ['messageDeleted', 'When a message is deleted', 'channelId'],
  ['directMessage', 'When direct message received', 'userId'],
  ['botMentioned', 'When bot is mentioned', 'channelId'],
  ['memberJoin', 'When member joins server', 'serverId'],
  ['memberLeave', 'When member leaves server', 'serverId'],
  ['memberBanned', 'When member is banned', 'serverId'],
  ['reactionAdded', 'When reaction is added', 'emoji'],
  ['reactionRemoved', 'When reaction is removed', 'emoji'],
  ['botStarts', 'When Bot Starts', ''],
  ['interval', 'Schedule / Interval Trigger', 'seconds']
]
for (const [id, title, key] of events)
  add(
    'events',
    id,
    title,
    `Start a flow: ${title.toLowerCase()}.`,
    key ? [key === 'seconds' ? number(key, 'Interval seconds', 60) : text(key, key)] : [],
    ['next'],
    true
  )
for (const [id, title] of [
  ['sendMessage', 'Send a message'],
  ['interactiveButtons', 'Send interactive buttons'],
  ['editMessage', 'Edit a message'],
  ['deleteMessage', 'Delete a message'],
  ['pinMessage', 'Pin a message'],
  ['unpinMessage', 'Unpin a message'],
  ['cloneMessage', 'Clone message'],
  ['typing', 'Show typing in channel'],
  ['waitMessage', 'Wait for a message reply'],
  ['sendPoll', 'Send poll']
]) {
  add(
    'messaging',
    id,
    title,
    `${title} in a specified Yapin channel.`,
    [
      channel,
      text('messageId', 'Message ID', '{messageId}'),
      ...message,
      ...(id === 'interactiveButtons' ? [json('buttons', 'Button rows', '[]')] : []),
      ...(id === 'sendPoll'
        ? [field('choices', 'Poll choices (one per line)', 'textarea', 'Yes\nNo')]
        : []),
      ...(id === 'waitMessage' ? [number('timeout', 'Timeout seconds', 60)] : []),
      save
    ],
    ['success', 'error']
  )
}
for (const [id, title] of [
  ['kickMember', 'Kick a member'],
  ['banMember', 'Ban a member'],
  ['unbanMember', 'Unban a member'],
  ['timeoutMember', 'Timeout a member'],
  ['addRole', 'Add role to user'],
  ['removeRole', 'Remove role from user'],
  ['nickname', 'Set member nickname'],
  ['createRole', 'Create a role'],
  ['deleteRole', 'Delete a role']
])
  add(
    'moderation',
    id,
    title,
    `${title} using the bot’s server permissions.`,
    [
      server,
      user,
      text('roleId', 'Role ID'),
      text('name', 'Name / nickname'),
      number('minutes', 'Timeout minutes', 10),
      text('reason', 'Audit reason'),
      save
    ],
    ['success', 'error']
  )
for (const [id, title] of [
  ['createChannel', 'Create a channel'],
  ['deleteChannel', 'Delete a channel'],
  ['renameChannel', 'Rename a channel'],
  ['channelTopic', 'Set channel topic'],
  ['slowmode', 'Set channel slowmode'],
  ['createThread', 'Create a thread'],
  ['archiveThread', 'Archive/Lock thread'],
  ['createInvite', 'Create an invite'],
  ['createWebhook', 'Create a webhook']
])
  add(
    'channels',
    id,
    title,
    `${title} in the selected server.`,
    [
      server,
      channel,
      text('name', 'Name', 'new-channel'),
      text('topic', 'Topic'),
      number('seconds', 'Slowmode seconds', 0),
      select('kind', 'Channel kind', ['text', 'voice']),
      field('locked', 'Locked', 'toggle', false),
      save
    ],
    ['success', 'error']
  )
for (const [id, title] of [
  ['dbSet', 'Set key-value record'],
  ['dbGet', 'Get key-value record'],
  ['dbDelete', 'Delete record'],
  ['dbInsert', 'Insert table row'],
  ['dbFind', 'Find rows'],
  ['dbUpdate', 'Update rows'],
  ['dbDeleteRows', 'Delete rows'],
  ['dbCount', 'Count rows'],
  ['dbEach', 'For each database row'],
  ['dbExport', 'Export CSV'],
  ['dbImport', 'Import CSV']
])
  add(
    'database',
    id,
    title,
    `${title} in the configured local database.`,
    [
      text('database', 'Database path', 'bot.database.json'),
      text('table', 'Table', 'records'),
      text('key', 'Record key'),
      json('value', 'Value / row'),
      json('filter', 'Filter'),
      text('path', 'CSV path', 'records.csv'),
      save
    ],
    id === 'dbEach' ? ['each', 'done'] : ['success', 'error']
  )
for (const [id, title] of [
  ['readFile', 'Read file'],
  ['writeFile', 'Write / Append file'],
  ['fileExists', 'Check file exists'],
  ['deleteFile', 'Delete file'],
  ['listFiles', 'List files in folder'],
  ['downloadFile', 'Download file from URL'],
  ['zipFolder', 'Zip / Unzip folder']
])
  add(
    'files',
    id,
    title,
    `${title} on the bot host computer.`,
    [
      text('path', 'Path', 'data.txt'),
      text('destination', 'Archive destination', 'archive.zip'),
      field('content', 'Content', 'textarea', ''),
      text('url', 'Download URL'),
      select('mode', 'Mode', ['write', 'append', 'zip', 'unzip']),
      save
    ],
    id === 'fileExists' ? ['true', 'false'] : ['success', 'error']
  )
for (const [id, title, outputs] of [
  ['switch', 'Switch / Match cases', ['match', 'default']],
  ['chance', 'Run with random chance', ['true', 'false']],
  ['repeat', 'Repeat an action', ['each', 'done']],
  ['forEach', 'For each item in list', ['each', 'done']],
  ['merge', 'Merge multiple triggers', ['next']],
  ['tryCatch', 'Try actions & catch errors', ['try', 'catch', 'next']],
  ['stopFlow', 'Stop flow', []]
] as [string, string, string[]][])
  add(
    'logic',
    id,
    title,
    `${title} to control connected branches.`,
    [
      text('value', 'Value / list', '{content}'),
      json('cases', 'Cases', '[]'),
      number('count', 'Repeat count', 3),
      number('percent', 'Chance percent', 50),
      save
    ],
    outputs
  )
for (const [id, title] of [
  ['qrGenerate', 'Generate QR code'],
  ['qrRead', 'Read QR code'],
  ['chartImage', 'Generate chart image URL'],
  ['imageMetadata', 'Get image metadata']
])
  add(
    'media',
    id,
    title,
    `${title} from text, image or chart data.`,
    [
      text('value', 'Text or image URL'),
      json('chart', 'Chart configuration'),
      number('width', 'Width', 512),
      save
    ],
    ['success', 'error']
  )
for (const [id, title] of [
  ['setPresence', 'Set bot status / presence'],
  ['clearPresence', 'Clear bot presence'],
  ['serverNickname', 'Set bot server nickname'],
  ['setBio', 'Set bot bio']
])
  add(
    'presence',
    id,
    title,
    `${title} for this bot account.`,
    [
      select('status', 'Status', ['online', 'idle', 'dnd']),
      text('activity', 'Activity'),
      server,
      text('nickname', 'Nickname'),
      field('bio', 'Bio', 'textarea', '')
    ],
    ['success', 'error']
  )
for (const [id, title] of [
  ['addReaction', 'Add a reaction'],
  ['removeReaction', 'Remove a reaction'],
  ['clearReactions', 'Clear reactions'],
  ['waitReaction', 'Wait for a reaction']
])
  add(
    'reactions',
    id,
    title,
    `${title} on a channel message.`,
    [
      channel,
      text('messageId', 'Message ID', '{messageId}'),
      text('emoji', 'Emoji', '👍'),
      number('timeout', 'Timeout seconds', 60),
      save
    ],
    ['success', 'error']
  )
for (const [id, title] of [
  ['rss', 'When RSS feed updates'],
  ['youtube', 'When YouTube video uploaded'],
  ['reddit', 'When Reddit post created'],
  ['twitch', 'When Twitch stream starts'],
  ['githubRelease', 'When GitHub release published']
])
  add(
    'social',
    id,
    title,
    `${title}; configure a source and polling interval.`,
    [
      text('source', 'Feed URL / account / repository'),
      number('interval', 'Poll interval seconds', 300),
      text('apiKeyVariable', 'API key variable')
    ],
    ['next'],
    true
  )
for (const [id, title] of [
  ['ticketPanel', 'Send ticket panel'],
  ['ticketOpen', 'Open ticket channel/thread'],
  ['ticketClaim', 'Claim ticket'],
  ['ticketAdd', 'Add ticket participant'],
  ['ticketRemove', 'Remove ticket participant'],
  ['ticketClose', 'Close ticket']
])
  add(
    'tickets',
    id,
    title,
    `${title} in a support workflow.`,
    [
      server,
      channel,
      user,
      text('ticketId', 'Ticket ID'),
      text('name', 'Ticket name', 'support-{user}'),
      json('staffRoleIds', 'Staff role IDs', '[]'),
      ...message,
      save
    ],
    ['success', 'error']
  )
add(
  'utility',
  'stickyNote',
  'Comment / Sticky Note',
  'Visual-only canvas note; does not execute.',
  [field('text', 'Note', 'textarea', 'Write a note…')],
  []
)
add('utility', 'callFunction', 'Call function', 'Call a named reusable workflow.', [
  text('name', 'Function name'),
  json('arguments', 'Arguments'),
  save
])
add(
  'utility',
  'functionCalled',
  'When a function is called',
  'Entry point for a reusable workflow.',
  [text('name', 'Function name')],
  ['next'],
  true
)
add('utility', 'stopBot', 'Stop bot', 'Stop this bot session.', [], [])
for (const [id, title] of [
  ['editVariable', 'Edit variable [+/−/×/÷]'],
  ['math', 'Calculate math expression'],
  ['randomNumber', 'Random number'],
  ['toggleBoolean', 'Toggle boolean'],
  ['modifyText', 'Modify text / Change case'],
  ['translate', 'Translate text'],
  ['createList', 'Create list'],
  ['listAdd', 'Add item to list'],
  ['listRemove', 'Remove item from list'],
  ['listSize', 'Get list size'],
  ['listContains', 'List contains item'],
  ['formatList', 'Format list as text'],
  ['timestamp', 'Get current timestamp'],
  ['timestampMath', 'Timestamp calculation'],
  ['stopwatchStart', 'Start stopwatch'],
  ['stopwatchEnd', 'End stopwatch'],
  ['cryptoText', 'Encrypt / Decrypt text']
])
  add(
    'variables',
    id,
    title,
    `${title} and optionally store the result.`,
    [...variableFields(id), save],
    id === 'listContains' ? ['true', 'false'] : ['next']
  )
for (const [id, title] of [
  ['httpRequest', 'Make an HTTP API request'],
  ['askAI', 'Ask an AI'],
  ['weather', 'Get weather'],
  ['dictionary', 'Look up dictionary definition'],
  ['githubRepo', 'Get GitHub repository details'],
  ['websiteMetadata', 'Get website metadata'],
  ['shortUrl', 'URL shortener']
])
  add(
    'apis',
    id,
    title,
    `${title} with a configured endpoint and result variable.`,
    [...apiFields(id), number('timeout', 'Timeout seconds', 30), save],
    ['success', 'error']
  )
add(
  'apis',
  'webhookListener',
  'Webhook listener',
  'Start a workflow when a configured webhook receives a request.',
  [
    number('port', 'Port', 8080),
    text('path', 'Path', '/webhook'),
    text('secretVariable', 'Signing secret variable')
  ],
  ['next'],
  true
)

export const NODE_CATALOG: readonly CatalogEntry[] = entries
export const CATALOG_BY_TYPE = new Map(NODE_CATALOG.map((entry) => [entry.type, entry]))
export function catalogOutputs(entry: CatalogEntry, data: Record<string, unknown>): string[] {
  if (entry.type !== 'catalog.switch') return entry.outputs
  try {
    const cases = typeof data.cases === 'string' ? JSON.parse(data.cases) : data.cases
    const extra = Array.isArray(cases)
      ? cases.flatMap((item) =>
          item && typeof item === 'object' ? [item.handle ?? item.output ?? 'match'] : []
        )
      : cases && typeof cases === 'object'
        ? Object.values(cases)
        : []
    return [
      ...new Set([
        ...entry.outputs,
        ...extra.filter(
          (value): value is string =>
            typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value)
        )
      ])
    ]
  } catch {
    return entry.outputs
  }
}
export function searchCatalog(query: string): readonly CatalogEntry[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return NODE_CATALOG.filter((entry) =>
    words.every((word) =>
      `${entry.title} ${entry.description} ${NODE_CATEGORIES.find((c) => c.id === entry.category)?.title}`
        .toLowerCase()
        .includes(word)
    )
  )
}
