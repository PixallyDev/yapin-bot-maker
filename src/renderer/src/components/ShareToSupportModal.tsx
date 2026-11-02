import React, { useState } from 'react'
import { BotNode, BotEdge } from '../types'
import { Icon } from './Icon'
import { useAccount } from '../accountStore'

interface ShareToSupportModalProps {
  isOpen: boolean
  nodes: BotNode[]
  edges: BotEdge[]
  onClose: () => void
  onSuccess: (message: string) => void
  onRequireAuth: () => void
}

export const ShareToSupportModal: React.FC<ShareToSupportModalProps> = ({
  isOpen,
  nodes,
  edges,
  onClose,
  onSuccess,
  onRequireAuth
}) => {
  const { isLoggedIn, user, addSupportTicketNotification } = useAccount()

  const [subject, setSubject] = useState(
    `Troubleshooting: ${String(nodes[0]?.data?.label || 'Flow Subgraph')} execution`
  )
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!isLoggedIn) {
      onRequireAuth()
      return
    }

    if (!subject.trim()) {
      setErrorMsg('Please enter a ticket subject.')
      return
    }

    if (!description.trim()) {
      setErrorMsg('Please describe what issue or question you have with this flow.')
      return
    }

    const ticketId = `YP-${Math.floor(1000 + Math.random() * 9000)}`

    addSupportTicketNotification(subject.trim(), ticketId, description.trim(), nodes.length)

    onSuccess(`Diagnostic package sent to Yapin Support! Ticket #${ticketId} created.`)
    onClose()
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="confirm-dialog-card share-support-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon icon-support-pill">
              <Icon name="LifeBuoy" size={20} />
            </span>
            <div>
              <h2 className="modal-title">Share to Yapin Support</h2>
              <span className="modal-subtitle">
                Send diagnostic flow snippet & logs to the official developer support team
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

        <form onSubmit={handleSubmit} className="share-friend-body">
          {/* Diagnostic Info Pill */}
          <div className="support-diag-card">
            <div className="support-diag-header">
              <Icon name="ShieldCheck" size={15} />
              <span>Automated Diagnostic Package Summary</span>
            </div>
            <div className="support-diag-grid">
              <div className="diag-item">
                <span className="diag-lbl">Author</span>
                <span className="diag-val">{user.handle}</span>
              </div>
              <div className="diag-item">
                <span className="diag-lbl">Selected Nodes</span>
                <span className="diag-val">{nodes.length} connected</span>
              </div>
              <div className="diag-item">
                <span className="diag-lbl">Graph Edges</span>
                <span className="diag-val">{edges.length} routes</span>
              </div>
              <div className="diag-item">
                <span className="diag-lbl">API Environment</span>
                <span className="diag-val">Yapin Bot API v1</span>
              </div>
            </div>
            <span className="diag-privacy-note">
              &bull; Credentials and sensitive bot tokens are automatically masked for privacy.
            </span>
          </div>

          {errorMsg && <div className="share-error-banner">{errorMsg}</div>}

          {/* Subject */}
          <div className="account-input-box">
            <label>
              Subject <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Rate limit retry loops on cooldown timer"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                setErrorMsg('')
              }}
              required
            />
          </div>

          {/* Problem description */}
          <div className="account-input-box">
            <label>
              Problem Description & Expected Behavior <span className="required-star">*</span>
            </label>
            <textarea
              className="modal-input"
              placeholder="Describe the issue you are experiencing, what logs appear, and what you expected to happen..."
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                setErrorMsg('')
              }}
              required
            />
          </div>

          {/* Actions */}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Icon name="LifeBuoy" size={14} />
              <span>Submit Support Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
