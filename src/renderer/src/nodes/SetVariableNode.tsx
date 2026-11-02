import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { SetVariableData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const SetVariableNode: React.FC<NodeProps<Node<SetVariableData>>> = ({
  id,
  data,
  selected
}) => {
  const op = data.operation ?? 'set'
  const opSymbol = op === 'increment' ? '+=' : op === 'decrement' ? '-=' : '='
  const summary = `${data.varName ?? 'var'} ${opSymbol} ${data.value ?? '1'}`

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="variable"
      categoryLabel="VARIABLE"
      title={data.label || 'Set Variable'}
      icon="Save"
      summary={<span className="summary-code">{summary}</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
