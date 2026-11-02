import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { CooldownTimerData } from '../types'

export const CooldownTimerNode: React.FC<NodeProps<Node<CooldownTimerData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = Math.max(1, Number(e.target.value) || 1)
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, seconds: val } } : n))
    )
  }

  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as CooldownTimerData['scope']
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, scope: val } } : n))
    )
  }

  return (
    <div
      className="node-card condition-node"
      style={{ borderColor: selected ? '#60a5fa' : undefined }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="flow-handle handle-target"
      />

      <div className="node-header">
        <div className="node-icon condition-icon">⏱️</div>
        <div className="node-title-group">
          <span className="node-badge condition-badge">CONDITION</span>
          <span className="node-title">Cooldown Timer</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Duration (seconds)</label>
          <input
            type="number"
            min={1}
            max={3600}
            className="node-input nodrag nopan"
            value={data.seconds ?? 5}
            onChange={handleSecondsChange}
          />
        </div>

        <div className="node-field">
          <label className="node-field-label">Cooldown Scope</label>
          <select
            className="node-select nodrag nopan"
            value={data.scope ?? 'user'}
            onChange={handleScopeChange}
          >
            <option value="user">Per User</option>
            <option value="channel">Per Channel</option>
            <option value="global">Global (All Users)</option>
          </select>
        </div>
      </div>

      <div className="node-handles-column">
        <div className="handle-row true-row">
          <span className="handle-label text-success">Ready (True)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="flow-handle handle-true"
          />
        </div>
        <div className="handle-row false-row">
          <span className="handle-label text-muted">On Cooldown (False)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="flow-handle handle-false"
          />
        </div>
      </div>
    </div>
  )
}
