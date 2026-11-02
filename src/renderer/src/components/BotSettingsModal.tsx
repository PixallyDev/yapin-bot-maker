import React, { useState } from 'react'
import { BotProjectRecord } from '../projectManager'
import { Icon } from './Icon'
import { ToggleSwitch } from './ToggleSwitch'

interface BotSettingsModalProps {
  isOpen: boolean
  project: BotProjectRecord
  token: string
  onSave: (updated: {
    name: string
    token: string
    prefix: string
    permissions?: number
    icon?: string
    iconBg?: string
  }) => void
  onClose: () => void
}

export const BotSettingsModal: React.FC<BotSettingsModalProps> = ({
  isOpen,
  project,
  token: initialToken,
  onSave,
  onClose
}) => {
  const [name, setName] = useState(project.name)
  const [token, setToken] = useState(initialToken)
  const [showToken, setShowToken] = useState(false)
  const [prefix, setPrefix] = useState(project.prefix || '/')
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [debugLogs, setDebugLogs] = useState(false)
  const [intentMessageContent, setIntentMessageContent] = useState(true)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSave({
      name: name.trim() || project.name,
      token: token.trim(),
      prefix: prefix.trim() || '/',
      permissions: project.permissions
    })
    onClose()
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="confirm-dialog-card bot-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon icon-settings-pill">
              <Icon name="Settings" size={20} />
            </span>
            <div>
              <h2 className="modal-title">Bot Project Settings</h2>
              <span className="modal-subtitle">
                Configure authentication tokens, command prefix, and gateway settings
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="X" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bot-settings-body">
          {/* Section 1: General Info */}
          <div className="settings-section">
            <h4 className="settings-section-title">General Project Identity</h4>
            <div className="settings-grid-2col">
              <div className="account-input-box">
                <label>Project Name</label>
                <input
                  type="text"
                  className="modal-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="account-input-box">
                <label>Command Prefix</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. . or / or !"
                  value={prefix}
                  maxLength={5}
                  onChange={(e) => setPrefix(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bot Authentication Token */}
          <div className="settings-section">
            <h4 className="settings-section-title">Authentication & Bot Token</h4>
            <div className="account-input-box">
              <label>Yapin Bot Token</label>
              <div className="input-with-die-btn">
                <input
                  type={showToken ? 'text' : 'password'}
                  className="modal-input font-mono"
                  placeholder="Paste your yb_... token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button
                  type="button"
                  className="die-random-btn"
                  onClick={() => setShowToken((prev) => !prev)}
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  <Icon name={showToken ? 'EyeOff' : 'Eye'} size={15} />
                </button>
              </div>
              <span className="input-hint-text">
                Stored locally in memory and never committed to project JSON files.
              </span>
            </div>
          </div>

          {/* Section 3: Collapsible Advanced Settings Accordion */}
          <div className="settings-accordion">
            <button
              type="button"
              className="accordion-header-btn"
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
            >
              <div className="accordion-title-row">
                <Icon name="SlidersHorizontal" size={15} />
                <span>Advanced Runner & Gateway Settings</span>
              </div>
              <Icon name={isAdvancedOpen ? 'ChevronUp' : 'ChevronDown'} size={14} />
            </button>

            {isAdvancedOpen && (
              <div className="accordion-content-box">
                <div className="advanced-toggle-row">
                  <div className="toggle-label-group">
                    <span className="toggle-main-label">Auto-Reconnect on Socket Drop</span>
                    <span className="toggle-sub-label">
                      Exponentially backoff and resume polling automatically
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={autoReconnect}
                    onChange={setAutoReconnect}
                    label="Auto-Reconnect"
                  />
                </div>

                <div className="advanced-toggle-row">
                  <div className="toggle-label-group">
                    <span className="toggle-main-label">Verbose Gateway Debug Logs</span>
                    <span className="toggle-sub-label">
                      Output raw JSON event payloads into the live studio console
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={debugLogs}
                    onChange={setDebugLogs}
                    label="Verbose Debug Logs"
                  />
                </div>

                <div className="advanced-toggle-row">
                  <div className="toggle-label-group">
                    <span className="toggle-main-label">Message Content Intent</span>
                    <span className="toggle-sub-label">
                      Required to evaluate On Message keywords and text conditions
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={intentMessageContent}
                    onChange={setIntentMessageContent}
                    label="Message Content Intent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn-primary">
              <Icon name="Check" size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
