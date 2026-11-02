import React from 'react'
import { ProjectContext } from '../projectStore'
import { BotProjectRecord } from '../projectManager'

export interface ProjectProviderProps {
  project?: BotProjectRecord | null
  commandPrefix?: string
  children: React.ReactNode
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  project,
  commandPrefix,
  children
}) => {
  const prefix = commandPrefix ?? project?.prefix ?? '/'
  return (
    <ProjectContext.Provider value={{ activeProject: project ?? null, commandPrefix: prefix }}>
      {children}
    </ProjectContext.Provider>
  )
}
