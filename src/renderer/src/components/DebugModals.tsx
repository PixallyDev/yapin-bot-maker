import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { buildTraces } from '../logUtils'
import type { BotLog } from '../types'

function ModalShell({
  title,
  icon,
  onClose,
  children
}: {
  title: string
  icon: string
  onClose: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="account-modal-container debug-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">
              <Icon name={icon} size={22} />
            </span>
            <h2 className="modal-title">{title}</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <Icon name="X" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const LiveDebugModal: React.FC<{ logs: BotLog[]; onClose: () => void }> = ({
  logs,
  onClose
}) => {
  const traces = useMemo(() => buildTraces(logs), [logs])
  return (
    <ModalShell title="Live Debug" icon="Bug" onClose={onClose}>
      <div className="account-modal-body">
        {traces.length === 0 ? (
          <div className="debug-empty">
            <Icon name="Activity" size={24} />
            <span>
              No triggers have fired yet. Start the bot and send a message or command to see each
              step it runs.
            </span>
          </div>
        ) : (
          traces.map((trace) => (
            <section key={trace.id} className="trace-card">
              <header className="trace-header">
                <Icon name="Zap" size={14} />
                <strong>{trace.trigger}</strong>
                <span className="trace-time">{trace.timestamp}</span>
              </header>
              {trace.steps.length === 0 ? (
                <div className="trace-step trace-empty">Triggered, but no nodes ran after it.</div>
              ) : (
                <ol className="trace-steps">
                  {trace.steps.map((step, index) => (
                    <li
                      key={`${step.timestamp}-${index}`}
                      className={`trace-step log-${step.level}`}
                    >
                      <span className="trace-index">{index + 1}</span>
                      <span className="trace-message">{step.message}</span>
                      <span className="trace-time">{step.timestamp}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalShell>
  )
}

export const LiveVariablesModal: React.FC<{ isRunning: boolean; onClose: () => void }> = ({
  isRunning,
  onClose
}) => {
  const [variables, setVariables] = useState<Record<string, string | number>>({})
  const [query, setQuery] = useState('')

  const refresh = useCallback((): void => {
    window.botApi
      ?.getVariables()
      .then((vars) => {
        if (vars) setVariables(vars)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    const poll = (): void => {
      window.botApi
        ?.getVariables()
        .then((vars) => {
          if (active && vars) setVariables(vars)
        })
        .catch(() => {})
    }
    poll()
    const timer = setInterval(poll, 1000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const entries = Object.entries(variables).filter(([name]) =>
    name.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <ModalShell title="Live Variables" icon="Variable" onClose={onClose}>
      <div className="account-modal-body">
        <div className="debug-search debug-search-wide">
          <Icon name="Search" size={13} />
          <input
            type="text"
            placeholder="Search variables"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {!isRunning && (
          <div className="account-status-alert">
            The bot is not running. Session variables only exist while the bot is online.
          </div>
        )}
        {entries.length === 0 ? (
          <div className="debug-empty">
            <Icon name="Database" size={24} />
            <span>No session variables set.</span>
          </div>
        ) : (
          <table className="vars-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([name, value]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void window.botApi?.clearVariables().then(() => refresh())}
          disabled={Object.keys(variables).length === 0}
        >
          <Icon name="Trash2" size={14} /> Clear
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </ModalShell>
  )
}
