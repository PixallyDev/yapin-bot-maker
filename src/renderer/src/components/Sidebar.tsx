import React from 'react'
import { Icon } from './Icon'
import { useAccount } from '../accountStore'

export type NavTabId = 'home' | 'canvas' | 'projects' | 'marketplace' | 'themes'

interface SidebarProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
  isRunning: boolean
  onOpenSettings: () => void
  onOpenAccount: () => void
  onOpenInbox: () => void
  onOpenProfileMenu: () => void
}

interface NavItem {
  id: NavTabId
  label: string
  icon: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'Home' },
  { id: 'canvas', label: 'Flow Editor', icon: 'Zap' },
  { id: 'projects', label: 'Projects', icon: 'Folder' },
  { id: 'marketplace', label: 'Marketplace', icon: 'ShoppingCart', badge: 'NEW' },
  { id: 'themes', label: 'Themes', icon: 'Palette' }
]

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isRunning,
  onOpenSettings,
  onOpenInbox,
  onOpenProfileMenu
}) => {
  const { user, isLoggedIn, unreadCount } = useAccount()

  return (
    <aside className="app-sidebar nodrag nopan">
      {/* Top Branding / Logo */}
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-logo-btn"
          onClick={() => onSelectTab('home')}
          title="Yapper Maker Home"
        >
          <div className="sidebar-logo-icon">
            <span>
              <Icon name="Zap" />
            </span>
          </div>
          {isRunning && <span className="sidebar-running-dot" title="Bot is currently running!" />}
        </button>
      </div>

      <div className="sidebar-divider" />

      {/* Main Navigation Links */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
              title={`${item.label} (${item.icon})`}
            >
              <div className="nav-item-indicator" />
              <div className="nav-item-content">
                <span className="nav-item-icon">
                  <Icon name={item.icon} />
                </span>
                <span className="nav-item-label">{item.label}</span>
                {item.badge && <span className="nav-item-badge">{item.badge}</span>}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Bottom Actions: Inbox, Account & Settings */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />

        {/* Inbox Button with Unread Badge (Image 5) */}
        <button
          type="button"
          className="sidebar-action-item inbox-btn"
          onClick={onOpenInbox}
          title={
            unreadCount > 0
              ? `Inbox (${unreadCount} unread notification${unreadCount > 1 ? 's' : ''})`
              : 'Inbox & Notifications'
          }
        >
          <div className="inbox-icon-container">
            <span className="nav-item-icon">
              <Icon name="Inbox" />
            </span>
            {unreadCount > 0 && (
              <span className="sidebar-unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          <span className="nav-item-label">Inbox</span>
        </button>

        {/* User Account / Profile (Image 6) */}
        <button
          type="button"
          className="sidebar-action-item user-profile-btn"
          onClick={onOpenProfileMenu}
          title={
            isLoggedIn ? `${user.username} (${user.handle})` : 'Guest Developer (Click to sign in)'
          }
        >
          <div className="user-avatar-small">
            {isLoggedIn && user.avatar ? (
              <img src={user.avatar} alt={user.username} className="user-avatar-img" />
            ) : (
              <span>
                <Icon name={isLoggedIn ? 'User' : 'UserCheck'} />
              </span>
            )}
            <span className={`avatar-status-dot ${isLoggedIn ? 'online' : 'offline'}`} />
          </div>
          <span className="nav-item-label">{isLoggedIn ? 'Profile' : 'Guest'}</span>
        </button>

        {/* Preferences / Settings */}
        <button
          type="button"
          className="sidebar-action-item settings-btn"
          onClick={onOpenSettings}
          title="Settings & Preferences"
        >
          <span className="nav-item-icon">
            <Icon name="Settings" />
          </span>
          <span className="nav-item-label">Settings</span>
        </button>
      </div>
    </aside>
  )
}
