import React from 'react'
import { Icon } from './Icon'
import type { InfoKind } from './PreferencesModal'

interface InfoModalProps {
  kind: InfoKind | null
  onClose: () => void
}

const CHANGELOG: { version: string; items: string[] }[] = [
  {
    version: '1.1.0',
    items: [
      'Vector icons and pill toggle switches throughout the studio.',
      'Right-side Issues analyzer and live Bot Log with debug traces and variable inspector.',
      'Interactive marketplace previews for flows and themes.',
      'Full preferences: startup, privacy, editor, auto-save and defaults.'
    ]
  },
  {
    version: '1.0.0',
    items: [
      'Visual node studio with 13 node types, multi-flow tabs and folders.',
      'Encrypted token storage, standalone bot export and live bot runner.'
    ]
  }
]

export const InfoModal: React.FC<InfoModalProps> = ({ kind, onClose }) => {
  if (!kind) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="account-modal-container"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">
              <Icon name={kind === 'changelog' ? 'ScrollText' : 'Scale'} size={22} />
            </span>
            <h2 className="modal-title">{kind === 'changelog' ? 'Changelog' : 'Legal'}</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="account-modal-body">
          {kind === 'changelog' ? (
            CHANGELOG.map((entry) => (
              <section key={entry.version} className="account-section">
                <h4 className="account-section-title">Version {entry.version}</h4>
                <ul className="info-list">
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <>
              <section className="account-section">
                <h4 className="account-section-title">Privacy</h4>
                <p className="account-section-desc">
                  Yapper Maker stores projects and preferences on this computer only. Bot tokens are
                  kept in memory unless you opt in to encrypted local storage, and they are never
                  written into project files or exports.
                </p>
              </section>
              <section className="account-section">
                <h4 className="account-section-title">Third-party software</h4>
                <p className="account-section-desc">
                  Built with Electron, React, @xyflow/react and lucide-react, each distributed under
                  its own open-source license. Yapin is a trademark of its respective owner.
                </p>
              </section>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
