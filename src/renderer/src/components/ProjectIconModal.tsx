import React, { useState } from 'react'
import { Icon } from './Icon'

interface ProjectIconModalProps {
  isOpen: boolean
  currentIcon?: string
  currentBg?: string
  onSave: (icon: string, bg: string) => void
  onClose: () => void
}

const PRESET_COLORS = [
  { name: 'Sapphire', value: '#3b82f6' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Hot Pink', value: '#ec4899' },
  { name: 'Ruby', value: '#ef4444' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Midnight', value: '#1e293b' }
]

const PRESET_ICONS = [
  'Bot',
  'Zap',
  'Shield',
  'Dices',
  'Coins',
  'Flame',
  'Sparkles',
  'Star',
  'Crown',
  'Rocket',
  'Cpu',
  'Layers',
  'Terminal',
  'Gamepad2',
  'Heart',
  'Wrench',
  'Globe',
  'Package'
]

export const ProjectIconModal: React.FC<ProjectIconModalProps> = ({
  isOpen,
  currentIcon = 'Bot',
  currentBg = '#3b82f6',
  onSave,
  onClose
}) => {
  const [selectedBg, setSelectedBg] = useState(currentBg)
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)
  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'symbol'>('presets')
  const [customSymbol, setCustomSymbol] = useState('')

  if (!isOpen) return null

  const handleSave = (): void => {
    const finalIcon =
      activeTab === 'symbol' && customSymbol.trim() ? customSymbol.trim() : selectedIcon
    onSave(finalIcon, selectedBg)
    onClose()
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="confirm-dialog-card project-icon-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon icon-purple-pill">
              <Icon name="Palette" size={18} />
            </span>
            <div>
              <h2 className="modal-title">Customize Project Icon</h2>
              <span className="modal-subtitle">
                Personalize your bot project branding & canvas avatar
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="X" size={14} />
          </button>
        </div>

        <div className="project-icon-body">
          {/* Live Preview Box */}
          <div className="icon-preview-banner">
            <div className="icon-live-preview-box" style={{ background: selectedBg }}>
              {activeTab === 'symbol' && customSymbol.trim() ? (
                <span className="symbol-preview-text">{customSymbol.trim().slice(0, 3)}</span>
              ) : (
                <Icon name={selectedIcon} size={32} />
              )}
            </div>
            <div className="icon-preview-meta">
              <span className="preview-heading">Live Icon Preview</span>
              <span className="preview-sub">
                Visible on projects dashboard and workflow headers
              </span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="icon-tabs-row">
            <button
              type="button"
              className={`icon-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Icon name="Bot" size={13} />
              <span>Preset Icons</span>
            </button>
            <button
              type="button"
              className={`icon-tab-btn ${activeTab === 'colors' ? 'active' : ''}`}
              onClick={() => setActiveTab('colors')}
            >
              <Icon name="Palette" size={13} />
              <span>Background Color</span>
            </button>
            <button
              type="button"
              className={`icon-tab-btn ${activeTab === 'symbol' ? 'active' : ''}`}
              onClick={() => setActiveTab('symbol')}
            >
              <Icon name="FileCode" size={13} />
              <span>Custom Symbol</span>
            </button>
          </div>

          {/* Tab 1: Preset Icons */}
          {activeTab === 'presets' && (
            <div className="icon-tab-panel">
              <span className="panel-label">Choose an icon:</span>
              <div className="preset-icons-grid">
                {PRESET_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    className={`preset-icon-btn ${selectedIcon === iconName ? 'selected' : ''}`}
                    onClick={() => setSelectedIcon(iconName)}
                    title={iconName}
                  >
                    <Icon name={iconName} size={20} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Background Colors */}
          {activeTab === 'colors' && (
            <div className="icon-tab-panel">
              <span className="panel-label">Choose background accent:</span>
              <div className="preset-colors-grid">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`preset-color-swatch ${selectedBg === color.value ? 'selected' : ''}`}
                    style={{ background: color.value }}
                    onClick={() => setSelectedBg(color.value)}
                    title={color.name}
                  >
                    {selectedBg === color.value && <Icon name="Check" size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Custom Symbol */}
          {activeTab === 'symbol' && (
            <div className="icon-tab-panel">
              <span className="panel-label">Enter custom initials or symbol:</span>
              <input
                type="text"
                className="modal-input"
                maxLength={4}
                placeholder="e.g. YB, 99, ⚡"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
              />
              <span className="panel-hint">
                Supports up to 3-4 alphanumeric characters or symbols.
              </span>
            </div>
          )}

          {/* Quick Color Swatches Row (Always visible underneath) */}
          {activeTab !== 'colors' && (
            <div className="quick-colors-strip">
              <span className="quick-colors-label">Accent:</span>
              <div className="quick-swatches">
                {PRESET_COLORS.slice(0, 6).map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`mini-swatch ${selectedBg === c.value ? 'active' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => setSelectedBg(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              <Icon name="Check" size={14} />
              <span>Apply Icon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
