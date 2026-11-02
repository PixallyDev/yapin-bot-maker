import { useState, useEffect, useCallback, createContext, useContext } from 'react'

export interface UserProfile {
  verified?: boolean
  displayName?: string
  authSource?: 'oauth'
  id: string
  username: string
  handle: string
  email: string
  avatar?: string
  isVerified: boolean
  communityPublicProfile: boolean
  allowDirectMessages: boolean
  syncCloud: boolean
  autoBackup: boolean
}

export interface NotificationItem {
  id: string
  type: 'rating' | 'install' | 'changelog' | 'system' | 'friend_share' | 'support'
  title: string
  message: string
  timestamp: string
  read: boolean
  rating?: number
  itemName?: string
  fromUser?: string
  recipient?: string
  nodesCount?: number
  hasCsv?: boolean
  payloadSnippet?: {
    nodes?: unknown[]
    edges?: unknown[]
  }
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  username: 'Guest',
  handle: '',
  email: '',
  isVerified: false,
  communityPublicProfile: true,
  allowDirectMessages: true,
  syncCloud: true,
  autoBackup: true
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    type: 'rating',
    title: 'New Marketplace Rating',
    message:
      'You got a 5 Star rating on your marketplace item "Ping & FAQ Starter Bot" by @cryptoking',
    rating: 5,
    itemName: 'Ping & FAQ Starter Bot',
    fromUser: '@cryptoking',
    timestamp: '10m ago',
    read: false
  },
  {
    id: 'notif_2',
    type: 'install',
    title: 'Flow Downloaded',
    message: 'Your community flow "Sentinel Auto-Moderator" was downloaded by Guest 42.',
    itemName: 'Sentinel Auto-Moderator',
    timestamp: '1h ago',
    read: false
  },
  {
    id: 'notif_3',
    type: 'changelog',
    title: 'Yapper Maker v1.2.0 Released',
    message:
      'Multi-node selection, floating action bar, developer inbox, and bot project settings are now live.',
    timestamp: 'Yesterday',
    read: false
  },
  {
    id: 'notif_4',
    type: 'rating',
    title: 'New Marketplace Rating',
    message:
      'You got a 5 Star rating on your marketplace item "Arcade Fun & Global Counter" by @alex_dev',
    rating: 5,
    itemName: 'Arcade Fun & Global Counter',
    fromUser: '@alex_dev',
    timestamp: '2d ago',
    read: true
  },
  {
    id: 'notif_5',
    type: 'friend_share',
    title: 'Flow Snippet Shared: Auto-Mod Bad Words Branch',
    message:
      '@bot_builder shared "Auto-Mod Bad Words Branch" with you: "Check out this custom condition chain!" (5 nodes, includes variables CSV)',
    itemName: 'Auto-Mod Bad Words Branch',
    fromUser: '@bot_builder',
    nodesCount: 5,
    hasCsv: true,
    timestamp: '3d ago',
    read: true
  }
]

export const OFFICIAL_SERVER_URL = 'https://yapin.gg/invite/cQNDdPFZcW'

export interface AccountContextType {
  isLoggedIn: boolean
  user: UserProfile
  notifications: NotificationItem[]
  unreadCount: number
  guestDownloadCount: number
  loginWithYapin: (handle?: string, email?: string, extra?: Partial<UserProfile>) => void
  logout: () => void
  updateProfile: (patch: Partial<UserProfile>) => void
  deleteAccount: () => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
  recordDownload: (itemName: string) => { isGuest: boolean; guestName?: string }
  addRatingNotification: (itemName: string, rating: number, fromUser?: string) => void
  addFriendShareNotification: (
    title: string,
    fromUser: string,
    recipient: string,
    message?: string,
    nodesCount?: number,
    hasCsv?: boolean,
    payloadSnippet?: { nodes?: unknown[]; edges?: unknown[] }
  ) => void
  addSupportTicketNotification: (
    subject: string,
    ticketId: string,
    message?: string,
    nodesCount?: number
  ) => void
}

const STORAGE_KEY_AUTH = 'yapin_auth_is_logged_in'
const STORAGE_KEY_PROFILE = 'yapin_user_profile_v1'
const STORAGE_KEY_NOTIFS = 'yapin_user_notifications_v1'
const STORAGE_KEY_GUEST_CTR = 'yapin_guest_download_counter'

export const AccountContext = createContext<AccountContextType | null>(null)

export function useAccount(): AccountContextType {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccount must be used within an AccountProvider')
  }
  return ctx
}

export function useAccountState(): AccountContextType {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH)
      return (
        stored === 'true' &&
        JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILE) || '{}').authSource === 'oauth'
      )
    } catch {
      return false
    }
  })

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE)
      if (stored) {
        return { ...DEFAULT_USER_PROFILE, ...JSON.parse(stored) }
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_USER_PROFILE
  })

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFS)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      /* ignore */
    }
    return INITIAL_NOTIFICATIONS
  })

  const [guestDownloadCount, setGuestDownloadCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GUEST_CTR)
      return stored ? parseInt(stored, 10) || 42 : 42
    } catch {
      return 42
    }
  })

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, String(isLoggedIn))
    } catch {
      /* ignore */
    }
  }, [isLoggedIn])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(user))
    } catch {
      /* ignore */
    }
  }, [user])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifications))
    } catch {
      /* ignore */
    }
  }, [notifications])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_CTR, String(guestDownloadCount))
    } catch {
      /* ignore */
    }
  }, [guestDownloadCount])

  const unreadCount = notifications.filter((n) => !n.read).length

  const loginWithYapin = useCallback(
    (customHandle?: string, customEmail?: string, extra?: Partial<UserProfile>) => {
      if (!extra?.id || extra.verified !== true) return
      setIsLoggedIn(true)
      setUser((prev) => ({
        ...prev,
        ...extra,
        handle: customHandle || extra?.handle || prev.handle || '@yapin_developer',
        email: customEmail || extra?.email || '',
        username:
          extra?.username ||
          (customHandle ? customHandle.replace(/^@/, '') : prev.username || 'YapinDeveloper'),
        avatar: extra?.avatar,
        isVerified: true,
        verified: true,
        authSource: 'oauth'
      }))
      window.dispatchEvent(new CustomEvent('yapin:signin', { detail: extra.username }))
    },
    []
  )

  const logout = useCallback(() => {
    setIsLoggedIn(false)
  }, [])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...patch }))
  }, [])

  const deleteAccount = useCallback(() => {
    setIsLoggedIn(false)
    setUser(DEFAULT_USER_PROFILE)
    setNotifications([])
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH)
      localStorage.removeItem(STORAGE_KEY_PROFILE)
      localStorage.removeItem(STORAGE_KEY_NOTIFS)
    } catch {
      /* ignore */
    }
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const recordDownload = useCallback(
    (itemName: string): { isGuest: boolean; guestName?: string } => {
      if (!isLoggedIn) {
        const nextNum = guestDownloadCount + 1
        setGuestDownloadCount(nextNum)
        const guestTag = `Guest ${nextNum}`

        // Add notification to inbox
        const newNotif: NotificationItem = {
          id: `notif_guest_${Date.now()}`,
          type: 'install',
          title: 'Guest Download Recorded',
          message: `Flow "${itemName}" was downloaded by ${guestTag}.`,
          itemName,
          timestamp: 'Just now',
          read: false
        }
        setNotifications((prev) => [newNotif, ...prev])

        return { isGuest: true, guestName: guestTag }
      }

      // If logged in
      const newNotif: NotificationItem = {
        id: `notif_dl_${Date.now()}`,
        type: 'install',
        title: 'Package Installed',
        message: `You installed "${itemName}" into your local studio workspace.`,
        itemName,
        timestamp: 'Just now',
        read: false
      }
      setNotifications((prev) => [newNotif, ...prev])

      return { isGuest: false }
    },
    [isLoggedIn, guestDownloadCount]
  )

  const addRatingNotification = useCallback(
    (itemName: string, rating: number, fromUser = '@community_member') => {
      const newNotif: NotificationItem = {
        id: `notif_rating_${Date.now()}`,
        type: 'rating',
        title: 'New Marketplace Rating',
        message: `You got a ${rating} Star rating on your marketplace item "${itemName}" by ${fromUser}`,
        rating,
        itemName,
        fromUser,
        timestamp: 'Just now',
        read: false
      }
      setNotifications((prev) => [newNotif, ...prev])
    },
    []
  )

  const addFriendShareNotification = useCallback(
    (
      title: string,
      fromUser: string,
      recipient: string,
      message?: string,
      nodesCount = 0,
      hasCsv = false,
      payloadSnippet?: { nodes?: unknown[]; edges?: unknown[] }
    ) => {
      const newNotif: NotificationItem = {
        id: `notif_share_${Date.now()}`,
        type: 'friend_share',
        title: `Flow Snippet Shared: ${title}`,
        message: `${fromUser} shared "${title}" with ${recipient}${
          message ? `: "${message}"` : '.'
        } (${nodesCount} nodes${hasCsv ? ', includes variables CSV' : ''})`,
        itemName: title,
        fromUser,
        recipient,
        nodesCount,
        hasCsv,
        payloadSnippet,
        timestamp: 'Just now',
        read: false
      }
      setNotifications((prev) => [newNotif, ...prev])
    },
    []
  )

  const addSupportTicketNotification = useCallback(
    (subject: string, ticketId: string, message?: string, nodesCount = 0) => {
      const newNotif: NotificationItem = {
        id: `notif_support_${Date.now()}`,
        type: 'support',
        title: `Support Ticket Created: #${ticketId}`,
        message: `Your diagnostic flow package for "${subject}" (${nodesCount} nodes) has been submitted to Yapin Support.${
          message ? ` Note: "${message}"` : ''
        }`,
        itemName: subject,
        timestamp: 'Just now',
        read: false
      }
      setNotifications((prev) => [newNotif, ...prev])
    },
    []
  )

  return {
    isLoggedIn,
    user,
    notifications,
    unreadCount,
    guestDownloadCount,
    loginWithYapin,
    logout,
    updateProfile,
    deleteAccount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    recordDownload,
    addRatingNotification,
    addFriendShareNotification,
    addSupportTicketNotification
  }
}
