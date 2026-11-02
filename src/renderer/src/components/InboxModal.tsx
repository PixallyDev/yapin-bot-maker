import React, { useState } from 'react'
import { useAccount, NotificationItem } from '../accountStore'
import { Icon } from './Icon'

interface InboxModalProps {
  isOpen: boolean
  onClose: () => void
}

export const InboxModal: React.FC<InboxModalProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications
  } = useAccount()
  const [filter, setFilter] = useState<
    'all' | 'unread' | 'rating' | 'install' | 'changelog' | 'friend_share'
  >('all')

  if (!isOpen) return null

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'rating') return n.type === 'rating'
    if (filter === 'install') return n.type === 'install'
    if (filter === 'changelog') return n.type === 'changelog'
    if (filter === 'friend_share') return n.type === 'friend_share'
    return true
  })

  const getIconForType = (type: NotificationItem['type']): string => {
    switch (type) {
      case 'rating':
        return 'Star'
      case 'install':
        return 'Download'
      case 'changelog':
        return 'Rocket'
      case 'friend_share':
        return 'Users'
      case 'support':
        return 'LifeBuoy'
      default:
        return 'Bell'
    }
  }

  const renderStars = (rating?: number): React.ReactNode => {
    if (!rating) return null
    return (
      <span className="notif-rating-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < rating ? 'star-filled' : 'star-empty'}>
            ★
          </span>
        ))}
        <span className="rating-num">({rating}.0)</span>
      </span>
    )
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="inbox-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon inbox-modal-icon">
              <Icon name="Inbox" size={18} />
              {unreadCount > 0 && <span className="inbox-header-badge">{unreadCount}</span>}
            </span>
            <div>
              <h2 className="modal-title">Developer Inbox</h2>
              <span className="modal-subtitle">
                Marketplace ratings, flow downloads, and platform updates
              </span>
            </div>
          </div>
          <div className="header-right-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="inbox-action-btn"
                onClick={markAllNotificationsRead}
                title="Mark all notifications as read"
              >
                <Icon name="CheckCheck" size={14} />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="inbox-action-btn"
                onClick={clearNotifications}
                title="Clear all notifications"
              >
                <Icon name="Trash2" size={14} />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close inbox"
            >
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="inbox-filter-bar">
          <button
            type="button"
            className={`inbox-filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`inbox-filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`inbox-filter-tab ${filter === 'rating' ? 'active' : ''}`}
            onClick={() => setFilter('rating')}
          >
            Ratings
          </button>
          <button
            type="button"
            className={`inbox-filter-tab ${filter === 'install' ? 'active' : ''}`}
            onClick={() => setFilter('install')}
          >
            Downloads
          </button>
          <button
            type="button"
            className={`inbox-filter-tab ${filter === 'changelog' ? 'active' : ''}`}
            onClick={() => setFilter('changelog')}
          >
            Updates
          </button>
          <button
            type="button"
            className={`inbox-filter-tab ${filter === 'friend_share' ? 'active' : ''}`}
            onClick={() => setFilter('friend_share')}
          >
            Shared Flows
          </button>
        </div>

        {/* Notification List */}
        <div className="inbox-modal-body">
          {filteredNotifs.length === 0 ? (
            <div className="inbox-empty-state">
              <span className="empty-inbox-icon">
                <Icon name="Inbox" size={36} />
              </span>
              <h3>No notifications</h3>
              <p>
                {filter === 'unread'
                  ? 'You are all caught up! No unread notifications.'
                  : 'Your inbox is clear.'}
              </p>
            </div>
          ) : (
            <div className="inbox-notifs-list">
              {filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  className={`inbox-notif-card notif-type-${n.type} ${!n.read ? 'unread' : ''}`}
                  onClick={() => markNotificationRead(n.id)}
                >
                  <div className={`notif-icon-circle type-${n.type}`}>
                    <Icon name={getIconForType(n.type)} size={16} />
                  </div>

                  <div className="notif-content-area">
                    <div className="notif-top-row">
                      <div className="notif-title-group">
                        <span className="notif-title">{n.title}</span>
                        {!n.read && <span className="notif-unread-dot" />}
                      </div>
                      <span className="notif-timestamp">{n.timestamp}</span>
                    </div>

                    <p className="notif-message-text">{n.message}</p>

                    {n.rating && (
                      <div className="notif-extra-row">
                        {renderStars(n.rating)}
                        {n.fromUser && (
                          <span className="notif-reviewer-badge">Review by {n.fromUser}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer inbox-modal-footer">
          <span className="inbox-footer-hint">
            <Icon name="Info" size={13} /> Notifications sync with your Yapin developer profile.
          </span>
          <button type="button" className="btn-primary" onClick={onClose}>
            Close Inbox
          </button>
        </div>
      </div>
    </div>
  )
}
