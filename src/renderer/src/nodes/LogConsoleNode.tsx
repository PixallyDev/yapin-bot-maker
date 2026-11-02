import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { LogConsoleData } from '../types'

export const LogConsoleNode: React.FC<NodeProps<Node<LogConsoleData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as LogConsoleData['level']
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, level: val } } : n))
    )
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: val } } : n))
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
        <div className="node-icon action-icon">📝</div>
        <div className="node-title-group">
          <span className="node-badge action-badge">ACTION</span>
          <span className="node-title">Log to Console</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Log Level</label>
          <select
            className="node-select nodrag nopan"
            value={data.level ?? 'info'}
            onChange={handleLevelChange}
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="node-field">
          <div className="field-header">
            <label className="node-field-label">Log Message</label>
            <span className="field-hint">
              {'{author}'}, {'{content}'}
            </span>
          </div>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.message ?? 'Triggered action by {author}'}
            onChange={handleMessageChange}
            placeholder="Log message..."
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
