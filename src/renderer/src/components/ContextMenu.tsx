import React, { useState, useEffect, useRef } from 'react'
import { BotNode, BotEdge } from '../types'
import { Icon } from './Icon'

export type ContextMenuTarget = { type: 'node'; node: BotNode } | { type: 'edge'; edge: BotEdge }

export interface ContextMenuProps {
  target: ContextMenuTarget | null
  position: { x: number; y: number } | null
  onClose: () => void
  onEditNode: (node: BotNode) => void
  onRenameNode: (nodeId: string, newLabel: string) => void
  onChangeNodeColor: (nodeId: string, color: string | undefined) => void
  onDuplicateNode: (node: BotNode) => void
  onDeleteNode: (nodeId: string) => void
  onEditLinkLabel: (edgeId: string, newLabel: string) => void
  onChangeLinkColor: (edgeId: string, color: string | undefined) => void
  onDeleteLink: (edgeId: string) => void
}

const COLOR_SWATCHES = [
  { label: 'Default', value: undefined, hex: 'transparent' },
  { label: 'Blue', value: '#3b82f6', hex: '#3b82f6' },
  { label: 'Purple', value: '#a855f7', hex: '#a855f7' },
  { label: 'Cyan', value: '#06b6d4', hex: '#06b6d4' },
  { label: 'Green', value: '#10b981', hex: '#10b981' },
  { label: 'Amber', value: '#f59e0b', hex: '#f59e0b' },
  { label: 'Red', value: '#ef4444', hex: '#ef4444' },
  { label: 'Pink', value: '#ec4899', hex: '#ec4899' },
  { label: 'Slate', value: '#64748b', hex: '#64748b' }
]

const ContextMenuContent: React.FC<
  Omit<ContextMenuProps, 'target' | 'position'> & {
    target: ContextMenuTarget
    position: { x: number; y: number }
  }
> = ({
  target,
  position,
  onClose,
  onEditNode,
  onRenameNode,
  onChangeNodeColor,
  onDuplicateNode,
  onDeleteNode,
  onEditLinkLabel,
  onChangeLinkColor,
  onDeleteLink
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(() =>
    target.type === 'node'
      ? String(target.node.data.label ?? target.node.type)
      : String(target.edge.label ?? '')
  )
  const [isPickingColor, setIsPickingColor] = useState(false)

  // Global click & Escape handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleClickOutside, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [onClose])

  // Clamp within viewport
  const menuWidth = 240
  const menuHeight = isRenaming ? 170 : isPickingColor ? 210 : 250
  const left = Math.max(10, Math.min(position.x, window.innerWidth - menuWidth - 10))
  const top = Math.max(10, Math.min(position.y, window.innerHeight - menuHeight - 10))

  const handleSaveRename = (e: React.FormEvent): void => {
    e.preventDefault()
    if (target.type === 'node') {
      onRenameNode(target.node.id, renameValue.trim() || String(target.node.type))
    } else {
      onEditLinkLabel(target.edge.id, renameValue.trim())
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="canvas-context-menu"
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Target Info Header */}
      <div className="context-menu-header">
        <Icon name={target.type === 'node' ? 'Settings' : 'Share2'} size={14} />
        <span className="context-menu-title">
          {target.type === 'node'
            ? String(target.node.data.label || target.node.type)
            : target.edge.label
              ? `Link: "${target.edge.label}"`
              : 'Connection Link'}
        </span>
      </div>

      {/* RENAME SUB-VIEW */}
      {isRenaming ? (
        <form onSubmit={handleSaveRename} className="context-menu-rename-form">
          <label className="context-menu-form-label">
            {target.type === 'node' ? 'Rename Node' : 'Link Label'}
          </label>
          <input
            type="text"
            className="context-menu-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder={target.type === 'node' ? 'Node name...' : 'Label (e.g. Yes / No)...'}
            autoFocus
          />
          <div className="context-menu-form-actions">
            <button
              type="button"
              className="btn-secondary context-btn-sm"
              onClick={() => setIsRenaming(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary context-btn-sm">
              Save
            </button>
          </div>
        </form>
      ) : isPickingColor ? (
        /* COLOR PICKER SUB-VIEW */
        <div className="context-menu-color-picker">
          <div className="context-menu-color-header">
            <span>Pick Accent Color</span>
            <button
              type="button"
              className="context-menu-back-btn"
              onClick={() => setIsPickingColor(false)}
            >
              <Icon name="ArrowLeft" size={12} /> Back
            </button>
          </div>
          <div className="context-menu-swatches">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.label}
                type="button"
                className="context-swatch-btn"
                title={swatch.label}
                onClick={() => {
                  if (target.type === 'node') {
                    onChangeNodeColor(target.node.id, swatch.value)
                  } else {
                    onChangeLinkColor(target.edge.id, swatch.value)
                  }
                  onClose()
                }}
              >
                <span
                  className={`context-swatch-dot ${swatch.value ? '' : 'swatch-default'}`}
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="context-swatch-name">{swatch.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : target.type === 'node' ? (
        /* NODE CONTEXT ACTIONS */
        <div className="context-menu-items">
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onEditNode(target.node)
              onClose()
            }}
          >
            <Icon name="Maximize2" size={14} />
            <span>Edit Node (Properties)</span>
          </button>
          <button type="button" className="context-menu-item" onClick={() => setIsRenaming(true)}>
            <Icon name="Edit3" size={14} />
            <span>Rename Node</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => setIsPickingColor(true)}
          >
            <Icon name="Palette" size={14} />
            <span>Change Color</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onDuplicateNode(target.node)
              onClose()
            }}
          >
            <Icon name="Copy" size={14} />
            <span>Duplicate</span>
          </button>
          <div className="context-menu-divider" />
          <button
            type="button"
            className="context-menu-item context-menu-danger"
            onClick={() => {
              onDeleteNode(target.node.id)
              onClose()
            }}
          >
            <Icon name="Trash2" size={14} />
            <span>Delete Node</span>
          </button>
        </div>
      ) : (
        /* EDGE (LINK) CONTEXT ACTIONS */
        <div className="context-menu-items">
          <button type="button" className="context-menu-item" onClick={() => setIsRenaming(true)}>
            <Icon name="Tag" size={14} />
            <span>Edit Link Label</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={() => setIsPickingColor(true)}
          >
            <Icon name="Palette" size={14} />
            <span>Change Link Color</span>
          </button>
          <div className="context-menu-divider" />
          <button
            type="button"
            className="context-menu-item context-menu-danger"
            onClick={() => {
              onDeleteLink(target.edge.id)
              onClose()
            }}
          >
            <Icon name="Trash2" size={14} />
            <span>Delete Link</span>
          </button>
        </div>
      )}
    </div>
  )
}

export const ContextMenu: React.FC<ContextMenuProps> = (props) => {
  if (!props.target || !props.position) return null
  return (
    <ContextMenuContent
      key={props.target.type === 'node' ? props.target.node.id : props.target.edge.id}
      {...props}
      target={props.target}
      position={props.position}
    />
  )
}
