import React, { useState } from 'react'
import {
  BotProjectRecord,
  getSavedProjects,
  deleteProjectRecord,
  renameProjectRecord,
  duplicateProjectRecord,
  saveProjectRecord
} from '../projectManager'
import { Icon } from '../components/Icon'
import { BotSettingsModal } from '../components/BotSettingsModal'

interface ProjectsViewProps {
  activeProject?: BotProjectRecord
  onOpenProject: (project: BotProjectRecord) => void
  onActivateProject?: (project: BotProjectRecord) => void
  onImportFromFile: () => void
  onExportStandalone: (project: BotProjectRecord) => void
  onOpenNewProjectModal?: () => void
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  activeProject,
  onOpenProject,
  onActivateProject,
  onImportFromFile,
  onExportStandalone,
  onOpenNewProjectModal
}) => {
  const [projects, setProjects] = useState<BotProjectRecord[]>(() => getSavedProjects())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [settingsModalProject, setSettingsModalProject] = useState<BotProjectRecord | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string): void => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const refreshList = (): void => {
    setProjects(getSavedProjects())
  }

  // Active project defaults to prop or the first project in list
  const currentActive =
    projects.find((p) => p.id === activeProject?.id) || activeProject || projects[0]

  const handleSelectToActivate = (proj: BotProjectRecord): void => {
    if (onActivateProject) {
      onActivateProject(proj)
    }
    showToast(`Activated project "${proj.name}" in studio workspace.`)
  }

  const handleDelete = (id: string, name: string): void => {
    if (window.confirm(`Are you sure you want to delete project "${name}"?`)) {
      deleteProjectRecord(id)
      refreshList()
      showToast(`Deleted project "${name}".`)
    }
  }

  const handleDuplicate = (id: string): void => {
    const dup = duplicateProjectRecord(id)
    refreshList()
    if (dup) {
      showToast(`Created duplicate "${dup.name}".`)
    }
  }

  const startRename = (proj: BotProjectRecord): void => {
    setEditingId(proj.id)
    setEditName(proj.name)
  }

  const saveRename = (id: string): void => {
    if (editName.trim()) {
      renameProjectRecord(id, editName)
      refreshList()
      showToast(`Project renamed to "${editName.trim()}".`)
    }
    setEditingId(null)
  }

  const handleRevealFolder = (path?: string): void => {
    const targetPath = path || 'C:\\YapinProjects'
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(targetPath)
    }
    showToast(`Project path copied: ${targetPath}`)
  }

  const handleSaveSettings = (updated: {
    name: string
    token: string
    prefix: string
    permissions?: number
  }): void => {
    if (!settingsModalProject) return
    const updatedProj: BotProjectRecord = {
      ...settingsModalProject,
      name: updated.name,
      token: updated.token,
      prefix: updated.prefix,
      permissions: updated.permissions,
      lastModified: Date.now()
    }
    saveProjectRecord(updatedProj)
    refreshList()
    if (onActivateProject && updatedProj.id === currentActive?.id) {
      onActivateProject(updatedProj)
    }
    showToast('Bot project settings saved successfully.')
  }

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    )
  })

  return (
    <div className="projects-view-container">
      {toast && (
        <div className="flow-toast" role="status">
          {toast}
        </div>
      )}

      {/* Top Header Controls */}
      <header className="projects-view-header">
        <div className="projects-header-left">
          <div className="view-title-group">
            <span className="view-icon">
              <Icon name="Folder" />
            </span>
            <div>
              <h1 className="view-heading">Bot Projects Manager</h1>
              <p className="view-subheading">
                Organize, edit, duplicate, and export your visual node bot configurations
              </p>
            </div>
          </div>
        </div>

        <div className="projects-header-actions">
          <div className="project-search-input-wrapper">
            <span className="search-icon">
              <Icon name="Search" />
            </span>
            <input
              type="text"
              className="project-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <Icon name="X" />
              </button>
            )}
          </div>

          <button
            type="button"
            className="projects-btn btn-secondary-outline"
            onClick={onImportFromFile}
            title="Import an existing .yapbot.json file from disk"
          >
            <Icon name="FolderOpen" />
            <span>Import File</span>
          </button>

          <button
            type="button"
            className="projects-btn btn-primary-gradient"
            onClick={onOpenNewProjectModal}
          >
            <Icon name="Plus" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      <div className="projects-view-content">
        {/* ================================================================= */}
        {/* CURRENT ACTIVE PROJECT SHOWCASE BANNER (Images 7 & 8)             */}
        {/* ================================================================= */}
        {currentActive && (
          <div className="current-project-banner">
            <div className="current-banner-top">
              <div className="active-badge-pill">
                <span className="badge-pulse-dot online" />
                <span>CURRENT ACTIVE PROJECT</span>
              </div>
              <span className="current-modified-date">
                Last modified: {new Date(currentActive.lastModified).toLocaleString()}
              </span>
            </div>

            <div className="current-banner-main">
              <div
                className="current-project-avatar"
                style={{ background: currentActive.iconBg || '#3b82f6' }}
              >
                <Icon name={currentActive.icon || 'Bot'} size={32} />
              </div>

              <div className="current-project-info">
                <div className="current-title-row">
                  <h2 className="current-project-name">{currentActive.name}</h2>
                  <span className="profile-verified-badge">
                    <Icon name="CheckCheck" size={11} /> Verified Bot
                  </span>
                  <span className="current-prefix-badge">
                    Prefix: {currentActive.prefix || '/'}
                  </span>
                </div>

                <p className="current-project-desc">
                  {currentActive.description || 'Active bot workflow canvas.'}
                </p>

                <div className="current-stats-row">
                  <span className="current-stat-item">
                    <Icon name="Workflow" size={13} /> {currentActive.nodeCount} Flow Nodes
                  </span>
                  <span className="current-stat-item">
                    <Icon name="Network" size={13} /> {currentActive.edgeCount} Connections
                  </span>
                  <span
                    className="current-stat-item clickable-path"
                    onClick={() =>
                      handleRevealFolder(currentActive.filePath || currentActive.location)
                    }
                    title="Click to copy path"
                  >
                    <Icon name="Folder" size={13} />{' '}
                    {currentActive.filePath || currentActive.location || 'Local Workspace'}
                  </span>
                </div>
              </div>

              {/* Action Buttons on Active Project Card (Image 8) */}
              <div className="current-project-actions">
                <button
                  type="button"
                  className="current-action-btn btn-settings"
                  onClick={() => setSettingsModalProject(currentActive)}
                  title="Configure bot settings, prefix & permissions"
                >
                  <Icon name="Settings" size={15} />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  className="current-action-btn btn-folder"
                  onClick={() =>
                    handleRevealFolder(currentActive.filePath || currentActive.location)
                  }
                  title="Show project folder"
                >
                  <Icon name="Folder" size={15} />
                  <span>Folder</span>
                </button>

                <button
                  type="button"
                  className="current-action-btn btn-open-editor"
                  onClick={() => onOpenProject(currentActive)}
                  title="Open Flow Editor canvas"
                >
                  <Icon name="Zap" size={15} />
                  <span>Open Editor</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* RECENT PROJECTS LIST                                              */}
        {/* ================================================================= */}
        <div className="recent-projects-header">
          <h3 className="recent-heading">Recent Projects</h3>
          <span className="recent-count">{filteredProjects.length} projects found</span>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="projects-empty-state">
            <span className="empty-icon">
              <Icon name="Folder" />
            </span>
            <h3>No projects found</h3>
            <p>
              {searchQuery
                ? `No bot projects matching "${searchQuery}".`
                : 'Get started by creating your first bot project.'}
            </p>
            <button
              type="button"
              className="projects-btn btn-primary-gradient"
              onClick={onOpenNewProjectModal}
            >
              Create New Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((proj) => {
              const isActive = proj.id === currentActive?.id
              return (
                <div
                  key={proj.id}
                  className={`project-card ${isActive ? 'is-active-card' : ''}`}
                  onClick={() => handleSelectToActivate(proj)}
                >
                  <div className="project-card-top">
                    <div
                      className="project-avatar"
                      style={{ background: proj.iconBg || '#3b82f6' }}
                    >
                      <Icon name={proj.icon || 'Bot'} size={20} />
                    </div>
                    <div className="project-card-title-group">
                      {editingId === proj.id ? (
                        <div className="rename-input-row" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            className="rename-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename(proj.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            className="rename-save-btn"
                            onClick={() => saveRename(proj.id)}
                          >
                            <Icon name="Check" />
                          </button>
                        </div>
                      ) : (
                        <div className="project-title-with-badge">
                          <h3
                            className="project-card-title"
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              startRename(proj)
                            }}
                            title="Double-click to rename"
                          >
                            {proj.name}
                          </h3>
                          {isActive && (
                            <span className="active-mini-dot" title="Currently Active" />
                          )}
                        </div>
                      )}
                      <span className="project-card-date">
                        Modified: {new Date(proj.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="project-card-description">
                    {proj.description || 'Visual workflow bot project.'}
                  </p>

                  <div className="project-card-stats">
                    <span className="stat-pill">{proj.nodeCount} Nodes</span>
                    <span className="stat-pill">{proj.edgeCount} Edges</span>
                    <span className="stat-pill">Prefix: {proj.prefix || '/'}</span>
                  </div>

                  <div className="project-card-footer" onClick={(e) => e.stopPropagation()}>
                    <div className="project-quick-actions">
                      <button
                        type="button"
                        className="card-action-btn"
                        onClick={() => setSettingsModalProject(proj)}
                        title="Bot Settings"
                      >
                        <Icon name="Settings" size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-action-btn"
                        onClick={() => startRename(proj)}
                        title="Rename Project"
                      >
                        <Icon name="Pencil" size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-action-btn"
                        onClick={() => handleDuplicate(proj.id)}
                        title="Duplicate Project"
                      >
                        <Icon name="Copy" size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-action-btn"
                        onClick={() => onExportStandalone(proj)}
                        title="Export Standalone Node.js Runner"
                      >
                        <Icon name="Package" size={14} />
                      </button>
                      <button
                        type="button"
                        className="card-action-btn delete-btn"
                        onClick={() => handleDelete(proj.id, proj.name)}
                        title="Delete Project"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="open-editor-btn"
                      onClick={() => onOpenProject(proj)}
                    >
                      Open Flow &rarr;
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bot Settings Modal */}
      {settingsModalProject && (
        <BotSettingsModal
          isOpen={Boolean(settingsModalProject)}
          project={settingsModalProject}
          token={settingsModalProject.token || ''}
          onSave={handleSaveSettings}
          onClose={() => setSettingsModalProject(null)}
        />
      )}
    </div>
  )
}
