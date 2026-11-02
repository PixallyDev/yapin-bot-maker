import React from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  title?: string
  size?: 'sm' | 'md'
}

/** Discord-style pill toggle used everywhere instead of native checkboxes. */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  title,
  size = 'md'
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={title}
    disabled={disabled}
    className={`pill-toggle pill-toggle-${size} nodrag nopan ${checked ? 'on' : 'off'}`}
    onClick={(event) => {
      event.stopPropagation()
      if (!disabled) onChange(!checked)
    }}
  >
    <span className="pill-toggle-knob" />
  </button>
)
