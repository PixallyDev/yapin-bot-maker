import { BotNode, BotEdge } from './types'
import { PRESET_TEMPLATES } from './templates'
import { COMMAND_PACKAGES } from './commandStore'

export interface MarketplaceItem {
  id: string
  name: string
  type: 'template' | 'node' | 'theme'
  category: 'moderation' | 'utility' | 'fun' | 'community' | 'economy'
  author: string
  version: string
  downloads: string
  rating: number
  description: string
  tags: string[]
  icon: string
  themeId?: string
  nodes?: BotNode[]
  edges?: BotEdge[]
  nodeCount?: number
  commandName?: string
}

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // --- TEMPLATES ---
  {
    id: 'market-tmpl-1',
    name: 'Ping & FAQ Starter Bot',
    type: 'template',
    category: 'utility',
    author: 'YapinOfficial',
    version: '1.2.0',
    downloads: '14.2k',
    rating: 4.9,
    description:
      'Complete multi-trigger starter bot with /ping latency test, FAQ responder, and console diagnostics.',
    tags: ['beginner', 'faq', 'commands'],
    icon: '⚡',
    nodes: PRESET_TEMPLATES[0].nodes,
    edges: PRESET_TEMPLATES[0].edges,
    nodeCount: PRESET_TEMPLATES[0].nodes.length
  },
  {
    id: 'market-tmpl-2',
    name: 'Sentinel Auto-Moderator',
    type: 'template',
    category: 'moderation',
    author: 'SecurityGuild',
    version: '2.1.0',
    downloads: '9.8k',
    rating: 4.8,
    description:
      'Proactive chat filter detecting bad words, deleting infringing messages, and delivering warning cards.',
    tags: ['filter', 'shield', 'moderation'],
    icon: '🛡️',
    nodes: PRESET_TEMPLATES[1].nodes,
    edges: PRESET_TEMPLATES[1].edges,
    nodeCount: PRESET_TEMPLATES[1].nodes.length
  },
  {
    id: 'market-tmpl-3',
    name: 'Arcade Fun & Global Counter',
    type: 'template',
    category: 'fun',
    author: 'YapArcade',
    version: '1.4.2',
    downloads: '11.5k',
    rating: 4.7,
    description:
      'Interactive entertainment bot featuring random reply 8-ball answers and incrementing persistent counters.',
    tags: ['games', 'counter', 'dice'],
    icon: '🎲',
    nodes: PRESET_TEMPLATES[2].nodes,
    edges: PRESET_TEMPLATES[2].edges,
    nodeCount: PRESET_TEMPLATES[2].nodes.length
  },
  {
    id: 'market-tmpl-4',
    name: 'Gatekeeper Welcome & Verification',
    type: 'template',
    category: 'community',
    author: 'CommunityLabs',
    version: '1.0.8',
    downloads: '6.4k',
    rating: 4.9,
    description:
      'Welcomes new members with branded greeting cards, rules prompt, and automated role assignment.',
    tags: ['welcome', 'onboarding', 'roles'],
    icon: '👋',
    nodeCount: 5
  },
  {
    id: 'market-tmpl-5',
    name: 'Support Ticket Dispatcher',
    type: 'template',
    category: 'utility',
    author: 'SupportPro',
    version: '1.1.5',
    downloads: '5.1k',
    rating: 4.6,
    description:
      'Handles support requests via /ticket, checks requester role, and creates private response notifications.',
    tags: ['tickets', 'support', 'workflow'],
    icon: '🎫',
    nodeCount: 6
  },

  // --- COMMUNITY NODES ---
  {
    id: 'market-node-poll',
    name: 'Quick Poll & Voting Suite',
    type: 'node',
    category: 'utility',
    author: 'PollMaster',
    version: '1.3.0',
    downloads: '8.3k',
    rating: 4.8,
    description:
      'Spawns interactive voting embed cards with automatic reaction buttons and user response logging.',
    tags: ['poll', 'voting', 'embed'],
    icon: '📊',
    commandName: '/poll',
    nodes: COMMAND_PACKAGES[0].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-flip',
    name: 'Coin Flip & Fortune Dice',
    type: 'node',
    category: 'fun',
    author: 'LuckyDev',
    version: '1.0.2',
    downloads: '12.1k',
    rating: 4.9,
    description:
      'High-speed randomized coin flipper with heads/tails probability and cooldown timer protection.',
    tags: ['dice', 'flip', 'random'],
    icon: '🪙',
    commandName: '/flip',
    nodes: COMMAND_PACKAGES[1].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-warn',
    name: 'Staff Moderation Warning Card',
    type: 'node',
    category: 'moderation',
    author: 'ModSquad',
    version: '2.0.0',
    downloads: '7.9k',
    rating: 4.9,
    description:
      'Restricted slash command allowing only server administrators to dispatch formal infraction warnings.',
    tags: ['warn', 'staff', 'mod'],
    icon: '⚠️',
    commandName: '/warn',
    nodes: COMMAND_PACKAGES[2].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-shield',
    name: 'Anti-Phishing & Link Shield',
    type: 'node',
    category: 'moderation',
    author: 'CyberGuard',
    version: '1.5.1',
    downloads: '16.7k',
    rating: 5.0,
    description:
      'Scans all messages for suspicious discord invite links or phishing URLs and immediately purges them.',
    tags: ['anti-invite', 'security', 'shield'],
    icon: '🔒',
    nodes: COMMAND_PACKAGES[3].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-xp',
    name: 'Community Activity & XP Leveler',
    type: 'node',
    category: 'community',
    author: 'LevelUp',
    version: '3.1.0',
    downloads: '19.4k',
    rating: 4.9,
    description:
      'Increments member experience points per message sent with rate-limit cooldown protection.',
    tags: ['xp', 'leveling', 'economy'],
    icon: '⭐',
    nodes: COMMAND_PACKAGES[4].nodes(100),
    nodeCount: 3
  },
  {
    id: 'market-node-bank',
    name: 'Virtual Economy Bank & Balances',
    type: 'node',
    category: 'economy',
    author: 'VaultDev',
    version: '1.1.0',
    downloads: '4.8k',
    rating: 4.7,
    description:
      'Enables /daily and /balance commands with session variable persistence and rich bank receipts.',
    tags: ['economy', 'coins', 'bank'],
    icon: '💰',
    commandName: '/balance',
    nodeCount: 4
  },

  // --- THEMES ---
  {
    id: 'market-theme-neon',
    name: 'Neon Purple (Cyberpunk)',
    type: 'theme',
    category: 'utility',
    author: 'VaporAesthetic',
    version: '1.0.0',
    downloads: '22.1k',
    rating: 5.0,
    description:
      'Vibrant neon violet and glowing magenta UI highlights for midnight studio sessions.',
    tags: ['purple', 'neon', 'cyberpunk'],
    icon: '🔮',
    themeId: 'neon-purple'
  },
  {
    id: 'market-theme-midnight',
    name: 'Midnight OLED Black',
    type: 'theme',
    category: 'utility',
    author: 'MinimalCraft',
    version: '1.1.0',
    downloads: '18.9k',
    rating: 4.9,
    description:
      'Deep pitch black surfaces with electric sapphire nodes for maximum contrast and battery efficiency.',
    tags: ['oled', 'black', 'sapphire'],
    icon: '🌑',
    themeId: 'midnight'
  },
  {
    id: 'market-theme-ice',
    name: 'Ice-Phoenix Glacier',
    type: 'theme',
    category: 'utility',
    author: 'Frostbyte',
    version: '1.0.2',
    downloads: '15.3k',
    rating: 4.8,
    description:
      'Frosted cyan accents and glacial sapphire glow inspired by Nordic winter aesthetics.',
    tags: ['cyan', 'frost', 'clean'],
    icon: '❄️',
    themeId: 'ice-phoenix'
  },
  {
    id: 'market-theme-gta',
    name: 'GTA VI Vice City Sunset',
    type: 'theme',
    category: 'fun',
    author: 'ViceCreative',
    version: '2.0.0',
    downloads: '31.2k',
    rating: 5.0,
    description:
      'Iconic retro Miami 80s neon pink, tropical turquoise and sunset purple gradients.',
    tags: ['gta', 'pink', 'retro'],
    icon: '🌴',
    themeId: 'gta-vi'
  }
]
