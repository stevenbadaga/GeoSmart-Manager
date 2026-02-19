import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const reportTypes = ['SURVEY', 'SUBDIVISION', 'COMPLIANCE', 'PROJECT_SUMMARY']

export default function Reports() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [reports, setReports] = useState([])
  const [reportType, setReportType] = useState('PROJECT_SUMMARY')
  const [error, setError] = useState('')

  const totalReports = reports.length
  const activeTypes = new Set(reports.map((report) => report.type)).size

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    api.get(`/api/projects/${selectedProject}/reports`)
      .then(setReports)
      .catch((err) => setError(err.message))
  }, [selectedProject])

  const onGenerate = async () => {
    setError('')
    if (!selectedProject) {
      setError('Select a project')
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
      setError('Select a project')
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
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Reports & Analytics</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Reporting Center</h1>
        <p className="text-sm text-ink/60">Generate project summaries, subdivision outputs, and compliance documentation.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Reports</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalReports}</p>
          <p className="text-xs text-ink/60 mt-2">Generated for this project</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Report Types Used</p>
          <p className="text-2xl font-semibold text-ink mt-2">{activeTypes}</p>
          <p className="text-xs text-ink/60 mt-2">Coverage across categories</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Downloads</p>
          <p className="text-2xl font-semibold text-ink mt-2">{Math.max(totalReports, 0)}</p>
          <p className="text-xs text-success mt-2">Ready for PDF export</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card title="Reports">
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink/50">Report ID #{report.id}</p>
                    <h4 className="font-semibold">{report.type}</h4>
                  </div>
                  <Button variant="secondary" className="text-xs" onClick={() => downloadPdf(report)}>
                    Download PDF
                  </Button>
                </div>
                <details className="mt-3 text-xs text-ink/70">
                  <summary className="cursor-pointer text-ink/60">View report content</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{report.content}</pre>
                </details>
              </div>
            ))}
            {reports.length === 0 && <p className="text-sm text-ink/70">No reports generated.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Generate Report">
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
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={onGenerate}>Generate report</Button>
            </div>
          </Card>
          <Card title="Recommended Usage">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Use project summaries for client briefings and contract handover.</p>
              <p>Generate compliance reports for RLMUA review and audits.</p>
              <p>Download PDFs to attach to email submissions or printed files.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
