import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { OnCommandData } from '../types'
import { CompactNodeCard } from './CompactNodeCard'
import { useProjectPrefix, normalizeCommandName } from '../projectStore'

export const OnCommandNode: React.FC<NodeProps<Node<OnCommandData>>> = ({ id, data, selected }) => {
  const projectPrefix = useProjectPrefix()
  const cleanKeyword = normalizeCommandName(data.commandName, projectPrefix) || 'ping'
  const cmd = `${projectPrefix}${cleanKeyword}`
  const summary = (
    <span>
      <span className="summary-code">{cmd}</span>
      {data.description ? <span className="summary-desc"> {data.description}</span> : null}
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
      categoryLabel="COMMAND"
      title={data.label || 'On Command'}
      icon="Keyboard"
      summary={summary}
      outputs={[{ id: 'out', label: 'Trigger' }]}
      customColor={data.customColor as string | undefined}
    />
  )
}
