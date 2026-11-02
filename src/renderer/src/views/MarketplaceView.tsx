import React, { useState, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BackgroundVariant
} from '@xyflow/react'
import {
  MarketplaceItem,
  MARKETPLACE_ITEMS,
  DEFAULT_COMMUNITY_TAGS,
  withMarketplaceReview,
  ItemReview
} from '../marketplaceData'
import { Icon } from '../components/Icon'
import { nodeTypes } from '../nodes'
import { applyTheme, getActiveThemeId } from '../themes'
import { useAccount } from '../accountStore'
import { AuthGuardModal } from '../components/AuthGuardModal'
import { CustomTagSelector } from '../components/CustomTagSelector'
import { BotNode, BotEdge } from '../types'

interface InitialPublishItem {
  name: string
  nodes?: BotNode[]
  edges?: BotEdge[]
}

interface MarketplaceViewProps {
  onInstallItem: (item: MarketplaceItem) => void
  onApplyTheme: (themeId: string) => void
  onOpenAccount?: (mode?: 'settings' | 'signin') => void
  initialPublishItem?: InitialPublishItem | null
  onClearInitialPublish?: () => void
}

const STORAGE_KEY_COMMUNITY_TAGS = 'yapin_community_tags_v1'

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onInstallItem,
  onApplyTheme,
  onOpenAccount,
  initialPublishItem,
  onClearInitialPublish
}) => {
  const { isLoggedIn, user, recordDownload, addRatingNotification } = useAccount()

  // Items state (dynamic so newly published flows & submitted reviews persist in session)
  const [items, setItems] = useState<MarketplaceItem[]>(() => [...MARKETPLACE_ITEMS])

  // Community tags database (persisted to localStorage)
  const [communityTags, setCommunityTags] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMMUNITY_TAGS)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        return Array.from(new Set([...DEFAULT_COMMUNITY_TAGS, ...parsed]))
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_COMMUNITY_TAGS
  })

  const [activeTab, setActiveTab] = useState<'all' | 'template' | 'node' | 'theme'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewItem, setPreviewItem] = useState<MarketplaceItem | null>(null)
  const previousThemeIdRef = useRef<string | null>(null)

  // Auth Guard & Publish & Ratings state
  const [authGuardAction, setAuthGuardAction] = useState<string | null>(() =>
    initialPublishItem && !isLoggedIn ? 'publish flows and templates to the Marketplace' : null
  )
  const [publishModalOpen, setPublishModalOpen] = useState(
    Boolean(initialPublishItem && isLoggedIn)
  )
  const [publishName, setPublishName] = useState(initialPublishItem?.name || '')
  const [publishDesc, setPublishDesc] = useState(
    initialPublishItem
      ? `Community flow containing ${initialPublishItem.nodes?.length || 0} nodes.`
      : ''
  )
  const [publishCategory, setPublishCategory] = useState<
    'moderation' | 'utility' | 'fun' | 'community' | 'economy'
  >('utility')
  const [publishTags, setPublishTags] = useState<string[]>(['commands', 'utility'])
  const [publishNodes, setPublishNodes] = useState<BotNode[]>(initialPublishItem?.nodes ?? [])
  const [publishEdges, setPublishEdges] = useState<BotEdge[]>(initialPublishItem?.edges ?? [])

  // Review Composer state
  const [isWritingReview, setIsWritingReview] = useState(false)
  const [reviewStars, setReviewStars] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [toast, setToast] = useState('')
  const [userRatings, setUserRatings] = useState<Record<string, number>>({})

  const showToast = (msg: string): void => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const handleAddCommunityTag = (newTag: string): void => {
    setCommunityTags((prev) => {
      if (prev.includes(newTag)) return prev
      const updated = [...prev, newTag]
      try {
        localStorage.setItem(STORAGE_KEY_COMMUNITY_TAGS, JSON.stringify(updated))
      } catch {
        /* ignore */
      }
      return updated
    })
  }

  const handleOpenPreview = (item: MarketplaceItem): void => {
    if (item.type === 'theme' && item.themeId) {
      previousThemeIdRef.current = getActiveThemeId()
      applyTheme(item.themeId)
    }
    setPreviewItem(item)
    setIsWritingReview(false)
  }

  const handleClosePreview = (): void => {
    if (previewItem?.type === 'theme' && previousThemeIdRef.current) {
      applyTheme(previousThemeIdRef.current)
      previousThemeIdRef.current = null
    }
    setPreviewItem(null)
    setIsWritingReview(false)
  }

  const handleApplyThemeFromPreview = (themeId: string): void => {
    onApplyTheme(themeId)
    previousThemeIdRef.current = null
    setPreviewItem(null)
    showToast('Theme applied to studio workspace.')
  }

  const handleInstall = (item: MarketplaceItem): void => {
    const result = recordDownload(item.name)
    if (result.isGuest) {
      showToast(`Downloaded as ${result.guestName}! Package imported into flow canvas.`)
    } else {
      showToast(`Downloaded by ${user.handle}! Package imported into flow canvas.`)
    }
    onInstallItem(item)
  }

  const handleRate = (item: MarketplaceItem, rating: number): void => {
    if (!isLoggedIn) {
      setAuthGuardAction('rate community items and leave reviews')
      return
    }
    setUserRatings((prev) => ({ ...prev, [item.id]: rating }))
    addRatingNotification(item.name, rating, user.handle)

    // Recalculate average rating on item
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === item.id) {
          const currentReviews = i.reviews ?? []
          const existingUserRevIdx = currentReviews.findIndex(
            (r) => !r.sample && r.author === user.handle
          )
          let updatedReviews: ItemReview[]
          if (existingUserRevIdx >= 0) {
            updatedReviews = currentReviews.map((r, idx) =>
              idx === existingUserRevIdx ? { ...r, rating, date: 'Just now' } : r
            )
          } else {
            updatedReviews = [
              {
                id: `rev-${Date.now()}`,
                author: user.handle,
                rating,
                date: 'Just now',
                comment: `Rated ${rating} stars by ${user.handle}.`
              },
              ...currentReviews
            ]
          }
          const updatedItem = withMarketplaceReview(
            i,
            updatedReviews.find((r) => !r.sample && r.author === user.handle)!
          )
          if (previewItem?.id === item.id) {
            setPreviewItem(updatedItem)
          }
          return updatedItem
        }
        return i
      })
    )

    showToast(`Rated "${item.name}" ${rating} stars! Thank you for supporting the creator.`)
  }

  const handleOpenWriteReview = (): void => {
    if (!isLoggedIn) {
      setAuthGuardAction('write reviews and rate marketplace items')
      return
    }
    setIsWritingReview(true)
  }

  const handleSubmitReview = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!previewItem) return
    if (!isLoggedIn) {
      setAuthGuardAction('write reviews and rate marketplace items')
      return
    }

    const newRev: ItemReview = {
      id: `rev-${Date.now()}`,
      author: user.handle,
      rating: reviewStars,
      date: 'Just now',
      comment: reviewComment.trim() || `Rated ${reviewStars} stars by verified developer.`
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === previewItem.id) {
          const updatedItem = withMarketplaceReview(i, newRev)
          setPreviewItem(updatedItem)
          return updatedItem
        }
        return i
      })
    )

    addRatingNotification(previewItem.name, reviewStars, user.handle)
    setIsWritingReview(false)
    setReviewComment('')
    showToast(`Review for "${previewItem.name}" submitted successfully!`)
  }

  const handlePublishClick = (): void => {
    if (!isLoggedIn) {
      setAuthGuardAction('publish flows and templates to the Marketplace')
      return
    }
    setPublishName('')
    setPublishDesc('')
    setPublishCategory('utility')
    setPublishTags(['commands', 'utility'])
    setPublishNodes([])
    setPublishEdges([])
    setPublishModalOpen(true)
  }

  const handleClosePublishModal = (): void => {
    setPublishModalOpen(false)
    if (onClearInitialPublish) onClearInitialPublish()
  }

  const handlePublishSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!publishName.trim()) return

    const newItem: MarketplaceItem = {
      id: `market-user-${Date.now()}`,
      name: publishName.trim(),
      type: 'template',
      category: publishCategory,
      author: user.handle,
      authorVerified: user.isVerified,
      version: '1.0.0',
      downloads: 1,
      rating: 5.0,
      reviewsCount: 1,
      reviews: [
        {
          id: `rev-initial-${Date.now()}`,
          author: user.handle,
          rating: 5,
          date: 'Just now',
          comment: 'Initial release published to the Yapin Creator Marketplace.'
        }
      ],
      description: publishDesc.trim() || `Community flow created and published by ${user.handle}.`,
      tags: publishTags.length > 0 ? publishTags : ['community', 'workflow'],
      icon: 'Rocket',
      nodes: publishNodes.length > 0 ? publishNodes : undefined,
      edges: publishEdges.length > 0 ? publishEdges : undefined,
      nodeCount: publishNodes.length > 0 ? publishNodes.length : 3
    }

    setItems((prev) => [newItem, ...prev])
    setPublishModalOpen(false)
    if (onClearInitialPublish) onClearInitialPublish()
    showToast(`Published "${newItem.name}" to Marketplace as verified creator ${user.handle}!`)
  }

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter
    const matchesTag = !selectedTagFilter || item.tags.includes(selectedTagFilter)
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.authorHandle?.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    return matchesTab && matchesCat && matchesTag && matchesQuery
  })

  return (
    <div className="marketplace-view-container">
      {toast && (
        <div className="flow-toast" role="status">
          {toast}
        </div>
      )}

      {/* Marketplace Top Hero */}
      <div className="marketplace-hero">
        <div className="marketplace-hero-content">
          <div className="marketplace-hero-title-row">
            <div>
              <h1 className="marketplace-hero-title">Yapin Community Marketplace</h1>
              <p className="marketplace-hero-subtitle">
                Explore, install, rate, and publish community bot flows, templates, and studio
                themes
              </p>
            </div>
            <div className="marketplace-header-actions">
              <button
                type="button"
                className="btn-publish-marketplace"
                onClick={handlePublishClick}
              >
                <Icon name="Upload" size={16} />
                <span>Publish Flow</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="marketplace-search-box">
            <span className="search-icon-wrapper">
              <Icon name="Search" />
            </span>
            <input
              type="text"
              className="marketplace-search-input"
              placeholder="Search by name, tags (#moderation, #rpg), author, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <Icon name="X" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Filter Bar */}
      <div className="marketplace-filters-bar">
        <div className="type-tabs-group">
          {(['all', 'template', 'node', 'theme'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`type-tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <Icon
                name={
                  tab === 'all'
                    ? 'Layers'
                    : tab === 'template'
                      ? 'Package'
                      : tab === 'node'
                        ? 'Workflow'
                        : 'Palette'
                }
              />
              <span>
                {tab === 'all'
                  ? 'All Packages'
                  : tab === 'template'
                    ? 'Flow Templates'
                    : tab === 'node'
                      ? 'Community Nodes'
                      : 'Themes'}
              </span>
            </button>
          ))}
        </div>

        <div className="category-filter-pills">
          {['all', 'utility', 'moderation', 'fun', 'community', 'economy'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-pill-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          {selectedTagFilter && (
            <button
              type="button"
              className="cat-pill-btn active filter-active-tag"
              onClick={() => setSelectedTagFilter(null)}
              title="Clear tag filter"
            >
              #{selectedTagFilter} <Icon name="X" size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="marketplace-content-scroll">
        {filteredItems.length === 0 ? (
          <div className="marketplace-empty">
            <span className="empty-icon">
              <Icon name="Search" />
            </span>
            <h3>No marketplace items found</h3>
            <p>Try clearing your search terms or selecting a different category.</p>
          </div>
        ) : (
          <div className="marketplace-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="market-card">
                <div className="market-card-top">
                  <div className="market-icon-box">
                    <span>
                      <Icon name={item.icon} />
                    </span>
                  </div>
                  <div className="market-badge-group">
                    <span className={`type-tag type-${item.type}`}>{item.type.toUpperCase()}</span>
                    <span className="cat-tag">{item.category}</span>
                    {item.sampleMetrics && <span className="cat-tag">Sample stats</span>}
                  </div>
                </div>

                <h3 className="market-card-title">{item.name}</h3>

                {/* Author Info with verified indicator */}
                <div className="market-author-row">
                  <span className="market-author" title={item.authorHandle}>
                    by {item.author}
                  </span>
                  {item.authorVerified && (
                    <span className="market-verified-pill" title="Verified Creator">
                      <Icon name="CheckCheck" size={10} />
                    </span>
                  )}
                  <span className="market-version">• v{item.version}</span>
                </div>

                <p className="market-card-desc">{item.description}</p>

                <div className="market-tags-row">
                  {item.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-pill ${selectedTagFilter === tag ? 'tag-pill-active' : ''}`}
                      onClick={() => setSelectedTagFilter((prev) => (prev === tag ? null : tag))}
                      title={`Filter by #${tag}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                <div className="market-card-footer">
                  <div className="market-stats">
                    <span className="stat-item" title="Downloads">
                      <Icon name="Download" /> {item.downloads.toLocaleString('en-US')}
                    </span>
                    <button
                      type="button"
                      className="stat-item stat-rating-btn"
                      onClick={() => handleRate(item, userRatings[item.id] ? 5 : 5)}
                      title={
                        isLoggedIn
                          ? `Rate ${item.name} (Currently ${
                              userRatings[item.id] ? `${userRatings[item.id]}.0 ★` : item.rating
                            })`
                          : 'Sign in to rate this item'
                      }
                    >
                      <Icon name="Star" />{' '}
                      {userRatings[item.id]
                        ? `${userRatings[item.id]}.0 ★`
                        : item.rating.toFixed(1)}
                      {item.reviewsCount ? ` (${item.reviewsCount} reviews)` : ''}
                    </button>
                  </div>

                  <div className="market-actions">
                    <button
                      type="button"
                      className="market-btn btn-preview"
                      onClick={() => handleOpenPreview(item)}
                    >
                      Preview
                    </button>

                    {item.type === 'theme' ? (
                      <button
                        type="button"
                        className="market-btn btn-install"
                        onClick={() => {
                          if (item.themeId) onApplyTheme(item.themeId)
                        }}
                      >
                        Apply Theme
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="market-btn btn-install"
                        onClick={() => handleInstall(item)}
                        title={
                          isLoggedIn
                            ? 'Install as verified user'
                            : 'Install as guest (tracked automatically)'
                        }
                      >
                        Install &rarr;
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Preview Modal */}
      {previewItem && (
        <div className="preview-modal-overlay" onClick={handleClosePreview}>
          <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-header-left">
                <div className="preview-icon-box">
                  <span>
                    <Icon name={previewItem.icon} />
                  </span>
                </div>
                <div>
                  <div className="preview-tags-row">
                    <span className={`type-tag type-${previewItem.type}`}>
                      {previewItem.type.toUpperCase()}
                    </span>
                    <span className="cat-tag">{previewItem.category}</span>
                  </div>
                  <h2 className="preview-title">{previewItem.name}</h2>
                  <div className="preview-author-sub">
                    <span>
                      Published by <strong>{previewItem.author}</strong>
                      {previewItem.authorHandle && ` (${previewItem.authorHandle})`}
                    </span>
                    {previewItem.authorVerified && (
                      <span className="profile-verified-badge">
                        <Icon name="CheckCheck" size={11} /> Verified Creator
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleClosePreview}
                aria-label="Close preview"
              >
                <Icon name="X" />
              </button>
            </div>

            <div className="preview-modal-body">
              {previewItem.sampleMetrics && (
                <p className="no-reviews-note">
                  Sample marketplace data: download counts, ratings and sample reviews are
                  illustrative, not verified community activity.
                </p>
              )}
              {/* Interactive Graph Canvas Section */}
              {previewItem.type !== 'theme' && previewItem.nodes && (
                <div className="preview-canvas-section">
                  <div className="preview-canvas-header">
                    <span className="preview-canvas-label">
                      <Icon name="Workflow" size={14} /> Interactive Graph Preview (
                      {previewItem.nodes.length} nodes)
                    </span>
                    <span className="preview-canvas-hint">
                      Drag canvas to pan &bull; Scroll wheel to zoom
                    </span>
                  </div>
                  <div className="preview-canvas-viewport">
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={previewItem.nodes}
                        edges={previewItem.edges ?? []}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        panOnDrag={true}
                        zoomOnScroll={true}
                        minZoom={0.2}
                        maxZoom={2}
                        defaultEdgeOptions={{ animated: true }}
                      >
                        <Background
                          variant={BackgroundVariant.Dots}
                          gap={16}
                          size={1}
                          color="#223249"
                        />
                        <Controls showInteractive={false} />
                      </ReactFlow>
                    </ReactFlowProvider>
                  </div>
                </div>
              )}

              {/* Theme Live Preview Showcase */}
              {previewItem.type === 'theme' && (
                <div className="preview-theme-showcase">
                  <div className="preview-theme-banner">
                    <Icon name="Palette" size={18} />
                    <div>
                      <strong>Live Theme Preview Active</strong>
                      <p>
                        Studio backgrounds, borders, and accent colors have temporarily shifted to
                        preview this theme. Closing this window reverts back to your saved theme
                        unless applied.
                      </p>
                    </div>
                  </div>
                  <div className="preview-theme-palette-preview">
                    <span className="theme-palette-label">Active Preview Palette</span>
                    <div className="theme-palette-swatches">
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--bg-primary)' }}
                        title="Background Primary"
                      />
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--bg-secondary)' }}
                        title="Background Secondary"
                      />
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--bg-card)' }}
                        title="Card Background"
                      />
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--color-primary)' }}
                        title="Primary Accent"
                      />
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--trigger-accent)' }}
                        title="Trigger Accent"
                      />
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--condition-accent)' }}
                        title="Condition Accent"
                      />
                      <div
                        className="theme-swatch"
                        style={{ background: 'var(--action-accent)' }}
                        title="Action Accent"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="preview-section">
                <h4>Description & Features</h4>
                <p>{previewItem.description}</p>
              </div>

              <div className="preview-stats-grid">
                <div className="preview-stat-card">
                  <span className="preview-stat-num">
                    {previewItem.downloads.toLocaleString('en-US')}
                  </span>
                  <span className="preview-stat-lbl">
                    {previewItem.sampleMetrics ? 'Sample Downloads' : 'Downloads'}
                  </span>
                </div>
                <div className="preview-stat-card">
                  <span className="preview-stat-num">
                    <Icon name="Star" />{' '}
                    {userRatings[previewItem.id]
                      ? `${userRatings[previewItem.id]}.0`
                      : previewItem.rating.toFixed(1)}
                  </span>
                  <span className="preview-stat-lbl">Community Rating</span>
                </div>
                <div className="preview-stat-card">
                  <span className="preview-stat-num">v{previewItem.version}</span>
                  <span className="preview-stat-lbl">Package Version</span>
                </div>
                {previewItem.nodeCount !== undefined && (
                  <div className="preview-stat-card">
                    <span className="preview-stat-num">{previewItem.nodeCount}</span>
                    <span className="preview-stat-lbl">Connected Nodes</span>
                  </div>
                )}
              </div>

              {/* Interactive Rating & Review Section */}
              <div className="preview-section preview-review-section">
                <div className="review-section-header">
                  <h4>Rate this Package</h4>
                  {!isWritingReview && (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={handleOpenWriteReview}
                    >
                      <Icon name="MessageSquare" size={13} />
                      <span>Write Review</span>
                    </button>
                  )}
                </div>

                <div className="preview-stars-row">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      className="star-click-btn"
                      onClick={() => handleRate(previewItem, stars)}
                      title={`Rate ${stars} star${stars > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="stars-hint">Click a star to quick-rate</span>
                </div>

                {/* Inline Review Composer */}
                {isWritingReview && (
                  <form onSubmit={handleSubmitReview} className="inline-review-composer">
                    <div className="composer-header">
                      <span>
                        Review as <strong>{user.handle}</strong>
                      </span>
                      <div className="composer-star-picker">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`composer-star-btn ${s <= reviewStars ? 'active' : ''}`}
                            onClick={() => setReviewStars(s)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="modal-input"
                      placeholder="Share your experience with this flow, setup tips, or feature feedback..."
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      required
                    />
                    <div className="composer-actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setIsWritingReview(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary btn-sm">
                        <Icon name="Check" size={13} />
                        <span>Submit Review</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Real Community Reviews List */}
              <div className="preview-section preview-reviews-list-section">
                <h4>Community Reviews ({previewItem.reviewsCount ?? 0})</h4>
                {previewItem.sampleMetrics && (
                  <p className="no-reviews-note">
                    Showing {previewItem.reviews?.length ?? 0} example reviews and session
                    submissions.
                  </p>
                )}
                <div className="reviews-list-container">
                  {!previewItem.reviews || previewItem.reviews.length === 0 ? (
                    <p className="no-reviews-note">
                      No written reviews yet. Be the first to share your review!
                    </p>
                  ) : (
                    previewItem.reviews.map((rev) => (
                      <div key={rev.id} className="community-review-card">
                        <div className="review-card-top">
                          <div className="review-author-info">
                            <span className="review-author-handle">
                              {rev.author}
                              {rev.sample ? ' · Sample review' : ''}
                            </span>
                            <span className="review-stars-badge">
                              {'★'.repeat(rev.rating)}
                              <span className="empty-stars">{'☆'.repeat(5 - rev.rating)}</span>
                            </span>
                          </div>
                          <span className="review-date-badge">{rev.date}</span>
                        </div>
                        <p className="review-comment-body">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Included Tags */}
              <div className="preview-section">
                <h4>Included Tags</h4>
                <div className="market-tags-row">
                  {previewItem.tags.map((t) => (
                    <span key={t} className="tag-pill">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {previewItem.commandName && (
                <div className="preview-section">
                  <h4>Registered Trigger</h4>
                  <code className="preview-code-pill">{previewItem.commandName}</code>
                </div>
              )}
            </div>

            <div className="preview-modal-footer">
              <button type="button" className="market-btn btn-preview" onClick={handleClosePreview}>
                Close
              </button>
              {previewItem.type === 'theme' ? (
                <button
                  type="button"
                  className="market-btn btn-install"
                  onClick={() => {
                    if (previewItem.themeId) handleApplyThemeFromPreview(previewItem.themeId)
                  }}
                >
                  Apply Theme Now
                </button>
              ) : (
                <button
                  type="button"
                  className="market-btn btn-install"
                  onClick={() => {
                    handleInstall(previewItem)
                    handleClosePreview()
                  }}
                >
                  Install to Flow Canvas &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish Flow Dialog with Custom Tag Selector */}
      {publishModalOpen && (
        <div className="modal-overlay nodrag nopan" onClick={handleClosePublishModal}>
          <div
            className="confirm-dialog-card publish-flow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog-header">
              <div className="auth-guard-icon-box">
                <Icon name="Upload" size={20} />
              </div>
              <div>
                <h3 className="auth-guard-title">Publish Flow to Marketplace</h3>
                <span className="auth-guard-sub">Publishing as verified creator {user.handle}</span>
              </div>
            </div>

            <form onSubmit={handlePublishSubmit} className="publish-flow-form">
              <div className="account-input-box">
                <label>Flow Package Name</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Advanced Economy Bot"
                  value={publishName}
                  onChange={(e) => setPublishName(e.target.value)}
                  required
                />
              </div>

              <div className="account-input-box">
                <label>Category</label>
                <select
                  className="modal-input"
                  value={publishCategory}
                  onChange={(e) =>
                    setPublishCategory(
                      e.target.value as 'moderation' | 'utility' | 'fun' | 'community' | 'economy'
                    )
                  }
                >
                  <option value="utility">Utility</option>
                  <option value="moderation">Moderation</option>
                  <option value="fun">Fun & Games</option>
                  <option value="community">Community</option>
                  <option value="economy">Economy</option>
                </select>
              </div>

              <div className="account-input-box">
                <label>Description</label>
                <textarea
                  className="modal-input"
                  placeholder="Describe how this bot works, what commands it registers, and its dependencies..."
                  rows={3}
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                />
              </div>

              {/* Custom Tag Input Component */}
              <div className="account-input-box">
                <label>Community & Custom Tags</label>
                <CustomTagSelector
                  selectedTags={publishTags}
                  onChange={setPublishTags}
                  availableTags={communityTags}
                  onAddCustomTag={handleAddCommunityTag}
                />
              </div>

              <div className="confirm-dialog-actions auth-guard-actions">
                <button type="button" className="btn-secondary" onClick={handleClosePublishModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Icon name="Upload" size={14} />
                  <span>Publish to Community</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authentication Required Guard Modal */}
      <AuthGuardModal
        isOpen={Boolean(authGuardAction)}
        actionName={authGuardAction ?? undefined}
        onClose={() => setAuthGuardAction(null)}
        onSignIn={() => {
          setAuthGuardAction(null)
          if (onOpenAccount) onOpenAccount('signin')
        }}
      />
    </div>
  )
}
