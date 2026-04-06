import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'

function statusPill(status) {
  if (status === 'PASS') return 'bg-success/10 text-success'
  if (status === 'WARN') return 'bg-warning/15 text-warning'
  return 'bg-danger/10 text-danger'
}

function formatDateTime(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

export default function Compliance() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [runs, setRuns] = useState([])
  const [checks, setChecks] = useState([])
  const [updates, setUpdates] = useState([])
  const [selectedRun, setSelectedRun] = useState('')
  const [selectedCheckId, setSelectedCheckId] = useState('')
  const [submissionPackage, setSubmissionPackage] = useState(null)
  const [certificateTemplate, setCertificateTemplate] = useState(null)
  const [loadingPackage, setLoadingPackage] = useState(false)
  const [loadingCertificate, setLoadingCertificate] = useState(false)
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
    if (!selectedProject) {
      setRuns([])
      setChecks([])
      setUpdates([])
      setSelectedRun('')
      setSelectedCheckId('')
      setSubmissionPackage(null)
      setCertificateTemplate(null)
      return
    }
    setError('')
    setSelectedRun('')
    setSelectedCheckId('')
    setSubmissionPackage(null)
    setCertificateTemplate(null)
    Promise.all([
      api.get(`/api/projects/${selectedProject}/subdivisions`),
      api.get(`/api/projects/${selectedProject}/compliance`),
      api.get(`/api/projects/${selectedProject}/compliance/updates`)
    ])
      .then(([runData, checkData, updateData]) => {
        const sortedRuns = [...runData].sort((a, b) => b.id - a.id)
        setRuns(sortedRuns)
        setSelectedRun(sortedRuns.length > 0 ? String(sortedRuns[0].id) : '')
        const sortedChecks = [...checkData].sort((a, b) => b.id - a.id)
        setChecks(sortedChecks)
        setUpdates(updateData || [])
        if (sortedChecks.length > 0) {
          setSelectedCheckId(String(sortedChecks[0].id))
        } else {
          setSelectedCheckId('')
        }
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
      const sortedChecks = [...updated].sort((a, b) => b.id - a.id)
      setChecks(sortedChecks)
      setSelectedCheckId(sortedChecks.length > 0 ? String(sortedChecks[0].id) : '')
      setSubmissionPackage(null)
      setCertificateTemplate(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const loadSubmissionPackage = async () => {
    setError('')
    if (!selectedProject || !selectedCheckId) {
      setError('Select a compliance check')
      return
    }
    setLoadingPackage(true)
    try {
      const data = await api.get(`/api/projects/${selectedProject}/compliance/${selectedCheckId}/submission-package`)
      setSubmissionPackage(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPackage(false)
    }
  }

  const loadCertificateTemplate = async () => {
    setError('')
    if (!selectedProject || !selectedCheckId) {
      setError('Select a compliance check')
      return
    }
    setLoadingCertificate(true)
    try {
      const data = await api.get(`/api/projects/${selectedProject}/compliance/${selectedCheckId}/certificate-template`)
      setCertificateTemplate(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingCertificate(false)
    }
  }

  const downloadSubmissionPackage = () => {
    if (!submissionPackage) return
    const blob = new Blob([JSON.stringify(submissionPackage, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${submissionPackage.packageId || 'compliance-package'}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const downloadCertificateTemplate = () => {
    if (!certificateTemplate) return
    const text = [
      `Template ID: ${certificateTemplate.templateId}`,
      `Project: ${certificateTemplate.projectName} (${certificateTemplate.projectCode})`,
      `Compliance Check: #${certificateTemplate.complianceCheckId}`,
      `Issued At: ${certificateTemplate.issuedAt}`,
      `Framework: ${certificateTemplate.frameworkVersion}`,
      `Status: ${certificateTemplate.status}`,
      '',
      certificateTemplate.statement,
      '',
      'Signatories:',
      ...(certificateTemplate.signatories || []).map((entry) => `- ${entry}`)
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${certificateTemplate.templateId || 'certificate-template'}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
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
        <Card title="Regulatory Update Tracker">
          <div className="space-y-3 text-sm text-ink/70">
            {updates.map((update) => (
              <div key={update.id} className="rounded-lg border border-clay/60 bg-white/70 p-3">
                <p className="font-semibold text-ink text-sm">{update.title}</p>
                <p className="text-xs text-ink/55 mt-1">Clause: {update.clauseReference} | Effective: {update.effectiveDate}</p>
                <p className="text-xs text-ink/65 mt-2">{update.summary}</p>
              </div>
            ))}
            {updates.length === 0 && (
              <p>No regulatory updates configured.</p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Submission Package Generator">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Compliance check</span>
              <select className="input" value={selectedCheckId} onChange={(e) => setSelectedCheckId(e.target.value)}>
                <option value="">Select compliance check</option>
                {checks.map((check) => (
                  <option key={check.id} value={check.id}>Check #{check.id} - {check.status}</option>
                ))}
              </select>
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button variant="secondary" onClick={loadSubmissionPackage} disabled={loadingPackage}>
                {loadingPackage ? 'Generating package...' : 'Generate package'}
              </Button>
              <Button variant="secondary" onClick={loadCertificateTemplate} disabled={loadingCertificate}>
                {loadingCertificate ? 'Loading certificate...' : 'Load certificate'}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {submissionPackage && (
              <div className="rounded-lg border border-clay/60 bg-white/70 p-3 text-sm text-ink/75">
                <p className="font-semibold text-ink">Package: {submissionPackage.packageId}</p>
                <p className="text-xs mt-1">Framework: {submissionPackage.frameworkVersion}</p>
                <p className="text-xs mt-1">Status: {submissionPackage.status}</p>
                <p className="text-xs mt-2">{submissionPackage.submissionNotes}</p>
                <Button className="mt-3" variant="secondary" onClick={downloadSubmissionPackage}>
                  Download package JSON
                </Button>
              </div>
            )}
            {certificateTemplate && (
              <div className="rounded-lg border border-clay/60 bg-white/70 p-3 text-sm text-ink/75">
                <p className="font-semibold text-ink">Certificate: {certificateTemplate.templateId}</p>
                <p className="text-xs mt-1">Framework: {certificateTemplate.frameworkVersion}</p>
                <p className="text-xs mt-2">{certificateTemplate.statement}</p>
                <Button className="mt-3" variant="secondary" onClick={downloadCertificateTemplate}>
                  Download certificate template
                </Button>
              </div>
            )}
            {!submissionPackage && !certificateTemplate && (
              <p className="text-sm text-ink/60">Generate a package or load a certificate template for the selected compliance check.</p>
            )}
          </div>
        </div>
      </Card>

      <Card title="Compliance History">
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Check #{check.id}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${statusPill(check.status)}`}>
                  {check.status}
                </span>
              </div>
              <p className="text-xs text-ink/55 mt-1">
                Run ID: {check.subdivisionRunId} | Framework: {check.frameworkVersion || 'N/A'} | Checked: {formatDateTime(check.checkedAt)}
              </p>
              <p className="text-sm text-ink/70 mt-2">{check.findings}</p>
              <div className="mt-3 space-y-2">
                {(check.ruleResults || []).map((rule) => (
                  <div key={`${check.id}-${rule.ruleCode}`} className="rounded-lg border border-clay/60 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">{rule.ruleName}</p>
                        <p className="text-xs text-ink/55">{rule.ruleCode} | Clause: {rule.clauseReference}</p>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full ${statusPill(rule.status)}`}>
                        {rule.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink/70 mt-2">{rule.detail}</p>
                    {rule.suggestion && (
                      <p className="text-xs text-ink/65 mt-1"><span className="font-semibold">Suggestion:</span> {rule.suggestion}</p>
                    )}
                  </div>
                ))}
                {(!check.ruleResults || check.ruleResults.length === 0) && (
                  <p className="text-xs text-ink/60">No rule-level details available for this check.</p>
                )}
              </div>
            </div>
          ))}
          {checks.length === 0 && <p className="text-sm text-ink/70">No compliance checks yet.</p>}
        </div>
      </Card>
    </div>
  )
}
