import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { RandomReplyData } from '../types'
import { VariablePills } from '../components/VariablePills'

export const RandomReplyNode: React.FC<NodeProps<Node<RandomReplyData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleRepliesChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, replies: val } } : n))
    )
  }

  const handleInsertPill = (pill: string): void => {
    const current = String(data.replies ?? '')
    const updated = current ? `${current} ${pill}` : pill
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, replies: updated } } : n))
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
        <div className="node-icon action-icon">🎲</div>
        <div className="node-title-group">
          <span className="node-badge action-badge">ACTION</span>
          <span className="node-title">Random Reply</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <div className="field-header">
            <label className="node-field-label">Options (1 per line)</label>
            <span className="field-hint">Randomly picks 1</span>
          </div>
          <textarea
            className="node-textarea nodrag nopan"
            rows={4}
            value={
              data.replies ??
              'Yes, absolutely!\nNo way.\nAsk again later, {user}.\nSigns point to yes!'
            }
            onChange={handleRepliesChange}
            placeholder="Enter reply options (one per line)..."
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
