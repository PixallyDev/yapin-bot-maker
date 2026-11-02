import React, { useState } from 'react'
import { BotProjectRecord, getSavedProjects } from '../projectManager'
import { NavTabId } from '../components/Sidebar'
import { Icon } from '../components/Icon'

interface HomeViewProps {
  onNavigate: (tab: NavTabId) => void
  onNewProject: () => void
  onOpenProjectFile: () => void
  onLoadProjectRecord: (project: BotProjectRecord) => void
  onOpenTemplates: () => void
  isRunning: boolean
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onNewProject,
  onOpenProjectFile,
  onLoadProjectRecord,
  onOpenTemplates,
  isRunning
}) => {
  const [recentProjects] = useState<BotProjectRecord[]>(() => getSavedProjects())

  return (
    <div className="home-view-container">
      {/* Hero Welcome Banner */}
      <section className="home-hero-banner">
        <div className="hero-welcome-badge">
          <span className="badge-pulse-dot" />
          <span>YAPIN BOT MAKER STUDIO SUITE v1.0</span>
        </div>

        <div className="hero-title-row">
          <div>
            <h1 className="hero-main-title">Welcome back to Yapper Maker</h1>
            <p className="hero-subtitle-text">
              The professional visual node studio for creating, testing, and deploying custom bots
              for the Yapin platform.
            </p>
          </div>

          <div className="hero-status-pill">
            <span className={`status-indicator ${isRunning ? 'running' : 'idle'}`} />
            <span>Bot Engine: {isRunning ? 'Active & Polling' : 'Idle'}</span>
          </div>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="quick-actions-grid">
          <button type="button" className="action-card primary-card" onClick={onNewProject}>
            <div className="action-card-icon">
              <Icon name="Plus" />
            </div>
            <div className="action-card-text">
              <span className="action-card-title">New Project</span>
              <span className="action-card-desc">Start a fresh visual flow from scratch</span>
            </div>
            <span className="action-card-arrow">&rarr;</span>
          </button>

          <button type="button" className="action-card" onClick={onOpenProjectFile}>
            <div className="action-card-icon">
              <Icon name="FolderOpen" />
            </div>
            <div className="action-card-text">
              <span className="action-card-title">Open Existing</span>
              <span className="action-card-desc">Load a saved .yapbot.json from disk</span>
            </div>
            <span className="action-card-arrow">&rarr;</span>
          </button>

          <button type="button" className="action-card" onClick={() => onNavigate('marketplace')}>
            <div className="action-card-icon">
              <Icon name="ShoppingCart" />
            </div>
            <div className="action-card-text">
              <span className="action-card-title">Browse Marketplace</span>
              <span className="action-card-desc">Get pre-built commands, nodes & themes</span>
            </div>
            <span className="action-card-arrow">&rarr;</span>
          </button>

          <button type="button" className="action-card" onClick={onOpenTemplates}>
            <div className="action-card-icon">
              <Icon name="Sparkles" />
            </div>
            <div className="action-card-text">
              <span className="action-card-title">Starter Templates</span>
              <span className="action-card-desc">Ping & FAQ, Auto-Mod, or Fun bot</span>
            </div>
            <span className="action-card-arrow">&rarr;</span>
          </button>
        </div>
      </section>

      {/* Main Home Layout: Recent Projects + Side Column */}
      <div className="home-columns-layout">
        {/* Left Column: Recent Projects */}
        <section className="home-main-section">
          <div className="section-header-row">
            <div className="section-title-group">
              <span className="section-title-icon">
                <Icon name="Folder" />
              </span>
              <h2 className="section-heading">Recent Projects</h2>
            </div>
            <button
              type="button"
              className="section-link-btn"
              onClick={() => onNavigate('projects')}
            >
              View All Projects ({recentProjects.length}) &rarr;
            </button>
          </div>

          <div className="recent-projects-list">
            {recentProjects.length === 0 ? (
              <div className="empty-projects-card">
                <span>
                  <Icon name="Folder" />
                </span>
                <p>
                  No recent projects yet. Click &quot;New Project&quot; above to build your first
                  bot!
                </p>
              </div>
            ) : (
              recentProjects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="recent-project-row"
                  onClick={() => onLoadProjectRecord(project)}
                >
                  <div className="project-row-icon">
                    <span>
                      <Icon name="Zap" />
                    </span>
                  </div>
                  <div className="project-row-info">
                    <span className="project-row-name">{project.name}</span>
                    <span className="project-row-desc">{project.description}</span>
                  </div>
                  <div className="project-row-meta">
                    <span className="meta-badge">{project.nodeCount} Nodes</span>
                    <span className="meta-badge">{project.edgeCount} Wires</span>
                    <span className="meta-time">
                      {new Date(project.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="project-open-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      onLoadProjectRecord(project)
                    }}
                  >
                    Open in Editor &rarr;
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Community & Changelog */}
        <aside className="home-side-section">
          {/* Community Hub Links */}
          <div className="home-widget-card">
            <h3 className="widget-title">Community & Resources</h3>
            <div className="community-links-list">
              <a
                href="https://bots.yapper.website/api/bot/v1"
                target="_blank"
                rel="noreferrer"
                className="community-link-item"
              >
                <span className="link-icon">
                  <Icon name="BookOpen" />
                </span>
                <div className="link-text-group">
                  <span className="link-label">Yapin Bot API Docs</span>
                  <span className="link-sub">REST endpoint specifications</span>
                </div>
                <span className="link-arrow">
                  <Icon name="ExternalLink" />
                </span>
              </a>

              <a
                href="https://yapin.gg/invite/cQNDdPFZcW"
                target="_blank"
                rel="noreferrer"
                className="community-link-item"
              >
                <span className="link-icon">
                  <Icon name="MessageSquare" />
                </span>
                <div className="link-text-group">
                  <span className="link-label">Developer Yapin</span>
                  <span className="link-sub">Join bot makers & share node setups</span>
                </div>
                <span className="link-arrow">
                  <Icon name="ExternalLink" />
                </span>
              </a>

              <a
                href="https://github.com/yapin-bot-maker/yapin-bot-maker"
                target="_blank"
                rel="noreferrer"
                className="community-link-item"
              >
                <span className="link-icon">
                  <Icon name="Star" />
                </span>
                <div className="link-text-group">
                  <span className="link-label">GitHub Repository</span>
                  <span className="link-sub">Source code, docs & issues</span>
                </div>
                <span className="link-arrow">
                  <Icon name="ExternalLink" />
                </span>
              </a>
            </div>
          </div>

          {/* Changelog & News Box */}
          <div className="home-widget-card changelog-card">
            <div className="widget-header-row">
              <h3 className="widget-title">Latest Studio Updates</h3>
              <span className="version-pill">v1.0.0</span>
            </div>
            <ul className="changelog-list">
              <li>
                <span className="changelog-bullet">
                  <Icon name="Sparkles" />
                </span>
                <span>
                  <strong>Multi-Tab Studio Suite:</strong> Discord-inspired left rail with Home,
                  Projects, Marketplace and Themes.
                </span>
              </li>
              <li>
                <span className="changelog-bullet">
                  <Icon name="Zap" />
                </span>
                <span>
                  <strong>13 Custom Flow Nodes:</strong> Dual-handle condition branching, session
                  variables, delay actions & rich cards.
                </span>
              </li>
              <li>
                <span className="changelog-bullet">
                  <Icon name="Palette" />
                </span>
                <span>
                  <strong>5 Built-in Themes:</strong> Dark, Neon Purple, Midnight OLED, Ice-Phoenix,
                  and GTA VI Vice City.
                </span>
              </li>
              <li>
                <span className="changelog-bullet">
                  <Icon name="Lock" />
                </span>
                <span>
                  <strong>Encrypted Token Storage:</strong> Zero plaintext token leaks with native
                  OS credential encryption.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
