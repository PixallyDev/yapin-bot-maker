import React, { useState } from 'react'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [username, setUsername] = useState('YapinDeveloper#4281')
  const [email, setEmail] = useState('developer@yapin.community')
  const [cloudSync, setCloudSync] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [secretVault, setSecretVault] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  if (!isOpen) return null

  const handleToggleLogin = (): void => {
    if (isLoggedIn) {
      setIsLoggedIn(false)
      setStatusMsg('Logged out to local guest session.')
    } else {
      setIsLoggedIn(true)
      setStatusMsg('Signed in with Yapin Cloud Account.')
    }
    setTimeout(() => setStatusMsg(''), 2500)
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="account-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">👤</span>
            <div>
              <h2 className="modal-title">Developer Account & Cloud Sync</h2>
              <span className="modal-subtitle">
                Manage your cloud profile and cross-device sync
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="account-modal-body">
          {/* Profile Card */}
          <div className="profile-hero-card">
            <div className="profile-avatar-large">
              <span>{isLoggedIn ? '⚡' : '👤'}</span>
              <span className={`profile-status-dot ${isLoggedIn ? 'online' : 'offline'}`} />
            </div>

            <div className="profile-details">
              <div className="profile-name-row">
                <h3 className="profile-name">{isLoggedIn ? username : 'Guest Developer'}</h3>
                {isLoggedIn && <span className="profile-badge">VERIFIED BOT MAKER</span>}
              </div>
              <span className="profile-email">
                {isLoggedIn ? email : 'Local offline mode • No cloud sync enabled'}
              </span>
            </div>

            <button
              type="button"
              className={`account-switch-btn ${isLoggedIn ? 'btn-logout' : 'btn-login'}`}
              onClick={handleToggleLogin}
            >
              {isLoggedIn ? 'Sign Out' : 'Sign In'}
            </button>
          </div>

          {statusMsg && <div className="account-status-alert">✓ {statusMsg}</div>}

          {/* Cloud Synchronization Features */}
          <div className="account-section">
            <h4 className="account-section-title">Cloud Synchronization</h4>
            <p className="account-section-desc">
              Synchronize your visual bot flows, templates, and execution nodes across all your
              desktop workstations.
            </p>

            <div className="sync-toggles-list">
              <label className="sync-toggle-row">
                <div className="sync-toggle-info">
                  <span className="sync-toggle-name">Cloud Workspace Sync</span>
                  <span className="sync-toggle-sub">
                    Automatically sync canvas nodes when project files are saved
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cloudSync}
                  disabled={!isLoggedIn}
                  onChange={(e) => setCloudSync(e.target.checked)}
                />
              </label>

              <label className="sync-toggle-row">
                <div className="sync-toggle-info">
                  <span className="sync-toggle-name">Automated Cloud Backups</span>
                  <span className="sync-toggle-sub">
                    Keep versioned rollbacks of .yapbot.json graphs in your cloud vault
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoBackup}
                  disabled={!isLoggedIn}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                />
              </label>

              <label className="sync-toggle-row">
                <div className="sync-toggle-info">
                  <span className="sync-toggle-name">Encrypted Bot Token Vault</span>
                  <span className="sync-toggle-sub">
                    Sync encrypted bot credentials using zero-knowledge end-to-end keys
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={secretVault}
                  disabled={!isLoggedIn}
                  onChange={(e) => setSecretVault(e.target.checked)}
                />
              </label>
            </div>
          </div>

          {/* Account Profile Edit */}
          {isLoggedIn && (
            <div className="account-section">
              <h4 className="account-section-title">Developer Identity</h4>
              <div className="account-inputs-grid">
                <div className="account-input-box">
                  <label>Display Handle</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="modal-input"
                  />
                </div>
                <div className="account-input-box">
                  <label>Notification Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="modal-input"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setStatusMsg('Profile preferences updated.')
              setTimeout(onClose, 800)
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
