import React, { useState, useRef, useEffect } from 'react'
import { BotNode } from '../types'
import { Icon } from './Icon'

interface FloatingSelectionBarProps {
  selectedNodes: BotNode[]
  onCreateGroup: () => void
  onShareToFriend: () => void
  onShareToSupport: () => void
  onShareToMarketplace: () => void
  onDeselect: () => void
}

export const FloatingSelectionBar: React.FC<FloatingSelectionBarProps> = ({
  selectedNodes,
  onCreateGroup,
  onShareToFriend,
  onShareToSupport,
  onShareToMarketplace,
  onDeselect
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsShareOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  if (selectedNodes.length < 2) return null

  return (
    <div className="floating-selection-container nodrag nopan">
      <div className="floating-selection-bar" onClick={(e) => e.stopPropagation()}>
        <div className="selection-badge">
          <Icon name="Layers" size={14} />
          <span>{selectedNodes.length} nodes selected</span>
        </div>

        <div className="selection-divider" />

        <button
          type="button"
          className="floating-bar-btn btn-create-group"
          onClick={onCreateGroup}
          title="Create a new flow group from selected nodes"
        >
          <Icon name="Plus" size={14} />
          <span>+ Create group</span>
        </button>

        <div className="share-menu-anchor" ref={menuRef}>
          <button
            type="button"
            className={`floating-bar-btn btn-share ${isShareOpen ? 'active' : ''}`}
            onClick={() => setIsShareOpen((prev) => !prev)}
            title="Share selected flow snippet"
          >
            <Icon name="Share2" size={14} />
            <span>Share</span>
            <Icon name="ChevronDown" size={12} />
          </button>

          {isShareOpen && (
            <div className="share-dropdown-menu">
              <button
                type="button"
                className="share-dropdown-item"
                onClick={() => {
                  setIsShareOpen(false)
                  onShareToFriend()
                }}
              >
                <div className="share-item-icon icon-friend">
                  <Icon name="Users" size={16} />
                </div>
                <div className="share-item-info">
                  <span className="share-item-title">Share to Friend</span>
                  <span className="share-item-sub">
                    Send snippet directly to collaborator&apos;s inbox
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="share-dropdown-item"
                onClick={() => {
                  setIsShareOpen(false)
                  onShareToSupport()
                }}
              >
                <div className="share-item-icon icon-support">
                  <Icon name="LifeBuoy" size={16} />
                </div>
                <div className="share-item-info">
                  <span className="share-item-title">Share to Support</span>
                  <span className="share-item-sub">
                    Send diagnostic flow package to Yapin Support
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="share-dropdown-item"
                onClick={() => {
                  setIsShareOpen(false)
                  onShareToMarketplace()
                }}
              >
                <div className="share-item-icon icon-market">
                  <Icon name="Store" size={16} />
                </div>
                <div className="share-item-info">
                  <span className="share-item-title">Share to Marketplace</span>
                  <span className="share-item-sub">Publish snippet as a public community item</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="floating-bar-close-btn"
          onClick={onDeselect}
          title="Deselect all"
          aria-label="Deselect"
        >
          <Icon name="X" size={13} />
        </button>
      </div>
    </div>
  )
}
