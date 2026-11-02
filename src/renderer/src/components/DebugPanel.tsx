import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { ToggleSwitch } from './ToggleSwitch'
import type { FlowIssue } from '../issuesAnalyzer'
import { LOG_FILTERS, classifyLog, type LogCategory } from '../logUtils'
import type { BotLog } from '../types'

type IssueFilter = 'all' | 'errors' | 'warnings' | 'flow'

interface DebugPanelProps {
  issues: FlowIssue[]
  activeFlowId: string
  onSelectIssue: (issue: FlowIssue) => void
  logs: BotLog[]
  onClearLogs: () => void
  isRunning: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenLiveDebug: () => void
  onOpenLiveVariables: () => void
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  issues,
  activeFlowId,
  onSelectIssue,
  logs,
  onClearLogs,
  isRunning,
  collapsed,
  onToggleCollapsed,
  onOpenLiveDebug,
  onOpenLiveVariables
}) => {
  const [issueQuery, setIssueQuery] = useState('')
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all')
  const [logQuery, setLogQuery] = useState('')
  const [logFilter, setLogFilter] = useState<'all' | LogCategory>('all')
  const [paused, setPaused] = useState<BotLog[] | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const logEnd = useRef<HTMLDivElement>(null)

  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.length - errorCount

  const visibleIssues = useMemo(() => {
    const needle = issueQuery.trim().toLowerCase()
    return issues.filter((issue) => {
      if (issueFilter === 'errors' && issue.severity !== 'error') return false
      if (issueFilter === 'warnings' && issue.severity !== 'warning') return false
      if (issueFilter === 'flow' && issue.flowId !== activeFlowId) return false
      return (
        !needle ||
        issue.message.toLowerCase().includes(needle) ||
        issue.flowName.toLowerCase().includes(needle) ||
        (issue.nodeLabel ?? '').toLowerCase().includes(needle)
      )
    })
  }, [issues, issueQuery, issueFilter, activeFlowId])

  const shownLogs = paused ?? logs
  const visibleLogs = useMemo(() => {
    const needle = logQuery.trim().toLowerCase()
    return shownLogs.filter(
      (log) =>
        (logFilter === 'all' || classifyLog(log) === logFilter) &&
        (!needle || log.message.toLowerCase().includes(needle))
    )
  }, [shownLogs, logQuery, logFilter])

  useEffect(() => {
    if (autoScroll && !collapsed) logEnd.current?.scrollIntoView({ block: 'end' })
  }, [visibleLogs.length, autoScroll, collapsed])

  if (collapsed) {
    return (
      <aside className="debug-panel debug-panel-collapsed">
        <button
          type="button"
          className="debug-collapse-btn"
          onClick={onToggleCollapsed}
          title="Show Debug & Issues"
          aria-label="Show Debug and Issues panel"
        >
          <Icon name="PanelRightOpen" size={18} />
        </button>
        {errorCount > 0 && <span className="debug-mini-badge debug-mini-error">{errorCount}</span>}
        {warningCount > 0 && (
          <span className="debug-mini-badge debug-mini-warning">{warningCount}</span>
        )}
      </aside>
    )
  }

  return (
    <aside className="debug-panel" aria-label="Debug and Issues">
      <section className="debug-half debug-issues">
        <header className="debug-header">
          <div className="debug-title">
            <Icon name="ListChecks" size={15} /> Issues
            <span className="debug-count debug-count-error" title="Errors">
              {errorCount}
            </span>
            <span className="debug-count debug-count-warning" title="Warnings">
              {warningCount}
            </span>
          </div>
          <button
            type="button"
            className="debug-icon-btn"
            onClick={onToggleCollapsed}
            title="Hide panel"
            aria-label="Hide Debug and Issues panel"
          >
            <Icon name="PanelRightClose" size={16} />
          </button>
        </header>
        <div className="debug-toolbar">
          <div className="debug-search">
            <Icon name="Search" size={13} />
            <input
              type="text"
              placeholder="Search issues"
              value={issueQuery}
              onChange={(e) => setIssueQuery(e.target.value)}
            />
          </div>
          <select
            className="debug-select"
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value as IssueFilter)}
            aria-label="Issue filter"
          >
            <option value="all">All</option>
            <option value="errors">Errors</option>
            <option value="warnings">Warnings</option>
            <option value="flow">Current flow</option>
          </select>
        </div>
        <div className="debug-list">
          {visibleIssues.length === 0 ? (
            <div className="debug-empty">
              <Icon name="CircleCheck" size={20} />
              <span>
                {issues.length === 0 ? 'No issues found.' : 'No issues match your filter.'}
              </span>
            </div>
          ) : (
            visibleIssues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                className={`issue-row issue-${issue.severity}`}
                onClick={() => onSelectIssue(issue)}
                title="Jump to this node"
              >
                <Icon name={issue.severity === 'error' ? 'CircleX' : 'TriangleAlert'} size={15} />
                <span className="issue-text">
                  <span className="issue-message">{issue.message}</span>
                  <span className="issue-where">
                    {issue.flowName}
                    {issue.nodeLabel ? ` / ${issue.nodeLabel}` : ''}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="debug-half debug-log">
        <header className="debug-header">
          <div className="debug-title">
            <Icon name="Terminal" size={15} /> Bot Log
            <span className={`debug-live ${isRunning ? 'on' : ''}`}>
              {isRunning ? 'LIVE' : 'IDLE'}
            </span>
          </div>
          <div className="debug-header-actions">
            <button
              type="button"
              className={`debug-pill-btn ${paused ? 'active' : ''}`}
              onClick={() => setPaused(paused ? null : logs)}
              title={paused ? 'Resume log' : 'Pause log'}
            >
              <Icon name={paused ? 'Play' : 'Pause'} size={13} /> {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="debug-icon-btn"
              onClick={() => {
                setPaused(null)
                onClearLogs()
              }}
              title="Clear log"
              aria-label="Clear log"
            >
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        </header>
        <div className="debug-toolbar">
          <div className="debug-search">
            <Icon name="Search" size={13} />
            <input
              type="text"
              placeholder="Search log"
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
            />
          </div>
          <select
            className="debug-select"
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value as 'all' | LogCategory)}
            aria-label="Log filter"
          >
            {LOG_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <div className="debug-autoscroll">
          <span>Auto-scroll</span>
          <ToggleSwitch
            size="sm"
            checked={autoScroll}
            onChange={setAutoScroll}
            label="Auto-scroll"
          />
        </div>
        <div className="debug-list debug-log-list">
          {visibleLogs.length === 0 ? (
            <div className="debug-empty">
              <Icon name="ScrollText" size={20} />
              <span>No log messages.</span>
            </div>
          ) : (
            visibleLogs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className={`log-line log-${log.level}`}>
                <span className="log-line-time">{log.timestamp}</span>
                <span className="log-line-text">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logEnd} />
        </div>
      </section>

      <footer className="debug-actions">
        <button type="button" className="debug-action-btn" onClick={onOpenLiveDebug}>
          <Icon name="Bug" size={15} /> Live Debug
        </button>
        <button type="button" className="debug-action-btn" onClick={onOpenLiveVariables}>
          <Icon name="Variable" size={15} /> Live Variables
        </button>
      </footer>
    </aside>
  )
}
