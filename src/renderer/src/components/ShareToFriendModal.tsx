import React, { useState } from 'react'
import { BotNode, BotEdge } from '../types'
import { Icon } from './Icon'
import { ToggleSwitch } from './ToggleSwitch'
import { useAccount } from '../accountStore'

interface ShareToFriendModalProps {
  isOpen: boolean
  nodes: BotNode[]
  edges: BotEdge[]
  onClose: () => void
  onSuccess: (message: string) => void
  onRequireAuth: () => void
}

export const ShareToFriendModal: React.FC<ShareToFriendModalProps> = ({
  isOpen,
  nodes,
  edges,
  onClose,
  onSuccess,
  onRequireAuth
}) => {
  const { isLoggedIn, user, addFriendShareNotification } = useAccount()

  const [title, setTitle] = useState(
    nodes.length > 0
      ? `${String(nodes[0].data.label || nodes[0].type)} Snippet`
      : 'Custom Flow Snippet'
  )
  const [recipient, setRecipient] = useState('')
  const [attachCsv, setAttachCsv] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSend = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!isLoggedIn) {
      onRequireAuth()
      return
    }

    const trimmedTitle = title.trim()
    const trimmedRecipient = recipient.trim()

    if (!trimmedTitle) {
      setErrorMsg('Please provide a snippet title.')
      return
    }

    if (!trimmedRecipient) {
      setErrorMsg('Please specify a recipient handle (@username).')
      return
    }

    const formattedRecipient = trimmedRecipient.startsWith('@')
      ? trimmedRecipient
      : `@${trimmedRecipient}`

    addFriendShareNotification(
      trimmedTitle,
      user.handle,
      formattedRecipient,
      message.trim(),
      nodes.length,
      attachCsv,
      { nodes, edges }
    )

    onSuccess(
      `Flow snippet "${trimmedTitle}" sent to ${formattedRecipient}! Delivered to their inbox.`
    )
    onClose()
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="confirm-dialog-card share-friend-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon icon-share-pill">
              <Icon name="Users" size={20} />
            </span>
            <div>
              <h2 className="modal-title">Share Flow Snippet</h2>
              <span className="modal-subtitle">
                Send directly to another creator or collaborator&apos;s Yapin inbox
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

        <form onSubmit={handleSend} className="share-friend-body">
          {/* Author Badge */}
          <div className="share-author-bar">
            <div className="share-author-info">
              <span className="share-author-label">Sharing as:</span>
              <span className="share-author-handle">{user.handle}</span>
              {user.isVerified && (
                <span className="profile-verified-badge">
                  <Icon name="CheckCheck" size={11} /> Verified
                </span>
              )}
            </div>
            <span className="share-node-counter">
              <Icon name="Workflow" size={13} /> {nodes.length} nodes &bull; {edges.length} edges
            </span>
          </div>

          {/* Flow Preview Canvas Snippet */}
          <div className="share-snippet-preview">
            <div className="snippet-preview-header">
              <span className="snippet-preview-label">
                <Icon name="Layers" size={13} /> Flow Preview Canvas Snippet
              </span>
              <span className="snippet-preview-tag">Live Subgraph</span>
            </div>
            <div className="snippet-nodes-chain">
              {nodes.map((node, index) => {
                const nodeType = node.type || 'node'
                return (
                  <React.Fragment key={node.id}>
                    <div className={`snippet-node-chip node-${nodeType}`}>
                      <span className="snippet-chip-icon">
                        <Icon
                          name={
                            nodeType.startsWith('on')
                              ? 'Zap'
                              : nodeType.includes('Condition') || nodeType.includes('Role')
                                ? 'GitBranch'
                                : nodeType.includes('Variable')
                                  ? 'Variable'
                                  : 'Rocket'
                          }
                          size={12}
                        />
                      </span>
                      <span className="snippet-chip-title">
                        {String(node.data.label || nodeType)}
                      </span>
                    </div>
                    {index < nodes.length - 1 && (
                      <span className="snippet-chain-arrow">
                        <Icon name="ArrowRight" size={12} />
                      </span>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {errorMsg && <div className="share-error-banner">{errorMsg}</div>}

          {/* Title Input */}
          <div className="account-input-box">
            <label>
              Title <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Auto-Mod Bad Words Branch"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrorMsg('')
              }}
              required
            />
          </div>

          {/* Recipient Input */}
          <div className="account-input-box">
            <label>
              Share with user <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <span className="input-prefix-icon">@</span>
              <input
                type="text"
                className="modal-input has-prefix"
                placeholder="friend_username or handle"
                value={recipient.replace(/^@/, '')}
                onChange={(e) => {
                  setRecipient(e.target.value)
                  setErrorMsg('')
                }}
                required
              />
            </div>
            <span className="input-hint-text">
              The recipient will receive an instant notification in their Yapin Studio inbox.
            </span>
          </div>

          {/* Database CSV Attachment Option */}
          <div className="share-attachment-box">
            <div className="attachment-toggle-row">
              <div className="attachment-info">
                <span className="attachment-title">Attach Variables & Database (CSV)</span>
                <span className="attachment-desc">
                  Bundle active session variables and memory schema as a CSV attachment
                </span>
              </div>
              <ToggleSwitch
                checked={attachCsv}
                onChange={setAttachCsv}
                label="Attach Variables & Database (CSV)"
              />
            </div>
            {attachCsv && (
              <div className="attachment-file-pill">
                <Icon name="FileSpreadsheet" size={14} />
                <span>flow_variables_database.csv (Session Memory Map included)</span>
              </div>
            )}
          </div>

          {/* Message Box */}
          <div className="account-input-box">
            <label>Message (optional)</label>
            <textarea
              className="modal-input"
              placeholder="Add a personal note or usage instructions for your friend..."
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-send-friend">
              <Icon name="Send" size={14} />
              <span>Send to Friend</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
