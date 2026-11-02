import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CatalogEntry } from '../data/nodeCatalog'
import { CatalogBrowser } from './CatalogBrowser'
export function AddNodeMenu({
  x,
  y,
  onSelect,
  onClose
}: {
  x: number
  y: number
  onSelect: (entry: CatalogEntry) => void
  onClose: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })
  useLayoutEffect(() => {
    const reposition = (): void => {
      const rect = ref.current?.getBoundingClientRect()
      if (rect)
        setPosition({
          left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
          top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))
        })
    }
    reposition()
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [x, y])
  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    const outside = (e: PointerEvent): void => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', key, true)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', key, true)
      document.removeEventListener('pointerdown', outside)
    }
  }, [onClose])
  return (
    <div
      ref={ref}
      className="add-node-menu nodrag nopan"
      role="dialog"
      aria-label="Add node"
      style={position}
      onContextMenu={(e) => e.preventDefault()}
    >
      <header>
        <strong>Add Node</strong>
        <button type="button" onClick={onClose} aria-label="Close add node menu">
          ×
        </button>
      </header>
      <CatalogBrowser
        autoFocus
        onSelect={(entry) => {
          onSelect(entry)
          onClose()
        }}
      />
    </div>
  )
}
