import React from 'react'

export type NavTabId = 'home' | 'canvas' | 'projects' | 'marketplace' | 'themes' | 'plugins'

interface SidebarProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
  isRunning: boolean
  onOpenSettings: () => void
  onOpenAccount: () => void
}

interface NavItem {
  id: NavTabId
  label: string
  icon: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'canvas', label: 'Flow Editor', icon: '⚡' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'marketplace', label: 'Marketplace', icon: '🛒', badge: 'NEW' },
  { id: 'themes', label: 'Themes', icon: '🎨' },
  { id: 'plugins', label: 'Plugins', icon: '🔌' }
]

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isRunning,
  onOpenSettings,
  onOpenAccount
}) => {
  return (
    <aside className="app-sidebar nodrag nopan">
      {/* Top Branding / Logo */}
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-logo-btn"
          onClick={() => onSelectTab('home')}
          title="Yapin Bot Maker Home"
        >
          <div className="sidebar-logo-icon">
            <span>⚡</span>
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
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
                {item.badge && <span className="nav-item-badge">{item.badge}</span>}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Bottom Actions: Account & Settings */}
      <div className="sidebar-bottom">
        <div className="sidebar-divider" />

        {/* User Account / Profile */}
        <button
          type="button"
          className="sidebar-action-item user-profile-btn"
          onClick={onOpenAccount}
          title="Account Profile & Cloud Sync"
        >
          <div className="user-avatar-small">
            <span>👤</span>
            <span className="avatar-status-dot" />
          </div>
          <span className="nav-item-label">Account</span>
        </button>

        {/* Preferences / Settings */}
        <button
          type="button"
          className="sidebar-action-item settings-btn"
          onClick={onOpenSettings}
          title="Settings & Preferences"
        >
          <span className="nav-item-icon">⚙️</span>
          <span className="nav-item-label">Settings</span>
        </button>
      </div>
    </aside>
  )
}
