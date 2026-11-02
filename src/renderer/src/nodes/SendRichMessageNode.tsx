import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { SendRichMessageData } from '../types'
import { VariablePills } from '../components/VariablePills'

export const SendRichMessageNode: React.FC<NodeProps<Node<SendRichMessageData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, title: val } } : n))
    )
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, description: val } } : n))
    )
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, color: val } } : n))
    )
  }

  const handleFooterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, footer: val } } : n))
    )
  }

  const handleInsertPill = (pill: string): void => {
    const current = String(data.description ?? '')
    const updated = current ? `${current} ${pill}` : pill
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, description: updated } } : n))
    )
  }

  return (
    <div className={`node-card action-node ${selected ? 'node-selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="flow-handle handle-target"
      />

      <div className="node-header">
        <div className="node-icon action-icon">🎴</div>
        <div className="node-title-group">
          <span className="node-badge action-badge">ACTION</span>
          <span className="node-title">Send Rich Card</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Card Title</label>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.title ?? 'Announcement'}
            onChange={handleTitleChange}
            placeholder="Embed title..."
          />
        </div>

        <div className="node-field">
          <label className="node-field-label">Accent Color</label>
          <div className="color-input-wrapper nodrag nopan">
            <input
              type="color"
              className="color-picker-input nodrag nopan"
              value={data.color ?? '#3b82f6'}
              onChange={handleColorChange}
            />
            <input
              type="text"
              className="node-input color-text-input nodrag nopan"
              value={data.color ?? '#3b82f6'}
              onChange={handleColorChange}
            />
          </div>
        </div>

        <div className="node-field">
          <div className="field-header">
            <label className="node-field-label">Card Description</label>
          </div>
          <textarea
            className="node-textarea nodrag nopan"
            rows={3}
            value={data.description ?? 'Welcome to the server, {user}!'}
            onChange={handleDescriptionChange}
            placeholder="Embed description..."
          />
          <VariablePills onInsert={handleInsertPill} />
        </div>

        <div className="node-field">
          <label className="node-field-label">Footer Text (optional)</label>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.footer ?? 'Yapin Bot Maker'}
            onChange={handleFooterChange}
            placeholder="Footer note..."
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="flow-handle handle-action"
      />
    </div>
  )
}
