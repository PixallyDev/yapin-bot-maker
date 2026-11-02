import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { OnMessageData } from '../types'

export const OnMessageNode: React.FC<NodeProps<Node<OnMessageData>>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow()

  const handleToggleBots = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ignoreBots: checked } } : n))
    )
  }

  return (
    <div className={`node-card trigger-node ${selected ? 'node-selected' : ''}`}>
      <div className="node-header">
        <div className="node-icon trigger-icon">⚡</div>
        <div className="node-title-group">
          <span className="node-badge trigger-badge">TRIGGER</span>
          <span className="node-title">On Message</span>
        </div>
      </div>

      <div className="node-body">
        <p className="node-description">Fires on every new chat message in server channels.</p>
        <label className="node-checkbox-label nodrag">
          <input
            type="checkbox"
            checked={data.ignoreBots !== false}
            onChange={handleToggleBots}
            className="nodrag"
          />
          <span>Ignore bot & webhook messages</span>
        </label>
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
