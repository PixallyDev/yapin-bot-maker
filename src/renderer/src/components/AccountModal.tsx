import React, { useState, useEffect, useRef } from 'react'
import { ToggleSwitch } from './ToggleSwitch'
import { Icon } from './Icon'
import { useAccount, OFFICIAL_SERVER_URL } from '../accountStore'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'settings' | 'signin'
}

interface AccountModalInnerProps {
  onClose: () => void
  initialMode: 'settings' | 'signin'
}

const AccountModalInner: React.FC<AccountModalInnerProps> = ({ onClose, initialMode }) => {
  const { isLoggedIn, user, loginWithYapin, logout, updateProfile, deleteAccount } = useAccount()

  const [viewMode, setViewMode] = useState<'settings' | 'signin'>(
    !isLoggedIn || initialMode === 'signin' ? 'signin' : 'settings'
  )

  // Local draft states for settings
  const [username, setUsername] = useState(user.username)
  const [handle, setHandle] = useState(user.handle)
  const [email, setEmail] = useState(user.email)
  const [communityPublic, setCommunityPublic] = useState(user.communityPublicProfile)
  const [allowDms, setAllowDms] = useState(user.allowDirectMessages)
  const [cloudSync, setCloudSync] = useState(user.syncCloud)
  const [autoBackup, setAutoBackup] = useState(user.autoBackup)

  // OAuth & Sign-in form states
  const [showLegacy, setShowLegacy] = useState(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      void window.botApi?.cancelYapinLogin()
    }
  }, [])
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [copiedHandle, setCopiedHandle] = useState(false)
  const [copiedServerUrl, setCopiedServerUrl] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const handleCopyHandle = (): void => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(handle)
    }
    setCopiedHandle(true)
    setTimeout(() => setCopiedHandle(false), 1500)
  }

  const handleCopyServerLink = (): void => {
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(OFFICIAL_SERVER_URL)
    }
    setCopiedServerUrl(true)
    setTimeout(() => setCopiedServerUrl(false), 1500)
  }

  const handleContinueWithYapin = async (): Promise<void> => {
    if (typeof window === 'undefined' || !window.botApi?.loginWithYapin) {
      setStatusMsg('Open Yapper Maker desktop to sign in using your browser.')
      return
    }
    setIsAuthenticating(true)
    setStatusMsg('Complete sign in in your browser.')
    try {
      const result = await window.botApi.loginWithYapin()
      if (!mounted.current) return
      if (result.success && result.user) {
        loginWithYapin(result.user.handle, '', { ...result.user, authSource: 'oauth' })
        onClose()
      } else setStatusMsg(result.error ?? 'Sign in failed.')
    } catch {
      if (mounted.current) setStatusMsg('Could not start Yapin sign in.')
    } finally {
      if (mounted.current) setIsAuthenticating(false)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!signInEmail.trim()) return
    setStatusMsg(
      'Legacy email authentication is unavailable. Continue with Yapin to sign in securely.'
    )
  }

  const handleSaveChanges = (): void => {
    updateProfile({
      username: username.trim() || user.username,
      handle: handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`,
      email: email.trim() || user.email,
      communityPublicProfile: communityPublic,
      allowDirectMessages: allowDms,
      syncCloud: cloudSync,
      autoBackup
    })
    setStatusMsg('Profile and preferences updated successfully.')
    setTimeout(() => {
      setStatusMsg('')
      onClose()
    }, 800)
  }

  const handleDeleteAccountConfirm = (): void => {
    deleteAccount()
    setShowDeleteConfirm(false)
    setViewMode('signin')
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="account-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ================================================================= */}
        {/* VIEW 0: YAPIN DEVELOPER OAUTH 2.0 FLOW                            */}
        {/* ================================================================= */}
        {viewMode === 'signin' ? (
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon account-yapin-logo">
                  <Icon name="Zap" size={20} />
                </span>
                <div>
                  <h2 className="modal-title">Sign In to Yapper Maker</h2>
                  <span className="modal-subtitle">Sign in securely in your system browser</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="account-modal-body">
              {statusMsg && (
                <div className="account-status-alert">
                  <Icon name="Check" size={14} /> {statusMsg}
                </div>
              )}

              {/* Primary OAuth Button: Continue with Yapin */}
              <div className="auth-primary-action-box">
                <button
                  type="button"
                  className="btn-continue-yapin"
                  onClick={handleContinueWithYapin}
                  disabled={isAuthenticating}
                >
                  <span className="yapin-btn-icon">
                    <Icon
                      name={isAuthenticating ? 'Loader2' : 'Zap'}
                      size={18}
                      className={isAuthenticating ? 'spin' : ''}
                    />
                  </span>
                  <span className="yapin-btn-text">
                    {isAuthenticating ? 'Signing in...' : 'Continue with Yapin'}
                  </span>
                </button>
                <span className="auth-secure-notice">
                  <Icon name="ShieldCheck" size={13} /> Yapin OAuth 2.0 · identify only
                </span>
              </div>

              {isAuthenticating && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    void window.botApi.cancelYapinLogin()
                  }}
                >
                  Cancel sign in
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                disabled={isAuthenticating}
                onClick={() => setShowLegacy(!showLegacy)}
              >
                Legacy email sign in
              </button>
              {/* Divider */}
              <div className="auth-divider-row">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">OR SIGN IN WITH EMAIL</span>
                <span className="auth-divider-line" />
              </div>

              {/* Legacy Email Sign-In Form */}
              {showLegacy && (
                <form onSubmit={handleEmailSubmit} className="auth-email-form">
                  <div className="auth-input-group">
                    <label className="auth-input-label">Email Address</label>
                    <div className="auth-input-wrapper">
                      <Icon name="Mail" size={14} />
                      <input
                        type="email"
                        className="modal-input auth-text-input"
                        placeholder="developer@yapin.community"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">Password</label>
                    <div className="auth-input-wrapper">
                      <Icon name="Lock" size={14} />
                      <input
                        type="password"
                        className="modal-input auth-text-input"
                        placeholder="••••••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Required Official Server Disclaimer */}
                  <div className="official-server-disclaimer-box">
                    <div className="disclaimer-header">
                      <Icon name="Crown" size={15} />
                      <span className="disclaimer-title">Official Server Verification</span>
                    </div>
                    <p className="disclaimer-text">
                      Official server roles are managed by the server moderators. Sign in alone does
                      not grant a role. Join our official server:{' '}
                      <a
                        href={OFFICIAL_SERVER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="disclaimer-link"
                      >
                        {OFFICIAL_SERVER_URL}
                      </a>
                    </p>
                    <button
                      type="button"
                      className="disclaimer-copy-btn"
                      onClick={handleCopyServerLink}
                    >
                      <Icon name={copiedServerUrl ? 'Check' : 'Copy'} size={12} />
                      <span>{copiedServerUrl ? 'Copied Invite Link!' : 'Copy Server Invite'}</span>
                    </button>
                  </div>

                  <div className="auth-form-submit-row">
                    <button type="submit" className="btn-primary auth-submit-btn">
                      <Icon name={isSigningUp ? 'UserCheck' : 'LogIn'} size={15} />
                      <span>{isSigningUp ? 'Create Developer Account' : 'Sign In with Email'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Toggle Sign Up vs Sign In */}
              <div className="auth-switch-mode-row">
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => setIsSigningUp(!isSigningUp)}
                >
                  {isSigningUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </button>
                <span className="auth-dot-sep">•</span>
                <button type="button" className="auth-link-btn" onClick={onClose}>
                  Continue as Guest
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ================================================================= */
          /* VIEW 2: ACCOUNT SETTINGS (Matches Image 1)                        */
          /* ================================================================= */
          <>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-icon">
                  <Icon name="User" size={20} />
                </span>
                <div>
                  <h2 className="modal-title">Developer Account Settings</h2>
                  <span className="modal-subtitle">
                    Manage your verified Yapin profile, public handle, and cloud synchronization
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={onClose}
                aria-label="Close settings"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="account-modal-body">
              {statusMsg && (
                <div className="account-status-alert">
                  <Icon name="Check" size={14} /> {statusMsg}
                </div>
              )}

              {/* Profile Hero Card (Image 1) */}
              <div className="profile-hero-card">
                <div className="profile-avatar-large">
                  <Icon name="Zap" size={24} />
                  <span className="profile-status-dot online" title="Online & Connected" />
                </div>

                <div className="profile-details">
                  <div className="profile-name-row">
                    <h3 className="profile-name">{username}</h3>
                    {user.isVerified && (
                      <span className="profile-badge verified-badge">
                        <Icon name="ShieldCheck" size={12} /> VERIFIED BOT MAKER
                      </span>
                    )}
                  </div>

                  {/* Handle Row with Copy Handle Button (Image 1) */}
                  <div className="profile-handle-row">
                    <code className="profile-handle-tag">{handle}</code>
                    <button
                      type="button"
                      className="btn-copy-handle"
                      onClick={handleCopyHandle}
                      title="Copy handle"
                    >
                      <Icon name={copiedHandle ? 'Check' : 'Copy'} size={12} />
                      <span>{copiedHandle ? 'Copied!' : 'Copy handle'}</span>
                    </button>
                  </div>

                  <span className="profile-email-text">{email}</span>
                </div>

                <div className="profile-card-side-actions">
                  <button
                    type="button"
                    className="btn-secondary profile-action-btn"
                    onClick={() => setViewMode('signin')}
                  >
                    <Icon name="RefreshCw" size={13} />
                    <span>Switch account</span>
                  </button>
                </div>
              </div>

              {/* Official Server Verification Banner */}
              <div className="official-server-disclaimer-box settings-server-banner">
                <div className="disclaimer-header">
                  <Icon name="Crown" size={15} />
                  <span className="disclaimer-title">Official Server Verified Role</span>
                </div>
                <p className="disclaimer-text">
                  Your account is linked with the official Yapin community server:{' '}
                  <a
                    href={OFFICIAL_SERVER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="disclaimer-link"
                  >
                    {OFFICIAL_SERVER_URL}
                  </a>
                </p>
                <button
                  type="button"
                  className="disclaimer-copy-btn"
                  onClick={handleCopyServerLink}
                >
                  <Icon name={copiedServerUrl ? 'Check' : 'Copy'} size={12} />
                  <span>{copiedServerUrl ? 'Copied Invite Link!' : 'Copy Server Invite'}</span>
                </button>
              </div>

              {/* Developer Profile Identity Settings */}
              <div className="account-section">
                <h4 className="account-section-title">Developer Identity</h4>
                <div className="account-inputs-grid">
                  <div className="account-input-box">
                    <label>Display Name</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="modal-input"
                    />
                  </div>
                  <div className="account-input-box">
                    <label>Yapin Handle</label>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="modal-input"
                    />
                  </div>
                </div>
                <div className="account-input-box single-box">
                  <label>Notification Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="modal-input"
                  />
                </div>
              </div>

              {/* Community Preferences (Image 1) */}
              <div className="account-section">
                <h4 className="account-section-title">Community & Cloud Preferences</h4>
                <div className="sync-toggles-list">
                  <label className="sync-toggle-row">
                    <div className="sync-toggle-info">
                      <span className="sync-toggle-name">Public Profile in Marketplace</span>
                      <span className="sync-toggle-sub">
                        Show your verified developer badge and published flows on community items
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={communityPublic}
                      onChange={setCommunityPublic}
                      label="Public profile in Marketplace"
                    />
                  </label>

                  <label className="sync-toggle-row">
                    <div className="sync-toggle-info">
                      <span className="sync-toggle-name">Direct Feedback & Ratings</span>
                      <span className="sync-toggle-sub">
                        Receive instant notifications when other developers rate or download your
                        flows
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={allowDms}
                      onChange={setAllowDms}
                      label="Direct Feedback & Ratings"
                    />
                  </label>

                  <label className="sync-toggle-row">
                    <div className="sync-toggle-info">
                      <span className="sync-toggle-name">Yapin Cloud Project Sync</span>
                      <span className="sync-toggle-sub">
                        Automatically synchronize canvas graphs across your desktop workstations
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={cloudSync}
                      onChange={setCloudSync}
                      label="Yapin Cloud Project Sync"
                    />
                  </label>

                  <label className="sync-toggle-row">
                    <div className="sync-toggle-info">
                      <span className="sync-toggle-name">Automated Cloud Backups</span>
                      <span className="sync-toggle-sub">
                        Save versioned rollbacks of .yapbot.json files in your cloud storage
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={autoBackup}
                      onChange={setAutoBackup}
                      label="Automated Cloud Backups"
                    />
                  </label>
                </div>
              </div>

              {/* Account Management & Danger Zone */}
              <div className="account-section danger-zone-section">
                <h4 className="account-section-title danger-title">Account Management</h4>
                <div className="danger-actions-row">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      logout()
                      setViewMode('signin')
                    }}
                  >
                    <Icon name="LogOut" size={14} />
                    <span>Sign Out</span>
                  </button>

                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Icon name="Trash2" size={14} />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>

              {/* Delete Account Confirmation Dialog */}
              {showDeleteConfirm && (
                <div
                  className="confirm-dialog-backdrop"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-dialog-header">
                      <Icon name="AlertTriangle" size={20} />
                      <h3>Delete Yapin Account?</h3>
                    </div>
                    <p className="confirm-dialog-msg">
                      Are you sure you want to delete your account? All published marketplace flows,
                      cloud backups, and your verified role will be revoked.
                    </p>
                    <div className="confirm-dialog-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={handleDeleteAccountConfirm}
                      >
                        Yes, Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveChanges}>
                <Icon name="Check" size={14} />
                <span>Save Changes</span>
              </button>
            </div>
          </>
        )}
        <div className="modal-footer">
          <span>{isLoggedIn ? `Signed in as ${user.username}` : 'Not signed in'}</span>
          {isLoggedIn && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                logout()
                setViewMode('signin')
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'settings'
}) => {
  if (!isOpen) return null

  return (
    <AccountModalInner
      key={`${initialMode}-${isOpen}`}
      onClose={onClose}
      initialMode={initialMode}
    />
  )
}
