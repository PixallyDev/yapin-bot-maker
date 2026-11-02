import { CATALOG_BY_TYPE } from '../renderer/src/data/nodeCatalog'

// Backend dispatch contracts. Catalog schema entries alone do not imply execution support.
const legacy = new Set(
  `onMessage onCommand textCondition checkUserRole cooldownTimer
setVariable getVariable sendReply sendRichMessage randomReply waitDelay moderateMessage
logConsole javascriptCode`.split(/\s+/)
)
const catalog = new Set(
  `slashCommand messageContains messageRegex messageAttachment
messageEdited messageDeleted directMessage botMentioned memberJoin memberLeave memberBanned
reactionAdded reactionRemoved botStarts interval functionCalled rss youtube reddit twitch
githubRelease webhookListener stickyNote merge stopFlow stopBot switch chance repeat forEach
dbEach tryCatch callFunction math randomNumber editVariable toggleBoolean modifyText translate
createList listAdd listRemove listContains listSize formatList timestamp timestampMath
stopwatchStart stopwatchEnd cryptoText dbSet dbGet dbDelete dbInsert dbFind dbUpdate dbDeleteRows
dbCount dbExport dbImport readFile writeFile fileExists deleteFile listFiles downloadFile zipFolder
httpRequest askAI weather dictionary githubRepo websiteMetadata shortUrl qrGenerate qrRead
chartImage imageMetadata sendMessage interactiveButtons editMessage deleteMessage pinMessage
unpinMessage cloneMessage sendPoll waitMessage waitReaction kickMember banMember unbanMember
timeoutMember addRole removeRole nickname serverNickname createRole deleteRole createChannel
deleteChannel renameChannel slowmode createWebhook setPresence clearPresence setBio addReaction
removeReaction clearReactions typing channelTopic createThread archiveThread createInvite
ticketPanel ticketOpen ticketClaim ticketAdd ticketRemove ticketClose`.split(/\s+/)
)

export function isSupportedNodeType(type: string): boolean {
  return (
    legacy.has(type) ||
    (type.startsWith('catalog.') && catalog.has(type.slice(8)) && CATALOG_BY_TYPE.has(type))
  )
}

/** Preserve metadata and malformed data for validation; remove only unknown types and dangling wires. */
export function cleanProjectGraph<T>(input: T): T {
  const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
  const clean = (value: unknown): unknown => {
    if (!record(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return value
    const nodes = value.nodes.filter(
      (node) => !record(node) || typeof node.type !== 'string' || isSupportedNodeType(node.type)
    )
    const ids = new Set(nodes.filter(record).map((node) => node.id))
    const edges = value.edges.filter(
      (edge) => !record(edge) || (ids.has(edge.source) && ids.has(edge.target))
    )
    return { ...value, nodes, edges }
  }
  if (!record(input)) return input
  const result = clean(input) as Record<string, unknown>
  return {
    ...result,
    ...(Array.isArray(input.flows) ? { flows: input.flows.map(clean) } : {})
  } as T
}
