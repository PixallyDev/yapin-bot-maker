import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { TextConditionData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const TextConditionNode: React.FC<NodeProps<Node<TextConditionData>>> = ({
  id,
  data,
  selected
}) => {
  const compType = data.comparisonType ?? 'text'
  let summaryText: string

  if (compType === 'number') {
    summaryText = `${data.leftValue || '{args}'} ${data.operator ?? '=='} ${data.value ?? '0'}`
  } else if (compType === 'user_role') {
    summaryText = `${data.checkType ?? 'username'} ${data.operator ?? '=='} "${data.value ?? ''}"`
  } else if (compType === 'variable') {
    summaryText = `{var:${data.varName ?? 'name'}} ${data.operator ?? '=='} "${data.value ?? ''}"`
  } else {
    summaryText = `${data.operator ?? 'contains'} "${data.value ?? ''}"`
  }

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="condition"
      categoryLabel="CONDITION"
      title={data.label || 'Condition'}
      icon="Search"
      summary={<span className="summary-keyword">{summaryText}</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[
        { id: 'true', label: 'True', variant: 'true' },
        { id: 'false', label: 'False', variant: 'false' }
      ]}
      customColor={data.customColor as string | undefined}
    />
  )
}
