import React, { useState } from 'react'
import {
  BotProjectRecord,
  getSavedProjects,
  deleteProjectRecord,
  renameProjectRecord,
  duplicateProjectRecord,
  createNewProjectRecord
} from '../projectManager'

interface ProjectsViewProps {
  onOpenProject: (project: BotProjectRecord) => void
  onImportFromFile: () => void
  onExportStandalone: (project: BotProjectRecord) => void
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onOpenProject,
  onImportFromFile,
  onExportStandalone
}) => {
  const [projects, setProjects] = useState<BotProjectRecord[]>(() => getSavedProjects())
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const refreshList = (): void => {
    setProjects(getSavedProjects())
  }

  const handleCreateNew = (): void => {
    const newProj = createNewProjectRecord('New Bot Project')
    refreshList()
    onOpenProject(newProj)
  }

  const handleDelete = (id: string, name: string): void => {
    if (window.confirm(`Are you sure you want to delete project "${name}"?`)) {
      deleteProjectRecord(id)
      refreshList()
    }
  }

  const handleDuplicate = (id: string): void => {
    duplicateProjectRecord(id)
    refreshList()
  }

  const startRename = (proj: BotProjectRecord): void => {
    setEditingId(proj.id)
    setEditName(proj.name)
  }

  const saveRename = (id: string): void => {
    if (editName.trim()) {
      renameProjectRecord(id, editName)
      refreshList()
    }
    setEditingId(null)
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
      {/* Top Header Controls */}
      <header className="projects-view-header">
        <div className="projects-header-left">
          <div className="view-title-group">
            <span className="view-icon">📁</span>
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
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="project-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="projects-btn btn-secondary-outline"
            onClick={onImportFromFile}
            title="Import an existing .yapbot.json file from your computer"
          >
            <span>📂</span> Import File
          </button>

          <button
            type="button"
            className="projects-btn btn-primary-gradient"
            onClick={handleCreateNew}
          >
            <span>➕</span> New Project
          </button>
        </div>
      </header>

      {/* Projects Grid */}
      <div className="projects-view-content">
        {filteredProjects.length === 0 ? (
          <div className="projects-empty-state">
            <span className="empty-icon">📁</span>
            <h3>No projects found</h3>
            <p>
              {searchQuery
                ? `No bot projects matching "${searchQuery}".`
                : 'Get started by creating your first bot project.'}
            </p>
            <button
              type="button"
              className="projects-btn btn-primary-gradient"
              onClick={handleCreateNew}
            >
              Create New Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((proj) => (
              <div key={proj.id} className="project-card">
                <div className="project-card-top">
                  <div className="project-avatar">
                    <span>⚡</span>
                  </div>
                  <div className="project-card-title-group">
                    {editingId === proj.id ? (
                      <div className="rename-input-row">
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
                          ✓
                        </button>
                      </div>
                    ) : (
                      <h3
                        className="project-card-title"
                        onDoubleClick={() => startRename(proj)}
                        title="Double-click to rename"
                      >
                        {proj.name}
                      </h3>
                    )}
                    <span className="project-card-date">
                      Modified: {new Date(proj.lastModified).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="project-card-description">
                  {proj.description || 'No description provided.'}
                </p>

                <div className="project-card-stats">
                  <span className="stat-pill">{proj.nodeCount} Flow Nodes</span>
                  <span className="stat-pill">{proj.edgeCount} Connections</span>
                  {proj.filePath && (
                    <span className="file-linked-pill" title={proj.filePath}>
                      🔗 Linked to File
                    </span>
                  )}
                </div>

                <div className="project-card-footer">
                  <div className="project-quick-actions">
                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => startRename(proj)}
                      title="Rename Project"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => handleDuplicate(proj.id)}
                      title="Duplicate Project"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => onExportStandalone(proj)}
                      title="Export Standalone Node.js Runner"
                    >
                      📦
                    </button>
                    <button
                      type="button"
                      className="card-action-btn delete-btn"
                      onClick={() => handleDelete(proj.id, proj.name)}
                      title="Delete Project"
                    >
                      🗑️
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
