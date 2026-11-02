import React, { useState } from 'react'
import { Icon } from './Icon'
import { ProjectIconModal } from './ProjectIconModal'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateProject: (data: {
    name: string
    template: 'starter' | 'blank'
    location: string
    icon: string
    iconBg: string
  }) => void
}

const RANDOM_NAMES = [
  'EchoPulse',
  'AegisBot',
  'YapBot-9000',
  'QuantumMod',
  'NovaPing',
  'CyberGuardian',
  'StarlingBot',
  'ApexModerator',
  'BeaconBot',
  'VortexAssistant',
  'SentinelPrime',
  'ChronoKeeper'
]

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject
}) => {
  const [name, setName] = useState('My Yapin Bot')
  const [location, setLocation] = useState('C:\\YapinProjects\\MyYapinBot')
  const [template, setTemplate] = useState<'starter' | 'blank'>('starter')
  const [icon, setIcon] = useState('Bot')
  const [iconBg, setIconBg] = useState('#3b82f6')
  const [isIconCustomizerOpen, setIsIconCustomizerOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleRollRandomName = (): void => {
    const picked = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]
    setName(picked)
    setLocation(`C:\\YapinProjects\\${picked}`)
    setErrorMsg('')
  }

  const handleNameChange = (val: string): void => {
    setName(val)
    const cleanSlug = val.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'Bot'
    setLocation(`C:\\YapinProjects\\${cleanSlug}`)
    setErrorMsg('')
  }

  const handleBrowseLocation = (): void => {
    // Allows user to customize or simulate folder browse
    const custom = window.prompt('Enter or confirm project directory path:', location)
    if (custom?.trim()) {
      setLocation(custom.trim())
    }
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Please specify a valid project name.')
      return
    }

    onCreateProject({
      name: name.trim(),
      template,
      location: location.trim(),
      icon,
      iconBg
    })
    onClose()
  }

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div className="confirm-dialog-card new-project-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon icon-blue-pill">
              <Icon name="FolderPlus" size={20} />
            </span>
            <div>
              <h2 className="modal-title">Create New Bot Project</h2>
              <span className="modal-subtitle">
                Configure your project name, initial template, and storage location
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

        <form onSubmit={handleSubmit} className="new-project-body">
          {errorMsg && <div className="share-error-banner">{errorMsg}</div>}

          {/* Project Identity & Icon Row */}
          <div className="project-identity-row">
            {/* Clickable Icon Thumbnail (Images 5 & 6) */}
            <button
              type="button"
              className="project-icon-picker-trigger"
              style={{ background: iconBg }}
              onClick={() => setIsIconCustomizerOpen(true)}
              title="Click to customize project icon & color"
            >
              <Icon name={icon} size={28} />
              <span className="icon-edit-overlay">
                <Icon name="Pencil" size={12} />
              </span>
            </button>

            <div className="project-name-input-wrapper">
              <label>
                Project Name <span className="required-star">*</span>
              </label>
              <div className="input-with-die-btn">
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. AegisBot, EchoPulse"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="die-random-btn"
                  onClick={handleRollRandomName}
                  title="Generate random bot name"
                >
                  <Icon name="Dices" size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Location Folder Browser */}
          <div className="account-input-box">
            <label>Project Storage Directory</label>
            <div className="location-browser-row">
              <input
                type="text"
                className="modal-input location-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary btn-browse-folder"
                onClick={handleBrowseLocation}
              >
                <Icon name="FolderOpen" size={14} />
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* Dual Template Selector (Image 4) */}
          <div className="template-selector-section">
            <label>Choose Starting Architecture</label>
            <div className="dual-template-grid">
              {/* Starter bot */}
              <div
                className={`template-choice-card ${template === 'starter' ? 'selected' : ''}`}
                onClick={() => setTemplate('starter')}
              >
                <div className="choice-card-header">
                  <div className="choice-icon-box starter">
                    <Icon name="Sparkles" size={18} />
                  </div>
                  <div className="choice-radio-indicator">
                    {template === 'starter' && <span className="radio-dot" />}
                  </div>
                </div>
                <h4 className="choice-title">Starter bot</h4>
                <p className="choice-desc">
                  Pre-configured with /ping latency test, FAQ auto-responder, and diagnostics. Best
                  for beginners.
                </p>
                <span className="choice-badge">Recommended</span>
              </div>

              {/* Blank canvas */}
              <div
                className={`template-choice-card ${template === 'blank' ? 'selected' : ''}`}
                onClick={() => setTemplate('blank')}
              >
                <div className="choice-card-header">
                  <div className="choice-icon-box blank">
                    <Icon name="FileCode" size={18} />
                  </div>
                  <div className="choice-radio-indicator">
                    {template === 'blank' && <span className="radio-dot" />}
                  </div>
                </div>
                <h4 className="choice-title">Blank canvas</h4>
                <p className="choice-desc">
                  Completely empty canvas with zero pre-existing nodes. Build your custom triggers
                  and actions from scratch.
                </p>
                <span className="choice-badge empty-badge">Clean Slate</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="confirm-dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Icon name="Plus" size={14} />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>

      {/* Project Icon Customizer Modal */}
      <ProjectIconModal
        isOpen={isIconCustomizerOpen}
        currentIcon={icon}
        currentBg={iconBg}
        onSave={(newIcon, newBg) => {
          setIcon(newIcon)
          setIconBg(newBg)
        }}
        onClose={() => setIsIconCustomizerOpen(false)}
      />
    </div>
  )
}
