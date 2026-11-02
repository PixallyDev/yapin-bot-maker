import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { SetVariableData } from '../types'
import { VariablePills } from '../components/VariablePills'

export const SetVariableNode: React.FC<NodeProps<Node<SetVariableData>>> = ({
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

  const handleOperationChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as SetVariableData['operation']
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, operation: val } } : n))
    )
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, value: val } } : n))
    )
  }

  const handleInsertPill = (pill: string): void => {
    const current = String(data.value ?? '')
    const updated = current ? `${current} ${pill}` : pill
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, value: updated } } : n))
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
        <div className="node-icon variable-icon">💾</div>
        <div className="node-title-group">
          <span className="node-badge variable-badge">VARIABLE</span>
          <span className="node-title">Set Variable</span>
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
            placeholder="e.g. score or user_count"
          />
        </div>

        <div className="node-field">
          <label className="node-field-label">Operation</label>
          <select
            className="node-select nodrag nopan"
            value={data.operation ?? 'set'}
            onChange={handleOperationChange}
          >
            <option value="set">Set to Value</option>
            <option value="increment">Increment (+)</option>
            <option value="decrement">Decrement (-)</option>
          </select>
        </div>

        <div className="node-field">
          <div className="field-header">
            <label className="node-field-label">Value</label>
          </div>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.value ?? '1'}
            onChange={handleValueChange}
            placeholder="Value or number"
          />
          <VariablePills onInsert={handleInsertPill} />
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
