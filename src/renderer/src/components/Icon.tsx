import React from 'react'
import { resolveIcon } from '../iconMap'

interface IconProps {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
}

/** Renders a lucide-react vector icon by its PascalCase name (see iconMap.ts). */
export const Icon: React.FC<IconProps> = ({ name, size = 16, className, strokeWidth = 2 }) => {
  return React.createElement(resolveIcon(name), {
    size,
    className,
    strokeWidth,
    'aria-hidden': 'true'
  })
}
