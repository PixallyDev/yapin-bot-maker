import React from 'react'
import { PRESET_TEMPLATES, BotTemplate } from '../templates'
import { Icon } from './Icon'

interface TemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: BotTemplate) => void
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate
}) => {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop nodrag nopan" onClick={onClose}>
      <div className="templates-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">
              <Icon name="Package" />
            </span>
            <div>
              <h2 className="modal-title">Starter Bot Templates</h2>
              <p className="modal-subtitle">Pick a pre-configured node graph to build on</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <Icon name="X" />
          </button>
        </div>

        <div className="templates-list">
          {PRESET_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} className="template-card">
              <div className="template-card-header">
                <span className="template-icon">
                  <Icon name={tmpl.icon} />
                </span>
                <div>
                  <h3 className="template-name">{tmpl.name}</h3>
                  <span className="template-tag">{tmpl.tag}</span>
                </div>
              </div>
              <p className="template-desc">{tmpl.description}</p>
              <div className="template-footer">
                <span className="template-meta">
                  {tmpl.nodes.length} nodes • {tmpl.edges.length} connections
                </span>
                <button
                  type="button"
                  className="template-load-btn"
                  onClick={() => {
                    onSelectTemplate(tmpl)
                    onClose()
                  }}
                >
                  Load Template &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
