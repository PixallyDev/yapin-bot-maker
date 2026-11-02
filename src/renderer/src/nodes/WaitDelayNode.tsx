import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { WaitDelayData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const WaitDelayNode: React.FC<NodeProps<Node<WaitDelayData>>> = ({ id, data, selected }) => {
  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="DELAY"
      title={data.label || 'Wait'}
      icon="Hourglass"
      summary={<span className="summary-keyword">{data.seconds ?? 1}s delay</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
