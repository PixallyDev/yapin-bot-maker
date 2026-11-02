import React, { useState, useEffect, useRef } from 'react'
import { BotLog } from '../types'

interface ConsoleDrawerProps {
  logs: BotLog[]
  onClearLogs: () => void
  isRunning: boolean
}

export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({ logs, onClearLogs, isRunning }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warn' | 'error' | 'success'>(
    'all'
  )
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && !isCollapsed) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll, isCollapsed])

  const filteredLogs = logs.filter((l) => (filterLevel === 'all' ? true : l.level === filterLevel))

  return (
    <footer className={`studio-console-drawer ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="console-header">
        <div className="console-header-left">
          <button
            type="button"
            className="drawer-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Console' : 'Collapse Console'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <div className="console-title-group">
            <span className="console-title">Live Bot Console</span>
            <span className="console-count-pill">{logs.length}</span>
            <span className={`console-pulse-indicator ${isRunning ? 'active' : ''}`} />
          </div>
        </div>

        {!isCollapsed && (
          <div className="console-header-right">
            <div className="console-filter-tabs">
              <button
                type="button"
                className={`filter-tab ${filterLevel === 'all' ? 'active' : ''}`}
                onClick={() => setFilterLevel('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-tab ${filterLevel === 'info' ? 'active' : ''}`}
                onClick={() => setFilterLevel('info')}
              >
                Info
              </button>
              <button
                type="button"
                className={`filter-tab ${filterLevel === 'success' ? 'active' : ''}`}
                onClick={() => setFilterLevel('success')}
              >
                Success
              </button>
              <button
                type="button"
                className={`filter-tab ${filterLevel === 'warn' ? 'active' : ''}`}
                onClick={() => setFilterLevel('warn')}
              >
                Warn
              </button>
              <button
                type="button"
                className={`filter-tab ${filterLevel === 'error' ? 'active' : ''}`}
                onClick={() => setFilterLevel('error')}
              >
                Error
              </button>
            </div>

            <label className="console-auto-scroll nodrag">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              <span>Auto-scroll</span>
            </label>

            <button
              type="button"
              className="console-clear-btn"
              onClick={onClearLogs}
              title="Clear Console Output"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="console-body">
          {filteredLogs.length === 0 ? (
            <div className="console-empty-state">
              <span className="empty-icon">📟</span>
              <p className="empty-text">
                Bot console idle. Click <strong>Start Bot</strong> to stream live execution events.
              </p>
            </div>
          ) : (
            <div className="console-log-list">
              {filteredLogs.map((log, idx) => (
                <div key={idx} className={`console-log-entry log-${log.level}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className={`log-badge log-badge-${log.level}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </footer>
  )
}
