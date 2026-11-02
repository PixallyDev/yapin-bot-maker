import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { OnCommandData } from '../types'

export const OnCommandNode: React.FC<NodeProps<Node<OnCommandData>>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow()

  const handleCommandChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, commandName: val } } : n))
    )
  }

  const handleDescChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, description: val } } : n))
    )
  }

  return (
    <div className={`node-card trigger-node ${selected ? 'node-selected' : ''}`}>
      <div className="node-header">
        <div className="node-icon trigger-icon">⌨️</div>
        <div className="node-title-group">
          <span className="node-badge trigger-badge">TRIGGER</span>
          <span className="node-title">On Command</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Command Name</label>
          <div className="command-input-wrapper">
            <span className="command-prefix">/</span>
            <input
              type="text"
              className="node-input nodrag nopan"
              value={data.commandName ?? 'ping'}
              onChange={handleCommandChange}
              placeholder="e.g. ping"
            />
          </div>
        </div>

        <div className="node-field">
          <label className="node-field-label">Description (for / menu)</label>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.description ?? 'A bot command'}
            onChange={handleDescChange}
            placeholder="Command description"
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="flow-handle handle-trigger"
      />
    </div>
  )
}
