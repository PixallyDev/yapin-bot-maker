import React, { useState } from 'react'

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
  projectName = 'Default Ping & FAQ Bot'
}) => {
  const [showToken, setShowToken] = useState(false)

  return (
    <header className="studio-toolbar">
      <div className="toolbar-left">
        <div className="app-branding">
          <div className="app-logo">
            <span>⚡</span>
          </div>
          <div className="app-title-group">
            <span className="app-title">Flow Studio</span>
            <span className="project-name-badge" title={`Active Project: ${projectName}`}>
              📁 {projectName}
            </span>
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
              {showToken ? '🙈' : '👁️'}
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
          <input
            type="checkbox"
            checked={rememberToken}
            disabled={!tokenStorageAvailable && !rememberToken}
            onChange={(event) => onRememberToken(event.target.checked)}
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
            <span>✨</span> Templates
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onNewCanvas}
            title="Reset to default blank starter nodes"
          >
            <span>📄</span> Clear
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onLoadProject}
            title="Load project from a .yapbot.json file"
          >
            <span>📂</span> Load
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onSaveProject}
            title="Save current canvas to a .yapbot.json file"
          >
            <span>💾</span> Save
          </button>
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
              <span>⏹</span> Stop Bot
            </>
          ) : (
            <>
              <span>▶</span> Start Bot
            </>
          )}
        </button>
      </div>
    </header>
  )
}
