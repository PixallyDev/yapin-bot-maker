import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { TextConditionData } from '../types'

export const TextConditionNode: React.FC<NodeProps<Node<TextConditionData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as TextConditionData['operator']
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, operator: val } } : n))
    )
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, value: val } } : n))
    )
  }

  const handleCaseChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, caseSensitive: checked } } : n))
    )
  }

  return (
    <div className={`node-card condition-node ${selected ? 'node-selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="flow-handle handle-target"
      />

      <div className="node-header">
        <div className="node-icon condition-icon">🔍</div>
        <div className="node-title-group">
          <span className="node-badge condition-badge">CONDITION</span>
          <span className="node-title">If Message Contains</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Comparison</label>
          <select
            className="node-select nodrag nopan"
            value={data.operator ?? 'contains'}
            onChange={handleOperatorChange}
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="starts_with">Starts With</option>
            <option value="ends_with">Ends With</option>
          </select>
        </div>

        <div className="node-field">
          <label className="node-field-label">Target Text</label>
          <input
            type="text"
            className="node-input nodrag nopan"
            value={data.value ?? ''}
            onChange={handleValueChange}
            placeholder="Text to match..."
          />
        </div>

        <label className="node-checkbox-label nodrag">
          <input
            type="checkbox"
            checked={Boolean(data.caseSensitive)}
            onChange={handleCaseChange}
            className="nodrag"
          />
          <span>Case sensitive</span>
        </label>
      </div>

      <div className="node-handles-column">
        <div className="handle-row true-row">
          <span className="handle-label text-success">Match (True)</span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="flow-handle handle-true"
          />
        </div>
        <div className="handle-row false-row">
          <span className="handle-label text-muted">No Match (False)</span>
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
