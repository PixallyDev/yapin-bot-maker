import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Icon } from '../components/Icon'

export interface NodeHandleDef {
  id: string
  label?: string
  variant?: 'default' | 'true' | 'false'
  topPercent?: number
}

interface CompactNodeCardProps {
  id: string
  selected?: boolean
  category: 'trigger' | 'condition' | 'variable' | 'action'
  categoryLabel: string
  title: string
  icon: string
  summary: React.ReactNode
  inputs?: NodeHandleDef[]
  outputs?: NodeHandleDef[]
  onOpenEditor?: () => void
  customColor?: string
}

export const CompactNodeCard: React.FC<CompactNodeCardProps> = ({
  id,
  selected,
  category,
  categoryLabel,
  title,
  icon,
  summary,
  inputs = [],
  outputs = [],
  onOpenEditor,
  customColor
}) => {
  const handleOpen = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (onOpenEditor) {
      onOpenEditor()
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('yapin:open-node-editor', { detail: { nodeId: id } }))
    }
  }

  const cardStyle: React.CSSProperties = customColor
    ? {
        borderColor: customColor,
        boxShadow: selected
          ? `0 0 0 2px ${customColor}, 0 8px 24px rgba(0, 0, 0, 0.45)`
          : `0 0 12px ${customColor}33, 0 4px 16px rgba(0, 0, 0, 0.35)`
      }
    : {}

  return (
    <div
      className={`compact-node-card node-${category} ${selected ? 'node-selected' : ''}`}
      style={cardStyle}
      onDoubleClick={handleOpen}
      title="Double-click to open rich editor"
    >
      {/* Category Colored Top Bar & Header */}
      <div
        className="compact-header"
        style={customColor ? { borderBottomColor: `${customColor}44` } : undefined}
      >
        <div
          className="compact-icon-box"
          style={
            customColor
              ? {
                  backgroundColor: `${customColor}22`,
                  borderColor: `${customColor}55`,
                  color: customColor
                }
              : undefined
          }
        >
          <Icon name={icon} size={15} />
        </div>
        <div className="compact-title-group">
          <span
            className="compact-badge"
            style={
              customColor
                ? {
                    color: customColor,
                    borderColor: `${customColor}44`,
                    backgroundColor: `${customColor}18`
                  }
                : undefined
            }
          >
            {categoryLabel}
          </span>
          <span className="compact-title" title={title}>
            {title}
          </span>
        </div>
        <button
          type="button"
          className="compact-edit-btn nodrag nopan"
          onClick={handleOpen}
          title="Edit node properties"
          aria-label="Edit node"
        >
          <Icon name="Settings" size={13} />
        </button>
      </div>

      {/* Summary Badge Preview */}
      <div className="compact-body">
        <div className="compact-summary" title={typeof summary === 'string' ? summary : undefined}>
          {summary}
        </div>
      </div>

      {/* Input Handles (Left) */}
      {inputs.map((h, idx) => {
        const top =
          h.topPercent !== undefined
            ? `${h.topPercent}%`
            : inputs.length === 1
              ? '50%'
              : `${((idx + 1) / (inputs.length + 1)) * 100}%`
        return (
          <div key={h.id} className="compact-handle-wrapper handle-input-wrapper" style={{ top }}>
            <Handle
              type="target"
              position={Position.Left}
              id={h.id}
              className="flow-handle handle-in"
            />
            {h.label && <span className="handle-label handle-label-in">{h.label}</span>}
          </div>
        )
      })}

      {/* Output Handles (Right) */}
      {outputs.length > 1 ? (
        /* Multi-output: vertically stacked rows inside card body (makes the node taller & cleaner) */
        <div className="compact-outputs-stack">
          {outputs.map((h) => {
            const variantClass =
              h.variant === 'true'
                ? 'handle-condition-true'
                : h.variant === 'false'
                  ? 'handle-condition-false'
                  : `handle-${category}`

            return (
              <div key={h.id} className={`compact-output-row row-${h.variant ?? 'default'}`}>
                <div className="output-row-content">
                  <span className={`output-badge-pill pill-${h.variant ?? 'default'}`}>
                    {h.variant === 'true' && <span className="output-dot dot-true" />}
                    {h.variant === 'false' && <span className="output-dot dot-false" />}
                    {h.label || 'Out'}
                  </span>
                </div>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={h.id}
                  className={`flow-handle handle-out ${variantClass}`}
                />
              </div>
            )
          })}
        </div>
      ) : outputs.length === 1 ? (
        /* Single output handle: centered vertically on the right edge */
        <div className="compact-handle-wrapper handle-output-wrapper" style={{ top: '50%' }}>
          {outputs[0].label && outputs[0].label !== 'Trigger' && outputs[0].label !== 'Next' && (
            <span className="handle-label handle-label-out">{outputs[0].label}</span>
          )}
          <Handle
            type="source"
            position={Position.Right}
            id={outputs[0].id}
            className={`flow-handle handle-out handle-${category}`}
          />
        </div>
      ) : null}
    </div>
  )
}
