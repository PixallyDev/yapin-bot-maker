import React, { useState } from 'react'
import { ToggleSwitch } from './ToggleSwitch'
import { Icon } from './Icon'

interface ToolbarProps {
  rememberToken: boolean
  tokenStorageAvailable: boolean
  onRememberToken: (remember: boolean) => void
  onExportStandalone: () => void
  isExporting: boolean
  token: string
  onTokenChange: (token: string) => void
  isRunning: boolean
  isStarting: boolean
  onToggleBot: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onNewCanvas: () => void
  onOpenTemplates: () => void
  onOpenBotSettings?: () => void
  projectName?: string
}

export const Toolbar: React.FC<ToolbarProps> = ({
  rememberToken,
  tokenStorageAvailable,
  onRememberToken,
  onExportStandalone,
  isExporting,
  token,
  onTokenChange,
  isRunning,
  isStarting,
  onToggleBot,
  onSaveProject,
  onLoadProject,
  onNewCanvas,
  onOpenTemplates,
  onOpenBotSettings,
  projectName = 'Default Ping & FAQ Bot'
}) => {
  const [showToken, setShowToken] = useState(false)

  return (
    <header className="studio-toolbar">
      <div className="toolbar-left">
        <div className="app-branding">
          <div className="app-logo">
            <span>
              <Icon name="Zap" />
            </span>
          </div>
          <div className="app-title-group">
            <span className="app-title">Yapper Maker</span>
            <button
              type="button"
              className="project-name-badge project-name-btn"
              onClick={onOpenBotSettings}
              title={`Configure ${projectName} settings`}
            >
              <Icon name="Folder" /> {projectName}
              {onOpenBotSettings && <Icon name="Settings" size={12} className="badge-gear-icon" />}
            </button>
          </div>
        </div>

        <div className="token-field-wrapper">
          <span className="token-label">Token:</span>
          <div className="token-input-container">
            <input
              type={showToken ? 'text' : 'password'}
              className="token-input"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="Paste Bot Token (yb_...)"
              spellCheck={false}
            />
            <button
              type="button"
              className="token-toggle-btn"
              onClick={() => setShowToken(!showToken)}
              title={showToken ? 'Hide Token' : 'Show Token'}
            >
              {showToken ? <Icon name="EyeOff" /> : <Icon name="Eye" />}
            </button>
          </div>
        </div>

        <label
          className="remember-token"
          title={
            tokenStorageAvailable
              ? 'Store encrypted on this PC only'
              : 'Secure token storage is unavailable'
          }
        >
          <ToggleSwitch
            size="sm"
            checked={rememberToken}
            disabled={!tokenStorageAvailable && !rememberToken}
            onChange={onRememberToken}
            label="Remember token"
          />
          <span>Remember Token</span>
        </label>
      </div>

      <div className="toolbar-center">
        <div className={`status-badge ${isRunning ? 'status-running' : 'status-stopped'}`}>
          <span className={`status-dot ${isRunning ? 'pulse' : ''}`} />
          <span className="status-text">{isRunning ? 'BOT ONLINE' : 'BOT OFFLINE'}</span>
        </div>
      </div>

      <div className="toolbar-right">
        <div className="project-actions-group">
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onExportStandalone}
            disabled={isExporting}
            title="Export a Node.js bot that runs independently of the studio"
          >
            {isExporting ? 'Exporting...' : 'Export Bot'}
          </button>
          <button
            type="button"
            className="toolbar-btn btn-templates"
            onClick={onOpenTemplates}
            title="Browse starter flow templates"
          >
            <span>
              <Icon name="Sparkles" />
            </span>{' '}
            Templates
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onNewCanvas}
            title="Reset to default blank starter nodes"
          >
            <span>
              <Icon name="FileText" />
            </span>{' '}
            Clear
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onLoadProject}
            title="Load project from a .yapbot.json file"
          >
            <span>
              <Icon name="FolderOpen" />
            </span>{' '}
            Load
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onSaveProject}
            title="Save current canvas to a .yapbot.json file"
          >
            <span>
              <Icon name="Save" />
            </span>{' '}
            Save
          </button>
          {onOpenBotSettings && (
            <button
              type="button"
              className="toolbar-btn btn-secondary"
              onClick={onOpenBotSettings}
              title="Open Bot Settings & Permissions"
            >
              <span>
                <Icon name="Settings" />
              </span>{' '}
              Settings
            </button>
          )}
        </div>

        <button
          type="button"
          className={`toolbar-btn bot-toggle-btn ${isRunning ? 'btn-stop' : 'btn-start'}`}
          onClick={onToggleBot}
          disabled={isStarting}
          title={
            isRunning
              ? 'Stop bot execution'
              : !token.trim()
                ? 'Enter a bot token to start'
                : 'Start bot runner'
          }
        >
          {isStarting ? (
            <span className="btn-spinner">Connecting...</span>
          ) : isRunning ? (
            <>
              <span>
                <Icon name="Square" />
              </span>{' '}
              Stop Bot
            </>
          ) : (
            <>
              <span>
                <Icon name="Play" />
              </span>{' '}
              Start Bot
            </>
          )}
        </button>
      </div>
    </header>
  )
}
