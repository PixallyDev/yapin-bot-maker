import React from 'react'
import { Handle, Position, NodeProps, Node, useReactFlow } from '@xyflow/react'
import { CheckUserRoleData } from '../types'

export const CheckUserRoleNode: React.FC<NodeProps<Node<CheckUserRoleData>>> = ({
  id,
  data,
  selected
}) => {
  const { setNodes } = useReactFlow()

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as CheckUserRoleData['checkType']
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, checkType: val } } : n))
    )
  }

  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value as CheckUserRoleData['operator']
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

  return (
    <div className={`node-card condition-node ${selected ? 'node-selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="flow-handle handle-target"
      />

      <div className="node-header">
        <div className="node-icon condition-icon">🛡️</div>
        <div className="node-title-group">
          <span className="node-badge condition-badge">CONDITION</span>
          <span className="node-title">Check User / Role</span>
        </div>
      </div>

      <div className="node-body">
        <div className="node-field">
          <label className="node-field-label">Check Property</label>
          <select
            className="node-select nodrag nopan"
            value={data.checkType ?? 'username'}
            onChange={handleTypeChange}
          >
            <option value="username">Username</option>
            <option value="user_id">User ID</option>
            <option value="is_bot">Is Bot Account</option>
          </select>
        </div>

        {data.checkType !== 'is_bot' && (
          <>
            <div className="node-field">
              <label className="node-field-label">Comparison</label>
              <select
                className="node-select nodrag nopan"
                value={data.operator ?? 'equals'}
                onChange={handleOperatorChange}
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Does Not Equal</option>
                <option value="contains">Contains</option>
              </select>
            </div>

            <div className="node-field">
              <label className="node-field-label">Target Value</label>
              <input
                type="text"
                className="node-input nodrag nopan"
                value={data.value ?? ''}
                onChange={handleValueChange}
                placeholder="e.g. admin or 123456"
              />
            </div>
          </>
        )}
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
