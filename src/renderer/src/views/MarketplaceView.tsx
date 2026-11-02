import React, { useState } from 'react'
import { MarketplaceItem, MARKETPLACE_ITEMS } from '../marketplaceData'

interface MarketplaceViewProps {
  onInstallItem: (item: MarketplaceItem) => void
  onApplyTheme: (themeId: string) => void
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onInstallItem,
  onApplyTheme
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'template' | 'node' | 'theme'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewItem, setPreviewItem] = useState<MarketplaceItem | null>(null)

  const filteredItems = MARKETPLACE_ITEMS.filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    return matchesTab && matchesCat && matchesQuery
  })

  return (
    <div className="marketplace-view-container">
      {/* Marketplace Top Hero */}
      <div className="marketplace-hero">
        <div className="marketplace-hero-left">
          <div className="marketplace-badge">COMMUNITY & CLOUD ECOSYSTEM</div>
          <h1 className="marketplace-title">Marketplace & Extensions</h1>
          <p className="marketplace-subtitle">
            Discover community-crafted starter bots, modular slash command nodes, and custom themes
            to power up your Yapin Bot Maker experience.
          </p>
        </div>

        <div className="marketplace-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="marketplace-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates, nodes, themes..."
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs: All / Templates / Community Nodes / Themes */}
      <div className="marketplace-tabs-bar">
        <div className="type-tabs-group">
          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>🌐</span> All Items
          </button>
          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'template' ? 'active' : ''}`}
            onClick={() => setActiveTab('template')}
          >
            <span>📦</span> Full Bot Templates
          </button>
          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'node' ? 'active' : ''}`}
            onClick={() => setActiveTab('node')}
          >
            <span>⚡</span> Community Nodes
          </button>
          <button
            type="button"
            className={`type-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            <span>🎨</span> Themes
          </button>
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
        </div>
      </div>

      {/* Items Grid */}
      <div className="marketplace-content-scroll">
        {filteredItems.length === 0 ? (
          <div className="marketplace-empty">
            <span className="empty-icon">🔍</span>
            <h3>No marketplace items found</h3>
            <p>Try clearing your search terms or selecting a different category.</p>
          </div>
        ) : (
          <div className="marketplace-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="market-card">
                <div className="market-card-top">
                  <div className="market-icon-box">
                    <span>{item.icon}</span>
                  </div>
                  <div className="market-badge-group">
                    <span className={`type-tag type-${item.type}`}>{item.type.toUpperCase()}</span>
                    <span className="cat-tag">{item.category}</span>
                  </div>
                </div>

                <h3 className="market-card-title">{item.name}</h3>
                <span className="market-author">
                  by {item.author} • v{item.version}
                </span>
                <p className="market-card-desc">{item.description}</p>

                <div className="market-tags-row">
                  {item.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="market-card-footer">
                  <div className="market-stats">
                    <span className="stat-item" title="Downloads">
                      📥 {item.downloads}
                    </span>
                    <span className="stat-item" title="Rating">
                      ⭐ {item.rating}
                    </span>
                  </div>

                  <div className="market-actions">
                    <button
                      type="button"
                      className="market-btn btn-preview"
                      onClick={() => setPreviewItem(item)}
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
                        onClick={() => onInstallItem(item)}
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
        <div className="preview-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-header-left">
                <div className="preview-icon-box">
                  <span>{previewItem.icon}</span>
                </div>
                <div>
                  <div className="preview-tags-row">
                    <span className={`type-tag type-${previewItem.type}`}>
                      {previewItem.type.toUpperCase()}
                    </span>
                    <span className="cat-tag">{previewItem.category}</span>
                    <span className="author-tag">by {previewItem.author}</span>
                  </div>
                  <h2 className="preview-modal-title">{previewItem.name}</h2>
                </div>
              </div>
              <button
                type="button"
                className="preview-close-btn"
                onClick={() => setPreviewItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="preview-modal-body">
              <div className="preview-section">
                <h4>Description & Features</h4>
                <p>{previewItem.description}</p>
              </div>

              <div className="preview-stats-grid">
                <div className="preview-stat-card">
                  <span className="preview-stat-num">{previewItem.downloads}</span>
                  <span className="preview-stat-lbl">Active Installs</span>
                </div>
                <div className="preview-stat-card">
                  <span className="preview-stat-num">⭐ {previewItem.rating}</span>
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
              <button
                type="button"
                className="market-btn btn-preview"
                onClick={() => setPreviewItem(null)}
              >
                Close
              </button>
              {previewItem.type === 'theme' ? (
                <button
                  type="button"
                  className="market-btn btn-install"
                  onClick={() => {
                    if (previewItem.themeId) onApplyTheme(previewItem.themeId)
                    setPreviewItem(null)
                  }}
                >
                  Apply Theme Now
                </button>
              ) : (
                <button
                  type="button"
                  className="market-btn btn-install"
                  onClick={() => {
                    onInstallItem(previewItem)
                    setPreviewItem(null)
                  }}
                >
                  Install to Flow Canvas &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
