/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projectId, setProjectId] = useState(() => localStorage.getItem('geosmart.projectId') || '')

  const value = useMemo(() => {
    function setSelectedProjectId(id) {
      const v = id || ''
      setProjectId(v)
      localStorage.setItem('geosmart.projectId', v)
    }

    return { projectId, setSelectedProjectId }
  }, [projectId])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}
