import React, { useState } from 'react'
import { Icon } from './Icon'
import { ToggleSwitch } from './ToggleSwitch'
import {
  DEFAULT_PREFERENCES,
  maskPath,
  usePreferences,
  type Preferences
} from '../preferencesStore'

export type InfoKind = 'changelog' | 'legal'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onViewInfo: (kind: InfoKind) => void
}

interface RowDef {
  id: string
  section: string
  title: string
  description: string
  control: React.ReactNode
}

const SECTION_ICONS: Record<string, string> = {
  General: 'FolderOpen',
  Startup: 'Rocket',
  'Safety & Privacy': 'ShieldCheck',
  'User Experience': 'Palette',
  'Flow Editor': 'Workflow',
  'Auto-save & Defaults': 'Save',
  About: 'Info'
}

export const PreferencesModal: React.FC<PreferencesModalProps> = (props) =>
  props.isOpen ? <PreferencesDialog {...props} /> : null

const PreferencesDialog: React.FC<PreferencesModalProps> = ({ onClose, onViewInfo }) => {
  const { prefs, setAll, update } = usePreferences()
  const [draft, setDraft] = useState<Preferences>(prefs)
  const [query, setQuery] = useState('')

  const set = (patch: Partial<Preferences>): void =>
    setDraft((current) => ({ ...current, ...patch }))

  const toggle = (key: keyof Preferences, label: string): React.ReactNode => (
    <ToggleSwitch
      checked={Boolean(draft[key])}
      onChange={(value) => set({ [key]: value } as Partial<Preferences>)}
      label={label}
    />
  )

  const browse = async (): Promise<void> => {
    const result = await window.botApi?.chooseFolder(draft.defaultProjectFolder || undefined)
    if (result?.success && result.folderPath) set({ defaultProjectFolder: result.folderPath })
  }

  const rows: RowDef[] = [
    {
      id: 'folder',
      section: 'General',
      title: 'Default project folder',
      description:
        'Where Save and Open dialogs start, and where regenerated bot files are written.',
      control: (
        <div className="pref-folder-control">
          <span className="pref-folder-path" title={draft.defaultProjectFolder}>
            {draft.defaultProjectFolder
              ? maskPath(draft.defaultProjectFolder, draft.hideUsernameInPaths)
              : 'Not set'}
          </span>
          <button type="button" className="pref-btn" onClick={() => void browse()}>
            <Icon name="FolderOpen" size={14} /> Browse
          </button>
          {draft.defaultProjectFolder && (
            <button
              type="button"
              className="pref-btn"
              onClick={() => set({ defaultProjectFolder: '' })}
            >
              <Icon name="X" size={14} /> Clear
            </button>
          )}
        </div>
      )
    },
    {
      id: 'autoload',
      section: 'Startup',
      title: 'Auto-load last project on startup',
      description: 'Reopen the project you were working on. Off starts with an empty flow.',
      control: toggle('autoLoadLastProject', 'Auto-load last project')
    },
    {
      id: 'runonload',
      section: 'Startup',
      title: 'Run bot when project loads',
      description: 'Starts the bot automatically if a token is available.',
      control: toggle('runBotOnLoad', 'Run bot when project loads')
    },
    {
      id: 'regen',
      section: 'Startup',
      title: 'Regenerate bot files on run',
      description:
        'Refresh the standalone bot in "Yapin-Bot-Live" inside the default project folder each time the bot starts.',
      control: toggle('regenerateOnRun', 'Regenerate bot files on run')
    },
    {
      id: 'startuppage',
      section: 'Startup',
      title: 'Startup page',
      description: 'The first page shown when the studio opens.',
      control: (
        <select
          className="modal-select"
          value={draft.startupPage}
          onChange={(e) => set({ startupPage: e.target.value as Preferences['startupPage'] })}
        >
          <option value="home">Home</option>
          <option value="canvas">Flow Editor</option>
          <option value="projects">Projects</option>
        </select>
      )
    },
    {
      id: 'overwrite',
      section: 'Safety & Privacy',
      title: 'Prompt before overwriting folder',
      description: 'Ask before regenerated bot files replace the previous ones.',
      control: toggle('promptBeforeOverwrite', 'Prompt before overwriting folder')
    },
    {
      id: 'confirm',
      section: 'Safety & Privacy',
      title: 'Disable confirmation dialogs',
      description: 'Skip "Are you sure?" prompts, for example when deleting a project.',
      control: toggle('disableConfirmations', 'Disable confirmation dialogs')
    },
    {
      id: 'hideuser',
      section: 'Safety & Privacy',
      title: 'Hide username in paths',
      description: 'Masks your Windows account name in file paths shown in logs and cards.',
      control: toggle('hideUsernameInPaths', 'Hide username in paths')
    },
    {
      id: 'thumbs',
      section: 'Safety & Privacy',
      title: 'Hide project thumbnails',
      description: 'Remove project preview icons from Home and Projects.',
      control: toggle('hideProjectThumbnails', 'Hide project thumbnails')
    },
    {
      id: 'dpi',
      section: 'User Experience',
      title: 'DPI scale',
      description: `Interface zoom from 80% to 130%. Currently ${draft.dpiScale}%.`,
      control: (
        <div className="pref-dpi-control">
          <input
            type="range"
            min={80}
            max={130}
            step={5}
            value={draft.dpiScale}
            className="modal-slider"
            onChange={(e) => set({ dpiScale: Number(e.target.value) })}
          />
          <span className="pref-dpi-value">{draft.dpiScale}%</span>
          <button
            type="button"
            className="pref-btn"
            onClick={() => {
              set({ dpiScale: 100 })
              update({ dpiScale: 100 })
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="pref-btn pref-btn-primary"
            onClick={() => update({ dpiScale: draft.dpiScale })}
          >
            Apply
          </button>
        </div>
      )
    },
    {
      id: 'motion',
      section: 'User Experience',
      title: 'Reduce motion and animations',
      description: 'Turns off transitions and animated effects.',
      control: toggle('reduceMotion', 'Reduce motion')
    },
    {
      id: 'tooltips',
      section: 'User Experience',
      title: 'Enable tooltips',
      description: 'Show hover hints on buttons and icons.',
      control: toggle('enableTooltips', 'Enable tooltips')
    },
    {
      id: 'nodedesc',
      section: 'User Experience',
      title: 'Show node descriptions',
      description: 'Show the small helper text inside nodes.',
      control: toggle('showNodeDescriptions', 'Show node descriptions')
    },
    {
      id: 'tabindicator',
      section: 'User Experience',
      title: 'Show sidebar active tab indicator',
      description: 'Highlight bar next to the current page in the left sidebar.',
      control: toggle('showActiveTabIndicator', 'Show sidebar active tab indicator')
    },
    {
      id: 'glass',
      section: 'User Experience',
      title: 'Use glass nodes',
      description: 'Translucent, blurred node cards on the canvas.',
      control: toggle('useGlassNodes', 'Use glass nodes')
    },
    {
      id: 'linetype',
      section: 'Flow Editor',
      title: 'Connection line type',
      description: 'Shape of the wires between nodes.',
      control: (
        <select
          className="modal-select"
          value={draft.connectionLineType}
          onChange={(e) =>
            set({ connectionLineType: e.target.value as Preferences['connectionLineType'] })
          }
        >
          <option value="smooth">Smooth</option>
          <option value="straight">Straight</option>
          <option value="step">Step</option>
        </select>
      )
    },
    {
      id: 'snap',
      section: 'Flow Editor',
      title: 'Snap nodes to grid',
      description: 'Align dragged nodes to a 20 px grid.',
      control: toggle('snapToGrid', 'Snap nodes to grid')
    },
    {
      id: 'dotgrid',
      section: 'Flow Editor',
      title: 'Interactive dot grid',
      description: 'Show the dotted grid that moves and zooms with the canvas.',
      control: toggle('interactiveDotGrid', 'Interactive dot grid')
    },
    {
      id: 'panwheel',
      section: 'Flow Editor',
      title: 'Pan canvas with mouse wheel',
      description: 'Wheel scrolls the canvas; hold Ctrl to zoom. Off makes the wheel zoom.',
      control: toggle('panOnWheel', 'Pan canvas with mouse wheel')
    },
    {
      id: 'minimap',
      section: 'Flow Editor',
      title: 'Show mini map',
      description: 'Overview map in the corner of the canvas.',
      control: toggle('showMiniMap', 'Show mini map')
    },
    {
      id: 'controls',
      section: 'Flow Editor',
      title: 'Hide graph controls',
      description: 'Hide the zoom and fit buttons.',
      control: toggle('hideGraphControls', 'Hide graph controls')
    },
    {
      id: 'propmodal',
      section: 'Flow Editor',
      title: 'Open node properties in a modal',
      description: 'Off keeps properties in the compact sidebar.',
      control: toggle('propertiesInModal', 'Open node properties in modal')
    },
    {
      id: 'autosave',
      section: 'Auto-save & Defaults',
      title: 'Auto-save interval',
      description: 'Saves the open project to local storage on a timer.',
      control: (
        <select
          className="modal-select"
          value={draft.autoSaveInterval}
          onChange={(e) =>
            set({ autoSaveInterval: e.target.value as Preferences['autoSaveInterval'] })
          }
        >
          <option value="1">Every 1 minute</option>
          <option value="5">Every 5 minutes</option>
          <option value="off">Off</option>
        </select>
      )
    },
    {
      id: 'prefix',
      section: 'Auto-save & Defaults',
      title: 'Default command prefix',
      description: 'Prefix shown for new On Command nodes.',
      control: (
        <select
          className="modal-select"
          value={draft.defaultCommandPrefix}
          onChange={(e) =>
            set({ defaultCommandPrefix: e.target.value as Preferences['defaultCommandPrefix'] })
          }
        >
          <option value="/">/ (slash)</option>
          <option value="!">! (exclamation)</option>
          <option value=".">. (dot)</option>
        </select>
      )
    },
    {
      id: 'emptyvar',
      section: 'Auto-save & Defaults',
      title: 'Empty variable text',
      description: 'Text used when {var:name} has no value yet.',
      control: (
        <input
          type="text"
          className="modal-input"
          maxLength={100}
          value={draft.emptyVariableText}
          onChange={(e) => set({ emptyVariableText: e.target.value })}
        />
      )
    },
    {
      id: 'sounds',
      section: 'Auto-save & Defaults',
      title: 'Play sounds',
      description: 'Short tones when the bot starts, stops or fails.',
      control: toggle('playSounds', 'Play sounds')
    },
    {
      id: 'about',
      section: 'About',
      title: 'Changelog and legal',
      description: 'Release notes, licenses and privacy information.',
      control: (
        <div className="pref-folder-control">
          <button type="button" className="pref-btn" onClick={() => onViewInfo('changelog')}>
            <Icon name="ScrollText" size={14} /> View Changelog
          </button>
          <button type="button" className="pref-btn" onClick={() => onViewInfo('legal')}>
            <Icon name="Scale" size={14} /> Legal
          </button>
        </div>
      )
    }
  ]

  const needle = query.trim().toLowerCase()
  const visible = rows.filter(
    (row) =>
      !needle ||
      row.title.toLowerCase().includes(needle) ||
      row.description.toLowerCase().includes(needle) ||
      row.section.toLowerCase().includes(needle)
  )
  const sections = Array.from(new Set(visible.map((row) => row.section)))

  return (
    <div className="modal-overlay nodrag nopan" onClick={onClose}>
      <div
        className="preferences-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">
              <Icon name="Settings" size={22} />
            </span>
            <div>
              <h2 className="modal-title">Preferences</h2>
              <span className="modal-subtitle">Studio behavior, privacy and editor defaults</span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="pref-search-bar">
          <Icon name="Search" size={15} />
          <input
            type="text"
            className="pref-search-input"
            placeholder="Search preferences"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" className="clear-search-btn" onClick={() => setQuery('')}>
              <Icon name="X" size={14} />
            </button>
          )}
        </div>

        <div className="preferences-modal-body">
          {sections.length === 0 && (
            <div className="pref-empty">No preferences match &quot;{query}&quot;.</div>
          )}
          {sections.map((section) => (
            <section key={section} className="pref-section">
              <h4 className="pref-section-heading">
                <Icon name={SECTION_ICONS[section] ?? 'Settings'} size={14} /> {section}
              </h4>
              <div className="pref-toggle-list">
                {visible
                  .filter((row) => row.section === section)
                  .map((row) => (
                    <div key={row.id} className="pref-row">
                      <div className="pref-row-text">
                        <span className="pref-toggle-title">{row.title}</span>
                        <span className="pref-toggle-desc">{row.description}</span>
                      </div>
                      <div className="pref-row-control">{row.control}</div>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>

        <div className="modal-footer pref-sticky-footer">
          <button
            type="button"
            className="btn-secondary pref-footer-btn"
            onClick={() => setDraft({ ...DEFAULT_PREFERENCES })}
          >
            <Icon name="RotateCcw" size={14} /> Reset
          </button>
          <span className="pref-footer-spacer" />
          <button type="button" className="btn-secondary pref-footer-btn" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary pref-footer-btn"
            onClick={() => {
              setAll(draft)
              onClose()
            }}
          >
            <Icon name="Check" size={14} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
