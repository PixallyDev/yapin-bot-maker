import React, { useState } from 'react'

interface ToolbarProps {
  token: string
  onTokenChange: (token: string) => void
  isRunning: boolean
  isStarting: boolean
  onToggleBot: () => void
  onSaveProject: () => void
  onLoadProject: () => void
  onNewCanvas: () => void
  onOpenTemplates: () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  token,
  onTokenChange,
  isRunning,
  isStarting,
  onToggleBot,
  onSaveProject,
  onLoadProject,
  onNewCanvas,
  onOpenTemplates
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
            <span className="app-title">Yapin Bot Maker</span>
            <span className="app-version-tag">Studio v1.0</span>
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
      </div>

      <div className="toolbar-center">
        <div className={`status-badge ${isRunning ? 'status-running' : 'status-stopped'}`}>
          <span className={`status-dot ${isRunning ? 'pulse' : ''}`} />
          <span className="status-text">{isRunning ? 'BOT ONLINE' : 'BOT STOPPED'}</span>
        </div>
      </div>

      <div className="toolbar-right">
        <div className="project-actions-group">
          <button
            type="button"
            className="toolbar-btn btn-templates"
            onClick={onOpenTemplates}
            title="Browse starter bot templates"
          >
            <span>📦</span> Templates
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onNewCanvas}
            title="Reset to default example"
          >
            <span>📄</span> New
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onLoadProject}
            title="Open .yapbot.json file"
          >
            <span>📂</span> Load JSON
          </button>
          <button
            type="button"
            className="toolbar-btn btn-secondary"
            onClick={onSaveProject}
            title="Save as .yapbot.json"
          >
            <span>💾</span> Save JSON
          </button>
        </div>

        <button
          type="button"
          className={`toolbar-btn bot-toggle-btn ${isRunning ? 'btn-stop' : 'btn-start'}`}
          onClick={onToggleBot}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <span className="btn-spinner" /> Starting...
            </>
          ) : isRunning ? (
            <>
              <span>⏹️</span> Stop Bot
            </>
          ) : (
            <>
              <span>▶️</span> Start Bot
            </>
          )}
        </button>
      </div>
    </header>
  )
}
