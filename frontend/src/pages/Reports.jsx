import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'

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
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-[#124E44]/20 bg-white shadow-[0_28px_70px_-52px_rgba(15,23,42,0.85)]">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden bg-[#123E36] p-6 text-white sm:p-8">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#E8C46A]/18 blur-2xl" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#E8C46A]">GeoSmart Reporting</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Compliance Report Center
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                Generate project reports and export professional subdivision compliance PDFs with parcel layouts, plot measurements, zoning results, warnings, and the official preliminary-use disclaimer.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" className="bg-[#E8C46A] text-[#123E36] hover:bg-[#f0d783]" onClick={() => navigate('/subdivision')}>
                  Create Subdivision PDF
                </Button>
                <Button type="button" variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white/15" onClick={() => navigate('/datasets')}>
                  Review GIS Data
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-[#F6F1E7] p-6 sm:p-8">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-[#124E44]/15 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/42">Selected Project</p>
                <p className="mt-2 text-xl font-black text-ink">{selectedProjectName || 'No project selected'}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Reports</p>
                  <p className="mt-2 text-2xl font-black text-[#124E44]">{totalReports}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">Types</p>
                  <p className="mt-2 text-2xl font-black text-[#124E44]">{activeTypes}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink/42">PDF</p>
                  <p className="mt-2 text-2xl font-black text-success">Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Daily reports', reportPeriods.daily, 'Generated in the last 24 hours'],
          ['Weekly reports', reportPeriods.weekly, 'Generated in the last 7 days'],
          ['Monthly reports', reportPeriods.monthly, 'Generated in the last 30 days'],
          ['Yearly reports', reportPeriods.yearly, 'Generated in the last 12 months']
        ].map(([label, value, detail]) => (
          <Card key={label} className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40">{label}</p>
            <p className="mt-3 text-3xl font-black text-[#124E44]">{value}</p>
            <p className="mt-2 text-sm text-ink/55">{detail}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_370px]">
        <Card title="Report Library">
          <div className="mb-5 max-w-md">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Project</span>
              <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-clay/60 bg-white/75 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#124E44]/65">Report #{report.id}</p>
                    <h4 className="mt-1 text-lg font-black text-ink">{reportTypeLabel(report.type)}</h4>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/55">
                      <span className="rounded-full border border-clay/70 bg-sand/60 px-2.5 py-1 font-semibold">
                        Generated {formatDateTime(report.createdAt)}
                      </span>
                      <span className="rounded-full border border-clay/70 bg-sand/60 px-2.5 py-1 font-semibold">
                        Owner: {report.generatedByName || 'System'}
                      </span>
                      <span className="rounded-full border border-clay/70 bg-sand/60 px-2.5 py-1 font-semibold">
                        {report.generatedByRole || 'SYSTEM'}
                      </span>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">{previewText(report.content)}</p>
                  </div>
                  <Button variant="secondary" className="text-xs" onClick={() => downloadPdf(report)}>
                    Download PDF
                  </Button>
                </div>
                <details className="mt-3 rounded-xl border border-clay/60 bg-sand/35 p-3 text-xs text-ink/70">
                  <summary className="cursor-pointer font-semibold text-ink/65">View source content</summary>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-sans leading-5">{report.content}</pre>
                </details>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="rounded-2xl border border-dashed border-clay/80 bg-sand/35 p-6 text-sm text-ink/65">
                Select a project to view generated project reports. Subdivision compliance PDFs are generated directly inside the Subdivision Planner after running a check.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Generate Project Report">
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Project</span>
                <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Report type</span>
                <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  {reportTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              {selectedReportType && <p className="rounded-2xl bg-sand/60 p-3 text-sm leading-5 text-ink/62">{selectedReportType.detail}</p>}
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={onGenerate}>Generate project report</Button>
            </div>
          </Card>

          <Card title="Subdivision Compliance PDF">
            <div className="space-y-3 text-sm leading-6 text-ink/68">
              <p>The professional subdivision report is produced from the planner after selecting a UPI, drawing or generating plots, and running checks.</p>
              <p>It includes the map layout, individual plot diagrams, side measurements, zoning, pass/fail/warning checks, score, and disclaimer.</p>
            </div>
            <Button className="mt-4 w-full" onClick={() => navigate('/subdivision')}>
              Open Subdivision Planner
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
