import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { LogConsoleData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'

export const LogConsoleNode: React.FC<NodeProps<Node<LogConsoleData>>> = ({
  id,
  data,
  selected
}) => {
  const msg = String(data.message ?? '')
  const preview = msg.length > 24 ? `${msg.slice(0, 24)}...` : msg

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="CONSOLE"
      title={data.label || 'Log Console'}
      icon="FileText"
      summary={
        <span>
          <span className={`compact-level-tag level-${data.level ?? 'info'}`}>
            {(data.level ?? 'info').toUpperCase()}
          </span>
          <span className="summary-desc">&quot;{preview}&quot;</span>
        </span>
      }
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={[{ id: 'out', label: 'Next' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
