import React from 'react'
import { PaletteItem } from '../types'

interface NodePaletteProps {
  onAddNode: (item: PaletteItem) => void
}

const PALETTE_ITEMS: PaletteItem[] = [
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
  {
    type: 'textCondition',
    category: 'condition',
    title: 'Text Contains / Equals',
    description: 'Tests if message matches a rule with True/False branches',
    icon: '🔍',
    defaultData: {
      label: 'Text Filter',
      operator: 'contains',
      value: 'hello',
      caseSensitive: false
    }
  },
  {
    type: 'sendReply',
    category: 'action',
    title: 'Send Reply',
    description: 'Replies directly to the user in the channel',
    icon: '💬',
    defaultData: {
      label: 'Send Reply',
      message: 'Hello {author}! Received your message.'
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
      message: 'Processed event from {author}: {content}'
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
            Connect <strong>Trigger</strong> &rarr; <strong>Condition</strong> &rarr;{' '}
            <strong>Action</strong> to build workflows.
          </p>
        </div>
      </div>
    </aside>
  )
}
