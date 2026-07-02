import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { API_URL, api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

const statusOptions = ['SUBMITTED', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'UNDER_REVIEW', 'NEEDS_MORE_INFO', 'DOCUMENTS_ACCEPTED', 'SUBDIVISION_REVIEW', 'REPORT_GENERATED', 'COMPLETED', 'CANCELLED']
const archiveOptions = ['ACTIVE', 'ARCHIVED', 'ALL']
const projectTypeOptions = ['Land Subdivision', 'Topography', 'Verification', 'Large Scale', 'Survey', 'Boundary Demarcation']
const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'client', label: 'Client Name' },
  { value: 'readiness', label: 'Readiness' },
  { value: 'deadline', label: 'Target End Date' }
]

const landUseOptions = [
  { value: '', label: 'Not specified' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Single family houses', label: 'Single family residential' },
  { value: 'Row housing', label: 'Row housing' },
  { value: 'Apartments', label: 'Apartments' },
  { value: 'Commercial', label: 'Commercial / mixed use' },
  { value: 'Public facility', label: 'Public facility' },
  { value: 'Industrial uses', label: 'Industrial use' }
]

const statusPalette = {
  SUBMITTED: 'bg-slate-50 text-slate-600 border-slate-200',
  PENDING_ASSIGNMENT: 'bg-amber-50 text-amber-700 border-amber-100',
  ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-100',
  UNDER_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  NEEDS_MORE_INFO: 'bg-rose-50 text-rose-700 border-rose-100',
  DOCUMENTS_ACCEPTED: 'bg-teal-50 text-teal-700 border-teal-100',
  SUBDIVISION_REVIEW: 'bg-purple-50 text-purple-700 border-purple-100',
  REPORT_GENERATED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  COMPLETED: 'bg-green-50 text-green-700 border-green-100',
  CANCELLED: 'bg-slate-50 text-slate-400 border-slate-200',
  ARCHIVED: 'bg-slate-50 text-slate-500 border-slate-200'
}

const emptyForm = {
  code: '',
  name: '',
  projectType: projectTypeOptions[0],
  locationSummary: '',
  scopeSummary: '',
  description: '',
  status: 'SUBMITTED',
  startDate: '',
  endDate: '',
  clientId: '',
  requestedUpi: '',
  requestedParcelCount: 3,
  requestedLandUse: 'Agriculture',
  intakeNotes: ''
}

const emptyMessageForm = {
  summary: ''
}

function statusLabel(value) {
  return String(value || '').replaceAll('_', ' ')
}

function normalizeUpi(value) {
  return String(value || '').trim().toUpperCase()
}

function computeProgress(project) {
  if (!project) return 0
  if (project.archived || project.status === 'COMPLETED' || project.readinessPercent >= 100) return 100
  return Math.max(0, Math.min(100, Number(project.readinessPercent || 0)))
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

function toDateRank(value) {
  if (!value) return 0
  const rank = new Date(value).getTime()
  return Number.isNaN(rank) ? 0 : rank
}

function strictestMinimumLotSize(zoning = []) {
  const values = zoning
    .map((zone) => zone?.rule?.minimumLotSizeSqm)
    .filter((value) => Number.isFinite(value) && value > 0)
  return values.length ? Math.max(...values) : null
}

function estimatedPossibleParcels(context) {
  if (!context?.parcel) return null
  const parcelArea = Number(context.parcel.officialAreaSqm || context.parcel.calculatedAreaSqm || 0)
  const minimumLotSize = strictestMinimumLotSize(context.zoning || [])
  if (!Number.isFinite(parcelArea) || parcelArea <= 0 || !Number.isFinite(minimumLotSize) || minimumLotSize <= 0) {
    return null
  }
  return Math.max(1, Math.floor(parcelArea / minimumLotSize))
}

function reportTypeLabel(type) {
  return String(type || 'Report').replaceAll('_', ' ')
}

export default function Projects() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const canManageProjects = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role)
  const canCreateProjects = canManageProjects || user?.role === 'CLIENT'
  const canAssignSurveyors = canManageProjects
  const canApproveProjects = canManageProjects
  const canWorkSubdivision = ['ADMIN', 'PROJECT_MANAGER', 'SURVEYOR'].includes(user?.role)
  const canAcceptAssignment = user?.role === 'SURVEYOR'
  const canChat = ['ADMIN', 'PROJECT_MANAGER', 'SURVEYOR', 'CLIENT'].includes(user?.role)
  const isClientSelfService = user?.role === 'CLIENT'

  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [surveyors, setSurveyors] = useState([])
  const [reports, setReports] = useState([])
  const [communications, setCommunications] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [messageForm, setMessageForm] = useState(emptyMessageForm)
  const [suggestion, setSuggestion] = useState(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)

  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')
  const [archiveFilter, setArchiveFilter] = useState(searchParams.get('archive') || 'ACTIVE')
  const [sortKey, setSortKey] = useState(searchParams.get('sort') || 'recent')
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('project') || '')

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId]
  )

  const isAssignedSurveyor = selectedProject && Number(selectedProject.assignedSurveyorId) === Number(user?.id)

  const workflowSteps = useMemo(() => {
    const readiness = computeProgress(selectedProject)
    return [
      { title: 'Submitted', detail: 'Client intake, UPI, target parcels, and land use captured.', active: readiness >= 10 },
      { title: 'Approved', detail: 'Admin or project manager validated the intake request.', active: readiness >= 20 },
      { title: 'Assigned', detail: 'A land surveyor was assigned to the case.', active: readiness >= 35 },
      { title: 'Accepted', detail: 'Assigned surveyor accepted and opened the job.', active: readiness >= 50 },
      { title: 'Drafted', detail: 'Subdivision draft was generated from the requested parcel.', active: readiness >= 68 },
      { title: 'Delivered', detail: 'Compliance report is stored in project reports for the client.', active: readiness >= 100 }
    ]
  }, [selectedProject])

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = projects.filter((project) => {
      const matchesArchive = archiveFilter === 'ALL'
        || (archiveFilter === 'ACTIVE' && !project.archived)
        || (archiveFilter === 'ARCHIVED' && project.archived)
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter
      const haystack = [
        project.name,
        project.code,
        project.clientName,
        project.projectType,
        project.locationSummary,
        project.scopeSummary,
        project.description,
        project.requestedUpi,
        project.requestedLandUse
      ]
      const matchesSearch = !query || haystack.some((value) => String(value || '').toLowerCase().includes(query))
      return matchesArchive && matchesStatus && matchesSearch
    })

    return [...list].sort((left, right) => {
      if (sortKey === 'client') return String(left.clientName || '').localeCompare(String(right.clientName || ''))
      if (sortKey === 'readiness') return computeProgress(right) - computeProgress(left)
      if (sortKey === 'deadline') return toDateRank(left.endDate) - toDateRank(right.endDate)
      return Number(right.id) - Number(left.id)
    })
  }, [archiveFilter, projects, search, sortKey, statusFilter])

  const metrics = useMemo(() => ({
    active: projects.filter((project) => !project.archived).length,
    awaitingApproval: projects.filter((project) => !project.archived && project.status === 'SUBMITTED').length,
    reportReady: projects.filter((project) => !project.archived && project.status === 'REPORT_GENERATED').length
  }), [projects])

  const loadProjectRecords = async (projectId) => {
    if (!projectId) {
      setReports([])
      setCommunications([])
      return
    }
    setRecordsLoading(true)
    try {
      const [nextReports, nextCommunications] = await Promise.all([
        api.get(`/api/projects/${projectId}/reports`),
        api.get(`/api/projects/${projectId}/communications`)
      ])
      setReports(nextReports || [])
      setCommunications(nextCommunications || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setRecordsLoading(false)
    }
  }

  const load = async (preferredProjectId = selectedProjectId) => {
    setLoading(true)
    try {
      const [projectResult, clientResult, userResult] = await Promise.allSettled([
        api.get('/api/projects?includeArchived=true'),
        api.get('/api/clients'),
        canAssignSurveyors ? api.get('/api/users') : Promise.resolve([])
      ])

      if (projectResult.status !== 'fulfilled') {
        throw projectResult.reason
      }

      const nextProjects = projectResult.value || []
      setProjects(nextProjects)
      setClients(clientResult.status === 'fulfilled' ? (clientResult.value || []) : [])
      setSurveyors(
        userResult.status === 'fulfilled'
          ? (userResult.value || []).filter((item) => item.role === 'SURVEYOR')
          : []
      )

      const keepSelected = nextProjects.some((project) => String(project.id) === String(preferredProjectId))
      const fallbackProject = nextProjects.find((project) => !project.archived) || nextProjects[0] || null
      setSelectedProjectId(keepSelected ? String(preferredProjectId) : fallbackProject ? String(fallbackProject.id) : '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.role])

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

  useEffect(() => {
    if (!showForm) {
      setSuggestion(null)
      return
    }

    const requestedUpi = normalizeUpi(form.requestedUpi)
    if (!requestedUpi) {
      setSuggestion(null)
      return
    }

    const timer = setTimeout(async () => {
      setSuggestionLoading(true)
      try {
        const matches = await api.get(`/api/parcels/search?upi=${encodeURIComponent(requestedUpi)}`)
        const exactMatch = (matches || []).find((item) => normalizeUpi(item.upi) === requestedUpi) || matches?.[0]
        if (!exactMatch) {
          setSuggestion({ state: 'not_found', message: 'UPI was not found in the loaded parcel registry.' })
          return
        }
        const parcelContext = await api.get(`/api/parcels/${exactMatch.id}/context`)
        const possibleCount = estimatedPossibleParcels(parcelContext)
        setSuggestion({
          state: 'ready',
          parcel: parcelContext.parcel,
          location: [exactMatch.district, exactMatch.sector, exactMatch.cell].filter(Boolean).join(', '),
          possibleCount,
          minimumLotSize: strictestMinimumLotSize(parcelContext.zoning || [])
        })
      } catch (err) {
        setSuggestion({ state: 'error', message: err.message || 'Unable to estimate parcel suggestion.' })
      } finally {
        setSuggestionLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.requestedUpi, showForm])

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showForm])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      clientId: canManageProjects && clients[0] ? String(clients[0].id) : '',
      requestedLandUse: 'Agriculture'
    })
    setShowForm(true)
    setMessageForm(emptyMessageForm)
    setSuggestion(null)
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
      status: project.status || 'SUBMITTED',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      clientId: project.clientId ? String(project.clientId) : '',
      requestedUpi: project.requestedUpi || '',
      requestedParcelCount: project.requestedParcelCount || 3,
      requestedLandUse: project.requestedLandUse || 'Agriculture',
      intakeNotes: project.intakeNotes || ''
    })
    setShowForm(true)
    setError('')
    setInfo('')
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setSuggestion(null)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (canManageProjects && !form.clientId) {
      setError('Select a client before saving the project.')
      return
    }

    const payload = {
      ...form,
      code: canManageProjects ? form.code || null : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      clientId: canManageProjects && form.clientId ? Number(form.clientId) : null,
      status: canManageProjects ? form.status : null,
      requestedUpi: normalizeUpi(form.requestedUpi) || null,
      requestedParcelCount: form.requestedParcelCount ? Number(form.requestedParcelCount) : null,
      requestedLandUse: form.requestedLandUse || null,
      intakeNotes: form.intakeNotes || null
    }

    try {
      if (editing) {
        await api.put(`/api/projects/${editing.id}`, payload)
        setInfo('Project updated successfully.')
        await load(editing.id)
      } else {
        await api.post('/api/projects', payload)
        setInfo(isClientSelfService ? 'Project request submitted successfully.' : 'Project created successfully.')
        await load()
      }
      closeForm()
    } catch (err) {
      setError(err.message)
    }
  }

  const approveProject = async (projectId) => {
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${projectId}/approve`, {})
      setInfo('Project approved and client notified.')
      await load(projectId)
    } catch (err) {
      setError(err.message)
    }
  }

  const assignSurveyor = async (projectId, surveyorId) => {
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${projectId}/assign`, { surveyorId: surveyorId ? Number(surveyorId) : null })
      setInfo(surveyorId ? 'Surveyor assigned successfully.' : 'Surveyor assignment cleared.')
      await load(projectId)
    } catch (err) {
      setError(err.message)
    }
  }

  const acceptAssignment = async (projectId) => {
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${projectId}/accept-assignment`, {})
      setInfo('Project accepted and admin notified.')
      await load(projectId)
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

  const sendMessage = async (event) => {
    event.preventDefault()
    if (!selectedProjectId) {
      setError('Select a project before sending a message.')
      return
    }
    if (!messageForm.summary.trim()) {
      setError('Write a short message first.')
      return
    }
    setError('')
    setInfo('')
    try {
      await api.post(`/api/projects/${selectedProjectId}/communications`, {
        channel: 'NOTE',
        subject: 'Project message',
        summary: messageForm.summary.trim()
      })
      setMessageForm(emptyMessageForm)
      setInfo('Message sent successfully.')
      await loadProjectRecords(selectedProjectId)
      await load(selectedProjectId)
    } catch (err) {
      setError(err.message)
    }
  }

  const openSubdivisionWorkspace = (project) => {
    navigate('/subdivision', {
      state: {
        project: {
          id: project.id,
          name: project.name,
          code: project.code,
          requestedUpi: project.requestedUpi,
          requestedParcelCount: project.requestedParcelCount,
          requestedLandUse: project.requestedLandUse,
          intakeNotes: project.intakeNotes
        }
      }
    })
  }

  const openReports = (project) => {
    navigate(`/reports?project=${project.id}`)
  }

  const downloadProjectReport = async (projectId, report) => {
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/projects/${projectId}/reports/${report.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to download report')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `GeoSmart-${report.type}-Report-${report.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="space-y-10 animate-rise">
        <section className="overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.42)]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#063F35_0%,#0D2F27_54%,#071F1A_100%)] p-6 text-white sm:p-7 lg:p-8">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-300/[0.16] blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-teal-300/10 blur-3xl" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/[0.35] to-transparent" />
            <div className="relative z-10 flex min-h-[14.5rem] flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/[0.08] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.75)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100/80">Project Workflow</p>
                </div>
                <h1 className="mt-5 max-w-xl font-display text-4xl font-black leading-[1.03] tracking-[-0.04em] text-white lg:text-5xl">
                  Manage Client Cases
                </h1>
                <p className="mt-3 max-w-xl text-[0.96rem] font-medium leading-7 text-emerald-50/[0.76]">
                  Create, assign, and track subdivision cases in one streamlined workspace.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {canCreateProjects && (
                  <Button
                    type="button"
                    className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-[#04251f] shadow-[0_18px_36px_-22px_rgba(52,211,153,0.9)] hover:bg-emerald-300"
                    onClick={openCreate}
                    disabled={canManageProjects && !clients.length}
                  >
                    {isClientSelfService ? 'Start Project' : 'New Project'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl border-white/15 bg-white/[0.08] px-5 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm hover:bg-white/[0.13]"
                  onClick={() => setArchiveFilter('ACTIVE')}
                >
                  Active Cases
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-[linear-gradient(180deg,#F7FAF4_0%,#ffffff_100%)] p-4 sm:p-5 lg:p-6">
            <div className="grid gap-3">
              <div className="relative overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-white p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)] transition-all hover:border-emerald-500/25 sm:p-5">
                <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-emerald-50" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700/70">Selected Case</p>
                  <p className="mt-2 font-display text-2xl font-black leading-tight tracking-[-0.03em] text-slate-950">{selectedProject?.name || 'No project selected'}</p>
                  <p className="mt-2 text-[13px] font-semibold leading-6 text-slate-500">
                    {selectedProject?.requestedUpi ? `UPI ${selectedProject.requestedUpi}` : 'Open a case to manage workflow, approvals, and reports.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[1rem] border border-emerald-100 bg-white p-3.5 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.38)]">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Active</p>
                  <p className="mt-2 font-display text-3xl font-black leading-none text-[#063F35]">{metrics.active}</p>
                </div>
                <div className="rounded-[1rem] border border-amber-100 bg-white p-3.5 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.38)]">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Awaiting Approval</p>
                  <p className="mt-2 font-display text-3xl font-black leading-none text-amber-500">{metrics.awaitingApproval}</p>
                </div>
                <div className="rounded-[1rem] border border-emerald-100 bg-white p-3.5 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.38)]">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Report Ready</p>
                  <p className="mt-2 font-display text-3xl font-black leading-none text-emerald-600">{metrics.reportReady}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="shadow-premium">
        <div className="grid gap-6 lg:grid-cols-[1fr_repeat(3,minmax(0,240px))]">
          <Input label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by project, client, UPI..." />
          <label className="block space-y-2">
            <span className="ml-1 text-[0.825rem] font-bold uppercase tracking-wider text-slate-500">Status</span>
            <select className="input h-[48px]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="ml-1 text-[0.825rem] font-bold uppercase tracking-wider text-slate-500">Archive view</span>
            <select className="input h-[48px]" value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
              {archiveOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'ACTIVE' ? 'Active Only' : option === 'ARCHIVED' ? 'Archived Only' : 'All Projects'}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="ml-1 text-[0.825rem] font-bold uppercase tracking-wider text-slate-500">Sort</span>
            <select className="input h-[48px]" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {(error || info) && (
        <Card className={error ? 'border border-rose-200 bg-rose-50 shadow-sm' : 'border border-emerald-200 bg-emerald-50 shadow-sm'}>
          {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
          {!error && info && <p className="text-sm font-bold text-emerald-700">{info}</p>}
        </Card>
      )}

      <Card className="overflow-hidden border-slate-200/60 p-0 shadow-premium">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Project Case</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Client & Parcel Request</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Surveyor</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className={`cursor-pointer border-b border-slate-100 transition-colors hover:bg-emerald-50/40 ${String(selectedProjectId) === String(project.id) ? 'bg-emerald-50/50' : 'bg-white'}`}
                  onClick={() => setSelectedProjectId(String(project.id))}
                >
                  <td className="px-6 py-5 align-top">
                    <p className="font-bold text-slate-900">{project.name}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">{project.code}</p>
                    <p className="mt-2 text-xs font-medium text-slate-500">{project.projectType || 'Land Subdivision'}</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <p className="font-bold text-slate-800">{project.clientName}</p>
                    <p className="mt-1 text-xs text-slate-500">{project.locationSummary || 'Location not captured yet.'}</p>
                    <div className="mt-3 space-y-1 text-[11px] font-medium text-slate-600">
                      <p>UPI: <span className="font-bold text-slate-800">{project.requestedUpi || '--'}</span></p>
                      <p>Requested parcels: <span className="font-bold text-slate-800">{project.requestedParcelCount || '--'}</span></p>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    {canAssignSurveyors ? (
                      <select
                        className="input h-auto w-52 bg-slate-50/50 py-2 text-[12px] font-bold"
                        value={project.assignedSurveyorId || ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => assignSurveyor(project.id, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {surveyors.map((surveyor) => (
                          <option key={surveyor.id} value={surveyor.id}>{surveyor.fullName}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-bold text-slate-700">{project.assignedSurveyorName || 'Pending assignment'}</p>
                    )}
                    {project.surveyorAcceptedAt && (
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-emerald-600">Accepted</p>
                    )}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusPalette[project.archived ? 'ARCHIVED' : project.status] || statusPalette.SUBMITTED}`}>
                      {project.archived ? 'Archived' : statusLabel(project.status)}
                    </span>
                    <p className="mt-3 text-xs font-medium text-slate-500">{statusLabel(project.workflowStage)}</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="w-40 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${computeProgress(project)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-600">{computeProgress(project)}%</p>
                    <p className="mt-1 text-[11px] text-slate-400">{project.nextAction}</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      {canManageProjects && (
                        <Button variant="secondary" className="px-4 py-2 text-[11px] font-black" onClick={() => openEdit(project)}>
                          Edit
                        </Button>
                      )}
                      {canApproveProjects && ['SUBMITTED', 'NEEDS_MORE_INFO'].includes(project.status) && (
                        <Button className="px-4 py-2 text-[11px] font-black" onClick={() => approveProject(project.id)}>
                          Approve
                        </Button>
                      )}
                      {canWorkSubdivision && project.requestedUpi && (
                        <Button variant="secondary" className="px-4 py-2 text-[11px] font-black" onClick={() => openSubdivisionWorkspace(project)}>
                          Subdivide
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm font-medium text-slate-400">
                    No projects matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedProject && (
        <div className="grid gap-8 xl:grid-cols-[1.65fr_420px]">
          <div className="space-y-8">
            <Card className="overflow-hidden border-none p-0 shadow-premium">
              <div className="relative bg-slate-900 p-8 text-white">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent" />
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Project Dossier</p>
                    <h3 className="text-3xl font-black tracking-tight">{selectedProject.name}</h3>
                    <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
                      {selectedProject.scopeSummary || selectedProject.description || 'This project is ready for intake, assignment, subdivision, and client report delivery.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-md">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Readiness</p>
                      <p className="text-xl font-black">{computeProgress(selectedProject)}%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-md">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Reports</p>
                      <p className="text-xl font-black">{reports.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-6 bg-white p-8 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{statusLabel(selectedProject.status)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workflow Stage</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{statusLabel(selectedProject.workflowStage)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested UPI</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{selectedProject.requestedUpi || '--'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested Parcels</p>
                  <p className="mt-2 text-lg font-bold text-slate-800">{selectedProject.requestedParcelCount || '--'}</p>
                </div>
              </div>
            </Card>

            <div className="grid gap-8 lg:grid-cols-2">
              <Card title="Client Intake Brief" className="shadow-premium">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Important</p>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-700">
                      Clients submit the request only. Drafting, compliance, and final report generation are completed by the admin team or assigned land surveyor.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client</p>
                      <p className="mt-2 font-bold text-slate-900">{selectedProject.clientName}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Land Use</p>
                      <p className="mt-2 font-bold text-slate-900">{selectedProject.requestedLandUse || '--'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                      <p className="mt-2 font-bold text-slate-900">{selectedProject.locationSummary || '--'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Surveyor</p>
                      <p className="mt-2 font-bold text-slate-900">{selectedProject.assignedSurveyorName || 'Pending assignment'}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Notes</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{selectedProject.intakeNotes || 'No additional intake notes were captured.'}</p>
                  </div>
                </div>
              </Card>

              <Card title="Project Reports" className="shadow-premium">
                <div className="space-y-4">
                  {recordsLoading && <p className="text-sm font-bold text-slate-400">Loading project records...</p>}
                  {!recordsLoading && reports.length === 0 && (
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
                      <p className="text-sm font-bold text-slate-400">No reports have been stored for this project yet.</p>
                      <p className="mt-2 text-xs text-slate-500">When subdivision is completed from the planner, the report will appear here automatically for client download.</p>
                    </div>
                  )}
                  {!recordsLoading && reports.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-slate-100 bg-white p-5 transition-all hover:border-emerald-200 hover:shadow-lg">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{reportTypeLabel(report.type)}</p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">#{report.id} • {formatDateTime(report.createdAt)}</p>
                          <p className="mt-3 text-sm leading-relaxed text-slate-500">
                            {(report.content || '').replace(/\s+/g, ' ').trim().slice(0, 150) || 'No report summary available.'}
                            {(report.content || '').length > 150 ? '...' : ''}
                          </p>
                        </div>
                        <Button variant="secondary" className="px-5 py-3 text-[11px] font-black" onClick={() => downloadProjectReport(selectedProject.id, report)}>
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card title="Project Conversation" className="shadow-premium">
              {canChat && (
                <form className="mb-8 space-y-4 rounded-[1.75rem] border border-slate-100 bg-slate-50/60 p-6" onSubmit={sendMessage}>
                  <div className="space-y-2">
                    <span className="ml-1 text-[0.85rem] font-bold uppercase tracking-wider text-slate-500/80">Message</span>
                    <textarea
                      className="input min-h-[120px] w-full resize-none text-[13px] leading-relaxed"
                      value={messageForm.summary}
                      onChange={(event) => setMessageForm({ summary: event.target.value })}
                      placeholder="Write a quick project update, question, approval note, or handover message."
                    />
                  </div>
                  <Button className="w-full py-4 text-xs font-black uppercase tracking-widest">Send Message</Button>
                </form>
              )}
              <div className="space-y-4">
                {recordsLoading && <p className="text-sm font-bold text-slate-400">Loading conversation...</p>}
                {!recordsLoading && communications.length === 0 && (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
                    <p className="text-sm font-bold text-slate-400">No messages recorded yet.</p>
                  </div>
                )}
                {!recordsLoading && communications.map((message) => {
                  const systemMessage = message.systemGenerated
                  return (
                    <div
                      key={message.id}
                      className={`rounded-3xl border p-5 ${systemMessage ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{message.senderName || message.contactPerson || 'Project message'}</p>
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            {message.senderRole || 'PROJECT'} • {formatDateTime(message.occurredAt || message.createdAt)}
                          </p>
                        </div>
                        {systemMessage && (
                          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Workflow
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-slate-600">{message.summary}</p>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card title="Workflow Actions" className="shadow-premium bg-slate-900 text-white border-none">
              <div className="space-y-4">
                {canApproveProjects && ['SUBMITTED', 'NEEDS_MORE_INFO'].includes(selectedProject.status) && (
                  <Button className="w-full bg-emerald-500 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-400" onClick={() => approveProject(selectedProject.id)}>
                    Approve Intake
                  </Button>
                )}

                {canAssignSurveyors && (
                  <label className="block space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Assign Surveyor</span>
                    <select
                      className="input h-[48px] border-white/10 bg-white/10 text-white"
                      value={selectedProject.assignedSurveyorId || ''}
                      onChange={(event) => assignSurveyor(selectedProject.id, event.target.value)}
                    >
                      <option value="" className="text-slate-900">Unassigned</option>
                      {surveyors.map((surveyor) => (
                        <option key={surveyor.id} value={surveyor.id} className="text-slate-900">{surveyor.fullName}</option>
                      ))}
                    </select>
                  </label>
                )}

                {canAcceptAssignment && isAssignedSurveyor && !selectedProject.surveyorAcceptedAt && (
                  <Button className="w-full py-4 text-xs font-black uppercase tracking-widest" onClick={() => acceptAssignment(selectedProject.id)}>
                    Accept And Start Project
                  </Button>
                )}

                {canWorkSubdivision && selectedProject.requestedUpi && (
                  <Button
                    variant="secondary"
                    className="w-full border-white/15 bg-white/10 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15"
                    onClick={() => openSubdivisionWorkspace(selectedProject)}
                  >
                    Open Subdivision Workspace
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full border-white/15 bg-white/10 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15"
                  onClick={() => openReports(selectedProject)}
                >
                  Open Project Reports
                </Button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {selectedProject.archived ? (
                    <Button variant="secondary" className="py-3 text-xs font-black uppercase tracking-widest" onClick={() => restoreProject(selectedProject)}>
                      Restore
                    </Button>
                  ) : (
                    <Button variant="secondary" className="py-3 text-xs font-black uppercase tracking-widest" onClick={() => archiveProject(selectedProject)}>
                      Archive
                    </Button>
                  )}
                  {canManageProjects && (
                    <Button variant="danger" className="py-3 text-xs font-black uppercase tracking-widest" onClick={() => deleteProject(selectedProject)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Technical Roadmap" className="shadow-premium">
              <div className="relative ml-4 space-y-6 before:absolute before:bottom-2 before:left-[-12px] before:top-2 before:w-px before:bg-slate-100">
                {workflowSteps.map((step) => (
                  <div key={step.title} className="relative">
                    <span className={`absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full ring-[6px] ring-white ${step.active ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    <div className="pl-6">
                      <p className="text-[13px] font-bold text-slate-800">{step.title}</p>
                      <p className="mt-2 text-[11px] font-medium text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Project Timing" className="shadow-premium">
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="font-semibold">Approved</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedProject.approvedAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="font-semibold">Surveyor Accepted</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedProject.surveyorAcceptedAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="font-semibold">Draft Prepared</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedProject.subdivisionDraftedAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="font-semibold">Compliance Checked</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedProject.complianceCheckedAt)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="font-semibold">Report Ready</span>
                  <span className="font-bold text-slate-800">{formatDateTime(selectedProject.reportReadyAt)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      </div> 
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 backdrop-blur-md p-[14px] md:pt-[24px] md:px-[24px] md:pb-[48px] overflow-hidden">
          <form className="relative w-full max-w-3xl overflow-hidden rounded-[20px] bg-white border border-slate-200/60 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18)] animate-rise flex flex-col max-h-[calc(100dvh-72px)] md:max-h-[calc(100vh-96px)]" onSubmit={onSubmit}>
            <div className="relative bg-white border-b border-slate-100 px-6 py-4 md:px-8 md:py-5 shrink-0 rounded-t-[20px]">
              <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-[20px]" />
              <button type="button" className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl p-2 transition-colors" onClick={closeForm}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Project Intake</p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5">{editing ? 'Update Project' : (isClientSelfService ? 'Submit Subdivision Request' : 'Create Project')}</h3>
            </div>

            <div className="space-y-4 bg-white p-6 md:p-8 overflow-y-auto flex-1 min-h-0">
              {isClientSelfService && (
                <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/50 px-5 py-4">
                  <p className="text-[0.75rem] font-black uppercase tracking-[0.22em] text-emerald-700">How This Works</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                    You are creating the project request only. The actual subdivision draft, compliance check, and final report are completed later by the admin team or assigned land surveyor.
                  </p>
                </div>
              )}

              <div className={`grid gap-5 grid-cols-1 ${canManageProjects ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                {canManageProjects && (
                  <Input label="Project code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="e.g. GS-2026-001" />
                )}
                <Input label="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="e.g. Nyarugenge Subdivision Request" />
              </div>

              <div className={`grid gap-5 grid-cols-1 ${canManageProjects ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                {canManageProjects ? (
                  <label className="block space-y-2">
                    <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Assign Client</span>
                    <select className="input h-[48px]" value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/50 px-5 py-4">
                    <p className="text-[0.75rem] font-black uppercase tracking-[0.22em] text-emerald-700">Client Assignment</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700">This project will be linked to your client account automatically.</p>
                  </div>
                )}

                <label className="block space-y-2">
                  <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Project type</span>
                  <select className="input h-[48px]" value={form.projectType} onChange={(event) => setForm({ ...form, projectType: event.target.value })}>
                    {projectTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-5 grid-cols-1 md:grid-cols-[1.2fr_0.8fr]">
                <Input
                  label="Land UPI"
                  value={form.requestedUpi}
                  onChange={(event) => setForm({ ...form, requestedUpi: event.target.value })}
                  required={isClientSelfService}
                  placeholder="Example: 1/01/05/04/3041"
                />
                <Input
                  label="Requested parcels"
                  type="number"
                  min="1"
                  value={form.requestedParcelCount}
                  onChange={(event) => setForm({ ...form, requestedParcelCount: Number(event.target.value || 0) })}
                  required={isClientSelfService}
                />
              </div>

              <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Target land use</span>
                  <select className="input h-[48px]" value={form.requestedLandUse} onChange={(event) => setForm({ ...form, requestedLandUse: event.target.value })}>
                    {landUseOptions.map((option) => (
                      <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <Input label="Location summary" value={form.locationSummary} onChange={(event) => setForm({ ...form, locationSummary: event.target.value })} placeholder="District, sector, cell" />
              </div>

              {(suggestionLoading || suggestion) && (
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/60 p-5">
                  <p className="text-[0.75rem] font-black uppercase tracking-[0.22em] text-slate-700">UPI Suggestion</p>
                  {suggestionLoading && <p className="mt-2 text-sm font-semibold text-slate-500">Checking parcel registry and masterplan guidance...</p>}
                  {!suggestionLoading && suggestion?.state === 'ready' && (
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <p><span className="font-bold">Matched parcel:</span> {suggestion.parcel?.upi}</p>
                      <p><span className="font-bold">Registry location:</span> {suggestion.location || '--'}</p>
                      <p><span className="font-bold">Estimated possible parcels:</span> {suggestion.possibleCount || 'No clear estimate from current zoning rules'}</p>
                      <p><span className="font-bold">Strictest minimum lot size:</span> {suggestion.minimumLotSize ? `${Math.round(suggestion.minimumLotSize)} sqm` : '--'}</p>
                    </div>
                  )}
                  {!suggestionLoading && suggestion?.state === 'not_found' && (
                    <p className="mt-2 text-sm font-semibold text-rose-600">{suggestion.message}</p>
                  )}
                  {!suggestionLoading && suggestion?.state === 'error' && (
                    <p className="mt-2 text-sm font-semibold text-rose-600">{suggestion.message}</p>
                  )}
                </div>
              )}

              <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Scope summary</span>
                  <textarea
                    className="input min-h-[100px] w-full resize-none text-[13px] leading-relaxed"
                    value={form.scopeSummary}
                    onChange={(event) => setForm({ ...form, scopeSummary: event.target.value })}
                    placeholder="Describe what the client wants done on this land."
                  />
                </label>
                <label className="block space-y-2">
                  <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Client notes</span>
                  <textarea
                    className="input min-h-[100px] w-full resize-none text-[13px] leading-relaxed"
                    value={form.intakeNotes}
                    onChange={(event) => setForm({ ...form, intakeNotes: event.target.value })}
                    placeholder="Ownership notes, preferred shapes, restrictions, site context, or anything important."
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Description</span>
                <textarea
                  className="input min-h-[80px] w-full resize-none text-[13px] leading-relaxed"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Optional internal project description."
                />
              </label>

              <div className={`grid gap-5 grid-cols-1 ${canManageProjects ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                <Input label="Start date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                <Input label="Target end date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
                {canManageProjects && (
                  <label className="block space-y-2">
                    <span className="ml-1 text-[0.825rem] font-black uppercase tracking-wider text-slate-700">Workflow status</span>
                    <select className="input h-[48px]" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-slate-100 px-6 py-4 md:px-8 md:py-5 bg-slate-50/50 shrink-0 rounded-b-[20px]">
              <button type="button" className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors" onClick={closeForm}>
                Cancel
              </button>
              <Button className="px-8 py-3.5 shadow-md rounded-xl text-xs font-black uppercase tracking-wider" type="submit">
                {editing ? 'Save Changes' : (isClientSelfService ? 'Submit Project Request' : 'Create Project')}
              </Button>
            </div>
          </form>
        </div>
      )}
      </>
    )
  }
