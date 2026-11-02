import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { SendReplyData } from '../types'
import { VariablePills } from '../components/VariablePills'

export const SendReplyNode: React.FC<NodeProps<Node<SendReplyData>>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow()

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: val } } : n))
    )
  }

  const handleInsertPill = (pill: string): void => {
    const current = String(data.message ?? '')
    const updated = current ? `${current} ${pill}` : pill
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: updated } } : n))
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
          </div>
          <textarea
            className="node-textarea nodrag nopan"
            rows={3}
            value={data.message ?? 'Hello! Thanks for reaching out.'}
            onChange={handleMessageChange}
            placeholder="Type bot response..."
          />
          <VariablePills onInsert={handleInsertPill} />
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
