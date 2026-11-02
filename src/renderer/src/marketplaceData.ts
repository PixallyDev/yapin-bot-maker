import { BotNode, BotEdge } from './types'
import { PRESET_TEMPLATES } from './templates'
import { COMMAND_PACKAGES } from './commandStore'

export interface ItemReview {
  id: string
  author: string
  sample?: boolean
  rating: number
  date: string
  comment: string
}

export interface MarketplaceItem {
  id: string
  name: string
  type: 'template' | 'node' | 'theme'
  category: 'moderation' | 'utility' | 'fun' | 'community' | 'economy'
  author: string
  authorHandle?: string
  sampleMetrics?: boolean
  authorVerified?: boolean
  version: string
  downloads: number
  rating: number
  reviewsCount?: number
  reviews?: ItemReview[]
  ratingTotal?: number
  description: string
  tags: string[]
  icon: string
  themeId?: string
  nodes?: BotNode[]
  edges?: BotEdge[]
  nodeCount?: number
  commandName?: string
}

/** Keep the aggregate count when the visible reviews are only an excerpt. */
export function withMarketplaceReview(item: MarketplaceItem, review: ItemReview): MarketplaceItem {
  const reviews = item.reviews ?? []
  const previous = reviews.find((entry) => !entry.sample && entry.author === review.author)
  const count = Math.max(item.reviewsCount ?? 0, reviews.length) + (previous ? 0 : 1)
  const total =
    (item.ratingTotal ?? item.rating * Math.max(item.reviewsCount ?? 0, reviews.length)) -
    (previous?.rating ?? 0) +
    review.rating
  return {
    ...item,
    reviews: previous
      ? reviews.map((entry) => (entry === previous ? review : entry))
      : [review, ...reviews],
    reviewsCount: count,
    ratingTotal: total,
    rating: Number((total / count).toFixed(1))
  }
}

export const DEFAULT_COMMUNITY_TAGS: string[] = [
  'beginner',
  'faq',
  'commands',
  'filter',
  'shield',
  'moderation',
  'games',
  'counter',
  'dice',
  'welcome',
  'onboarding',
  'roles',
  'tickets',
  'support',
  'workflow',
  'poll',
  'voting',
  'embed',
  'flip',
  'random',
  'warn',
  'staff',
  'mod',
  'anti-invite',
  'security',
  'xp',
  'leveling',
  'economy',
  'coins',
  'bank',
  'ai',
  'music'
]

// Offline showcase data, not verified telemetry or endorsements by these accounts.
const sampleReviews = (id: string, comments: string[]): ItemReview[] =>
  comments.map((comment, index) => ({
    id: `${id}-sample-${index}`,
    author: ['@yapin_gm49195', '@yapin_alex', '@yapin_sarah'][index],
    rating: 5,
    date: ['2026-11-01', '2026-10-29', '2026-10-25'][index],
    comment,
    sample: true
  }))

const ITEMS: MarketplaceItem[] = [
  // --- TEMPLATES ---
  {
    id: 'market-tmpl-1',
    name: 'Ping & FAQ Starter Bot',
    type: 'template',
    category: 'utility',
    author: 'Reflex9947',
    version: '1.2.0',
    downloads: 14890,
    rating: 4.9,
    reviewsCount: 112,
    reviews: sampleReviews('starter', [
      'Clear command routing and a useful FAQ example.',
      'The console steps make this flow easy to follow.',
      'A helpful starting point for customizing replies.'
    ]),
    description:
      'Complete multi-trigger starter bot with /ping latency test, FAQ responder, and console diagnostics.',
    tags: ['beginner', 'faq', 'commands'],
    icon: 'Zap',
    nodes: PRESET_TEMPLATES[0].nodes,
    edges: PRESET_TEMPLATES[0].edges,
    nodeCount: PRESET_TEMPLATES[0].nodes.length
  },
  {
    id: 'market-tmpl-2',
    name: 'Sentinel Auto-Moderator',
    type: 'template',
    category: 'moderation',
    author: 'Reflex9947',
    version: '2.1.0',
    downloads: 9840,
    rating: 4.8,
    reviewsCount: 96,
    reviews: sampleReviews('sentinel', [
      'The filter branches are easy to inspect.',
      'Warning messages are straightforward to customize.',
      'Useful moderation examples with readable node labels.'
    ]),
    description:
      'Proactive chat filter detecting bad words, deleting infringing messages, and delivering warning cards.',
    tags: ['filter', 'shield', 'moderation'],
    icon: 'Shield',
    nodes: PRESET_TEMPLATES[1].nodes,
    edges: PRESET_TEMPLATES[1].edges,
    nodeCount: PRESET_TEMPLATES[1].nodes.length
  },
  {
    id: 'market-tmpl-3',
    name: 'Arcade Fun & Global Counter',
    type: 'template',
    category: 'fun',
    author: 'Reflex9947',
    version: '1.4.2',
    downloads: 11520,
    rating: 4.7,
    reviewsCount: 87,
    reviews: sampleReviews('arcade', [
      'A fun example of random replies and counters.',
      'The variable connections make the flow easy to learn.',
      'Simple to adapt the responses for a community.'
    ]),
    description:
      'Interactive entertainment bot featuring random reply 8-ball answers and incrementing persistent counters.',
    tags: ['games', 'counter', 'dice'],
    icon: 'Dices',
    nodes: PRESET_TEMPLATES[2].nodes,
    edges: PRESET_TEMPLATES[2].edges,
    nodeCount: PRESET_TEMPLATES[2].nodes.length
  },
  {
    id: 'market-tmpl-4',
    name: 'Gatekeeper Welcome & Verification',
    type: 'template',
    category: 'community',
    author: 'Reflex9947',
    version: '1.0.8',
    downloads: 6420,
    rating: 4.9,
    reviewsCount: 64,
    reviews: sampleReviews('welcome', [
      'A tidy welcome-command starting point.',
      'Changing the server rules message is quick.',
      'The greeting flow is clear and approachable.'
    ]),
    description: 'Provides a /welcome command with a greeting and server rules reminder.',
    tags: ['welcome', 'onboarding', 'roles'],
    icon: 'Hand',
    nodeCount: 5
  },
  {
    id: 'market-tmpl-5',
    name: 'Support Ticket Dispatcher',
    type: 'template',
    category: 'utility',
    author: 'Reflex9947',
    version: '1.1.5',
    downloads: 5150,
    rating: 4.8,
    reviewsCount: 58,
    reviews: sampleReviews('ticket', [
      'A clear acknowledgement for support requests.',
      'The reply keeps the supplied support details readable.',
      'A useful foundation for extending a support flow.'
    ]),
    description:
      'Acknowledges /ticket requests in the current channel with the supplied support details.',
    tags: ['tickets', 'support', 'workflow'],
    icon: 'Ticket',
    nodeCount: 6
  },

  // --- COMMUNITY NODES ---
  {
    id: 'market-node-poll',
    name: 'Quick Poll & Voting Suite',
    type: 'node',
    category: 'utility',
    author: 'Reflex9947',
    version: '1.3.0',
    downloads: 8420,
    rating: 4.8,
    reviewsCount: 91,
    reviews: sampleReviews('poll', [
      'The voting-card layout is easy to customize.',
      'A useful command package for community questions.',
      'The connected nodes are straightforward to explore.'
    ]),
    description:
      'Spawns interactive voting embed cards with automatic reaction buttons and user response logging.',
    tags: ['poll', 'voting', 'embed'],
    icon: 'ChartBar',
    commandName: '/poll',
    nodes: COMMAND_PACKAGES[0].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-flip',
    name: 'Coin Flip & Fortune Dice',
    type: 'node',
    category: 'fun',
    author: 'Reflex9947',
    version: '1.0.2',
    downloads: 12180,
    rating: 4.9,
    reviewsCount: 104,
    reviews: sampleReviews('flip', [
      'A compact and understandable random-reply example.',
      'Quick to customize the heads and tails responses.',
      'The command is a nice addition to a starter bot.'
    ]),
    description:
      'High-speed randomized coin flipper with heads/tails probability and cooldown timer protection.',
    tags: ['dice', 'flip', 'random'],
    icon: 'Coins',
    commandName: '/flip',
    nodes: COMMAND_PACKAGES[1].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-warn',
    name: 'Staff Moderation Warning Card',
    type: 'node',
    category: 'moderation',
    author: 'Reflex9947',
    version: '2.0.0',
    downloads: 7940,
    rating: 4.9,
    reviewsCount: 78,
    reviews: sampleReviews('warn', [
      'The warning-card format is clean and readable.',
      'Useful node organization for a staff command.',
      'Easy to adjust the wording for server rules.'
    ]),
    description:
      'Restricted slash command allowing only server administrators to dispatch formal infraction warnings.',
    tags: ['warn', 'staff', 'mod'],
    icon: 'TriangleAlert',
    commandName: '/warn',
    nodes: COMMAND_PACKAGES[2].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-shield',
    name: 'Anti-Phishing & Link Shield',
    type: 'node',
    category: 'moderation',
    author: 'Reflex9947',
    version: '1.5.1',
    downloads: 13960,
    rating: 5.0,
    reviewsCount: 108,
    reviews: sampleReviews('shield', [
      'A readable example of filtering linked messages.',
      'The condition and moderation branches are clearly connected.',
      'Helpful as a starting point for custom link rules.'
    ]),
    description:
      'Scans all messages for suspicious discord invite links or phishing URLs and immediately purges them.',
    tags: ['anti-invite', 'security', 'shield'],
    icon: 'Lock',
    nodes: COMMAND_PACKAGES[3].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-xp',
    name: 'Community Activity & XP Leveler',
    type: 'node',
    category: 'community',
    author: 'Reflex9947',
    version: '3.1.0',
    downloads: 10680,
    rating: 4.9,
    reviewsCount: 99,
    reviews: sampleReviews('xp', [
      'The activity-counter flow is easy to understand.',
      'Useful variable examples for learning leveling logic.',
      'Simple node structure with room for customization.'
    ]),
    description:
      'Increments member experience points per message sent with rate-limit cooldown protection.',
    tags: ['xp', 'leveling', 'economy'],
    icon: 'Star',
    nodes: COMMAND_PACKAGES[4].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-bank',
    name: 'Virtual Economy Bank & Balances',
    type: 'node',
    category: 'economy',
    author: 'Reflex9947',
    version: '1.1.0',
    downloads: 3150,
    rating: 4.7,
    reviewsCount: 48,
    reviews: sampleReviews('bank', [
      'A concise balance-command example.',
      'The session variable makes the reply easy to adapt.',
      'A helpful first step for an economy workflow.'
    ]),
    description: 'Provides a /balance reply using the current session balance variable.',
    tags: ['economy', 'coins', 'bank'],
    icon: 'Coins',
    commandName: '/balance',
    nodeCount: 4
  },

  // --- THEMES ---
  {
    id: 'market-theme-neon',
    name: 'Neon Purple (Cyberpunk)',
    type: 'theme',
    category: 'utility',
    author: 'Reflex9947',
    version: '1.0.0',
    downloads: 12840,
    rating: 5.0,
    reviewsCount: 102,
    reviews: sampleReviews('neon', [
      'The violet highlights give the canvas a cohesive look.',
      'The accent colors make the controls easy to find.',
      'A polished palette for a dark workspace.'
    ]),
    description:
      'Vibrant neon violet and glowing magenta UI highlights for midnight studio sessions.',
    tags: ['purple', 'neon', 'cyberpunk'],
    icon: 'Gem',
    themeId: 'neon-purple'
  },
  {
    id: 'market-theme-midnight',
    name: 'Midnight OLED Black',
    type: 'theme',
    category: 'utility',
    author: 'Reflex9947',
    version: '1.1.0',
    downloads: 9340,
    rating: 4.9,
    reviewsCount: 88,
    reviews: sampleReviews('midnight', [
      'The dark surfaces keep the workspace visually calm.',
      'Sapphire accents stand out clearly against the background.',
      'A clean theme with a consistent palette.'
    ]),
    description:
      'Deep pitch black surfaces with electric sapphire nodes for maximum contrast and battery efficiency.',
    tags: ['oled', 'black', 'sapphire'],
    icon: 'Moon',
    themeId: 'midnight'
  },
  {
    id: 'market-theme-ice',
    name: 'Ice-Phoenix Glacier',
    type: 'theme',
    category: 'utility',
    author: 'Reflex9947',
    version: '1.0.2',
    downloads: 1240,
    rating: 4.8,
    reviewsCount: 48,
    reviews: sampleReviews('ice', [
      'The cyan accents give the editor a fresh look.',
      'A crisp palette that works well across panels.',
      'The node colors fit the glacier theme nicely.'
    ]),
    description:
      'Frosted cyan accents and glacial sapphire glow inspired by Nordic winter aesthetics.',
    tags: ['cyan', 'frost', 'clean'],
    icon: 'Snowflake',
    themeId: 'ice-phoenix'
  },
  {
    id: 'market-theme-gta',
    name: 'GTA VI Vice City Sunset',
    type: 'theme',
    category: 'fun',
    author: 'Reflex9947',
    version: '2.0.0',
    downloads: 14560,
    rating: 5.0,
    reviewsCount: 110,
    reviews: sampleReviews('sunset', [
      'The pink and turquoise combination looks cohesive.',
      'A lively palette with clear highlights.',
      'The retro colors give the workspace plenty of character.'
    ]),
    description:
      'Iconic retro Miami 80s neon pink, tropical turquoise and sunset purple gradients.',
    tags: ['gta', 'pink', 'retro'],
    icon: 'TreePalm',
    themeId: 'gta-vi'
  }
]

export const MARKETPLACE_ITEMS: MarketplaceItem[] = ITEMS.map((entry) => {
  const item = { ...entry, authorHandle: '@yapin_Reflex9947', sampleMetrics: true }
  if (item.type === 'theme') return item
  const nodes =
    item.nodes ??
    ([
      {
        id: 'trigger',
        type: 'onCommand',
        position: { x: 80, y: 100 },
        data: {
          label: 'On Command',
          commandName: item.id.includes('bank')
            ? 'balance'
            : item.id.includes('ticket')
              ? 'ticket'
              : 'welcome',
          description: 'Show community information'
        }
      },
      {
        id: 'reply',
        type: 'sendReply',
        position: { x: 420, y: 100 },
        data: {
          label: 'Reply',
          message: item.id.includes('bank')
            ? 'Your session balance is {var:balance}'
            : item.id.includes('ticket')
              ? 'Support request received: {args}'
              : 'Welcome {user}! Please read the server rules.'
        }
      }
    ] as BotNode[])
  const edges =
    item.edges ??
    nodes.slice(0, -1).map((n, i) => ({
      id: `edge-${i}`,
      source: n.id,
      target: nodes[i + 1].id,
      sourceHandle: ['textCondition', 'checkUserRole', 'cooldownTimer'].includes(String(n.type))
        ? 'true'
        : 'out',
      targetHandle: 'in'
    }))
  return { ...item, nodes, edges, nodeCount: nodes.length }
})
