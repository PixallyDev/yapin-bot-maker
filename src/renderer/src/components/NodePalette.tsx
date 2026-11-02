import React from 'react'
import { PaletteItem } from '../types'

interface NodePaletteProps {
  onAddNode: (item: PaletteItem) => void
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Triggers
  {
    type: 'onMessage',
    category: 'trigger',
    title: 'On Message',
    description: 'Triggers whenever a chat message is sent in server',
    icon: '⚡',
    defaultData: {
      label: 'On Message',
      ignoreBots: true
    }
  },
  {
    type: 'onCommand',
    category: 'trigger',
    title: 'On Command',
    description: 'Registers & triggers a /slash command',
    icon: '⌨️',
    defaultData: {
      label: 'On Command',
      commandName: 'ping',
      description: 'Replies with pong'
    }
  },

  // Conditions
  {
    type: 'textCondition',
    category: 'condition',
    title: 'If Message Contains',
    description: 'Tests if message content matches text with True/False branches',
    icon: '🔍',
    defaultData: {
      label: 'If Message Contains',
      operator: 'contains',
      value: 'hello',
      caseSensitive: false
    }
  },
  {
    type: 'checkUserRole',
    category: 'condition',
    title: 'Check User / Role',
    description: 'Checks author username, user ID, or if bot account',
    icon: '🛡️',
    defaultData: {
      label: 'Check User',
      checkType: 'username',
      operator: 'equals',
      value: 'admin'
    }
  },
  {
    type: 'cooldownTimer',
    category: 'condition',
    title: 'Cooldown Timer',
    description: 'Rate-limits actions per user, channel, or globally',
    icon: '⏱️',
    defaultData: {
      label: 'Cooldown',
      seconds: 5,
      scope: 'user'
    }
  },

  // Variables
  {
    type: 'setVariable',
    category: 'variable',
    title: 'Set Variable',
    description: 'Stores or increments a value in bot session memory',
    icon: '💾',
    defaultData: {
      label: 'Set Variable',
      varName: 'score',
      value: '1',
      operation: 'set'
    }
  },
  {
    type: 'getVariable',
    category: 'variable',
    title: 'Get Variable',
    description: 'Reads a variable with a fallback default',
    icon: '📥',
    defaultData: {
      label: 'Get Variable',
      varName: 'score',
      fallback: '0'
    }
  },

  // Actions
  {
    type: 'sendReply',
    category: 'action',
    title: 'Send Reply',
    description: 'Replies directly to the user in the channel',
    icon: '💬',
    defaultData: {
      label: 'Send Reply',
      message: 'Hello {user}! Received your message.'
    }
  },
  {
    type: 'sendRichMessage',
    category: 'action',
    title: 'Send Rich Card',
    description: 'Sends an embed card with title, description, and color',
    icon: '🎴',
    defaultData: {
      label: 'Send Rich Card',
      title: 'Announcement',
      description: 'Welcome {user} to the community!',
      color: '#3b82f6',
      footer: 'Yapin Bot'
    }
  },
  {
    type: 'randomReply',
    category: 'action',
    title: 'Random Reply',
    description: 'Randomly picks 1 reply from a list of options',
    icon: '🎲',
    defaultData: {
      label: 'Random Reply',
      replies: 'Yes, absolutely!\nNo way.\nAsk again later, {user}.\nSigns point to yes!'
    }
  },
  {
    type: 'waitDelay',
    category: 'action',
    title: 'Wait / Delay',
    description: 'Pauses execution for a specified number of seconds',
    icon: '⏳',
    defaultData: {
      label: 'Wait',
      seconds: 2
    }
  },
  {
    type: 'moderateMessage',
    category: 'action',
    title: 'Delete / Moderate',
    description: 'Deletes message, or times out / kicks the author',
    icon: '🔨',
    defaultData: {
      label: 'Moderate',
      actionType: 'delete',
      minutes: 10,
      reason: 'Rule violation'
    }
  },
  {
    type: 'logConsole',
    category: 'action',
    title: 'Log to Console',
    description: 'Outputs a debug entry to the Bot Console drawer',
    icon: '📝',
    defaultData: {
      label: 'Log Console',
      level: 'info',
      message: 'Processed event from {user}: {content}'
    }
  }
]

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const onDragStart = (event: React.DragEvent, item: PaletteItem): void => {
    event.dataTransfer.setData('application/yapin-node', JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'move'
  }

  const triggers = PALETTE_ITEMS.filter((item) => item.category === 'trigger')
  const conditions = PALETTE_ITEMS.filter((item) => item.category === 'condition')
  const variables = PALETTE_ITEMS.filter((item) => item.category === 'variable')
  const actions = PALETTE_ITEMS.filter((item) => item.category === 'action')

  return (
    <aside className="studio-palette">
      <div className="palette-header">
        <h3 className="palette-title">Node Library</h3>
        <p className="palette-subtitle">Click or drag nodes onto canvas</p>
      </div>

      <div className="palette-categories">
        {/* TRIGGERS */}
        <section className="palette-section">
          <div className="section-label-group trigger-group">
            <span className="section-dot trigger-dot" />
            <h4 className="section-title">Triggers</h4>
            <span className="section-count">{triggers.length}</span>
          </div>
          <div className="palette-list">
            {triggers.map((item) => (
              <div
                key={item.type}
                className="palette-card trigger-card"
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onAddNode(item)}
              >
                <div className="palette-card-top">
                  <span className="palette-card-icon">{item.icon}</span>
                  <span className="palette-card-name">{item.title}</span>
                  <span className="palette-add-hint">+</span>
                </div>
                <p className="palette-card-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CONDITIONS */}
        <section className="palette-section">
          <div className="section-label-group condition-group">
            <span className="section-dot condition-dot" />
            <h4 className="section-title">Conditions</h4>
            <span className="section-count">{conditions.length}</span>
          </div>
          <div className="palette-list">
            {conditions.map((item) => (
              <div
                key={item.type}
                className="palette-card condition-card"
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onAddNode(item)}
              >
                <div className="palette-card-top">
                  <span className="palette-card-icon">{item.icon}</span>
                  <span className="palette-card-name">{item.title}</span>
                  <span className="palette-add-hint">+</span>
                </div>
                <p className="palette-card-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* VARIABLES */}
        <section className="palette-section">
          <div className="section-label-group variable-group">
            <span className="section-dot variable-dot" />
            <h4 className="section-title">Variables</h4>
            <span className="section-count">{variables.length}</span>
          </div>
          <div className="palette-list">
            {variables.map((item) => (
              <div
                key={item.type}
                className="palette-card variable-card"
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onAddNode(item)}
              >
                <div className="palette-card-top">
                  <span className="palette-card-icon">{item.icon}</span>
                  <span className="palette-card-name">{item.title}</span>
                  <span className="palette-add-hint">+</span>
                </div>
                <p className="palette-card-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ACTIONS */}
        <section className="palette-section">
          <div className="section-label-group action-group">
            <span className="section-dot action-dot" />
            <h4 className="section-title">Actions</h4>
            <span className="section-count">{actions.length}</span>
          </div>
          <div className="palette-list">
            {actions.map((item) => (
              <div
                key={item.type}
                className="palette-card action-card"
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                onClick={() => onAddNode(item)}
              >
                <div className="palette-card-top">
                  <span className="palette-card-icon">{item.icon}</span>
                  <span className="palette-card-name">{item.title}</span>
                  <span className="palette-add-hint">+</span>
                </div>
                <p className="palette-card-desc">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="palette-footer">
        <div className="yapper-doc-tip">
          <span className="doc-tip-icon">💡</span>
          <p className="doc-tip-text">
            Use variables like <code>{'{user}'}</code> and <code>{'{args}'}</code> to personalize
            bot responses!
          </p>
        </div>
      </div>
    </aside>
  )
}
