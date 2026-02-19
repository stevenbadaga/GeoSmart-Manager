import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const statusOptions = ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'COMPLETED']
const sortOptions = [
  { value: 'recent', label: 'Sort: Recent' },
  { value: 'deadline', label: 'Sort: Deadline' },
  { value: 'name', label: 'Sort: Name' }
]

const typePalette = {
  'Land Subdivision': 'bg-river/10 text-river',
  Topography: 'bg-water/10 text-water',
  Verification: 'bg-success/10 text-success',
  'Large Scale': 'bg-parcel/15 text-parcel',
  Survey: 'bg-sand text-secondary'
}

const statusPalette = {
  PLANNING: 'bg-water/10 text-water',
  IN_PROGRESS: 'bg-sunrise/10 text-sunrise',
  REVIEW: 'bg-warning/15 text-warning',
  APPROVED: 'bg-success/10 text-success',
  COMPLETED: 'bg-sand text-secondary'
}

const emptyForm = {
  code: '',
  name: '',
  description: '',
  status: 'PLANNING',
  startDate: '',
  endDate: '',
  clientId: ''
}

function getProjectType(project) {
  const text = `${project.name} ${project.description || ''}`.toLowerCase()
  if (text.includes('subdivision')) return 'Land Subdivision'
  if (text.includes('topo') || text.includes('topography')) return 'Topography'
  if (text.includes('boundary') || text.includes('verification')) return 'Verification'
  if (text.includes('large') || text.includes('estate')) return 'Large Scale'
  return 'Survey'
}

function computeProgress(project) {
  if (project.status === 'COMPLETED') return 100
  if (project.status === 'APPROVED') return 80
  if (project.status === 'REVIEW') return 65
  if (project.status === 'IN_PROGRESS') return 40
  if (project.status === 'PLANNING') return 20

  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate).getTime()
    const end = new Date(project.endDate).getTime()
    const now = Date.now()
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
    return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)))
  }
  return 0
}

function formatDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function avatarColor(name = '') {
  const palette = ['#1F6F5F', '#2A6FA1', '#B6862C', '#5B667A', '#1F8A4C', '#C97A1A']
  const hash = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

export default function Projects() {
  const [params] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortKey, setSortKey] = useState('recent')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const clientMap = useMemo(() => {
    const map = new Map()
    clients.forEach((client) => map.set(client.id, client))
    return map
  }, [clients])

  const load = () => {
    setError('')
    Promise.all([api.get('/api/projects'), api.get('/api/clients')])
      .then(([projectsData, clientsData]) => {
        setProjects(projectsData || [])
        setClients(clientsData || [])
      })
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const q = params.get('q') || ''
    setSearch(q)
  }, [params])

  const stats = useMemo(() => {
    const active = projects.filter((project) => project.status !== 'COMPLETED').length
    const fieldWork = projects.filter((project) => project.status === 'IN_PROGRESS').length
    const pendingCompliance = projects.filter((project) => project.status === 'REVIEW').length
    const completed = projects.filter((project) => project.status === 'COMPLETED').length
    return { active, fieldWork, pendingCompliance, completed }
  }, [projects])

  const typeOptions = useMemo(() => {
    const types = new Set(projects.map(getProjectType))
    return ['ALL', ...Array.from(types)]
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const client = clientMap.get(project.clientId)
        const location = client?.address || ''
        const haystack = `${project.name} ${project.code} ${client?.name || ''} ${location} ${project.nextAction || ''}`.toLowerCase()
        const matchesSearch = haystack.includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter
        const matchesType = typeFilter === 'ALL' || getProjectType(project) === typeFilter
        return matchesSearch && matchesStatus && matchesType
      })
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name)
        if (sortKey === 'deadline') {
          const aDate = a.endDate ? new Date(a.endDate).getTime() : Infinity
          const bDate = b.endDate ? new Date(b.endDate).getTime() : Infinity
          return aDate - bDate
        }
        const aStart = a.startDate ? new Date(a.startDate).getTime() : 0
        const bStart = b.startDate ? new Date(b.startDate).getTime() : 0
        return bStart - aStart
      })
  }, [projects, clientMap, search, statusFilter, typeFilter, sortKey])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (project) => {
    setEditing(project)
    setForm({
      code: project.code || '',
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'PLANNING',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      clientId: project.clientId ? String(project.clientId) : ''
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        clientId: Number(form.clientId),
        startDate: form.startDate || null,
        endDate: form.endDate || null
      }
      if (editing) {
        await api.put(`/api/projects/${editing.id}`, payload)
      } else {
        await api.post('/api/projects', payload)
      }
      closeForm()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"?`)) return
    try {
      await api.del(`/api/projects/${project.id}`)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs text-ink/50">Home / Projects</p>
          <h1 className="text-2xl font-semibold text-ink">Projects</h1>
          <p className="text-sm text-ink/60">Manage surveys, subdivisions, and client requests.</p>
        </div>
        <Button onClick={openCreate}>New Project</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/60">Total Active</p>
            <span className="h-8 w-8 rounded-xl bg-water/10 text-water flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16v11H4z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-semibold mt-3">{stats.active}</p>
          <p className="text-xs text-success mt-2">Up this week</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/60">Field Work Phase</p>
            <span className="h-8 w-8 rounded-xl bg-sunrise/10 text-sunrise flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6l8-3 8 3v12l-8 3-8-3z" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-semibold mt-3">{stats.fieldWork}</p>
          <p className="text-xs text-ink/50 mt-2">On schedule</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/60">Pending Compliance</p>
            <span className="h-8 w-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 3l8 4-8 4-8-4 8-4z" />
                <path d="M4 13l8 4 8-4" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-semibold mt-3">{stats.pendingCompliance}</p>
          <p className="text-xs text-danger mt-2">Need attention</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink/60">Completed</p>
            <span className="h-8 w-8 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="text-2xl font-semibold mt-3">{stats.completed}</p>
          <p className="text-xs text-success mt-2">+15% vs last month</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-2 bg-white/90 border border-clay/70 rounded-xl px-3 py-2 w-full xl:max-w-md">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink/50" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="bg-transparent text-sm text-ink/70 placeholder:text-ink/40 focus:outline-none w-full"
              placeholder="Search projects, clients, or location..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="input max-w-[160px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Status: All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select className="input max-w-[160px]" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type === 'ALL' ? 'Type: All' : type}</option>
              ))}
            </select>
            <select className="input max-w-[160px]" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-sand text-ink/60">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Project</th>
                <th className="text-left px-6 py-3 font-semibold">Client</th>
                <th className="text-left px-6 py-3 font-semibold">Type</th>
                <th className="text-left px-6 py-3 font-semibold">Location</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Next Action</th>
                <th className="text-left px-6 py-3 font-semibold">Progress</th>
                <th className="text-left px-6 py-3 font-semibold">Deadline</th>
                <th className="text-left px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const client = clientMap.get(project.clientId)
                const type = getProjectType(project)
                const progress = Number.isFinite(project.readinessPercent) ? project.readinessPercent : computeProgress(project)
                return (
                  <tr key={project.id} className="border-t border-clay/60 hover:bg-white/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-semibold text-ink">{project.name}</p>
                      <p className="text-xs text-ink/50">{project.code}</p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                          style={{ background: avatarColor(client?.name || 'V') }}
                        >
                          {(client?.name || 'V').slice(0, 1)}
                        </div>
                        <span className="text-ink/80">{client?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs ${typePalette[type] || typePalette.Survey}`}>
                        {type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-ink/70 max-w-[220px]">
                      <p className="truncate" title={client?.address || 'Kigali, Rwanda'}>
                        {client?.address || 'Kigali, Rwanda'}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs ${statusPalette[project.status] || 'bg-sand text-secondary'}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-ink/70">
                      <p className="text-xs font-medium text-ink">{project.nextAction || 'Review workflow stage'}</p>
                      <p className="text-[11px] text-ink/50 mt-1">{project.workflowStage ? project.workflowStage.replace(/_/g, ' ') : 'WORKFLOW'}</p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-sand">
                          <div className="h-2 rounded-full bg-river" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-ink/60">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-ink/70">{formatDate(project.endDate)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg border border-clay/70 bg-white/90 text-xs text-ink/70 hover:bg-sand transition"
                          onClick={() => openEdit(project)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg border border-danger/30 bg-danger/10 text-xs text-danger hover:bg-danger/20 transition"
                          onClick={() => deleteProject(project)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filteredProjects.length && (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-sm text-ink/50">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-clay/70 w-full max-w-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Project' : 'New Project'}</h3>
              <button className="text-ink/50 hover:text-ink" onClick={closeForm}>x</button>
            </div>
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <Input label="Project code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
              <Input label="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <label className="block space-y-2 md:col-span-1">
                <span className="text-sm font-medium text-ink/80">Client</span>
                <select className="input" value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 md:col-span-1">
                <span className="text-sm font-medium text-ink/80">Status</span>
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              <Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-ink/80">Description</span>
                <textarea className="input min-h-[90px]" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
                <Button type="submit">{editing ? 'Save Changes' : 'Create Project'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
