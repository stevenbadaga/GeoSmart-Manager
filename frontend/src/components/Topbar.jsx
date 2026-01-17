import { useEffect } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { useProject } from '../projects/ProjectContext'
import { Button } from './Button'

export function Topbar({ onMenu }) {
  const { logout } = useAuth()
  const { projectId, setSelectedProjectId } = useProject()

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data,
  })

  const projects = projectsQuery.data || []

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

      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Project</div>
        <select
          className="mt-1 h-10 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          value={projectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <Button variant="outline" onClick={logout} title="Logout">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </div>
  )
}

