import { BotNode, BotEdge } from './types'

export interface BotTemplate {
  id: string
  name: string
  tag: string
  description: string
  icon: string
  nodes: BotNode[]
  edges: BotEdge[]
}

export const PRESET_TEMPLATES: BotTemplate[] = [
  {
    id: 'ping-faq',
    name: 'Ping & FAQ Bot',
    tag: 'Beginner Friendly',
    description:
      'Responds to /ping with instant latency check, sends a styled Rich FAQ Card on /faq, and auto-detects help requests in chat.',
    icon: 'Zap',
    nodes: [
      {
        id: 'cmd-ping',
        type: 'onCommand',
        position: { x: 80, y: 80 },
        data: {
          label: 'On Command /ping',
          commandName: 'ping',
          description: 'Check bot latency'
        }
      },
      {
        id: 'reply-ping',
        type: 'sendReply',
        position: { x: 440, y: 80 },
        data: {
          label: 'Send Reply',
          message: 'Pong! Latency is 12ms. Bot is fully online.'
        }
      },
      {
        id: 'log-ping',
        type: 'logConsole',
        position: { x: 800, y: 80 },
        data: {
          label: 'Log Console',
          level: 'success',
          message: 'Replied to /ping from @{user}'
        }
      },
      {
        id: 'cmd-faq',
        type: 'onCommand',
        position: { x: 80, y: 280 },
        data: {
          label: 'On Command /faq',
          commandName: 'faq',
          description: 'Frequently asked questions'
        }
      },
      {
        id: 'card-faq',
        type: 'sendRichMessage',
        position: { x: 440, y: 280 },
        data: {
          label: 'Send FAQ Card',
          title: 'Yapin Server FAQ ',
          description:
            'Hey {user}! Welcome to our official server.\n\n**Commands**:\n• `/ping` - Test bot responsiveness\n• `/faq` - View server guidelines\n\n**Guidelines**:\n1. Be friendly to fellow yappers.\n2. No spam in general chat.',
          color: '#3b82f6',
          footer: 'Yapin FAQ Guide'
        }
      },
      {
        id: 'msg-help',
        type: 'onMessage',
        position: { x: 80, y: 560 },
        data: {
          label: 'On Message',
          ignoreBots: true
        }
      },
      {
        id: 'cond-help',
        type: 'textCondition',
        position: { x: 440, y: 560 },
        data: {
          label: 'If Message Contains',
          operator: 'contains',
          value: 'help',
          caseSensitive: false
        }
      },
      {
        id: 'reply-help',
        type: 'sendReply',
        position: { x: 800, y: 520 },
        data: {
          label: 'Help Hint Reply',
          message: 'Looking for help, {user}? Try typing **/faq** or **/ping**!'
        }
      }
    ],
    edges: [
      {
        id: 'e1',
        source: 'cmd-ping',
        target: 'reply-ping',
        sourceHandle: 'out',
        targetHandle: 'in'
      },
      {
        id: 'e2',
        source: 'reply-ping',
        target: 'log-ping',
        sourceHandle: 'out',
        targetHandle: 'in'
      },
      { id: 'e3', source: 'cmd-faq', target: 'card-faq', sourceHandle: 'out', targetHandle: 'in' },
      {
        id: 'e4',
        source: 'msg-help',
        target: 'cond-help',
        sourceHandle: 'out',
        targetHandle: 'in'
      },
      {
        id: 'e5',
        source: 'cond-help',
        target: 'reply-help',
        sourceHandle: 'true',
        targetHandle: 'in'
      }
    ]
  },
  {
    id: 'automod',
    name: 'Auto-Moderator (Bad Word Filter)',
    tag: 'Moderation & Safety',
    description:
      'Monitors every incoming chat message, verifies the user is not an administrator, filters prohibited keywords, deletes offending messages, and issues an inline warning.',
    icon: 'Shield',
    nodes: [
      {
        id: 'mod-msg',
        type: 'onMessage',
        position: { x: 80, y: 160 },
        data: {
          label: 'On Message',
          ignoreBots: true
        }
      },
      {
        id: 'check-admin',
        type: 'checkUserRole',
        position: { x: 440, y: 160 },
        data: {
          label: 'Check If Admin',
          checkType: 'username',
          operator: 'equals',
          value: 'admin'
        }
      },
      {
        id: 'admin-log',
        type: 'logConsole',
        position: { x: 800, y: 80 },
        data: {
          label: 'Log Bypass',
          level: 'info',
          message: 'AutoMod: Bypassed for admin @{user}'
        }
      },
      {
        id: 'filter-bad',
        type: 'textCondition',
        position: { x: 800, y: 240 },
        data: {
          label: 'Filter Bad Word',
          operator: 'contains',
          value: 'badword',
          caseSensitive: false
        }
      },
      {
        id: 'del-msg',
        type: 'moderateMessage',
        position: { x: 1160, y: 200 },
        data: {
          label: 'Delete Message',
          actionType: 'delete'
        }
      },
      {
        id: 'warn-user',
        type: 'sendReply',
        position: { x: 1520, y: 200 },
        data: {
          label: 'Send Warning',
          message: 'Warning @{user}: Inappropriate language is not permitted here!'
        }
      },
      {
        id: 'log-mod',
        type: 'logConsole',
        position: { x: 1880, y: 200 },
        data: {
          label: 'Log Moderation',
          level: 'warn',
          message: 'AutoMod deleted offending message from @{user}: {content}'
        }
      }
    ],
    edges: [
      {
        id: 'm1',
        source: 'mod-msg',
        target: 'check-admin',
        sourceHandle: 'out',
        targetHandle: 'in'
      },
      {
        id: 'm2',
        source: 'check-admin',
        target: 'admin-log',
        sourceHandle: 'true',
        targetHandle: 'in'
      },
      {
        id: 'm3',
        source: 'check-admin',
        target: 'filter-bad',
        sourceHandle: 'false',
        targetHandle: 'in'
      },
      {
        id: 'm4',
        source: 'filter-bad',
        target: 'del-msg',
        sourceHandle: 'true',
        targetHandle: 'in'
      },
      { id: 'm5', source: 'del-msg', target: 'warn-user', sourceHandle: 'out', targetHandle: 'in' },
      { id: 'm6', source: 'warn-user', target: 'log-mod', sourceHandle: 'out', targetHandle: 'in' }
    ]
  },
  {
    id: 'counter-fun',
    name: 'Counter & Random Fun Bot',
    tag: 'Community Games',
    description:
      'Features a rate-limited /roll dice game picking random rewards, and a global community counter stored in session memory.',
    icon: 'Dices',
    nodes: [
      {
        id: 'cmd-roll',
        type: 'onCommand',
        position: { x: 80, y: 100 },
        data: {
          label: 'On Command /roll',
          commandName: 'roll',
          description: 'Roll a lucky outcome'
        }
      },
      {
        id: 'roll-cd',
        type: 'cooldownTimer',
        position: { x: 440, y: 100 },
        data: {
          label: 'Roll Cooldown (5s)',
          seconds: 5,
          scope: 'user'
        }
      },
      {
        id: 'roll-pick',
        type: 'randomReply',
        position: { x: 800, y: 60 },
        data: {
          label: 'Pick Random Outcome',
          replies:
            '{user} rolled a **1**! Critical fail! \n{user} rolled a **7**! Lucky throw! \n{user} rolled a **14**! Solid roll! \n{user} rolled a **20**! Critical victory! '
        }
      },
      {
        id: 'roll-wait',
        type: 'sendReply',
        position: { x: 800, y: 220 },
        data: {
          label: 'Cooldown Warning',
          message: 'Please slow down @{user}! Try rolling again in a few seconds.'
        }
      },
      {
        id: 'cmd-count',
        type: 'onCommand',
        position: { x: 80, y: 380 },
        data: {
          label: 'On Command /count',
          commandName: 'count',
          description: 'Increment community counter'
        }
      },
      {
        id: 'set-count',
        type: 'setVariable',
        position: { x: 440, y: 380 },
        data: {
          label: 'Increment Counter',
          varName: 'global_count',
          value: '1',
          operation: 'increment'
        }
      },
      {
        id: 'card-count',
        type: 'sendRichMessage',
        position: { x: 800, y: 380 },
        data: {
          label: 'Display Count Card',
          title: 'Community Counter ',
          description:
            'Current Count: **{var:global_count}**\n\nIncremented by @{user}!\nKeep the streak going.',
          color: '#10b981',
          footer: 'Yapin Fun Bot'
        }
      },
      {
        id: 'log-count',
        type: 'logConsole',
        position: { x: 1160, y: 380 },
        data: {
          label: 'Log Count',
          level: 'success',
          message: 'Counter updated to {var:global_count} by {user}'
        }
      }
    ],
    edges: [
      { id: 'f1', source: 'cmd-roll', target: 'roll-cd', sourceHandle: 'out', targetHandle: 'in' },
      {
        id: 'f2',
        source: 'roll-cd',
        target: 'roll-pick',
        sourceHandle: 'true',
        targetHandle: 'in'
      },
      {
        id: 'f3',
        source: 'roll-cd',
        target: 'roll-wait',
        sourceHandle: 'false',
        targetHandle: 'in'
      },
      {
        id: 'f4',
        source: 'cmd-count',
        target: 'set-count',
        sourceHandle: 'out',
        targetHandle: 'in'
      },
      {
        id: 'f5',
        source: 'set-count',
        target: 'card-count',
        sourceHandle: 'out',
        targetHandle: 'in'
      },
      {
        id: 'f6',
        source: 'card-count',
        target: 'log-count',
        sourceHandle: 'out',
        targetHandle: 'in'
      }
    ]
  }
]
