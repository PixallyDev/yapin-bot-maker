import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { SendRichMessageData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const SendRichMessageNode: React.FC<NodeProps<Node<SendRichMessageData>>> = ({
  id,
  data,
  selected
}) => {
  const text = data.title || data.description || 'Rich Card'
  const preview = text.length > 26 ? `${text.slice(0, 26)}...` : text

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="CARD"
      title={data.label || 'Send Rich Card'}
      icon="Layers"
      summary={
        <span>
          <span
            className="compact-color-dot"
            style={{ backgroundColor: data.color || '#3b82f6' }}
          />
          <span className="summary-desc">&quot;{preview}&quot;</span>
        </span>
      }
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
