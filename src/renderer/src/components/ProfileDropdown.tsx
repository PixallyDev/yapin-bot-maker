import React, { useState, useEffect, useRef } from 'react'
import { useAccount } from '../accountStore'
import { Icon } from './Icon'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  onOpenAccountSettings: () => void
  onSwitchAccount: () => void
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  onOpenAccountSettings,
  onSwitchAccount
}) => {
  const { user, isLoggedIn, logout } = useAccount()
  const menuRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleClickOutside, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopyEmail = (): void => {
    const textToCopy = isLoggedIn ? user.email : 'guest@yapin.local'
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(textToCopy)
    }
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      onClose()
    }, 1200)
  }

  const handleSignOut = (): void => {
    logout()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="profile-dropdown-menu nodrag nopan"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info */}
      <div className="profile-dropdown-header">
        <div className="profile-dropdown-avatar">
          {isLoggedIn && user.avatar ? (
            <img src={user.avatar} alt={user.username} className="profile-dropdown-avatar-img" />
          ) : (
            <Icon name={isLoggedIn ? 'User' : 'UserCheck'} size={18} />
          )}
          <span className={`avatar-status-dot ${isLoggedIn ? 'online' : 'offline'}`} />
        </div>
        <div className="profile-dropdown-userinfo">
          <div className="profile-dropdown-name-row">
            <span className="profile-dropdown-name">
              {isLoggedIn ? user.username : 'Guest User'}
            </span>
            {isLoggedIn && user.isVerified && (
              <span className="profile-verified-badge" title="Verified Developer">
                <Icon name="Check" size={11} strokeWidth={3} /> VERIFIED
              </span>
            )}
          </div>
          <span className="profile-dropdown-handle">
            {isLoggedIn ? user.handle : 'Local Session'}
          </span>
          <span className="profile-dropdown-email">
            {isLoggedIn ? user.email : 'No Yapin Account linked'}
          </span>
        </div>
      </div>

      <div className="profile-dropdown-divider" />

      {/* Menu Actions */}
      <div className="profile-dropdown-actions">
        <button type="button" className="profile-dropdown-item" onClick={handleCopyEmail}>
          <Icon name={copied ? 'Check' : 'Copy'} size={14} />
          <span>{copied ? 'Copied Email!' : 'Copy email'}</span>
        </button>

        <button
          type="button"
          className="profile-dropdown-item"
          onClick={() => {
            onSwitchAccount()
            onClose()
          }}
        >
          <Icon name="RefreshCw" size={14} />
          <span>{isLoggedIn ? 'Switch account' : 'Sign in with Yapin'}</span>
        </button>

        <button
          type="button"
          className="profile-dropdown-item"
          onClick={() => {
            onOpenAccountSettings()
            onClose()
          }}
        >
          <Icon name="Settings" size={14} />
          <span>Account settings</span>
        </button>

        <div className="profile-dropdown-divider" />

        {isLoggedIn ? (
          <button
            type="button"
            className="profile-dropdown-item item-danger"
            onClick={handleSignOut}
          >
            <Icon name="LogOut" size={14} />
            <span>Sign out</span>
          </button>
        ) : (
          <button
            type="button"
            className="profile-dropdown-item item-primary"
            onClick={() => {
              onSwitchAccount()
              onClose()
            }}
          >
            <Icon name="LogIn" size={14} />
            <span>Sign in to Yapin</span>
          </button>
        )}
      </div>
    </div>
  )
}
