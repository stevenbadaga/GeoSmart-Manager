import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const statusOptions = ['PLANNING', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'COMPLETED']
const archiveOptions = ['ACTIVE', 'ARCHIVED', 'ALL']
const projectTypeOptions = ['Land Subdivision', 'Topography', 'Verification', 'Large Scale', 'Survey', 'Boundary Demarcation']
const documentStatusOptions = ['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED']
const communicationChannels = ['EMAIL', 'CALL', 'MEETING', 'SMS', 'NOTE']
const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'client', label: 'Client Name' },
  { value: 'readiness', label: 'Readiness' },
  { value: 'deadline', label: 'Target End Date' }
]
const typePalette = {
  'Land Subdivision': 'bg-success/10 text-success',
  Topography: 'bg-water/10 text-water',
  Verification: 'bg-secondary/10 text-secondary',
  'Large Scale': 'bg-parcel/15 text-parcel',
  Survey: 'bg-river/10 text-river',
  'Boundary Demarcation': 'bg-moss/10 text-moss'
}
const statusPalette = {
  PLANNING: 'bg-sand text-ink/70',
  IN_PROGRESS: 'bg-river/10 text-river',
  REVIEW: 'bg-warning/15 text-warning',
  APPROVED: 'bg-success/10 text-success',
  COMPLETED: 'bg-moss/10 text-moss',
  ARCHIVED: 'bg-secondary/10 text-secondary'
}
const avatarPalette = ['#1F6F5F', '#2A6FA1', '#B6862C', '#5B667A', '#1F8A4C', '#C97A1A']
const emptyForm = { code: '', name: '', projectType: projectTypeOptions[0], locationSummary: '', scopeSummary: '', description: '', status: 'PLANNING', startDate: '', endDate: '', clientId: '' }
const emptyDocumentForm = { title: '', category: '', versionLabel: '', fileReference: '', approvalStatus: 'DRAFT', notes: '' }
const emptyCommunicationForm = { channel: 'EMAIL', subject: '', contactPerson: '', summary: '', occurredAt: '' }

function computeProgress(project) {
  if (!project) return 0
  if (project.archived || project.status === 'COMPLETED' || project.workflowStage === 'READY_FOR_SUBMISSION') return 100
  return Math.max(0, Math.min(100, project.readinessPercent || 0))
}

function formatDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function avatarColor(text = '') {
  const hash = text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatarPalette[hash % avatarPalette.length]
}

function toDateRank(value) {
  if (!value) return 0
  const rank = new Date(value).getTime()
  return Number.isNaN(rank) ? 0 : rank
}

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [documents, setDocuments] = useState([])
  const [communications, setCommunications] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')
  const [archiveFilter, setArchiveFilter] = useState(searchParams.get('archive') || 'ACTIVE')
  const [sortKey, setSortKey] = useState(searchParams.get('sort') || 'recent')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('project') || '')
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm)
  const [communicationForm, setCommunicationForm] = useState(emptyCommunicationForm)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId]
  )

  const loadProjectRecords = async (projectId) => {
    if (!projectId) {
      setDocuments([])
      setCommunications([])
      return
    }
    setRecordsLoading(true)
    try {
      const [documentData, communicationData] = await Promise.all([
        api.get(`/api/projects/${projectId}/documents`),
        api.get(`/api/projects/${projectId}/communications`)
      ])
      setDocuments(documentData || [])
      setCommunications(communicationData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setRecordsLoading(false)
    }
  }

  const load = async (preferredProjectId = selectedProjectId) => {
    setLoading(true)
    try {
      const [projectData, clientData] = await Promise.all([
        api.get('/api/projects?includeArchived=true'),
        api.get('/api/clients')
      ])
      const nextProjects = projectData || []
      const nextClients = clientData || []
      setProjects(nextProjects)
      setClients(nextClients)
      const keepSelected = nextProjects.some((project) => String(project.id) === String(preferredProjectId))
      const fallbackProject = nextProjects.find((project) => !project.archived) || nextProjects[0] || null
      setSelectedProjectId(keepSelected ? String(preferredProjectId) : (fallbackProject ? String(fallbackProject.id) : ''))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const nextParams = new URLSearchParams()
    nextParams.set('includeArchived', 'true')
    if (search) nextParams.set('q', search)
    if (statusFilter !== 'ALL') nextParams.set('status', statusFilter)
    if (archiveFilter !== 'ACTIVE') nextParams.set('archive', archiveFilter)
    if (sortKey !== 'recent') nextParams.set('sort', sortKey)
    if (selectedProjectId) nextParams.set('project', selectedProjectId)
    setSearchParams(nextParams, { replace: true })
  }, [archiveFilter, search, selectedProjectId, setSearchParams, sortKey, statusFilter])

  useEffect(() => {
    loadProjectRecords(selectedProjectId)
  }, [selectedProjectId])

  const metrics = useMemo(() => ({
    active: projects.filter((project) => !project.archived).length,
    fieldWork: projects.filter((project) => !project.archived && project.status === 'IN_PROGRESS').length,
    pendingCompliance: projects.filter((project) => !project.archived && project.workflowStage === 'COMPLIANCE_PENDING').length,
    archived: projects.filter((project) => project.archived).length
  }), [projects])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = projects.filter((project) => {
      const matchesArchive = archiveFilter === 'ALL'
        || (archiveFilter === 'ACTIVE' && !project.archived)
        || (archiveFilter === 'ARCHIVED' && project.archived)
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter
      const matchesSearch = !query || [project.name, project.code, project.clientName, project.projectType, project.locationSummary, project.scopeSummary, project.description]
        .some((value) => value?.toLowerCase().includes(query))
      return matchesArchive && matchesStatus && matchesSearch
    })

    return [...list].sort((left, right) => {
      if (sortKey === 'client') return (left.clientName || '').localeCompare(right.clientName || '')
      if (sortKey === 'readiness') return computeProgress(right) - computeProgress(left)
      if (sortKey === 'deadline') return toDateRank(left.endDate) - toDateRank(right.endDate)
      return Number(right.id) - Number(left.id)
    })
  }, [archiveFilter, projects, search, sortKey, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, clientId: clients[0] ? String(clients[0].id) : '' })
    setShowForm(true)
    setError('')
    setInfo('')
  }

  const openEdit = (project) => {
    setEditing(project)
    setForm({
      code: project.code || '',
      name: project.name || '',
      projectType: project.projectType || projectTypeOptions[0],
      locationSummary: project.locationSummary || '',
      scopeSummary: project.scopeSummary || '',
      description: project.description || '',
      status: project.status || 'PLANNING',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      clientId: project.clientId ? String(project.clientId) : ''
    })
    setShowForm(true)
    setError('')
    setInfo('')
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    if (!form.clientId) {
      setError('Select a client before saving the project.')
      return
    }
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null, clientId: Number(form.clientId) }
    try {
      if (editing) {
        await api.put(`/api/projects/${editing.id}`, payload)
        setInfo('Project updated successfully.')
        await load(editing.id)
      } else {
        await api.post('/api/projects', payload)
        setInfo('Project created successfully.')
        await load()
      }
      closeForm()
    } catch (err) {
      setError(err.message)
    }
  }

  const archiveProject = async (project) => {
    if (project.archived || !window.confirm(`Archive ${project.name}?`)) return
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${project.id}/archive`, {})
      setInfo('Project archived successfully.')
      await load(project.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const restoreProject = async (project) => {
    if (!project.archived || !window.confirm(`Restore ${project.name}?`)) return
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${project.id}/restore`, {})
      setInfo('Project restored successfully.')
      await load(project.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete ${project.name}? This cannot be undone.`)) return
    setError('')
    setInfo('')
    try {
      await api.del(`/api/projects/${project.id}`)
      setInfo('Project deleted successfully.')
      await load(project.id === selectedProject?.id ? '' : selectedProjectId)
    } catch (err) {
      setError(err.message)
    }
  }

  const submitDocument = async (event) => {
    event.preventDefault()
    if (!selectedProjectId) return setError('Select a project before adding documents.')
    if (selectedProject?.archived) return setError('Restore the project before adding new documents.')
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${selectedProjectId}/documents`, documentForm)
      setDocumentForm(emptyDocumentForm)
      setInfo('Project document recorded.')
      await loadProjectRecords(selectedProjectId)
      await load(selectedProjectId)
    } catch (err) {
      setError(err.message)
    }
  }

  const submitCommunication = async (event) => {
    event.preventDefault()
    if (!selectedProjectId) return setError('Select a project before adding communications.')
    if (selectedProject?.archived) return setError('Restore the project before adding new communications.')
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${selectedProjectId}/communications`, {
        ...communicationForm,
        occurredAt: communicationForm.occurredAt ? new Date(communicationForm.occurredAt).toISOString() : null
      })
      setCommunicationForm(emptyCommunicationForm)
      setInfo('Project communication recorded.')
      await loadProjectRecords(selectedProjectId)
      await load(selectedProjectId)
    } catch (err) {
      setError(err.message)
    }
  }

  const recordsDisabled = !selectedProjectId || Boolean(selectedProject?.archived)

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Project Delivery</p>
          <h1 className="text-2xl font-semibold text-ink mt-2">Projects & Client Delivery</h1>
          <p className="text-sm text-ink/60">Track active work, archive completed engagements, and keep delivery records attached to each project.</p>
        </div>
        <Button onClick={openCreate} disabled={!clients.length}>New Project</Button>
      </div>

      {!clients.length && (
        <Card className="p-4">
          <p className="text-sm text-warning">Add at least one client before creating projects.</p>
        </Card>
      )}

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Active Projects</p>
          <p className="text-2xl font-semibold text-ink mt-2">{metrics.active}</p>
          <p className="text-xs text-success mt-2">Visible across delivery modules</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Field Work</p>
          <p className="text-2xl font-semibold text-ink mt-2">{metrics.fieldWork}</p>
          <p className="text-xs text-ink/60 mt-2">Projects currently in execution</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Pending Compliance</p>
          <p className="text-2xl font-semibold text-ink mt-2">{metrics.pendingCompliance}</p>
          <p className="text-xs text-warning mt-2">Ready for validation follow-up</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Archived</p>
          <p className="text-2xl font-semibold text-ink mt-2">{metrics.archived}</p>
          <p className="text-xs text-ink/60 mt-2">Retained outside active workflows</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid lg:grid-cols-[1.2fr_repeat(3,minmax(0,220px))] gap-4">
          <Input label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, code, client, location" />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">Status</span>
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">Archive view</span>
            <select className="input" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
              {archiveOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'ACTIVE' ? 'Active Only' : option === 'ARCHIVED' ? 'Archived Only' : 'All Projects'}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">Sort</span>
            <select className="input" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}
      {info && <p className="text-sm text-success">{info}</p>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-sand text-ink/60">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Project</th>
                <th className="text-left px-6 py-3 font-semibold">Client</th>
                <th className="text-left px-6 py-3 font-semibold">Type</th>
                <th className="text-left px-6 py-3 font-semibold">Location</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Records</th>
                <th className="text-left px-6 py-3 font-semibold">Progress</th>
                <th className="text-left px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const progress = computeProgress(project)
                return (
                  <tr key={project.id} className="border-t border-clay/60 align-top">
                    <td className="px-6 py-4">
                      <button className="font-semibold text-left text-ink hover:text-river transition" onClick={() => setSelectedProjectId(String(project.id))}>
                        {project.name}
                      </button>
                      <p className="text-xs text-ink/45 mt-1">{project.code}</p>
                      <p className="text-xs text-ink/60 mt-1">{project.scopeSummary || project.description || 'Scope not captured yet'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full border border-clay/70 flex items-center justify-center text-white text-xs font-semibold" style={{ background: avatarColor(project.clientName) }}>
                          {project.clientName?.slice(0, 1) || 'C'}
                        </div>
                        <div>
                          <p className="font-medium text-ink">{project.clientName}</p>
                          <p className="text-xs text-ink/45">Client #{project.clientId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${typePalette[project.projectType] || 'bg-sand text-ink/70'}`}>
                        {project.projectType || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink/70">
                      <p>{project.locationSummary || 'Location not set'}</p>
                      <p className="text-xs text-ink/45 mt-1">
                        {project.startDate ? `Start ${formatDate(project.startDate)}` : 'No start date'}
                        {project.endDate ? ` | End ${formatDate(project.endDate)}` : ''}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs ${statusPalette[project.archived ? 'ARCHIVED' : project.status] || 'bg-sand text-ink/70'}`}>
                        {project.archived ? 'ARCHIVED' : project.status}
                      </span>
                      <p className="text-xs text-ink/45 mt-2">{project.workflowStage || 'Delivery planning'}</p>
                    </td>
                    <td className="px-6 py-4 text-ink/70">
                      <p>{project.documentCount} document(s)</p>
                      <p className="text-xs text-ink/45 mt-1">{project.communicationCount} communication(s)</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2 min-w-36">
                        <div className="h-2 rounded-full bg-sand overflow-hidden">
                          <div className="h-full bg-river rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-ink/55">{progress}% ready</p>
                        <p className="text-xs text-ink/45">{project.nextAction || 'Review project setup'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setSelectedProjectId(String(project.id))}>Records</Button>
                        <Button variant="secondary" onClick={() => openEdit(project)}>Edit</Button>
                        {project.archived ? (
                          <Button variant="secondary" onClick={() => restoreProject(project)}>Restore</Button>
                        ) : (
                          <Button variant="secondary" onClick={() => archiveProject(project)}>Archive</Button>
                        )}
                        <Button variant="secondary" onClick={() => deleteProject(project)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filteredProjects.length && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-sm text-ink/50">
                    {loading ? 'Loading projects...' : 'No projects match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid xl:grid-cols-[1.6fr_420px] gap-6">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Project Records Workspace</h3>
                <p className="text-sm text-ink/60">Store project documents and stakeholder communications in one place.</p>
              </div>
              <label className="block space-y-2 w-full lg:w-80">
                <span className="text-sm font-medium text-ink/80">Selected project</span>
                <select className="input" value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name} {project.archived ? '(Archived)' : ''}</option>
                  ))}
                </select>
              </label>
            </div>
            {selectedProject ? (
              <div className="mt-4 rounded-2xl border border-clay/60 bg-white/70 p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/45">{selectedProject.code}</p>
                    <h4 className="text-xl font-semibold text-ink mt-1">{selectedProject.name}</h4>
                    <p className="text-sm text-ink/60 mt-1">{selectedProject.locationSummary || 'Location not provided'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${statusPalette[selectedProject.archived ? 'ARCHIVED' : selectedProject.status] || 'bg-sand text-ink/70'}`}>
                    {selectedProject.archived ? 'ARCHIVED' : selectedProject.status}
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-3 text-sm text-ink/70">
                  <div className="rounded-xl border border-clay/60 bg-sand/40 p-3">
                    <p className="text-xs text-ink/45">Workflow</p>
                    <p className="font-medium text-ink mt-1">{selectedProject.workflowStage || 'PROJECT_SETUP'}</p>
                    <p className="text-xs text-ink/50 mt-1">{selectedProject.nextAction || 'No next action recorded'}</p>
                  </div>
                  <div className="rounded-xl border border-clay/60 bg-sand/40 p-3">
                    <p className="text-xs text-ink/45">Records</p>
                    <p className="font-medium text-ink mt-1">{selectedProject.documentCount} docs / {selectedProject.communicationCount} communications</p>
                    <p className="text-xs text-ink/50 mt-1">Client: {selectedProject.clientName}</p>
                  </div>
                  <div className="rounded-xl border border-clay/60 bg-sand/40 p-3">
                    <p className="text-xs text-ink/45">Timeline</p>
                    <p className="font-medium text-ink mt-1">{formatDate(selectedProject.startDate)} to {formatDate(selectedProject.endDate)}</p>
                    <p className="text-xs text-ink/50 mt-1">
                      {selectedProject.archivedAt ? `Archived ${formatDateTime(selectedProject.archivedAt)}` : `${computeProgress(selectedProject)}% delivery readiness`}
                    </p>
                  </div>
                </div>
                {selectedProject.archived && (
                  <p className="text-sm text-warning">
                    This project is archived. Existing records remain visible, but new entries are locked until restoration.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink/60 mt-4">Choose a project to review documents and communications.</p>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card title="Project Documents">
              <form className="space-y-3" onSubmit={submitDocument}>
                <Input label="Document title" value={documentForm.title} onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} required disabled={recordsDisabled} />
                <Input label="Category" value={documentForm.category} onChange={(event) => setDocumentForm({ ...documentForm, category: event.target.value })} required disabled={recordsDisabled} />
                <div className="grid md:grid-cols-2 gap-3">
                  <Input label="Version" value={documentForm.versionLabel} onChange={(event) => setDocumentForm({ ...documentForm, versionLabel: event.target.value })} required disabled={recordsDisabled} />
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-ink/80">Approval status</span>
                    <select className="input" value={documentForm.approvalStatus} onChange={(event) => setDocumentForm({ ...documentForm, approvalStatus: event.target.value })} disabled={recordsDisabled}>
                      {documentStatusOptions.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <Input label="File reference" value={documentForm.fileReference} onChange={(event) => setDocumentForm({ ...documentForm, fileReference: event.target.value })} placeholder="Path, registry code, or cloud reference" disabled={recordsDisabled} />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink/80">Notes</span>
                  <textarea className="input min-h-24" value={documentForm.notes} onChange={(event) => setDocumentForm({ ...documentForm, notes: event.target.value })} placeholder="Submission notes or reviewer remarks" disabled={recordsDisabled} />
                </label>
                <Button className="w-full" disabled={recordsDisabled}>Add Document</Button>
              </form>
              <div className="mt-5 space-y-3">
                {recordsLoading && <p className="text-sm text-ink/50">Loading records...</p>}
                {!recordsLoading && documents.map((document) => (
                  <div key={document.id} className="rounded-xl border border-clay/60 bg-white/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{document.title}</p>
                        <p className="text-xs text-ink/55 mt-1">{document.category} | {document.versionLabel}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${statusPalette[document.approvalStatus] || 'bg-sand text-ink/70'}`}>{document.approvalStatus}</span>
                    </div>
                    <p className="text-xs text-ink/50 mt-2">{document.fileReference || 'No file reference recorded'}</p>
                    {document.notes && <p className="text-xs text-ink/60 mt-2">{document.notes}</p>}
                    <p className="text-xs text-ink/45 mt-2">Recorded {formatDateTime(document.createdAt)}</p>
                  </div>
                ))}
                {!recordsLoading && !documents.length && <p className="text-sm text-ink/50">No project documents recorded yet.</p>}
              </div>
            </Card>

            <Card title="Communications Log">
              <form className="space-y-3" onSubmit={submitCommunication}>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-ink/80">Channel</span>
                    <select className="input" value={communicationForm.channel} onChange={(event) => setCommunicationForm({ ...communicationForm, channel: event.target.value })} disabled={recordsDisabled}>
                      {communicationChannels.map((channel) => (
                        <option key={channel} value={channel}>{channel}</option>
                      ))}
                    </select>
                  </label>
                  <Input label="Contact person" value={communicationForm.contactPerson} onChange={(event) => setCommunicationForm({ ...communicationForm, contactPerson: event.target.value })} disabled={recordsDisabled} />
                </div>
                <Input label="Subject" value={communicationForm.subject} onChange={(event) => setCommunicationForm({ ...communicationForm, subject: event.target.value })} required disabled={recordsDisabled} />
                <Input label="Occurred at" type="datetime-local" value={communicationForm.occurredAt} onChange={(event) => setCommunicationForm({ ...communicationForm, occurredAt: event.target.value })} disabled={recordsDisabled} />
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink/80">Summary</span>
                  <textarea className="input min-h-24" value={communicationForm.summary} onChange={(event) => setCommunicationForm({ ...communicationForm, summary: event.target.value })} placeholder="Meeting notes or decision summary" required disabled={recordsDisabled} />
                </label>
                <Button className="w-full" disabled={recordsDisabled}>Log Communication</Button>
              </form>
              <div className="mt-5 space-y-3">
                {recordsLoading && <p className="text-sm text-ink/50">Loading records...</p>}
                {!recordsLoading && communications.map((communication) => (
                  <div key={communication.id} className="rounded-xl border border-clay/60 bg-white/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{communication.subject}</p>
                        <p className="text-xs text-ink/55 mt-1">{communication.channel} {communication.contactPerson ? `| ${communication.contactPerson}` : ''}</p>
                      </div>
                      <span className="text-xs text-ink/45">{formatDateTime(communication.occurredAt)}</span>
                    </div>
                    <p className="text-sm text-ink/65 mt-2">{communication.summary}</p>
                    <p className="text-xs text-ink/45 mt-2">Logged {formatDateTime(communication.createdAt)}</p>
                  </div>
                ))}
                {!recordsLoading && !communications.length && <p className="text-sm text-ink/50">No communication entries recorded yet.</p>}
              </div>
            </Card>
          </div>
        </div>

        <Card title="Delivery Guidance">
          <div className="space-y-3 text-sm text-ink/70">
            <p>Archive completed or dormant projects so active workflow screens only show current work.</p>
            <p>Record file references as soon as plans, approvals, or reports are produced.</p>
            <p>Use the communications log to preserve client approvals and regulator follow-ups.</p>
            <p>Keep location and scope summaries concise so teams can identify work quickly.</p>
          </div>
        </Card>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-clay/70 w-full max-w-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Project' : 'Create Project'}</h3>
              <button className="text-ink/50 hover:text-ink" onClick={closeForm}>x</button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Project code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
                <Input label="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink/80">Client</span>
                  <select className="input" value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink/80">Status</span>
                  <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink/80">Project type</span>
                  <select className="input" value={form.projectType} onChange={(event) => setForm({ ...form, projectType: event.target.value })}>
                    {projectTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Input label="Location summary" value={form.locationSummary} onChange={(event) => setForm({ ...form, locationSummary: event.target.value })} />
                <Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                <Input label="End date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Scope summary</span>
                <textarea className="input min-h-24" value={form.scopeSummary} onChange={(event) => setForm({ ...form, scopeSummary: event.target.value })} placeholder="Short operational scope for dashboards and handovers" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Description</span>
                <textarea className="input min-h-28" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Extended project notes, deliverables, or constraints" />
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
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
