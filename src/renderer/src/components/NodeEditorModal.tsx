import React, { useState, useMemo } from 'react'
import { BotNode, CustomNodeData } from '../types'
import { Icon } from './Icon'
import { CatalogFields } from './CatalogFields'
import { ToggleSwitch } from './ToggleSwitch'
import { usePreferences } from '../preferencesStore'
import { useProjectPrefix, normalizeCommandName } from '../projectStore'

interface NodeEditorModalProps {
  node: BotNode | null
  isOpen: boolean
  onClose: () => void
  onSave: (nodeId: string, updatedData: CustomNodeData) => void
  onDeleteNode?: (nodeId: string) => void
  onDuplicateNode?: (node: BotNode) => void
}

interface InsertPickerTarget {
  field: string
  label: string
}

const COMMON_EVENT_PROPS = [
  { token: '{user}', label: 'Author Username', desc: 'Username of the message author' },
  { token: '{userId}', label: 'Author User ID', desc: 'Unique snowflake ID of author' },
  { token: '{channelId}', label: 'Channel ID', desc: 'ID of channel where event triggered' },
  { token: '{serverId}', label: 'Server ID', desc: 'ID of the server / guild' },
  {
    token: '{command.args}',
    label: 'Command Arguments',
    desc: 'Text arguments passed after /command'
  },
  { token: '{content}', label: 'Raw Message Content', desc: 'Full text sent by the user' },
  { token: '{args}', label: 'Arguments Alias', desc: 'Shorthand for {command.args}' }
]

export const NodeEditorModal: React.FC<NodeEditorModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  onDeleteNode,
  onDuplicateNode
}) => {
  if (!isOpen || !node) return null
  return (
    <NodeEditorDialog
      key={node.id}
      node={node}
      onClose={onClose}
      onSave={onSave}
      onDeleteNode={onDeleteNode}
      onDuplicateNode={onDuplicateNode}
    />
  )
}

const NodeEditorDialog: React.FC<Omit<NodeEditorModalProps, 'isOpen'> & { node: BotNode }> = ({
  node,
  onClose,
  onSave,
  onDeleteNode,
  onDuplicateNode
}) => {
  const prefix = useProjectPrefix()
  const { prefs } = usePreferences()
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    const initial = { ...node.data }
    if (node.type === 'onCommand' && initial.commandName) {
      initial.commandName = normalizeCommandName(initial.commandName, prefix)
    }
    return initial
  })
  const [pickerTarget, setPickerTarget] = useState<InsertPickerTarget | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [customVarInput, setCustomVarInput] = useState('')
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false)
  const [initialSerializedData] = useState<string>(() => JSON.stringify(node.data))

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== initialSerializedData
  }, [draft, initialSerializedData])

  const setField = (field: string, value: unknown): void => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleRequestClose = (): void => {
    if (isDirty && !prefs.disableConfirmations) {
      setShowUnsavedPrompt(true)
    } else {
      onClose()
    }
  }

  const handleConfirmSave = (): void => {
    const finalData = { ...draft }
    if (node.type === 'onCommand') {
      finalData.commandName =
        normalizeCommandName(finalData.commandName ?? 'ping', prefix) || 'ping'
    }
    onSave(node.id, finalData as CustomNodeData)
    setShowUnsavedPrompt(false)
    onClose()
  }

  const handleConfirmDiscard = (): void => {
    setShowUnsavedPrompt(false)
    onClose()
  }

  const insertToken = (token: string): void => {
    if (!pickerTarget) return
    const current = String(draft[pickerTarget.field] ?? '')
    const updated = current ? `${current} ${token}` : token
    setField(pickerTarget.field, updated)
    setPickerTarget(null)
  }

  const renderInsertBtn = (field: string, label: string): React.JSX.Element => (
    <button
      type="button"
      className="node-editor-insert-btn"
      onClick={() => {
        setPickerTarget({ field, label })
        setPickerSearch('')
      }}
      title={`Insert variable or property into ${label}`}
    >
      <Icon name="Braces" size={13} />
      <span>Insert</span>
    </button>
  )

  const getCategory = (): {
    label: string
    colorClass: string
    icon: string
  } => {
    const t = node.type
    if (t === 'onMessage' || t === 'onCommand') {
      return { label: 'TRIGGER', colorClass: 'badge-trigger', icon: 'Zap' }
    }
    if (t === 'textCondition' || t === 'checkUserRole' || t === 'cooldownTimer') {
      return { label: 'CONDITION', colorClass: 'badge-condition', icon: 'Search' }
    }
    if (t === 'setVariable' || t === 'getVariable') {
      return { label: 'VARIABLE', colorClass: 'badge-variable', icon: 'Save' }
    }
    return { label: 'ACTION', colorClass: 'badge-action', icon: 'Settings' }
  }

  const category = getCategory()

  // Filter variable options in picker
  const filteredProps = COMMON_EVENT_PROPS.filter(
    (p) =>
      p.token.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      p.label.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      p.desc.toLowerCase().includes(pickerSearch.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={handleRequestClose}>
      <div
        className="node-editor-container"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="node-editor-header">
          <div className="node-editor-title-group">
            <span className={`node-editor-icon-box ${category.colorClass}`}>
              <Icon name={category.icon} size={18} />
            </span>
            <div>
              <div className="node-editor-badge-row">
                <span className={`node-editor-badge ${category.colorClass}`}>{category.label}</span>
                <span className="node-editor-id">ID: {node.id}</span>
              </div>
              <h2 className="node-editor-title">Edit: {String(draft.label || node.type)}</h2>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleRequestClose}
            aria-label="Close"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="node-editor-body">
          <CatalogFields
            type={node.type ?? ''}
            draft={draft}
            setField={setField}
            insert={renderInsertBtn}
          />
          {/* Node Display Label (Universal) */}
          <div className="node-editor-section">
            <label className="node-editor-label">Node Title / Display Label</label>
            <input
              type="text"
              className="node-editor-input"
              value={String(draft.label ?? '')}
              onChange={(e) => setField('label', e.target.value)}
              placeholder="Custom node title on canvas"
            />
          </div>

          {/* ============================================================ */}
          {/* TRIGGER: On Command                                           */}
          {/* ============================================================ */}
          {node.type === 'onCommand' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <label className="node-editor-label">Command Name</label>
                <div className="command-input-wrapper">
                  <span className="command-prefix">{prefix}</span>
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.commandName ?? 'ping')}
                    onChange={(e) => {
                      const clean = normalizeCommandName(e.target.value, prefix)
                      setField('commandName', clean)
                    }}
                    placeholder="e.g. ping"
                  />
                </div>
                <span className="node-editor-hint">
                  Lowercase alphanumeric name without spaces. Triggered via {prefix}
                  {normalizeCommandName(draft.commandName ?? 'ping', prefix) || 'ping'}
                </span>
              </div>

              <div className="node-editor-section">
                <label className="node-editor-label">Description (for {prefix} command menu)</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.description ?? '')}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="What this command does"
                  />
                  {renderInsertBtn('description', 'Description')}
                </div>
              </div>

              {/* Optional ID Filters */}
              <div className="node-editor-card">
                <h4 className="node-editor-card-heading">
                  <Icon name="Filter" size={14} /> Optional Execution Filters
                </h4>
                <div className="node-editor-row-2col">
                  <div>
                    <label className="node-editor-label">
                      User ID (optional)
                      <span
                        className="tooltip-icon"
                        title="Only execute when run by this specific user snowflake ID"
                      >
                        ?
                      </span>
                    </label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.userId ?? '')}
                        onChange={(e) => setField('userId', e.target.value)}
                        placeholder="e.g. 1234567890"
                      />
                      {renderInsertBtn('userId', 'User ID')}
                    </div>
                  </div>

                  <div>
                    <label className="node-editor-label">
                      Channel ID (optional)
                      <span
                        className="tooltip-icon"
                        title="Only execute in this specific channel ID"
                      >
                        ?
                      </span>
                    </label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.channelId ?? '')}
                        onChange={(e) => setField('channelId', e.target.value)}
                        placeholder="e.g. 9876543210"
                      />
                      {renderInsertBtn('channelId', 'Channel ID')}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label className="node-editor-label">
                    Server ID (optional)
                    <span
                      className="tooltip-icon"
                      title="Only execute in this specific server/guild ID"
                    >
                      ?
                    </span>
                  </label>
                  <div className="input-with-action">
                    <input
                      type="text"
                      className="node-editor-input"
                      value={String(draft.serverId ?? '')}
                      onChange={(e) => setField('serverId', e.target.value)}
                      placeholder="e.g. 5555555555"
                    />
                    {renderInsertBtn('serverId', 'Server ID')}
                  </div>
                </div>
              </div>

              {/* Save command to variable */}
              <div className="node-editor-card">
                <div className="toggle-row">
                  <div>
                    <span className="toggle-title">Save arguments to variable</span>
                    <span className="toggle-desc">
                      Store the command text arguments into memory for downstream nodes
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(draft.saveToVariable)}
                    onChange={(val) => setField('saveToVariable', val)}
                    label="Save arguments to variable"
                  />
                </div>

                {Boolean(draft.saveToVariable) && (
                  <div className="node-editor-row-2col" style={{ marginTop: 12 }}>
                    <div>
                      <label className="node-editor-label">Variable Name</label>
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.variableName ?? 'cmdArgs')}
                        onChange={(e) => setField('variableName', e.target.value)}
                        placeholder="variable_name"
                      />
                    </div>
                    <div>
                      <label className="node-editor-label">Scope</label>
                      <select
                        className="node-editor-select"
                        value={String(draft.variableScope ?? 'local')}
                        onChange={(e) => setField('variableScope', e.target.value)}
                      >
                        <option value="local">Local (per-event only)</option>
                        <option value="global">Global (session memory)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TRIGGER: On Message                                          */}
          {/* ============================================================ */}
          {node.type === 'onMessage' && (
            <div className="node-editor-group">
              <div className="node-editor-card">
                <div className="toggle-row">
                  <div>
                    <span className="toggle-title">Ignore Bot Accounts</span>
                    <span className="toggle-desc">
                      Prevent loops by ignoring messages generated by automated bot accounts
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={draft.ignoreBots !== false}
                    onChange={(val) => setField('ignoreBots', val)}
                    label="Ignore Bot Accounts"
                  />
                </div>
              </div>

              {/* Optional ID Filters */}
              <div className="node-editor-card">
                <h4 className="node-editor-card-heading">
                  <Icon name="Filter" size={14} /> Optional Execution Filters
                </h4>
                <div className="node-editor-row-2col">
                  <div>
                    <label className="node-editor-label">
                      User ID (optional)
                      <span
                        className="tooltip-icon"
                        title="Only execute when author matches this user ID or username"
                      >
                        ?
                      </span>
                    </label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.userId ?? '')}
                        onChange={(e) => setField('userId', e.target.value)}
                        placeholder="e.g. 1234567890"
                      />
                      {renderInsertBtn('userId', 'User ID')}
                    </div>
                  </div>

                  <div>
                    <label className="node-editor-label">
                      Channel ID (optional)
                      <span
                        className="tooltip-icon"
                        title="Only execute in this specific channel ID"
                      >
                        ?
                      </span>
                    </label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.channelId ?? '')}
                        onChange={(e) => setField('channelId', e.target.value)}
                        placeholder="e.g. 9876543210"
                      />
                      {renderInsertBtn('channelId', 'Channel ID')}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label className="node-editor-label">
                    Server ID (optional)
                    <span
                      className="tooltip-icon"
                      title="Only execute in this specific server/guild ID"
                    >
                      ?
                    </span>
                  </label>
                  <div className="input-with-action">
                    <input
                      type="text"
                      className="node-editor-input"
                      value={String(draft.serverId ?? '')}
                      onChange={(e) => setField('serverId', e.target.value)}
                      placeholder="e.g. 5555555555"
                    />
                    {renderInsertBtn('serverId', 'Server ID')}
                  </div>
                </div>
              </div>

              {/* Save message to variable */}
              <div className="node-editor-card">
                <div className="toggle-row">
                  <div>
                    <span className="toggle-title">Save message to variable</span>
                    <span className="toggle-desc">
                      Store the raw message content into memory for downstream nodes
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(draft.saveToVariable)}
                    onChange={(val) => setField('saveToVariable', val)}
                    label="Save message to variable"
                  />
                </div>

                {Boolean(draft.saveToVariable) && (
                  <div className="node-editor-row-2col" style={{ marginTop: 12 }}>
                    <div>
                      <label className="node-editor-label">Variable Name</label>
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.variableName ?? 'userMessage')}
                        onChange={(e) => setField('variableName', e.target.value)}
                        placeholder="variable_name"
                      />
                    </div>
                    <div>
                      <label className="node-editor-label">Scope</label>
                      <select
                        className="node-editor-select"
                        value={String(draft.variableScope ?? 'local')}
                        onChange={(e) => setField('variableScope', e.target.value)}
                      >
                        <option value="local">Local (per-event only)</option>
                        <option value="global">Global (session memory)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* UNIFIED CONDITION: textCondition & checkUserRole             */}
          {/* ============================================================ */}
          {(node.type === 'textCondition' || node.type === 'checkUserRole') && (
            <div className="node-editor-group">
              {/* Segmented Comparison Mode Picker */}
              <div className="node-editor-section">
                <label className="node-editor-label">Comparison Mode</label>
                <div className="segmented-control">
                  {[
                    { id: 'text', label: 'Text' },
                    { id: 'number', label: 'Number' },
                    { id: 'user_role', label: 'User / Role' },
                    { id: 'variable', label: 'Variable' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`segmented-btn ${
                        (draft.comparisonType ??
                          (node.type === 'checkUserRole' ? 'user_role' : 'text')) === mode.id
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => setField('comparisonType', mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode: TEXT */}
              {(draft.comparisonType ?? (node.type === 'checkUserRole' ? 'user_role' : 'text')) ===
                'text' && (
                <div className="node-editor-card">
                  <div className="node-editor-section">
                    <label className="node-editor-label">Value to Test</label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.leftValue ?? '{content}')}
                        onChange={(e) => setField('leftValue', e.target.value)}
                        placeholder="{content}"
                      />
                      {renderInsertBtn('leftValue', 'Value to Test')}
                    </div>
                  </div>

                  <div className="node-editor-row-2col">
                    <div>
                      <label className="node-editor-label">Operator</label>
                      <select
                        className="node-editor-select"
                        value={String(draft.operator ?? 'contains')}
                        onChange={(e) => setField('operator', e.target.value)}
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Equals exactly</option>
                        <option value="not_equals">Does not equal</option>
                        <option value="starts_with">Starts with</option>
                        <option value="ends_with">Ends with</option>
                      </select>
                    </div>

                    <div>
                      <label className="node-editor-label">Compare With</label>
                      <div className="input-with-action">
                        <input
                          type="text"
                          className="node-editor-input"
                          value={String(draft.value ?? '')}
                          onChange={(e) => setField('value', e.target.value)}
                          placeholder="e.g. hello"
                        />
                        {renderInsertBtn('value', 'Compare With')}
                      </div>
                    </div>
                  </div>

                  <div className="toggle-row" style={{ marginTop: 14 }}>
                    <div>
                      <span className="toggle-title">Case Sensitive?</span>
                      <span className="toggle-desc">Match uppercase/lowercase exactly</span>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(draft.caseSensitive)}
                      onChange={(val) => setField('caseSensitive', val)}
                      label="Case Sensitive"
                    />
                  </div>
                </div>
              )}

              {/* Mode: NUMBER */}
              {draft.comparisonType === 'number' && (
                <div className="node-editor-card">
                  <div className="node-editor-section">
                    <label className="node-editor-label">Number / Expression to Test</label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.leftValue ?? '{args}')}
                        onChange={(e) => setField('leftValue', e.target.value)}
                        placeholder="e.g. {var:score} or {args}"
                      />
                      {renderInsertBtn('leftValue', 'Number Expression')}
                    </div>
                  </div>

                  <div className="node-editor-row-2col">
                    <div>
                      <label className="node-editor-label">Comparison Operator</label>
                      <select
                        className="node-editor-select"
                        value={String(draft.operator ?? 'greater_than')}
                        onChange={(e) => setField('operator', e.target.value)}
                      >
                        <option value="equals">== (Equals)</option>
                        <option value="not_equals">!= (Not Equals)</option>
                        <option value="greater_than">&gt; (Greater Than)</option>
                        <option value="less_than">&lt; (Less Than)</option>
                        <option value="greater_or_equal">&gt;= (Greater or Equal)</option>
                        <option value="less_or_equal">&lt;= (Less or Equal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="node-editor-label">Target Number</label>
                      <div className="input-with-action">
                        <input
                          type="text"
                          className="node-editor-input"
                          value={String(draft.value ?? '10')}
                          onChange={(e) => setField('value', e.target.value)}
                          placeholder="10"
                        />
                        {renderInsertBtn('value', 'Target Number')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode: USER / ROLE */}
              {(draft.comparisonType ?? (node.type === 'checkUserRole' ? 'user_role' : 'text')) ===
                'user_role' && (
                <div className="node-editor-card">
                  <div className="node-editor-section">
                    <label className="node-editor-label">Check Property</label>
                    <select
                      className="node-editor-select"
                      value={String(draft.checkType ?? 'username')}
                      onChange={(e) => setField('checkType', e.target.value)}
                    >
                      <option value="username">Author Username</option>
                      <option value="user_id">Author User ID</option>
                      <option value="is_bot">Is a Bot Account?</option>
                    </select>
                  </div>

                  {draft.checkType !== 'is_bot' && (
                    <div className="node-editor-row-2col">
                      <div>
                        <label className="node-editor-label">Operator</label>
                        <select
                          className="node-editor-select"
                          value={String(draft.operator ?? 'equals')}
                          onChange={(e) => setField('operator', e.target.value)}
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Does not equal</option>
                          <option value="contains">Contains</option>
                        </select>
                      </div>

                      <div>
                        <label className="node-editor-label">Target Value</label>
                        <div className="input-with-action">
                          <input
                            type="text"
                            className="node-editor-input"
                            value={String(draft.value ?? '')}
                            onChange={(e) => setField('value', e.target.value)}
                            placeholder="e.g. admin"
                          />
                          {renderInsertBtn('value', 'Target Value')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: VARIABLE */}
              {draft.comparisonType === 'variable' && (
                <div className="node-editor-card">
                  <div className="node-editor-row-2col">
                    <div>
                      <label className="node-editor-label">Variable Name</label>
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.varName ?? '')}
                        onChange={(e) => setField('varName', e.target.value)}
                        placeholder="e.g. userRole"
                      />
                    </div>

                    <div>
                      <label className="node-editor-label">Operator</label>
                      <select
                        className="node-editor-select"
                        value={String(draft.operator ?? 'equals')}
                        onChange={(e) => setField('operator', e.target.value)}
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does not equal</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">&gt; (Numeric Greater)</option>
                        <option value="less_than">&lt; (Numeric Less)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label className="node-editor-label">Compare With</label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.value ?? '')}
                        onChange={(e) => setField('value', e.target.value)}
                        placeholder="Target value"
                      />
                      {renderInsertBtn('value', 'Target Value')}
                    </div>
                  </div>
                </div>
              )}

              {/* Output Routing Notice */}
              <div className="condition-routing-banner">
                <div className="routing-item routing-true">
                  <span className="routing-dot dot-true" />
                  <span>
                    <strong>True wire (Top):</strong> Executes when condition is met
                  </span>
                </div>
                <div className="routing-item routing-false">
                  <span className="routing-dot dot-false" />
                  <span>
                    <strong>False wire (Bottom):</strong> Executes when condition fails
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* COOLDOWN TIMER                                               */}
          {/* ============================================================ */}
          {node.type === 'cooldownTimer' && (
            <div className="node-editor-group">
              <div className="node-editor-row-2col">
                <div className="node-editor-section">
                  <label className="node-editor-label">Cooldown Duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    className="node-editor-input"
                    value={Number(draft.seconds ?? 5)}
                    onChange={(e) => setField('seconds', Number(e.target.value))}
                  />
                </div>

                <div className="node-editor-section">
                  <label className="node-editor-label">Scope</label>
                  <select
                    className="node-editor-select"
                    value={String(draft.scope ?? 'user')}
                    onChange={(e) => setField('scope', e.target.value)}
                  >
                    <option value="user">Per User</option>
                    <option value="channel">Per Channel</option>
                    <option value="global">Global (Entire Bot)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SET VARIABLE                                                 */}
          {/* ============================================================ */}
          {node.type === 'setVariable' && (
            <div className="node-editor-group">
              <div className="node-editor-row-2col">
                <div className="node-editor-section">
                  <label className="node-editor-label">Variable Name</label>
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.varName ?? '')}
                    onChange={(e) => setField('varName', e.target.value)}
                    placeholder="e.g. coinBalance"
                  />
                </div>

                <div className="node-editor-section">
                  <label className="node-editor-label">Operation</label>
                  <select
                    className="node-editor-select"
                    value={String(draft.operation ?? 'set')}
                    onChange={(e) => setField('operation', e.target.value)}
                  >
                    <option value="set">Set Value (=)</option>
                    <option value="increment">Increment Number (+=)</option>
                    <option value="decrement">Decrement Number (-=)</option>
                  </select>
                </div>
              </div>

              <div className="node-editor-section">
                <label className="node-editor-label">Value</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.value ?? '')}
                    onChange={(e) => setField('value', e.target.value)}
                    placeholder="Value or {template}"
                  />
                  {renderInsertBtn('value', 'Value')}
                </div>
              </div>

              <div className="node-editor-section">
                <label className="node-editor-label">Variable Scope</label>
                <select
                  className="node-editor-select"
                  value={String(draft.scope ?? 'global')}
                  onChange={(e) => setField('scope', e.target.value)}
                >
                  <option value="global">Global (Persistent session memory)</option>
                  <option value="local">Local (Current event execution only)</option>
                </select>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* GET VARIABLE                                                 */}
          {/* ============================================================ */}
          {node.type === 'getVariable' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <label className="node-editor-label">Variable Name</label>
                <input
                  type="text"
                  className="node-editor-input"
                  value={String(draft.varName ?? '')}
                  onChange={(e) => setField('varName', e.target.value)}
                  placeholder="e.g. coinBalance"
                />
              </div>

              <div className="node-editor-section">
                <label className="node-editor-label">Fallback Value (if not set)</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.fallback ?? '')}
                    onChange={(e) => setField('fallback', e.target.value)}
                    placeholder="0"
                  />
                  {renderInsertBtn('fallback', 'Fallback')}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SEND REPLY                                                   */}
          {/* ============================================================ */}
          {node.type === 'sendReply' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">Reply Message Text</label>
                  {renderInsertBtn('message', 'Message Text')}
                </div>
                <textarea
                  className="node-editor-textarea"
                  rows={4}
                  value={String(draft.message ?? '')}
                  onChange={(e) => setField('message', e.target.value)}
                  placeholder="Hello {user}! Your message was received."
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SEND RICH MESSAGE                                            */}
          {/* ============================================================ */}
          {node.type === 'sendRichMessage' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">Embed Title</label>
                  {renderInsertBtn('title', 'Title')}
                </div>
                <input
                  type="text"
                  className="node-editor-input"
                  value={String(draft.title ?? '')}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Card Title"
                />
              </div>

              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">Embed Description</label>
                  {renderInsertBtn('description', 'Description')}
                </div>
                <textarea
                  className="node-editor-textarea"
                  rows={3}
                  value={String(draft.description ?? '')}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Detailed card description..."
                />
              </div>

              <div className="node-editor-row-2col">
                <div className="node-editor-section">
                  <label className="node-editor-label">Border Accent Color</label>
                  <div className="color-picker-input">
                    <input
                      type="color"
                      value={String(draft.color ?? '#3b82f6')}
                      onChange={(e) => setField('color', e.target.value)}
                    />
                    <input
                      type="text"
                      className="node-editor-input"
                      value={String(draft.color ?? '#3b82f6')}
                      onChange={(e) => setField('color', e.target.value)}
                    />
                  </div>
                </div>

                <div className="node-editor-section">
                  <div className="label-with-action">
                    <label className="node-editor-label">Footer Text</label>
                    {renderInsertBtn('footer', 'Footer')}
                  </div>
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.footer ?? '')}
                    onChange={(e) => setField('footer', e.target.value)}
                    placeholder="Yapin Bot"
                  />
                </div>
              </div>

              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">Image URL (optional)</label>
                  {renderInsertBtn('imageUrl', 'Image URL')}
                </div>
                <input
                  type="text"
                  className="node-editor-input"
                  value={String(draft.imageUrl ?? '')}
                  onChange={(e) => setField('imageUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* RANDOM REPLY                                                 */}
          {/* ============================================================ */}
          {node.type === 'randomReply' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">Reply Choices (one per line)</label>
                  {renderInsertBtn('replies', 'Choices')}
                </div>
                <textarea
                  className="node-editor-textarea"
                  rows={5}
                  value={
                    Array.isArray(draft.replies)
                      ? draft.replies.join('\n')
                      : String(draft.replies ?? '')
                  }
                  onChange={(e) => setField('replies', e.target.value)}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* WAIT DELAY                                                   */}
          {/* ============================================================ */}
          {node.type === 'waitDelay' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <label className="node-editor-label">
                  Delay Duration: {Number(draft.seconds ?? 1)} seconds
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  className="node-editor-slider"
                  value={Number(draft.seconds ?? 1)}
                  onChange={(e) => setField('seconds', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODERATE MESSAGE                                             */}
          {/* ============================================================ */}
          {node.type === 'moderateMessage' && (
            <div className="node-editor-group">
              <div className="node-editor-section">
                <label className="node-editor-label">Moderation Action</label>
                <select
                  className="node-editor-select"
                  value={String(draft.actionType ?? 'delete')}
                  onChange={(e) => setField('actionType', e.target.value)}
                >
                  <option value="delete">Delete Infringing Message</option>
                  <option value="timeout">Timeout Author (Temporary Mute)</option>
                  <option value="kick">Kick Author from Server</option>
                </select>
              </div>

              {draft.actionType === 'timeout' && (
                <div className="node-editor-section">
                  <label className="node-editor-label">Timeout Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    className="node-editor-input"
                    value={Number(draft.minutes ?? 10)}
                    onChange={(e) => setField('minutes', Number(e.target.value))}
                  />
                </div>
              )}

              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">Reason</label>
                  {renderInsertBtn('reason', 'Reason')}
                </div>
                <input
                  type="text"
                  className="node-editor-input"
                  value={String(draft.reason ?? '')}
                  onChange={(e) => setField('reason', e.target.value)}
                  placeholder="Automated moderation rule"
                />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* LOG CONSOLE                                                  */}
          {/* ============================================================ */}
          {node.type === 'logConsole' && (
            <div className="node-editor-group">
              <div className="node-editor-row-2col">
                <div className="node-editor-section">
                  <label className="node-editor-label">Log Level</label>
                  <select
                    className="node-editor-select"
                    value={String(draft.level ?? 'info')}
                    onChange={(e) => setField('level', e.target.value)}
                  >
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="success">Success</option>
                  </select>
                </div>

                <div className="node-editor-section">
                  <div className="label-with-action">
                    <label className="node-editor-label">Message</label>
                    {renderInsertBtn('message', 'Message')}
                  </div>
                  <input
                    type="text"
                    className="node-editor-input"
                    value={String(draft.message ?? '')}
                    onChange={(e) => setField('message', e.target.value)}
                    placeholder="Debug log message"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* CUSTOM JAVASCRIPT CODE                                       */}
          {/* ============================================================ */}
          {node.type === 'javascriptCode' && (
            <div className="node-editor-group">
              {/* Context variables cheatsheet */}
              <div className="js-cheatsheet-banner">
                <Icon name="Code2" size={16} />
                <div>
                  <strong>Available Execution Context:</strong>
                  <code>context.author</code>, <code>context.authorId</code>,{' '}
                  <code>context.content</code>, <code>context.args</code>, <code>variables</code>,{' '}
                  <code>localVariables</code>, <code>console.log()</code>
                </div>
              </div>

              {/* Monospace Code Editor */}
              <div className="node-editor-section">
                <div className="label-with-action">
                  <label className="node-editor-label">JavaScript Source Code</label>
                  <span className="node-editor-hint">Return a value or output number (1-5)</span>
                </div>
                <textarea
                  className="node-editor-textarea js-code-textarea"
                  rows={8}
                  value={String(draft.code ?? '')}
                  onChange={(e) => setField('code', e.target.value)}
                  placeholder="// return 'Hello ' + context.author;&#10;// or return { output: 2, value: 'done' };"
                  spellCheck={false}
                />
              </div>

              {/* Extra Output Points Slider (1–5) */}
              <div className="node-editor-card">
                <div className="node-editor-section">
                  <div className="label-with-action">
                    <label className="node-editor-label">
                      Extra Output Points: {Number(draft.outputCount ?? 1)}
                    </label>
                    <span className="node-editor-hint">
                      Return a number 1–{Number(draft.outputCount ?? 1)} to branch!
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    className="node-editor-slider"
                    value={Number(draft.outputCount ?? 1)}
                    onChange={(e) => setField('outputCount', Number(e.target.value))}
                  />
                  <div className="slider-labels">
                    <span>1 (Default Out)</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5 Outputs</span>
                  </div>
                </div>
              </div>

              {/* Save returned value to variable */}
              <div className="node-editor-card">
                <div className="toggle-row">
                  <div>
                    <span className="toggle-title">Save returned value to variable</span>
                    <span className="toggle-desc">
                      Store whatever this script returns into bot memory
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(draft.saveToVariable)}
                    onChange={(val) => setField('saveToVariable', val)}
                    label="Save returned value to variable"
                  />
                </div>

                {Boolean(draft.saveToVariable) && (
                  <div className="node-editor-row-2col" style={{ marginTop: 12 }}>
                    <div>
                      <label className="node-editor-label">Variable Name</label>
                      <input
                        type="text"
                        className="node-editor-input"
                        value={String(draft.variableName ?? 'customResult')}
                        onChange={(e) => setField('variableName', e.target.value)}
                        placeholder="e.g. scriptResult"
                      />
                    </div>
                    <div>
                      <label className="node-editor-label">Scope</label>
                      <select
                        className="node-editor-select"
                        value={String(draft.variableScope ?? 'local')}
                        onChange={(e) => setField('variableScope', e.target.value)}
                      >
                        <option value="local">Local (Current Event)</option>
                        <option value="global">Global (Bot Session)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="node-editor-footer">
          <div className="footer-left-actions">
            {onDeleteNode && (
              <button
                type="button"
                className="btn-danger-icon"
                onClick={() => {
                  onDeleteNode(node.id)
                  onClose()
                }}
                title="Delete this node from graph"
              >
                <Icon name="Trash2" size={15} />
                <span>Delete</span>
              </button>
            )}
            {onDuplicateNode && (
              <button
                type="button"
                className="btn-secondary-icon"
                onClick={() => {
                  onDuplicateNode(node)
                  onClose()
                }}
                title="Duplicate node"
              >
                <Icon name="Copy" size={15} />
                <span>Duplicate</span>
              </button>
            )}
          </div>

          <div className="footer-right-actions">
            <button type="button" className="btn-secondary" onClick={handleRequestClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onSave(node.id, draft as CustomNodeData)
                onClose()
              }}
            >
              <Icon name="Check" size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* VARIABLE & EVENT PROPERTY PICKER POPOVER                    */}
        {/* ============================================================ */}
        {pickerTarget && (
          <div className="picker-popover-backdrop" onClick={() => setPickerTarget(null)}>
            <div className="picker-popover-card" onClick={(e) => e.stopPropagation()}>
              <div className="picker-header">
                <div className="picker-title">
                  <Icon name="Braces" size={15} />
                  <span>Insert into {pickerTarget.label}</span>
                </div>
                <button
                  type="button"
                  className="picker-close-btn"
                  onClick={() => setPickerTarget(null)}
                >
                  <Icon name="X" size={14} />
                </button>
              </div>

              <div className="picker-search-box">
                <Icon name="Search" size={13} />
                <input
                  type="text"
                  placeholder="Search properties & variables..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="picker-list">
                <div className="picker-category-title">Event Properties</div>
                {filteredProps.map((p) => (
                  <button
                    key={p.token}
                    type="button"
                    className="picker-item-btn"
                    onClick={() => insertToken(p.token)}
                  >
                    <code className="picker-token">{p.token}</code>
                    <div className="picker-text">
                      <span className="picker-name">{p.label}</span>
                      <span className="picker-desc">{p.desc}</span>
                    </div>
                  </button>
                ))}

                <div className="picker-category-title">Custom Variable</div>
                <div className="picker-custom-var-row">
                  <input
                    type="text"
                    placeholder="variable_name"
                    value={customVarInput}
                    onChange={(e) => setCustomVarInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customVarInput.trim()) {
                        insertToken(`{var:${customVarInput.trim()}}`)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!customVarInput.trim()}
                    onClick={() => insertToken(`{var:${customVarInput.trim()}}`)}
                  >
                    Insert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* UNSAVED CHANGES CONFIRMATION PROMPT                         */}
        {/* ============================================================ */}
        {showUnsavedPrompt && (
          <div className="confirm-dialog-backdrop" onClick={() => setShowUnsavedPrompt(false)}>
            <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-dialog-header">
                <Icon name="AlertTriangle" size={20} />
                <h3>Unsaved Changes</h3>
              </div>
              <p className="confirm-dialog-msg">
                You have modified this node&apos;s properties. Do you want to save your changes
                before closing?
              </p>
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUnsavedPrompt(false)}
                >
                  Cancel
                </button>
                <button type="button" className="btn-danger-outline" onClick={handleConfirmDiscard}>
                  Don&apos;t Save
                </button>
                <button type="button" className="btn-primary" onClick={handleConfirmSave}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
