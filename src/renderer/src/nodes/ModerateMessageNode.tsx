import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { ModerateMessageData } from '../types'

export const ModerateMessageNode: React.FC<NodeProps<Node<ModerateMessageData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as ModerateMessageData['actionType']
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, actionType: val } } : n))
    )
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = Math.max(1, Number(e.target.value) || 1)
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, minutes: val } } : n))
    )
  }

  const handleReasonChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, reason: val } } : n))
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
        <div className="node-icon action-icon">🔨</div>
        <div className="node-title-group">
          <span className="node-badge action-badge">ACTION</span>
          <span className="node-title">Moderate Message</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Action</label>
          <select
            className="node-select nodrag nopan"
            value={data.actionType ?? 'delete'}
            onChange={handleActionChange}
          >
            <option value="delete">Delete Trigger Message</option>
            <option value="timeout">Timeout Author (minutes)</option>
            <option value="kick">Kick Author</option>
          </select>
        </div>

        {data.actionType === 'timeout' && (
          <div className="node-field">
            <label className="node-field-label">Timeout Duration (minutes)</label>
            <input
              type="number"
              min={1}
              max={1440}
              className="node-input nodrag nopan"
              value={data.minutes ?? 10}
              onChange={handleMinutesChange}
            />
          </div>
        )}

        {data.actionType !== 'delete' && (
          <div className="node-field">
            <label className="node-field-label">Reason</label>
            <input
              type="text"
              className="node-input nodrag nopan"
              value={data.reason ?? 'Rule violation'}
              onChange={handleReasonChange}
              placeholder="Audit log reason"
            />
          </div>
        )}
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
