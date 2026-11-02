import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { CheckUserRoleData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const CheckUserRoleNode: React.FC<NodeProps<Node<CheckUserRoleData>>> = ({
  id,
  data,
  selected
}) => {
  const summary = `${data.checkType ?? 'username'} ${data.operator ?? 'equals'} "${data.value ?? ''}"`

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="condition"
      categoryLabel="ROLE CHECK"
      title={data.label || 'Check User'}
      icon="Shield"
      summary={<span className="summary-keyword">{summary}</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[
        { id: 'true', label: 'True', variant: 'true' },
        { id: 'false', label: 'False', variant: 'false' }
      ]}
      customColor={data.customColor as string | undefined}
    />
  )
}
