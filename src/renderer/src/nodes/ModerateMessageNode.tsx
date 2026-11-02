import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { ModerateMessageData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const ModerateMessageNode: React.FC<NodeProps<Node<ModerateMessageData>>> = ({
  id,
  data,
  selected
}) => {
  const action = String(data.actionType ?? 'delete').toUpperCase()
  const detail = action === 'TIMEOUT' ? ` (${data.minutes ?? 10}m)` : ''

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="MODERATION"
      title={data.label || 'Moderate'}
      icon="Gavel"
      summary={
        <span className="summary-keyword">
          {action}
          {detail}
        </span>
      }
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
