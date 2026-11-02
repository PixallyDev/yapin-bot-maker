import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { GetVariableData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const GetVariableNode: React.FC<NodeProps<Node<GetVariableData>>> = ({
  id,
  data,
  selected
}) => {
  const summary = `Read {var:${data.varName ?? 'var'}}`

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="variable"
      categoryLabel="VARIABLE"
      title={data.label || 'Get Variable'}
      icon="Download"
      summary={<span className="summary-code">{summary}</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
