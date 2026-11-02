import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { CooldownTimerData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const CooldownTimerNode: React.FC<NodeProps<Node<CooldownTimerData>>> = ({
  id,
  data,
  selected
}) => {
  const summary = `${data.seconds ?? 5}s (${data.scope ?? 'user'})`

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="condition"
      categoryLabel="COOLDOWN"
      title={data.label || 'Cooldown'}
      icon="Timer"
      summary={<span className="summary-keyword">{summary}</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[
        { id: 'true', label: 'Ready', variant: 'true' },
        { id: 'false', label: 'Wait', variant: 'false' }
      ]}
      customColor={data.customColor as string | undefined}
    />
  )
}
