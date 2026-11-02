import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { WaitDelayData } from '../types'

export const WaitDelayNode: React.FC<NodeProps<Node<WaitDelayData>>> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow()

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = Math.max(1, Math.min(30, Number(e.target.value) || 1))
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, seconds: val } } : n))
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
        <div className="node-icon action-icon">⏳</div>
        <div className="node-title-group">
          <span className="node-badge action-badge">ACTION</span>
          <span className="node-title">Wait / Delay</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Delay (seconds)</label>
          <input
            type="number"
            min={1}
            max={30}
            className="node-input nodrag nopan"
            value={data.seconds ?? 2}
            onChange={handleSecondsChange}
          />
          <span className="field-hint">Pauses before next connected action (1–30s)</span>
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
