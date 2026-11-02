import React from 'react'

interface VariablePillsProps {
  onInsert: (variable: string) => void
}

const COMMON_PILLS = [
  { label: '{user}', token: '{user}', tip: 'Username of author' },
  { label: '{args}', token: '{args}', tip: 'Command arguments' },
  { label: '{channel}', token: '{channel}', tip: 'Current channel ID' },
  { label: '{content}', token: '{content}', tip: 'Original message text' },
  { label: '{var:count}', token: '{var:count}', tip: 'Session variable' }
]

export const VariablePills: React.FC<VariablePillsProps> = ({ onInsert }) => {
  return (
    <div className="variable-pills-row nodrag nopan">
      <span className="pills-label">Insert:</span>
      <div className="pills-container">
        {COMMON_PILLS.map((pill) => (
          <button
            key={pill.label}
            type="button"
            className="variable-pill-btn nodrag nopan"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onInsert(pill.token)
            }}
            title={pill.tip}
          >
            + {pill.label}
          </button>
        ))}
      </div>
    </div>
  )
}
