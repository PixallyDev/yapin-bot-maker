import React, { useState } from 'react'
import { Icon } from './Icon'

interface CustomTagSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  availableTags: string[]
  onAddCustomTag?: (newTag: string) => void
}

export const CustomTagSelector: React.FC<CustomTagSelectorProps> = ({
  selectedTags,
  onChange,
  availableTags,
  onAddCustomTag
}) => {
  const [inputVal, setInputVal] = useState('')

  const handleToggleTag = (tag: string): void => {
    const cleanTag = tag.toLowerCase().replace(/^#/, '').trim()
    if (selectedTags.includes(cleanTag)) {
      onChange(selectedTags.filter((t) => t !== cleanTag))
    } else {
      onChange([...selectedTags, cleanTag])
    }
  }

  const handleAddTag = (): void => {
    const cleanTag = inputVal.toLowerCase().replace(/^#/, '').trim()
    if (!cleanTag) return

    if (!selectedTags.includes(cleanTag)) {
      onChange([...selectedTags, cleanTag])
    }
    if (onAddCustomTag) {
      onAddCustomTag(cleanTag)
    }
    setInputVal('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="custom-tag-selector">
      <div className="tag-input-row">
        <div className="input-with-icon tag-input-wrapper">
          <span className="input-prefix-icon">#</span>
          <input
            type="text"
            className="modal-input has-prefix tag-text-input"
            placeholder="Type a custom tag name and press Enter..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          type="button"
          className="btn-secondary btn-add-tag"
          onClick={handleAddTag}
          disabled={!inputVal.trim()}
        >
          <Icon name="Plus" size={13} />
          <span>Add Tag</span>
        </button>
      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="selected-tags-container">
          <span className="selected-tags-label">Active tags:</span>
          <div className="active-tag-pills">
            {selectedTags.map((tag) => (
              <span key={tag} className="tag-pill active-pill">
                #{tag}
                <button
                  type="button"
                  className="tag-remove-btn"
                  onClick={() => handleToggleTag(tag)}
                  title={`Remove #${tag}`}
                  aria-label={`Remove #${tag}`}
                >
                  <Icon name="X" size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Community Available Tags suggestions */}
      <div className="available-tags-box">
        <span className="available-tags-label">Available Community Tags (Click to toggle):</span>
        <div className="available-tag-pills">
          {availableTags.slice(0, 20).map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                className={`tag-toggle-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggleTag(tag)}
              >
                #{tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
