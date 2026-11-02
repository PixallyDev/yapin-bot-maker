import React from 'react'
import { Icon } from './Icon'
import { OFFICIAL_SERVER_URL } from '../accountStore'

interface AuthGuardModalProps {
  isOpen: boolean
  actionName?: string
  onClose: () => void
  onSignIn: () => void
}

export const AuthGuardModal: React.FC<AuthGuardModalProps> = ({
  isOpen,
  actionName = 'perform this marketplace action',
  onClose,
  onSignIn
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="confirm-dialog-card auth-guard-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div className="auth-guard-icon-box">
            <Icon name="Lock" size={20} />
          </div>
          <div>
            <h3 className="auth-guard-title">Yapin Account Required</h3>
            <span className="auth-guard-sub">Authentication required for community actions</span>
          </div>
        </div>

        <p className="confirm-dialog-msg">
          You must be signed in with a verified Yapin account to {actionName}.
        </p>

        <div className="auth-guard-info-pill">
          <Icon name="ShieldCheck" size={15} />
          <span>
            Signing in is free and grants you a verified developer role in our official server:{' '}
            <a
              href={OFFICIAL_SERVER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="disclaimer-link"
            >
              {OFFICIAL_SERVER_URL}
            </a>
          </span>
        </div>

        <div className="confirm-dialog-actions auth-guard-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose()
              onSignIn()
            }}
          >
            <Icon name="Zap" size={15} />
            <span>Sign In with Yapin</span>
          </button>
        </div>
      </div>
    </div>
  )
}
