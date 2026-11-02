import type { PaletteItem } from '../types'
import { CatalogBrowser } from './CatalogBrowser'
export function NodePalette({
  onAddNode
}: {
  onAddNode: (item: PaletteItem) => void
}): React.JSX.Element {
  return (
    <aside className="studio-palette">
      <div className="palette-header">
        <h3>Node Library</h3>
        <p>Click or drag onto the canvas</p>
      </div>
      <CatalogBrowser onSelect={onAddNode} />
    </aside>
  )
}
