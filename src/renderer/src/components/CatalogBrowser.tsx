import { useState } from 'react'
import { NODE_CATEGORIES, searchCatalog, type CatalogEntry } from '../data/nodeCatalog'
import { Icon } from './Icon'
export function CatalogBrowser({
  onSelect,
  autoFocus = false
}: {
  onSelect: (entry: CatalogEntry) => void
  autoFocus?: boolean
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const matches = searchCatalog(query)
  return (
    <div className="catalog-browser">
      <input
        autoFocus={autoFocus}
        aria-label="Search nodes"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="catalog-scroll">
        {NODE_CATEGORIES.map((category) => {
          const items = matches.filter((entry) => entry.category === category.id)
          if (!items.length) return null
          const open = !!query.trim() || expanded.includes(category.id)
          return (
            <section key={category.id}>
              <button
                className="catalog-category"
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setExpanded((prev) =>
                    prev.includes(category.id)
                      ? prev.filter((id) => id !== category.id)
                      : [...prev, category.id]
                  )
                }
              >
                <span style={{ color: category.color }}>
                  <Icon name={category.icon} size={16} />
                </span>
                <strong>{category.title}</strong>
                <span>{items.length}</span>
                <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={14} />
              </button>
              {open &&
                items.map((entry) => (
                  <button
                    type="button"
                    className="catalog-choice"
                    key={entry.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/yapin-node', JSON.stringify(entry))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => onSelect(entry)}
                    title={entry.description}
                  >
                    <span style={{ color: entry.accentColor }}>
                      <Icon name={entry.icon} size={18} />
                    </span>
                    <span>
                      <strong>{entry.title}</strong>
                      <small>{entry.description}</small>
                    </span>
                  </button>
                ))}
            </section>
          )
        })}
        {!matches.length && <p className="catalog-empty">No matching nodes.</p>}
      </div>
    </div>
  )
}
