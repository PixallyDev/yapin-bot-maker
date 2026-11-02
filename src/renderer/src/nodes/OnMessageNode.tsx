import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { OnMessageData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const OnMessageNode: React.FC<NodeProps<Node<OnMessageData>>> = ({ id, data, selected }) => {
  const filterDesc = data.userId
    ? `User: ${data.userId}`
    : data.channelId
      ? `Channel: ${data.channelId}`
      : data.ignoreBots
        ? 'Ignore bots'
        : 'All messages'

  const summary = (
    <span>
      <span className="summary-keyword">{filterDesc}</span>
      {data.saveToVariable && data.variableName ? (
        <span className="compact-sub-pill"> &rarr; {'{' + data.variableName + '}'}</span>
      ) : null}
    </span>
  )

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="trigger"
      categoryLabel="TRIGGER"
      title={data.label || 'On Message'}
      icon="Zap"
      summary={summary}
      outputs={[{ id: 'out', label: 'Trigger' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
