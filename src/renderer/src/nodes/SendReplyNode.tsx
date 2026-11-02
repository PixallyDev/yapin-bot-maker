import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { SendReplyData } from '../types'

export const SendReplyNode: React.FC<NodeProps<Node<SendReplyData>>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow()

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
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
        <div className="node-icon action-icon">💬</div>
        <div className="node-title-group">
          <span className="node-badge action-badge">ACTION</span>
          <span className="node-title">Send Reply</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <div className="field-header">
            <label className="node-field-label">Reply Content</label>
            <span className="field-hint">
              Vars: {'{author}'}, {'{content}'}
            </span>
          </div>
          <textarea
            className="node-textarea nodrag nopan"
            rows={3}
            value={data.message ?? 'Hello! Thanks for reaching out.'}
            onChange={handleMessageChange}
            placeholder="Type bot response..."
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
