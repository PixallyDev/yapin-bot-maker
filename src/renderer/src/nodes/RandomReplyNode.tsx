import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { RandomReplyData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const RandomReplyNode: React.FC<NodeProps<Node<RandomReplyData>>> = ({
  id,
  data,
  selected
}) => {
  const count = Array.isArray(data.replies)
    ? data.replies.length
    : String(data.replies ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean).length

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="RANDOM"
      title={data.label || 'Random Reply'}
      icon="Dices"
      summary={<span className="summary-keyword">{count || 1} choices</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
