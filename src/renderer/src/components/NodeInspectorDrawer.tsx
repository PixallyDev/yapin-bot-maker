import React from 'react'
import { ToggleSwitch } from './ToggleSwitch'
import { BotNode, CustomNodeData } from '../types'
import { VariablePills } from './VariablePills'
import { Icon } from './Icon'
import { useProjectPrefix, normalizeCommandName } from '../projectStore'

interface NodeInspectorDrawerProps {
  selectedNode: BotNode | null
  onClose: () => void
  onUpdateData: (nodeId: string, patch: Partial<CustomNodeData>) => void
  onDuplicateNode: (node: BotNode) => void
  onDeleteNode: (nodeId: string) => void
  onOpenFullEditor?: (node: BotNode) => void
}

export const NodeInspectorDrawer: React.FC<NodeInspectorDrawerProps> = ({
  selectedNode,
  onClose,
  onUpdateData,
  onDuplicateNode,
  onDeleteNode,
  onOpenFullEditor
}) => {
  const prefix = useProjectPrefix()
  if (!selectedNode) return null

  const { id, type, data } = selectedNode

  const update = (patch: Record<string, unknown>): void => {
    onUpdateData(id, patch as Partial<CustomNodeData>)
  }

  const handleInsertPill = (field: string, token: string): void => {
    const current = String(data[field] ?? '')
    const updated = current ? `${current} ${token}` : token
    update({ [field]: updated })
  }

  const getCategoryInfo = (): { label: string; colorClass: string; icon: string } => {
    if (type === 'onMessage' || type === 'onCommand') {
      return { label: 'TRIGGER', colorClass: 'badge-trigger', icon: 'Zap' }
    }
    if (type === 'textCondition' || type === 'checkUserRole' || type === 'cooldownTimer') {
      return { label: 'CONDITION', colorClass: 'badge-condition', icon: 'Search' }
    }
    if (type === 'setVariable' || type === 'getVariable') {
      return { label: 'VARIABLE', colorClass: 'badge-variable', icon: 'Save' }
    }
    return { label: 'ACTION', colorClass: 'badge-action', icon: 'Settings' }
  }

  const category = getCategoryInfo()

  return (
    <aside className="node-inspector-drawer nodrag nopan">
      <div className="inspector-header">
        <div className="inspector-title-group">
          <span className="inspector-icon">
            <Icon name={category.icon} />
          </span>
          <div>
            <div className="inspector-badge-row">
              <span className={`inspector-badge ${category.colorClass}`}>{category.label}</span>
              <span className="inspector-id">ID: {id}</span>
            </div>
            <h3 className="inspector-title">{String(data.label || type)}</h3>
          </div>
        </div>
        <div className="inspector-header-actions">
          {onOpenFullEditor && (
            <button
              type="button"
              className="inspector-expand-btn"
              onClick={() => onOpenFullEditor(selectedNode)}
              title="Open Rich Node Editor Modal"
            >
              <Icon name="Maximize2" size={14} />
            </button>
          )}
          <button
            type="button"
            className="inspector-close-btn"
            onClick={onClose}
            title="Close Inspector"
          >
            <Icon name="X" />
          </button>
        </div>
      </div>

      <div className="inspector-body">
        {/* Node Label */}
        <div className="inspector-section">
          <label className="inspector-label">Display Label</label>
          <input
            type="text"
            className="inspector-input"
            value={String(data.label ?? '')}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Node title"
          />
        </div>

        {/* Node-Specific Configurations */}
        {type === 'onCommand' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Command Name</label>
              <div className="command-input-wrapper">
                <span className="command-prefix">{prefix}</span>
                <input
                  type="text"
                  className="inspector-input"
                  value={String(data.commandName ?? 'ping')}
                  onChange={(e) =>
                    update({
                      commandName: normalizeCommandName(e.target.value, prefix)
                    })
                  }
                  placeholder="command_name"
                />
              </div>
              <span className="field-hint">
                Triggered via {prefix}
                {normalizeCommandName(data.commandName ?? 'ping', prefix) || 'ping'}
              </span>
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Description</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.description ?? '')}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Brief command description"
                maxLength={100}
              />
            </div>
          </>
        )}

        {type === 'onMessage' && (
          <div className="inspector-section">
            <label className="inspector-checkbox-label">
              <ToggleSwitch
                checked={data.ignoreBots !== false}
                onChange={(v) => update({ ignoreBots: v })}
                label="Ignore bots"
              />
              <span>Ignore messages from bots and webhooks</span>
            </label>
          </div>
        )}

        {type === 'textCondition' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Operator</label>
              <select
                className="inspector-select"
                value={String(data.operator ?? 'contains')}
                onChange={(e) => update({ operator: e.target.value })}
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals Exactly</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
              </select>
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Matching Text</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.value ?? '')}
                onChange={(e) => update({ value: e.target.value })}
                placeholder="Target phrase or word"
              />
              <VariablePills onInsert={(token) => handleInsertPill('value', token)} />
            </div>
            <div className="inspector-section">
              <label className="inspector-checkbox-label">
                <ToggleSwitch
                  checked={Boolean(data.caseSensitive)}
                  onChange={(v) => update({ caseSensitive: v })}
                  label="Case sensitive"
                />
                <span>Case sensitive comparison</span>
              </label>
            </div>
          </>
        )}

        {type === 'checkUserRole' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Check Property</label>
              <select
                className="inspector-select"
                value={String(data.checkType ?? 'username')}
                onChange={(e) => update({ checkType: e.target.value })}
              >
                <option value="username">Author Username</option>
                <option value="user_id">Author User ID</option>
                <option value="is_bot">Is Bot Account</option>
              </select>
            </div>
            {data.checkType !== 'is_bot' && (
              <>
                <div className="inspector-section">
                  <label className="inspector-label">Comparison</label>
                  <select
                    className="inspector-select"
                    value={String(data.operator ?? 'equals')}
                    onChange={(e) => update({ operator: e.target.value })}
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Does Not Equal</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>
                <div className="inspector-section">
                  <label className="inspector-label">Target Value</label>
                  <input
                    type="text"
                    className="inspector-input"
                    value={String(data.value ?? '')}
                    onChange={(e) => update({ value: e.target.value })}
                    placeholder="e.g. admin or 123456"
                  />
                </div>
              </>
            )}
          </>
        )}

        {type === 'cooldownTimer' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Cooldown Duration (seconds)</label>
              <input
                type="number"
                min={1}
                max={3600}
                className="inspector-input"
                value={Number(data.seconds ?? 5)}
                onChange={(e) => update({ seconds: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Cooldown Scope</label>
              <select
                className="inspector-select"
                value={String(data.scope ?? 'user')}
                onChange={(e) => update({ scope: e.target.value })}
              >
                <option value="user">Per User</option>
                <option value="channel">Per Channel</option>
                <option value="global">Global (All Users)</option>
              </select>
            </div>
          </>
        )}

        {type === 'setVariable' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Variable Name</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.varName ?? 'score')}
                onChange={(e) => update({ varName: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="e.g. user_score"
              />
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Operation</label>
              <select
                className="inspector-select"
                value={String(data.operation ?? 'set')}
                onChange={(e) => update({ operation: e.target.value })}
              >
                <option value="set">Set to Value</option>
                <option value="increment">Increment (+)</option>
                <option value="decrement">Decrement (-)</option>
              </select>
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Value</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.value ?? '1')}
                onChange={(e) => update({ value: e.target.value })}
                placeholder="Value or number"
              />
              <VariablePills onInsert={(token) => handleInsertPill('value', token)} />
            </div>
          </>
        )}

        {type === 'getVariable' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Variable Name</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.varName ?? 'score')}
                onChange={(e) => update({ varName: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="e.g. user_score"
              />
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Default / Fallback</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.fallback ?? '0')}
                onChange={(e) => update({ fallback: e.target.value })}
                placeholder="Default if variable not set"
              />
            </div>
          </>
        )}

        {type === 'sendReply' && (
          <div className="inspector-section">
            <label className="inspector-label">Reply Message</label>
            <textarea
              className="inspector-textarea"
              rows={4}
              value={String(data.message ?? '')}
              onChange={(e) => update({ message: e.target.value })}
              placeholder="Response content..."
            />
            <VariablePills onInsert={(token) => handleInsertPill('message', token)} />
          </div>
        )}

        {type === 'sendRichMessage' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Card Title</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.title ?? '')}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Embed card title"
              />
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Border Accent Color</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-picker-input"
                  value={String(data.color ?? '#3b82f6')}
                  onChange={(e) => update({ color: e.target.value })}
                />
                <input
                  type="text"
                  className="inspector-input color-text-input"
                  value={String(data.color ?? '#3b82f6')}
                  onChange={(e) => update({ color: e.target.value })}
                />
              </div>
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Card Description</label>
              <textarea
                className="inspector-textarea"
                rows={4}
                value={String(data.description ?? '')}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Main card body markdown..."
              />
              <VariablePills onInsert={(token) => handleInsertPill('description', token)} />
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Footer Note</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.footer ?? '')}
                onChange={(e) => update({ footer: e.target.value })}
                placeholder="Optional small footer text"
              />
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Image URL</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.imageUrl ?? '')}
                onChange={(e) => update({ imageUrl: e.target.value })}
                placeholder="https://example.com/banner.png"
              />
            </div>
          </>
        )}

        {type === 'randomReply' && (
          <div className="inspector-section">
            <div className="field-header">
              <label className="inspector-label">Reply Choices (1 per line)</label>
              <span className="field-hint">Random selection</span>
            </div>
            <textarea
              className="inspector-textarea"
              rows={5}
              value={String(data.replies ?? '')}
              onChange={(e) => update({ replies: e.target.value })}
              placeholder="Choice 1&#10;Choice 2&#10;Choice 3"
            />
            <VariablePills onInsert={(token) => handleInsertPill('replies', token)} />
          </div>
        )}

        {type === 'waitDelay' && (
          <div className="inspector-section">
            <label className="inspector-label">Delay Duration (seconds)</label>
            <input
              type="number"
              min={1}
              max={30}
              className="inspector-input"
              value={Number(data.seconds ?? 2)}
              onChange={(e) =>
                update({ seconds: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })
              }
            />
            <span className="field-hint">Pauses branch execution for 1–30 seconds</span>
          </div>
        )}

        {type === 'moderateMessage' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Moderation Action</label>
              <select
                className="inspector-select"
                value={String(data.actionType ?? 'delete')}
                onChange={(e) => update({ actionType: e.target.value })}
              >
                <option value="delete">Delete Message</option>
                <option value="timeout">Timeout Author (minutes)</option>
                <option value="kick">Kick Author</option>
              </select>
            </div>
            {data.actionType === 'timeout' && (
              <div className="inspector-section">
                <label className="inspector-label">Timeout Minutes</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  className="inspector-input"
                  value={Number(data.minutes ?? 10)}
                  onChange={(e) => update({ minutes: Math.max(1, Number(e.target.value) || 1) })}
                />
              </div>
            )}
            {data.actionType !== 'delete' && (
              <div className="inspector-section">
                <label className="inspector-label">Audit Log Reason</label>
                <input
                  type="text"
                  className="inspector-input"
                  value={String(data.reason ?? '')}
                  onChange={(e) => update({ reason: e.target.value })}
                  placeholder="Reason for moderation"
                />
              </div>
            )}
          </>
        )}

        {type === 'logConsole' && (
          <>
            <div className="inspector-section">
              <label className="inspector-label">Log Level</label>
              <select
                className="inspector-select"
                value={String(data.level ?? 'info')}
                onChange={(e) => update({ level: e.target.value })}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="inspector-section">
              <label className="inspector-label">Console Message</label>
              <input
                type="text"
                className="inspector-input"
                value={String(data.message ?? '')}
                onChange={(e) => update({ message: e.target.value })}
                placeholder="Log message..."
              />
              <VariablePills onInsert={(token) => handleInsertPill('message', token)} />
            </div>
          </>
        )}
      </div>

      <div className="inspector-footer">
        <button
          type="button"
          className="inspector-btn btn-duplicate"
          onClick={() => onDuplicateNode(selectedNode)}
        >
          <span>
            <Icon name="Copy" />
          </span>{' '}
          Duplicate
        </button>
        <button type="button" className="inspector-btn btn-delete" onClick={() => onDeleteNode(id)}>
          <span>
            <Icon name="Trash2" />
          </span>{' '}
          Delete
        </button>
      </div>
    </aside>
  )
}
