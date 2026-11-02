import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { GetVariableData } from '../types'

export const GetVariableNode: React.FC<NodeProps<Node<GetVariableData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleVarNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, varName: val } } : n))
    )
  }

  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, fallback: val } } : n))
    )
  }

  return (
    <div className={`node-card variable-node ${selected ? 'node-selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="flow-handle handle-target"
      />

      <div className="node-header">
        <div className="node-icon variable-icon">📥</div>
        <div className="node-title-group">
          <span className="node-badge variable-badge">VARIABLE</span>
          <span className="node-title">Get Variable</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Variable Name</label>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.varName ?? 'score'}
            onChange={handleVarNameChange}
            placeholder="e.g. score"
          />
        </div>

        <div className="node-field">
          <label className="node-field-label">Default / Fallback</label>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.fallback ?? '0'}
            onChange={handleFallbackChange}
            placeholder="Fallback if unset"
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="flow-handle handle-variable"
      />
    </div>
  )
}
