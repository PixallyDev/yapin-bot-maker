import React, { useState } from 'react'
import { COMMAND_PACKAGES, CommandPackage } from '../commandStore'
import { PRESET_TEMPLATES, BotTemplate } from '../templates'
import { Icon } from './Icon'

interface CommandStoreViewProps {
  onAddPackage: (pkg: CommandPackage) => void
  onLoadTemplate: (template: BotTemplate) => void
  onSwitchToCanvas: () => void
}

export const CommandStoreView: React.FC<CommandStoreViewProps> = ({
  onAddPackage,
  onLoadTemplate,
  onSwitchToCanvas
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'moderation' | 'utility' | 'fun' | 'community'
  >('all')

  const filteredPackages = COMMAND_PACKAGES.filter((pkg) => {
    const matchesCat = activeCategory === 'all' || pkg.category === activeCategory
    const matchesQuery =
      searchQuery.trim() === '' ||
      pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.commandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesQuery
  })

  const filteredTemplates = PRESET_TEMPLATES.filter((tmpl) => {
    return (
      searchQuery.trim() === '' ||
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  return (
    <div className="command-store-container">
      <div className="store-hero">
        <div className="store-hero-content">
          <div className="hero-badge">COMMAND MARKETPLACE & TEMPLATES</div>
          <h1 className="hero-title">Bot Command Store</h1>
          <p className="hero-subtitle">
            Browse ready-to-use command workflows and full starter templates. Click{' '}
            <strong>Add to Flow</strong> to instantly insert modular nodes into your canvas.
          </p>
        </div>

        <div className="store-search-bar">
          <span className="search-icon">
            <Icon name="Search" />
          </span>
          <input
            type="text"
            className="store-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands, templates, tags..."
          />
          {searchQuery && (
            <button type="button" className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <Icon name="X" />
            </button>
          )}
        </div>
      </div>

      <div className="store-categories-bar">
        <button
          type="button"
          className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All Items ({COMMAND_PACKAGES.length + PRESET_TEMPLATES.length})
        </button>
        <button
          type="button"
          className={`category-pill ${activeCategory === 'utility' ? 'active' : ''}`}
          onClick={() => setActiveCategory('utility')}
        >
          <Icon name="Wrench" /> Utility
        </button>
        <button
          type="button"
          className={`category-pill ${activeCategory === 'moderation' ? 'active' : ''}`}
          onClick={() => setActiveCategory('moderation')}
        >
          <Icon name="Shield" /> Moderation
        </button>
        <button
          type="button"
          className={`category-pill ${activeCategory === 'fun' ? 'active' : ''}`}
          onClick={() => setActiveCategory('fun')}
        >
          <Icon name="Dices" /> Fun & Games
        </button>
        <button
          type="button"
          className={`category-pill ${activeCategory === 'community' ? 'active' : ''}`}
          onClick={() => setActiveCategory('community')}
        >
          <Icon name="Users" /> Community
        </button>
      </div>

      <div className="store-content-scroll">
        {/* Full Bot Templates Section */}
        {activeCategory === 'all' && (
          <section className="store-section">
            <div className="store-section-header">
              <div className="store-section-title-group">
                <span className="section-icon">
                  <Icon name="Package" />
                </span>
                <div>
                  <h2 className="store-section-title">Pre-Built Bot Architectures</h2>
                  <p className="store-section-desc">
                    Full bot projects ready to launch or customize
                  </p>
                </div>
              </div>
            </div>

            <div className="templates-grid">
              {filteredTemplates.map((tmpl) => (
                <div key={tmpl.id} className="store-template-card">
                  <div className="template-card-top">
                    <span className="template-icon-large">
                      <Icon name={tmpl.icon} />
                    </span>
                    <span className="template-badge-pill">{tmpl.tag}</span>
                  </div>
                  <h3 className="template-card-title">{tmpl.name}</h3>
                  <p className="template-card-description">{tmpl.description}</p>
                  <div className="template-card-bottom">
                    <span className="template-node-count">
                      {tmpl.nodes.length} Nodes • {tmpl.edges.length} Wires
                    </span>
                    <button
                      type="button"
                      className="store-btn-primary"
                      onClick={() => {
                        onLoadTemplate(tmpl)
                        onSwitchToCanvas()
                      }}
                    >
                      Load Project &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Modular Command Workflows Section */}
        <section className="store-section">
          <div className="store-section-header">
            <div className="store-section-title-group">
              <span className="section-icon">
                <Icon name="Zap" />
              </span>
              <div>
                <h2 className="store-section-title">Modular Command Packages</h2>
                <p className="store-section-desc">
                  Drop pre-wired command flows straight into your existing canvas
                </p>
              </div>
            </div>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="store-empty">
              <span className="store-empty-icon">
                <Icon name="Search" />
              </span>
              <p>No matching commands found for &quot;{searchQuery}&quot;.</p>
            </div>
          ) : (
            <div className="packages-grid">
              {filteredPackages.map((pkg) => (
                <div key={pkg.id} className="command-card">
                  <div className="command-card-header">
                    <div className="command-icon-wrapper">
                      <span>
                        <Icon name={pkg.icon} />
                      </span>
                    </div>
                    <div>
                      <h3 className="command-title">{pkg.name}</h3>
                      <span className="command-trigger-badge">{pkg.commandName}</span>
                    </div>
                    <span className="category-tag">{pkg.category.toUpperCase()}</span>
                  </div>

                  <p className="command-desc">{pkg.description}</p>

                  <div className="command-card-footer">
                    <span className="pkg-meta">Includes {pkg.nodeCount} connected nodes</span>
                    <button
                      type="button"
                      className="store-btn-add"
                      onClick={() => {
                        onAddPackage(pkg)
                        onSwitchToCanvas()
                      }}
                    >
                      <span>+</span> Add to Flow
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
