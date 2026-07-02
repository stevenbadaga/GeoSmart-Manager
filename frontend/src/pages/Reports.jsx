import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import BrandLogo from '../components/BrandLogo'
import { api } from '../api/http'
import { publicImages } from '../assets/publicImages'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const reportTypes = [
  { value: 'PROJECT_SUMMARY', label: 'Project Summary', detail: 'Executive project status and handover summary.' },
  { value: 'COMPLIANCE', label: 'Compliance Summary', detail: 'Governance and planning review summary.' },
  { value: 'SUBDIVISION', label: 'Subdivision Summary', detail: 'Project-level subdivision documentation.' },
  { value: 'SURVEY', label: 'Survey Summary', detail: 'Survey activity and field-work summary.' }
]

function reportTypeLabel(type) {
  return reportTypes.find((item) => item.value === type)?.label || String(type || 'Report').replaceAll('_', ' ')
}

function previewText(content = '') {
  const clean = content.replace(/\s+/g, ' ').trim()
  return clean.length > 180 ? `${clean.slice(0, 180)}...` : clean || 'No report summary available.'
}

function isAfter(dateValue, cutoff) {
  if (!dateValue) return false
  const date = new Date(dateValue)
  return !Number.isNaN(date.getTime()) && date >= cutoff
}

function formatDateTime(dateValue) {
  if (!dateValue) return 'Not recorded'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

export default function Reports() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') || '')
  const [reports, setReports] = useState([])
  const [reportType, setReportType] = useState('PROJECT_SUMMARY')
  const [error, setError] = useState('')

  const selectedProjectName = projects.find((project) => String(project.id) === String(selectedProject))?.name
  const totalReports = reports.length
  const activeTypes = useMemo(() => new Set(reports.map((report) => report.type)).size, [reports])
  const selectedReportType = reportTypes.find((item) => item.value === reportType)
  
  const reportPeriods = useMemo(() => {
    const now = new Date()
    const day = new Date(now)
    day.setDate(now.getDate() - 1)
    const week = new Date(now)
    week.setDate(now.getDate() - 7)
    const month = new Date(now)
    month.setMonth(now.getMonth() - 1)
    const year = new Date(now)
    year.setFullYear(now.getFullYear() - 1)

    return {
      daily: reports.filter((report) => isAfter(report.createdAt, day)).length,
      weekly: reports.filter((report) => isAfter(report.createdAt, week)).length,
      monthly: reports.filter((report) => isAfter(report.createdAt, month)).length,
      yearly: reports.filter((report) => isAfter(report.createdAt, year)).length
    }
  }, [reports])

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const requestedProject = searchParams.get('project') || ''
    if (requestedProject && requestedProject !== selectedProject) {
      setSelectedProject(requestedProject)
    }
  }, [searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams()
    if (selectedProject) nextParams.set('project', selectedProject)
    setSearchParams(nextParams, { replace: true })
  }, [selectedProject, setSearchParams])

  useEffect(() => {
    if (!selectedProject) {
      setReports([])
      return
    }
    api.get(`/api/projects/${selectedProject}/reports`)
      .then(setReports)
      .catch((err) => setError(err.message))
  }, [selectedProject])

  const onGenerate = async () => {
    setError('')
    if (!selectedProject) {
      setError('Select a project before generating a project report.')
      return
    }
    try {
      await api.post(`/api/projects/${selectedProject}/reports/generate`, { type: reportType })
      const updated = await api.get(`/api/projects/${selectedProject}/reports`)
      setReports(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadPdf = async (report) => {
    setError('')
    if (!selectedProject) {
      setError('Select a project before downloading a report.')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/projects/${selectedProject}/reports/${report.id}/pdf`, {
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
    <div className="space-y-10 animate-rise">
      <section className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-premium">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden bg-[#063F35] p-6 lg:p-8 text-white flex flex-col justify-between">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="gis-grid absolute inset-0 opacity-[0.03]" />
            <div className="relative z-10 my-auto">
              <div className="inline-flex items-center gap-3 rounded-full bg-emerald-400/10 px-3.5 py-1.5 border border-emerald-400/20 mb-4 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">Governance & Records</p>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight font-display text-white">
                Compliance Report Center
              </h1>
              <p className="mt-3 text-sm text-emerald-100/75 leading-relaxed font-medium max-w-xl">
                Generate project reports and export professional subdivision compliance PDFs with parcel layouts, zoning results, and official preliminary-use documentation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" className="bg-emerald-500 text-white hover:bg-emerald-400 px-6 py-3 text-sm font-bold shadow-md shadow-emerald-500/10" onClick={() => navigate('/subdivision')}>
                  Generate Subdivision PDF
                </Button>
                <Button type="button" variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10 px-6 py-3 text-sm font-bold backdrop-blur-sm" onClick={() => navigate('/datasets')}>
                  Audit GIS Data
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-slate-50/50 p-6 lg:p-8 flex flex-col justify-center">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-500/20 group">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Selected Context</p>
                <p className="mt-2 text-xl font-bold text-slate-900 tracking-tight font-display transition-colors group-hover:text-emerald-700">{selectedProjectName || 'No project selected'}</p>
                <p className="mt-1 text-xs font-medium text-slate-500 leading-relaxed">Select a case file to view generated records.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm transition-all hover:border-emerald-500/20 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Records</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#063F35] font-display">{totalReports}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm transition-all hover:border-emerald-500/20 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Types</p>
                  <p className="mt-1.5 text-2xl font-bold text-[#063F35] font-display">{activeTypes}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm transition-all hover:border-emerald-500/20 text-center flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Status</p>
                  <p className="mt-1.5 text-lg font-bold text-emerald-600 font-display">READY</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Daily Activity', value: reportPeriods.daily, detail: 'Past 24 hours', color: 'emerald' },
          { label: 'Weekly Velocity', value: reportPeriods.weekly, detail: 'Past 7 days', color: 'blue' },
          { label: 'Monthly Summary', value: reportPeriods.monthly, detail: 'Past 30 days', color: 'purple' },
          { label: 'Annual Archive', value: reportPeriods.yearly, detail: 'Past 12 months', color: 'slate' }
        ].map((item) => (
          <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-premium transition-all hover:border-emerald-500/20 hover:shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-900 transition-colors font-display">{item.value}</p>
            <p className="mt-2 text-[11px] font-bold text-slate-500/70 uppercase tracking-widest">{item.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <Card title="Dossier Library" premium className="shadow-premium">
          <div className="mb-10 max-w-md">
            <label className="block space-y-2">
              <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">Case Filter</span>
              <select className="input h-[48px]" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Choose a planning project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-6">
            {reports.map((report) => (
              <div key={report.id} className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-emerald-200 hover:shadow-xl">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                       <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID #{report.id}</span>
                       <span className="h-1 w-1 rounded-full bg-slate-200" />
                       <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600/70">{reportTypeLabel(report.type)}</span>
                    </div>
                    <h4 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors tracking-tight font-display">{reportTypeLabel(report.type)}</h4>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <span className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {formatDateTime(report.createdAt)}
                      </span>
                      <span className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        By {report.generatedByName || 'System'} • {report.generatedByRole || 'PLANNER'}
                      </span>
                    </div>
                    <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-slate-500 font-medium">{previewText(report.content)}</p>
                  </div>
                  <Button variant="secondary" className="px-6 shadow-sm whitespace-nowrap" onClick={() => downloadPdf(report)}>
                    Download PDF
                  </Button>
                </div>
                <details className="mt-8 rounded-xl border border-slate-100 bg-slate-50/50 p-5 text-[12px] text-slate-600">
                  <summary className="cursor-pointer font-bold text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 8h10M7 12h10M7 16h6" /></svg>
                    View Raw Markdown Content
                  </summary>
                  <pre className="mt-6 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed p-5 bg-white rounded-xl border border-slate-200">{report.content}</pre>
                </details>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="py-24 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 transition-colors hover:bg-white hover:border-emerald-200">
                <div className="mx-auto h-20 w-20 grid place-items-center rounded-3xl bg-white text-slate-300 mb-8 shadow-xl shadow-slate-900/5">
                   <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-lg font-bold text-slate-500 font-display">No project-level reports found.</p>
                <p className="mt-3 text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">Select a project above to browse its dossier library. Subdivision compliance PDFs are generated within the AI Planner module.</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-10">
          <Card title="Report Generator" className="shadow-premium">
            <div className="space-y-8">
              <label className="block space-y-2">
                <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">Context Case</span>
                <select className="input h-[48px]" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="">Select project context...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">Document Type</span>
                <select className="input h-[48px]" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              {selectedReportType && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 shadow-sm">
                   <p className="text-[13px] leading-relaxed text-emerald-800 font-medium">{selectedReportType.detail}</p>
                </div>
              )}
              {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100">{error}</p>}
              <Button className="w-full py-4 text-xs font-black uppercase tracking-widest shadow-xl" onClick={onGenerate}>Launch Generation</Button>
            </div>
          </Card>

          <Card title="Compliance Artifacts" className="shadow-premium bg-[#002a23] border-none text-white overflow-hidden relative group">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:scale-125 transition-transform" />
            <div className="relative z-10 space-y-6">
              <div className="space-y-5 text-[13px] leading-relaxed font-medium text-slate-300">
                <p>Professional subdivision compliance dossiers are synthesized within the AI Planner workspace.</p>
                <p>Reports include: high-resolution map snapshots, plot-specific side measurements, zoning rule audits, and verified technical scores.</p>
              </div>
              <Button className="w-full py-4 text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-400 shadow-xl shadow-emerald-500/20" onClick={() => navigate('/subdivision')}>
                Open AI Subdivision Planner
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
