import React from 'react'
import { NodeProps, Node } from '@xyflow/react'
import { JavascriptCodeData } from '../types'
import { CompactNodeCard, NodeHandleDef } from './CompactNodeCard'

export const JavascriptCodeNode: React.FC<NodeProps<Node<JavascriptCodeData>>> = ({
  id,
  data,
  selected
}) => {
  const outputCount = Math.min(5, Math.max(1, Number(data.outputCount ?? 1)))
  const outputs: NodeHandleDef[] =
    outputCount === 1
      ? [{ id: 'out', label: 'Next' }]
      : Array.from({ length: outputCount }, (_, idx) => ({
          id: `out_${idx + 1}`,
          label: `Out ${idx + 1}`
        }))

  const summary = (
    <span>
      <strong>JS</strong> ({outputCount} output{outputCount > 1 ? 's' : ''})
      {data.saveToVariable && data.variableName ? (
        <span className="compact-sub-pill"> &rarr; {'{' + data.variableName + '}'}</span>
      ) : null}
    </span>
  )

  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category="action"
      categoryLabel="CUSTOM JS"
      title={data.label || 'JavaScript Code'}
      icon="Code2"
      summary={summary}
      inputs={[{ id: 'in', label: 'In' }]}
      outputs={outputs}
      customColor={data.customColor as string | undefined}
    />
  )
}
