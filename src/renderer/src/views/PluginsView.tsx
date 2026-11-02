import { PluginConfigModal } from '../components/PluginConfigModal'
import React, { useState } from 'react'
import { BotPlugin, getPluginsList, togglePluginState } from '../pluginsData'

export const PluginsView: React.FC = () => {
  const [configPlugin, setConfigPlugin] = useState<BotPlugin | null>(null)
  const [plugins, setPlugins] = useState<BotPlugin[]>(() => getPluginsList())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [toastMessage, setToastMessage] = useState<string>('')

  const handleToggle = (id: string, currentState: boolean): void => {
    const updated = togglePluginState(id, !currentState)
    setPlugins(updated)
    const toggledPlugin = updated.find((p) => p.id === id)
    setToastMessage(`Plugin "${toggledPlugin?.name}" ${!currentState ? 'enabled' : 'disabled'}.`)
    setTimeout(() => setToastMessage(''), 2500)
  }

  const filteredPlugins = plugins.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q)
    return matchesCat && matchesQuery
  })

  const enabledCount = plugins.filter((p) => p.enabled).length

  return (
    <div className="plugins-view-container">
      {configPlugin && (
        <PluginConfigModal
          key={configPlugin.id}
          plugin={configPlugin}
          onClose={() => setConfigPlugin(null)}
        />
      )}
      {/* Header */}
      <div className="plugins-header">
        <div className="plugins-header-left">
          <div className="view-title-group">
            <span className="view-icon">🔌</span>
            <div>
              <h1 className="view-heading">Plugin Extensions Manager</h1>
              <p className="view-subheading">
                Extend your bot execution runtime with external integrations, databases, and AI
                helpers
              </p>
            </div>
          </div>
        </div>

        <div className="plugins-header-stats">
          <span className="plugin-stat-pill">
            <span className="dot-green" /> {enabledCount} of {plugins.length} Plugins Enabled
          </span>
          {toastMessage && <span className="plugin-toast">✓ {toastMessage}</span>}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="plugins-controls-bar">
        <div className="plugin-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="plugin-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search extensions..."
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        <div className="plugin-category-pills">
          {['all', 'Integration', 'Visual', 'Network', 'Diagnostics', 'AI', 'Database'].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                className={`plugin-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All Plugins' : cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Plugins List */}
      <div className="plugins-content-scroll">
        <div className="plugins-grid">
          {filteredPlugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`plugin-card ${plugin.enabled ? 'plugin-active' : 'plugin-disabled'}`}
            >
              <div className="plugin-card-top">
                <div className="plugin-icon-box">
                  <span>{plugin.icon}</span>
                </div>

                <div className="plugin-title-group">
                  <div className="plugin-name-row">
                    <h3 className="plugin-name">{plugin.name}</h3>
                    <span className="plugin-version-tag">v{plugin.version}</span>
                  </div>
                  <span className="plugin-author">
                    by {plugin.author} • {plugin.category}
                  </span>
                </div>

                <div className="plugin-toggle-wrapper">
                  <label
                    className="switch-toggle"
                    title={plugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
                  >
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={() => handleToggle(plugin.id, plugin.enabled)}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>
              </div>

              <p className="plugin-description">{plugin.description}</p>

              <div className="plugin-card-footer">
                <span className={`plugin-status-badge ${plugin.enabled ? 'active' : 'inactive'}`}>
                  {plugin.enabled ? '● Active & Loaded' : '○ Disabled'}
                </span>

                {plugin.hasSettings && (
                  <button
                    type="button"
                    className="plugin-settings-btn"
                    onClick={() => setConfigPlugin(plugin)}
                  >
                    ⚙️ Configure
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
