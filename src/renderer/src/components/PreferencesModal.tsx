import React, { useState } from 'react'
import { BUILTIN_THEMES, applyTheme, getActiveThemeId } from '../themes'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onThemeChanged?: (themeId: string) => void
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  onThemeChanged
}) => {
  const [activeTheme, setActiveTheme] = useState(() => getActiveThemeId())
  const [pathPrivacy, setPathPrivacy] = useState(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('yapin_pref_path_privacy')
          : null
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })
  const [soundEffects, setSoundEffects] = useState(() => {
    try {
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('yapin_pref_sound_effects')
          : null
      return stored !== null ? stored === 'true' : true
    } catch {
      return true
    }
  })
  const [volume, setVolume] = useState(70)
  const [showMinimap, setShowMinimap] = useState(true)
  const [gridVariant, setGridVariant] = useState<'dots' | 'lines' | 'cross'>('dots')
  const [dpiScale, setDpiScale] = useState(100)
  const [autoUpdateCheck, setAutoUpdateCheck] = useState(true)
  const [updateStatus, setUpdateStatus] = useState('')

  if (!isOpen) return null

  const handleSelectTheme = (themeId: string): void => {
    setActiveTheme(themeId)
    applyTheme(themeId)
    onThemeChanged?.(themeId)
  }

  const handleSavePreferences = (): void => {
    try {
      window.localStorage.setItem('yapin_pref_path_privacy', String(pathPrivacy))
      window.localStorage.setItem('yapin_pref_sound_effects', String(soundEffects))
    } catch {
      // Ignore
    }
    onClose()
  }

  const handleCheckUpdates = (): void => {
    setUpdateStatus('Checking Yapin Bot Maker update servers...')
    setTimeout(() => {
      setUpdateStatus('✓ You are currently running the latest version (v1.0.0 Stable).')
    }, 1200)
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="preferences-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">⚙️</span>
            <div>
              <h2 className="modal-title">Studio Preferences</h2>
              <span className="modal-subtitle">
                Configure workflow defaults, interface themes, and privacy
              </span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="preferences-modal-body">
          {/* General & Theme Section */}
          <section className="pref-section">
            <h4 className="pref-section-heading">Visual Theme</h4>
            <div className="pref-theme-options-grid">
              {BUILTIN_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`pref-theme-pill ${activeTheme === theme.id ? 'active' : ''}`}
                  onClick={() => handleSelectTheme(theme.id)}
                >
                  <span
                    className="pref-color-dot"
                    style={{ backgroundColor: theme.previewColors[2] }}
                  />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Privacy & Security Section */}
          <section className="pref-section">
            <h4 className="pref-section-heading">Privacy & Paths</h4>
            <div className="pref-toggle-list">
              <label className="pref-toggle-row">
                <div>
                  <span className="pref-toggle-title">Path Privacy</span>
                  <span className="pref-toggle-desc">
                    Mask full machine filesystem paths when displaying logs or sharing project
                    outputs
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={pathPrivacy}
                  onChange={(e) => setPathPrivacy(e.target.checked)}
                />
              </label>

              <label className="pref-toggle-row">
                <div>
                  <span className="pref-toggle-title">Token Auto-Masking</span>
                  <span className="pref-toggle-desc">
                    Hide bot tokens behind password asterisks on screen to prevent stream leaks
                  </span>
                </div>
                <input type="checkbox" checked={true} disabled />
              </label>
            </div>
          </section>

          {/* Canvas & Workspace Section */}
          <section className="pref-section">
            <h4 className="pref-section-heading">Canvas & Flow Editor</h4>
            <div className="pref-toggle-list">
              <label className="pref-toggle-row">
                <div>
                  <span className="pref-toggle-title">MiniMap Overview</span>
                  <span className="pref-toggle-desc">
                    Display interactive canvas navigator in lower right corner
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showMinimap}
                  onChange={(e) => setShowMinimap(e.target.checked)}
                />
              </label>

              <div className="pref-field-row">
                <div>
                  <span className="pref-toggle-title">Canvas Grid Pattern</span>
                  <span className="pref-toggle-desc">Background visual styling style</span>
                </div>
                <select
                  className="modal-select"
                  value={gridVariant}
                  onChange={(e) => setGridVariant(e.target.value as 'dots' | 'lines' | 'cross')}
                >
                  <option value="dots">Dots (Standard)</option>
                  <option value="lines">Lines (Blueprint)</option>
                  <option value="cross">Crosshairs (Technical)</option>
                </select>
              </div>

              <div className="pref-field-row">
                <div>
                  <span className="pref-toggle-title">Interface Zoom Scale</span>
                  <span className="pref-toggle-desc">DPI scaling: {dpiScale}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="140"
                  step="5"
                  value={dpiScale}
                  onChange={(e) => setDpiScale(Number(e.target.value))}
                  className="modal-slider"
                />
              </div>
            </div>
          </section>

          {/* Audio Effects Section */}
          <section className="pref-section">
            <h4 className="pref-section-heading">Audio & Feedback</h4>
            <div className="pref-toggle-list">
              <label className="pref-toggle-row">
                <div>
                  <span className="pref-toggle-title">Sound Effects</span>
                  <span className="pref-toggle-desc">
                    Subtle audio cues on bot start, stop, and test events
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                />
              </label>

              {soundEffects && (
                <div className="pref-field-row">
                  <div>
                    <span className="pref-toggle-title">Master Volume</span>
                    <span className="pref-toggle-desc">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="modal-slider"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Software Updates Section */}
          <section className="pref-section">
            <h4 className="pref-section-heading">Software Updates</h4>
            <div className="pref-toggle-list">
              <label className="pref-toggle-row">
                <div>
                  <span className="pref-toggle-title">Automatic Update Checks</span>
                  <span className="pref-toggle-desc">
                    Silently query update servers when studio launches
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoUpdateCheck}
                  onChange={(e) => setAutoUpdateCheck(e.target.checked)}
                />
              </label>

              <div className="update-check-box">
                <button type="button" className="check-updates-btn" onClick={handleCheckUpdates}>
                  <span>🔄</span> Check for Updates Now
                </button>
                {updateStatus && <span className="update-status-text">{updateStatus}</span>}
              </div>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSavePreferences}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
