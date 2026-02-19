import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'

export default function Compliance() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [runs, setRuns] = useState([])
  const [checks, setChecks] = useState([])
  const [selectedRun, setSelectedRun] = useState('')
  const [error, setError] = useState('')

  const totalChecks = checks.length
  const passCount = checks.filter((check) => check.status === 'PASS').length
  const warnCount = checks.filter((check) => check.status === 'WARN').length
  const failCount = checks.filter((check) => check.status === 'FAIL').length
  const passRate = totalChecks ? Math.round((passCount / totalChecks) * 100) : 0

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    Promise.all([
      api.get(`/api/projects/${selectedProject}/subdivisions`),
      api.get(`/api/projects/${selectedProject}/compliance`)
    ])
      .then(([runData, checkData]) => {
        setRuns(runData)
        setChecks(checkData)
      })
      .catch((err) => setError(err.message))
  }, [selectedProject])

  const onCheck = async () => {
    setError('')
    if (!selectedProject || !selectedRun) {
      setError('Select project and subdivision run')
      return
    }
    try {
      await api.post(`/api/projects/${selectedProject}/compliance/check`, {
        subdivisionRunId: Number(selectedRun)
      })
      const updated = await api.get(`/api/projects/${selectedProject}/compliance`)
      setChecks(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Regulatory Compliance</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Compliance Validation</h1>
        <p className="text-sm text-ink/60">Validate subdivision outputs against Rwanda land regulations and standards.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Checks</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalChecks}</p>
          <p className="text-xs text-ink/60 mt-2">Historical validations</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Pass Rate</p>
          <p className="text-2xl font-semibold text-ink mt-2">{passRate}%</p>
          <p className="text-xs text-success mt-2">{passCount} passes</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Warnings</p>
          <p className="text-2xl font-semibold text-ink mt-2">{warnCount}</p>
          <p className="text-xs text-warning mt-2">Review flagged items</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Failures</p>
          <p className="text-2xl font-semibold text-ink mt-2">{failCount}</p>
          <p className="text-xs text-danger mt-2">Critical corrections needed</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card title="Run Compliance Check">
          <div className="grid md:grid-cols-2 gap-4">
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
              <span className="text-sm font-medium">Subdivision run</span>
              <select className="input" value={selectedRun} onChange={(e) => setSelectedRun(e.target.value)}>
                <option value="">Select run</option>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>Run #{run.id} - {run.parcelCount} parcels</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
          <Button className="mt-4" onClick={onCheck}>Run compliance validation</Button>
        </Card>
        <Card title="Compliance Rules">
          <div className="space-y-2 text-sm text-ink/70">
            <p>Validate parcel area, boundary overlaps, and zoning constraints.</p>
            <p>Ensure UPI identifiers are unique and formatted correctly.</p>
            <p>Align subdivision outputs with approved master plan zoning.</p>
            <p>Review warnings to avoid rejection at RLMUA review stage.</p>
          </div>
        </Card>
      </div>

      <Card title="Compliance History">
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Check #{check.id}</h4>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    check.status === 'PASS'
                      ? 'bg-success/10 text-success'
                      : check.status === 'WARN'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-danger/10 text-danger'
                  }`}
                >
                  {check.status}
                </span>
              </div>
              <p className="text-sm text-ink/70">Run ID: {check.subdivisionRunId}</p>
              <p className="text-sm text-ink/70">{check.findings}</p>
            </div>
          ))}
          {checks.length === 0 && <p className="text-sm text-ink/70">No compliance checks yet.</p>}
        </div>
      </Card>
    </div>
  )
}
