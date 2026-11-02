import React, { useState } from 'react'
import {
  BUILTIN_THEMES,
  ThemeDefinition,
  getActiveThemeId,
  getCustomThemeColors,
  applyTheme,
  resetThemeToDefault
} from '../themes'

interface ThemesViewProps {
  onThemeChanged?: (themeId: string) => void
}

export const ThemesView: React.FC<ThemesViewProps> = ({ onThemeChanged }) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => getActiveThemeId())
  const [customColors, setCustomColors] = useState<Record<string, string>>(() =>
    getCustomThemeColors()
  )
  const [customPrimary, setCustomPrimary] = useState<string>(
    () => getCustomThemeColors()['--color-primary'] || '#3b82f6'
  )
  const [customBg, setCustomBg] = useState<string>(
    () => getCustomThemeColors()['--bg-primary'] || '#0b0f19'
  )
  const [customCard, setCustomCard] = useState<string>(
    () => getCustomThemeColors()['--bg-card'] || '#182234'
  )
  const [customAccent, setCustomAccent] = useState<string>(
    () => getCustomThemeColors()['--trigger-accent'] || '#a855f7'
  )
  const [saveMessage, setSaveMessage] = useState<string>('')

  const handleSelectPreset = (theme: ThemeDefinition): void => {
    setCurrentThemeId(theme.id)
    applyTheme(theme.id)
    onThemeChanged?.(theme.id)
    setSaveMessage(`Theme "${theme.name}" applied successfully!`)
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleApplyCustomColors = (): void => {
    const overrides = {
      ...customColors,
      '--color-primary': customPrimary,
      '--bg-primary': customBg,
      '--bg-card': customCard,
      '--trigger-accent': customAccent
    }
    setCustomColors(overrides)
    applyTheme(currentThemeId, overrides)
    onThemeChanged?.(currentThemeId)
    setSaveMessage('Custom accent colors saved and applied!')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  const handleReset = (): void => {
    resetThemeToDefault()
    setCurrentThemeId('dark')
    setCustomColors({})
    setCustomPrimary('#3b82f6')
    setCustomBg('#0b0f19')
    setCustomCard('#182234')
    setCustomAccent('#a855f7')
    onThemeChanged?.('dark')
    setSaveMessage('Reset all themes to Dark Studio defaults.')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  return (
    <div className="themes-view-container">
      {/* Header */}
      <div className="themes-header">
        <div className="themes-header-left">
          <div className="view-title-group">
            <span className="view-icon">🎨</span>
            <div>
              <h1 className="view-heading">Visual Themes & Studio Styling</h1>
              <p className="view-subheading">
                Customize your workspace palette, card contrasts, and canvas node accent colors
              </p>
            </div>
          </div>
        </div>

        {saveMessage && <div className="theme-save-toast">✓ {saveMessage}</div>}
      </div>

      <div className="themes-content-scroll">
        {/* Preset Themes Section */}
        <section className="themes-section">
          <div className="section-title-row">
            <h2 className="themes-section-title">Built-In Preset Themes</h2>
            <span className="section-badge">5 Curated Palettes</span>
          </div>

          <div className="themes-grid">
            {BUILTIN_THEMES.map((theme) => {
              const isSelected = currentThemeId === theme.id
              return (
                <div
                  key={theme.id}
                  className={`theme-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectPreset(theme)}
                >
                  <div className="theme-card-preview">
                    {theme.previewColors.map((color, idx) => (
                      <span
                        key={idx}
                        className="color-swatch-bar"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  <div className="theme-card-body">
                    <div className="theme-card-title-row">
                      <h3 className="theme-name">{theme.name}</h3>
                      {isSelected && <span className="active-badge">ACTIVE</span>}
                    </div>
                    <p className="theme-desc">{theme.description}</p>

                    <button
                      type="button"
                      className={`theme-apply-btn ${isSelected ? 'active-btn' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectPreset(theme)
                      }}
                    >
                      {isSelected ? '✓ Currently Active' : 'Apply Theme'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Custom Accent Adjuster Section */}
        <section className="themes-section">
          <div className="section-title-row">
            <h2 className="themes-section-title">Custom Palette Overrides</h2>
            <button type="button" className="reset-theme-btn" onClick={handleReset}>
              ↺ Reset to Defaults
            </button>
          </div>

          <div className="custom-color-adjuster-card">
            <p className="adjuster-intro">
              Fine-tune specific interface elements to match your brand or monitor profile. Changes
              apply instantly across the canvas wires, sidebar, and node cards.
            </p>

            <div className="adjuster-grid">
              <div className="color-field-box">
                <label className="color-field-label">Primary Brand Accent</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-wheel-picker"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                  />
                  <input
                    type="text"
                    className="color-hex-input"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                  />
                </div>
                <span className="color-field-hint">Buttons, wire selections & focus rings</span>
              </div>

              <div className="color-field-box">
                <label className="color-field-label">Canvas Background</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-wheel-picker"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                  />
                  <input
                    type="text"
                    className="color-hex-input"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                  />
                </div>
                <span className="color-field-hint">Flow grid background backdrop</span>
              </div>

              <div className="color-field-box">
                <label className="color-field-label">Node Card Surface</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-wheel-picker"
                    value={customCard}
                    onChange={(e) => setCustomCard(e.target.value)}
                  />
                  <input
                    type="text"
                    className="color-hex-input"
                    value={customCard}
                    onChange={(e) => setCustomCard(e.target.value)}
                  />
                </div>
                <span className="color-field-hint">Background of canvas node blocks</span>
              </div>

              <div className="color-field-box">
                <label className="color-field-label">Trigger Accent Highlight</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-wheel-picker"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                  />
                  <input
                    type="text"
                    className="color-hex-input"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                  />
                </div>
                <span className="color-field-hint">Color of On Command / Message triggers</span>
              </div>
            </div>

            <div className="adjuster-footer">
              <button type="button" className="save-custom-btn" onClick={handleApplyCustomColors}>
                💾 Save Custom Palette
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
