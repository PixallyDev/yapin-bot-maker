import type { NodeProps, Node } from '@xyflow/react'
import { CATALOG_BY_TYPE, catalogOutputs } from '../data/nodeCatalog'
import { CompactNodeCard } from './CompactNodeCard'
export function CatalogNode({
  id,
  type,
  data,
  selected
}: NodeProps<Node<Record<string, unknown>>>): React.JSX.Element | null {
  const entry = CATALOG_BY_TYPE.get(type)
  if (!entry) return null
  const summary = entry.summaryTemplate.replace(/\{([^}]+)\}/g, (_, key: string) =>
    String(data[key] ?? '')
  )
  return (
    <CompactNodeCard
      id={id}
      selected={selected}
      category={
        !entry.inputs.length
          ? 'trigger'
          : entry.outputs.includes('true')
            ? 'condition'
            : entry.category === 'variables'
              ? 'variable'
              : 'action'
      }
      categoryLabel={entry.category.toUpperCase()}
      title={String(data.label ?? entry.title)}
      icon={entry.icon}
      customColor={String(data.customColor ?? entry.accentColor)}
      summary={summary}
      inputs={entry.inputs.map((id) => ({ id }))}
      outputs={catalogOutputs(entry, data).map((id) => ({
        id,
        label: id,
        variant: ['true', 'success', 'each'].includes(id)
          ? 'true'
          : ['false', 'error'].includes(id)
            ? 'false'
            : 'default'
      }))}
    />
  )
}
