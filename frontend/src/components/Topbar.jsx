import { useEffect, useMemo } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { useProject } from '../projects/ProjectContext'
import { Button } from './Button'
import { useLocation } from 'react-router-dom'

export function Topbar({ onMenu }) {
  const { logout } = useAuth()
  const { projectId, setSelectedProjectId } = useProject()
  const loc = useLocation()

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data,
  })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])

  const pageTitle = useMemo(() => {
    const p = loc.pathname
    if (p === '/') return 'Dashboard'
    if (p.startsWith('/clients')) return 'Clients'
    if (p.startsWith('/projects')) return 'Projects'
    if (p.startsWith('/workflow')) return 'Workflow'
    if (p.startsWith('/workspace')) return 'Map Workspace'
    if (p.startsWith('/subdivision')) return 'AI Subdivision'
    if (p.startsWith('/compliance')) return 'Compliance'
    if (p.startsWith('/reports')) return 'Reports'
    if (p.startsWith('/admin/users')) return 'Admin • Users'
    if (p.startsWith('/admin/audit')) return 'Admin • Audit Log'
    return 'GeoSmart-Manager'
  }, [loc.pathname])

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projectId, projects, setSelectedProjectId])

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 lg:hidden"
        onClick={onMenu}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{pageTitle}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active project</div>
          </div>

          <select
            className="h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={projectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={projectsQuery.isLoading || projectsQuery.isError}
          >
            <option value="">
              {projectsQuery.isLoading
                ? 'Loading projects...'
                : projectsQuery.isError
                  ? 'Failed to load projects'
                  : 'Select a project...'}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button variant="outline" onClick={logout} title="Logout">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </div>
  )
}
