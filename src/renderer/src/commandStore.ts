import { BotNode, BotEdge } from './types'

export interface CommandPackage {
  id: string
  name: string
  commandName: string
  category: 'moderation' | 'utility' | 'fun' | 'community'
  description: string
  icon: string
  nodeCount: number
  nodes: (offsetY: number) => BotNode[]
  edges: BotEdge[]
}

export const COMMAND_PACKAGES: CommandPackage[] = [
  {
    id: 'pkg-poll',
    name: 'Interactive Poll (/poll)',
    commandName: '/poll',
    category: 'utility',
    description:
      'Creates a clean Rich Card poll for community voting with Agree, Disagree, and Neutral choices.',
    icon: 'ChartBar',
    nodeCount: 3,
    nodes: (offsetY: number) => [
      {
        id: `poll-cmd-${Date.now().toString(36)}`,
        type: 'onCommand',
        position: { x: 80, y: offsetY },
        data: {
          label: 'On Command /poll',
          commandName: 'poll',
          description: 'Create a community poll'
        }
      },
      {
        id: `poll-card-${Date.now().toString(36)}`,
        type: 'sendRichMessage',
        position: { x: 440, y: offsetY },
        data: {
          label: 'Poll Rich Card',
          title: 'Community Poll',
          description:
            '**Question**: {args}\n\n1️⃣ Agree\n2️⃣ Disagree\n3️⃣ Neutral\n\n*Cast your reaction vote below!*',
          color: '#6366f1',
          footer: 'Poll by @{user}'
        }
      },
      {
        id: `poll-log-${Date.now().toString(36)}`,
        type: 'logConsole',
        position: { x: 800, y: offsetY },
        data: {
          label: 'Log Poll',
          level: 'info',
          message: 'Poll created by @{user}: {args}'
        }
      }
    ],
    edges: []
  },
  {
    id: 'pkg-flip',
    name: 'Coin Flipper (/flip)',
    commandName: '/flip',
    category: 'fun',
    description: 'Flips a virtual coin and returns random Heads or Tails with clean formatting.',
    icon: 'Coins',
    nodeCount: 3,
    nodes: (offsetY: number) => [
      {
        id: `flip-cmd-${Date.now().toString(36)}`,
        type: 'onCommand',
        position: { x: 80, y: offsetY },
        data: {
          label: 'On Command /flip',
          commandName: 'flip',
          description: 'Flip a virtual coin'
        }
      },
      {
        id: `flip-pick-${Date.now().toString(36)}`,
        type: 'randomReply',
        position: { x: 440, y: offsetY },
        data: {
          label: 'Coin Outcome',
          replies: 'The coin landed on: **HEADS**!\nThe coin landed on: **TAILS**!'
        }
      },
      {
        id: `flip-log-${Date.now().toString(36)}`,
        type: 'logConsole',
        position: { x: 800, y: offsetY },
        data: {
          label: 'Log Flip',
          level: 'info',
          message: '{user} flipped a coin.'
        }
      }
    ],
    edges: []
  },
  {
    id: 'pkg-antispam',
    name: 'Invite Link Shield',
    commandName: 'AutoMod',
    category: 'moderation',
    description:
      'Detects unauthorized discord/yapin invite links in chat, immediately deletes the message, and warns the poster.',
    icon: 'Shield',
    nodeCount: 4,
    nodes: (offsetY: number) => [
      {
        id: `spam-msg-${Date.now().toString(36)}`,
        type: 'onMessage',
        position: { x: 80, y: offsetY },
        data: {
          label: 'Watch All Messages',
          ignoreBots: true
        }
      },
      {
        id: `spam-cond-${Date.now().toString(36)}`,
        type: 'textCondition',
        position: { x: 440, y: offsetY },
        data: {
          label: 'Detect Invite Link',
          operator: 'contains',
          value: 'invite/',
          caseSensitive: false
        }
      },
      {
        id: `spam-del-${Date.now().toString(36)}`,
        type: 'moderateMessage',
        position: { x: 800, y: offsetY - 40 },
        data: {
          label: 'Delete Link',
          actionType: 'delete'
        }
      },
      {
        id: `spam-warn-${Date.now().toString(36)}`,
        type: 'sendReply',
        position: { x: 1160, y: offsetY - 40 },
        data: {
          label: 'Warn User',
          message: 'Unauthorized advertising is not permitted here, @{user}!'
        }
      }
    ],
    edges: []
  },
  {
    id: 'pkg-warn',
    name: 'Admin Warning System (/warn)',
    commandName: '/warn',
    category: 'moderation',
    description:
      'Restricts /warn to administrators; outputs an official moderation banner into the channel.',
    icon: 'TriangleAlert',
    nodeCount: 4,
    nodes: (offsetY: number) => [
      {
        id: `warn-cmd-${Date.now().toString(36)}`,
        type: 'onCommand',
        position: { x: 80, y: offsetY },
        data: {
          label: 'On Command /warn',
          commandName: 'warn',
          description: 'Issue an official moderator warning'
        }
      },
      {
        id: `warn-check-${Date.now().toString(36)}`,
        type: 'checkUserRole',
        position: { x: 440, y: offsetY },
        data: {
          label: 'Verify Admin',
          checkType: 'username',
          operator: 'equals',
          value: 'admin'
        }
      },
      {
        id: `warn-card-${Date.now().toString(36)}`,
        type: 'sendRichMessage',
        position: { x: 800, y: offsetY - 60 },
        data: {
          label: 'Official Warning Card',
          title: 'Official Staff Warning',
          description: '**Reason**: {args}\n\n*Please adhere to community rules.*',
          color: '#f59e0b',
          footer: 'Enforced by @{user}'
        }
      },
      {
        id: `warn-denied-${Date.now().toString(36)}`,
        type: 'sendReply',
        position: { x: 800, y: offsetY + 120 },
        data: {
          label: 'Permission Denied',
          message: 'You must be an administrator to issue /warn.'
        }
      }
    ],
    edges: []
  },
  {
    id: 'pkg-xp',
    name: 'Community XP Leveler',
    commandName: 'XP Timer',
    category: 'community',
    description:
      'Awards 10 XP once per minute per user on chat messages, incrementing a persistent session XP pool.',
    icon: 'Zap',
    nodeCount: 4,
    nodes: (offsetY: number) => [
      {
        id: `xp-msg-${Date.now().toString(36)}`,
        type: 'onMessage',
        position: { x: 80, y: offsetY },
        data: {
          label: 'Chat Message',
          ignoreBots: true
        }
      },
      {
        id: `xp-cd-${Date.now().toString(36)}`,
        type: 'cooldownTimer',
        position: { x: 440, y: offsetY },
        data: {
          label: 'XP Timer (60s)',
          seconds: 60,
          scope: 'user'
        }
      },
      {
        id: `xp-add-${Date.now().toString(36)}`,
        type: 'setVariable',
        position: { x: 800, y: offsetY - 40 },
        data: {
          label: 'Add 10 XP',
          varName: 'community_xp',
          value: '10',
          operation: 'increment'
        }
      },
      {
        id: `xp-log-${Date.now().toString(36)}`,
        type: 'logConsole',
        position: { x: 1160, y: offsetY - 40 },
        data: {
          label: 'Log XP',
          level: 'success',
          message: '+10 XP awarded to {user}! Pool total: {var:community_xp}'
        }
      }
    ],
    edges: []
  }
]
