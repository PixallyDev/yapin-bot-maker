import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { SendReplyData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const SendReplyNode: React.FC<NodeProps<Node<SendReplyData>>> = ({ id, data, selected }) => {
  const msg = String(data.message ?? 'Hello!')
  const preview = msg.length > 28 ? `${msg.slice(0, 28)}...` : msg

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="REPLY"
      title={data.label || 'Send Reply'}
      icon="MessageSquare"
      summary={<span className="summary-desc">&quot;{preview}&quot;</span>}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
