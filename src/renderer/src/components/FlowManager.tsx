import { useState } from 'react'
import { Flow, Folder } from '../flows'
import { Icon } from './Icon'
interface Props {
  flows: Flow[]
  folders: Folder[]
  active: string
  select: (id: string) => void
  change: (flows: Flow[], folders: Folder[]) => void
  create: () => void
}
export function FlowManager({
  flows,
  folders,
  active,
  select,
  change,
  create
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('')
  const [menu, setMenu] = useState<{ id: string; folder: boolean; x: number; y: number } | null>(
    null
  )
  const patch = (id: string, p: Partial<Flow>): void =>
    change(
      flows.map((f) => (f.id === id ? { ...f, ...p } : f)),
      folders
    )
  const selected = menu?.folder
    ? folders.find((f) => f.id === menu.id)
    : flows.find((f) => f.id === menu?.id)
  const context = (e: React.MouseEvent, id: string, folder = false): void => {
    e.preventDefault()
    setMenu({
      id,
      folder,
      x: Math.min(e.clientX, window.innerWidth - 250),
      y: Math.min(e.clientY, window.innerHeight - 430)
    })
  }
  const visible = (f: Flow): boolean => f.name.toLowerCase().includes(search.toLowerCase())
  const row = (f: Flow): React.JSX.Element => (
    <button
      key={f.id}
      onClick={() => {
        patch(f.id, { isOpen: true })
        select(f.id)
        setOpen(false)
      }}
      onContextMenu={(e) => context(e, f.id)}
      style={{ borderLeft: `4px solid ${f.color}` }}
    >
      {f.name}
      {f.isDisabled ? ' (disabled)' : ''}
    </button>
  )
  return (
    <div className="flow-bar">
      <button onClick={() => setOpen(!open)}>
        Flows <Icon name="ChevronDown" />
      </button>
      {flows
        .filter((f) => f.isOpen)
        .map((f) => (
          <button
            key={f.id}
            aria-pressed={active === f.id}
            onClick={() => select(f.id)}
            onContextMenu={(e) => context(e, f.id)}
            style={{ borderTop: `3px solid ${f.color}`, opacity: f.isDisabled ? 0.5 : 1 }}
          >
            {f.name}
          </button>
        ))}
      <button onClick={create} aria-label="New flow">
        +
      </button>
      {open && (
        <div className="flows-popover">
          <input
            placeholder="Search flows"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <h4>Open tabs</h4>
          {flows.filter((f) => f.isOpen && visible(f)).map(row)}
          {folders.map((folder) => (
            <section key={folder.id}>
              <button
                onContextMenu={(e) => context(e, folder.id, true)}
                onClick={() =>
                  change(
                    flows,
                    folders.map((g) => (g.id === folder.id ? { ...g, isOpen: !g.isOpen } : g))
                  )
                }
                style={{ color: folder.color }}
              >
                {folder.isOpen ? <Icon name="ChevronDown" /> : <Icon name="ChevronRight" />}{' '}
                {folder.name}
              </button>
              {folder.isOpen &&
                flows.filter((f) => f.folderId === folder.id && visible(f)).map(row)}
            </section>
          ))}
          <h4>Disabled flows</h4>
          {flows
            .filter(
              (f) =>
                (f.isDisabled || folders.some((g) => g.id === f.folderId && g.isDisabled)) &&
                visible(f)
            )
            .map(row)}
          <h4>Closed flows</h4>
          {flows.filter((f) => !f.isOpen && visible(f)).map(row)}
        </div>
      )}
      {menu && selected && (
        <div className="flow-menu" style={{ left: menu.x, top: menu.y }}>
          <button onClick={() => setMenu(null)}>Dismiss ×</button>
          <label>
            Rename
            <input
              value={selected.name}
              onChange={(e) =>
                menu.folder
                  ? change(
                      flows,
                      folders.map((f) => (f.id === menu.id ? { ...f, name: e.target.value } : f))
                    )
                  : patch(menu.id, { name: e.target.value })
              }
            />
          </label>
          <label>
            Header colour
            <input
              type="color"
              value={selected.color}
              onChange={(e) =>
                menu.folder
                  ? change(
                      flows,
                      folders.map((f) => (f.id === menu.id ? { ...f, color: e.target.value } : f))
                    )
                  : patch(menu.id, { color: e.target.value })
              }
            />
          </label>
          <button
            onClick={() => {
              if (menu.folder)
                change(
                  flows,
                  folders.map((f) => (f.id === menu.id ? { ...f, isOpen: false } : f))
                )
              else patch(menu.id, { isOpen: false })
              setMenu(null)
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              change(
                flows.map((f) => ({
                  ...f,
                  isOpen: menu.folder ? f.folderId === menu.id : f.id === menu.id
                })),
                folders
              )
              setMenu(null)
            }}
          >
            Close others
          </button>
          <button
            onClick={() => {
              if (menu.folder)
                change(
                  flows,
                  folders.map((f) => (f.id === menu.id ? { ...f, isDisabled: !f.isDisabled } : f))
                )
              else patch(menu.id, { isDisabled: !selected.isDisabled })
              setMenu(null)
            }}
          >
            {selected.isDisabled ? 'Enable' : 'Disable'} {menu.folder ? 'folder' : 'flow'}
          </button>
          {!menu.folder && (
            <>
              <button
                onClick={() => {
                  const id = crypto.randomUUID()
                  change(
                    flows.map((f) => (f.id === menu.id ? { ...f, folderId: id } : f)),
                    [
                      ...folders,
                      {
                        id,
                        name: selected.name,
                        color: selected.color,
                        isOpen: true,
                        isDisabled: false
                      }
                    ]
                  )
                  setMenu(null)
                }}
              >
                New folder from tab
              </button>
              <label>
                Move to folder
                <select
                  value={(selected as Flow).folderId ?? ''}
                  onChange={(e) => patch(menu.id, { folderId: e.target.value })}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button
            onClick={() => {
              if (menu.folder)
                change(
                  flows.map((f) => (f.folderId === menu.id ? { ...f, folderId: undefined } : f)),
                  folders.filter((f) => f.id !== menu.id)
                )
              else
                change(
                  flows.filter((f) => f.id !== menu.id),
                  folders
                )
              setMenu(null)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
