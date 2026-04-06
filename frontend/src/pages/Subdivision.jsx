import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

const optimizationModes = ['BALANCED', 'MAXIMIZE_AREA', 'MINIMIZE_ROADS']

function formatScore(value) {
  if (!Number.isFinite(value)) return '--'
  return `${Math.round(value)}`
}

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

export default function Subdivision() {
  const { user } = useAuth()
  const canRunLiveCompliance = ['ADMIN', 'PROJECT_MANAGER', 'SURVEYOR', 'ENGINEER', 'CIVIL_ENGINEER'].includes(user?.role || '')
  const [projects, setProjects] = useState([])
  const [datasets, setDatasets] = useState([])
  const [runs, setRuns] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [parcelCount, setParcelCount] = useState(4)
  const [optimizationMode, setOptimizationMode] = useState('BALANCED')
  const [result, setResult] = useState('')
  const [lastRun, setLastRun] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [liveCompliance, setLiveCompliance] = useState(null)
  const [liveChecking, setLiveChecking] = useState(false)
  const [liveError, setLiveError] = useState('')
  const [autoLiveCheck, setAutoLiveCheck] = useState(true)
  const [pendingDesignChanges, setPendingDesignChanges] = useState(false)
  const [error, setError] = useState('')

  const avgParcels = runs.length
    ? Math.round(runs.reduce((sum, run) => sum + (run.parcelCount || 0), 0) / runs.length)
    : 0

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setDatasets([])
      setRuns([])
      setSelectedDataset('')
      setResult('')
      setLastRun(null)
      setLiveCompliance(null)
      setLiveError('')
      setPendingDesignChanges(false)
      return
    }
    setError('')
    setDatasets([])
    setRuns([])
    setSelectedDataset('')
    setResult('')
    setLastRun(null)
    setLiveCompliance(null)
    setLiveError('')
    setPendingDesignChanges(false)
    Promise.all([
      api.get(`/api/projects/${selectedProject}/datasets`),
      api.get(`/api/projects/${selectedProject}/subdivisions`)
    ])
      .then(([datasetData, runData]) => {
        setDatasets(datasetData)
        setSelectedDataset(datasetData[0] ? String(datasetData[0].id) : '')
        const sortedRuns = [...runData].sort((a, b) => b.id - a.id)
        setRuns(sortedRuns)
        setLastRun(sortedRuns[0] || null)
      })
      .catch((err) => setError(err.message))
  }, [selectedProject])

  useEffect(() => {
    if (!lastRun) return
    setPendingDesignChanges(true)
  }, [selectedDataset, parcelCount, optimizationMode])

  const runLiveCompliance = async (runId, { silent = false } = {}) => {
    if (!selectedProject || !runId || !canRunLiveCompliance) return
    if (!silent) setLiveChecking(true)
    setLiveError('')
    try {
      const data = await api.get(`/api/projects/${selectedProject}/compliance/live/${runId}`)
      setLiveCompliance(data)
    } catch (err) {
      setLiveError(err.message || 'Unable to run live compliance check.')
    } finally {
      if (!silent) setLiveChecking(false)
    }
  }

  useEffect(() => {
    if (!autoLiveCheck || !selectedProject || !lastRun?.id || !canRunLiveCompliance) return
    runLiveCompliance(lastRun.id, { silent: true })
    const interval = setInterval(() => {
      runLiveCompliance(lastRun.id, { silent: true })
    }, 15000)
    return () => clearInterval(interval)
  }, [autoLiveCheck, selectedProject, lastRun?.id, canRunLiveCompliance])

  const onRun = async (e) => {
    e.preventDefault()
    setError('')
    setResult('')
    setLastRun(null)
    setLiveCompliance(null)
    setLiveError('')
    setPendingDesignChanges(false)
    if (!selectedProject || !selectedDataset) {
      setError('Select project and dataset')
      return
    }
    try {
      setIsRunning(true)
      const data = await api.post(`/api/projects/${selectedProject}/subdivisions/run`, {
        datasetId: Number(selectedDataset),
        parcelCount: Number(parcelCount),
        optimizationMode
      })
      setResult(data.resultGeoJson)
      setLastRun(data)
      const updatedRuns = await api.get(`/api/projects/${selectedProject}/subdivisions`)
      setRuns([...updatedRuns].sort((a, b) => b.id - a.id))
      if (autoLiveCheck && canRunLiveCompliance) {
        await runLiveCompliance(data.id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsRunning(false)
    }
  }

  const modeSummary = {
    BALANCED: 'Balances parcel compactness with uniform sizing.',
    MAXIMIZE_AREA: 'Prioritizes maximum parcel area per lot.',
    MINIMIZE_ROADS: 'Reduces internal road cuts and access splits.'
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">AI Subdivision</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Automated Land Subdivision</h1>
        <p className="text-sm text-ink/60">Generate parcel layouts using geospatial AI optimization tailored for Rwanda.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Subdivision Runs</p>
          <p className="text-2xl font-semibold text-ink mt-2">{runs.length}</p>
          <p className="text-xs text-ink/60 mt-2">Historical runs for this project</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Avg Parcel Count</p>
          <p className="text-2xl font-semibold text-ink mt-2">{avgParcels || '--'}</p>
          <p className="text-xs text-ink/60 mt-2">Average parcels per run</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Latest Quality Score</p>
          <p className="text-2xl font-semibold text-ink mt-2">
            {lastRun?.qualityScore?.toFixed ? lastRun.qualityScore.toFixed(1) : lastRun?.qualityScore || '--'}
          </p>
          <p className="text-xs text-success mt-2">AI layout quality</p>
        </Card>
      </div>

      <Card title="AI Engine Status">
        <div className="grid md:grid-cols-3 gap-4 text-sm text-ink/70">
          <div className={`rounded-xl border border-clay/70 p-4 bg-white/70 ${isRunning ? 'animate-pulse' : ''}`}>
            <p className="font-semibold text-ink">1. Data Ingestion</p>
            <p className="text-xs mt-1">{selectedDataset ? 'Dataset loaded for analysis.' : 'Waiting for dataset selection.'}</p>
          </div>
          <div className={`rounded-xl border border-clay/70 p-4 bg-white/70 ${isRunning ? 'animate-pulse' : ''}`}>
            <p className="font-semibold text-ink">2. AI Optimization</p>
            <p className="text-xs mt-1">{isRunning ? 'Running optimization...' : modeSummary[optimizationMode]}</p>
          </div>
          <div className={`rounded-xl border border-clay/70 p-4 bg-white/70 ${isRunning ? 'animate-pulse' : ''}`}>
            <p className="font-semibold text-ink">3. Parcel Generation</p>
            <p className="text-xs mt-1">{lastRun ? 'AI output generated.' : 'Ready to generate output.'}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-ink/60">
          <span className={`h-2 w-2 rounded-full ${isRunning ? 'bg-warning' : 'bg-success'}`} />
          {isRunning ? 'AI engine is processing subdivision...' : 'AI engine idle. Ready for next run.'}
        </div>
      </Card>

      {canRunLiveCompliance && (
        <Card title="Live Compliance Monitor">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={autoLiveCheck}
                  onChange={(event) => setAutoLiveCheck(event.target.checked)}
                />
                Auto-validate every 15 seconds
              </label>
              <Button
                variant="secondary"
                onClick={() => runLiveCompliance(lastRun?.id)}
                disabled={!lastRun?.id || liveChecking}
              >
                {liveChecking ? 'Validating...' : 'Validate current run'}
              </Button>
            </div>

            {pendingDesignChanges && (
              <p className="text-xs text-warning">
                Design inputs changed since the latest subdivision run. Run subdivision again to validate the updated design.
              </p>
            )}
            {liveError && <p className="text-sm text-danger">{liveError}</p>}
            {!lastRun && <p className="text-sm text-ink/60">Run a subdivision to start live compliance monitoring.</p>}

            {liveCompliance && (
              <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">Compliance status</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusPill(liveCompliance.status)}`}>
                    {liveCompliance.status}
                  </span>
                </div>
                <p className="text-xs text-ink/55 mt-2">
                  Check #{liveCompliance.id} | Framework: {liveCompliance.frameworkVersion || 'N/A'} | Checked: {formatDateTime(liveCompliance.checkedAt)}
                </p>
                <p className="text-sm text-ink/70 mt-2">{liveCompliance.findings}</p>
                <div className="mt-3 space-y-2">
                  {(liveCompliance.ruleResults || []).map((rule) => (
                    <div key={`${liveCompliance.id}-${rule.ruleCode}`} className="rounded-lg border border-clay/60 bg-white p-3">
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
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="Subdivision Inputs">
        <form className="grid md:grid-cols-2 gap-4" onSubmit={onRun}>
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
            <span className="text-sm font-medium">Dataset</span>
            <select className="input" value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)}>
              <option value="">Select dataset</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
              ))}
            </select>
          </label>
          <Input label="Parcel count" type="number" min="1" value={parcelCount} onChange={(e) => setParcelCount(e.target.value)} />
          <label className="block space-y-2">
            <span className="text-sm font-medium">Optimization mode</span>
            <select className="input" value={optimizationMode} onChange={(e) => setOptimizationMode(e.target.value)}>
              {optimizationModes.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-danger col-span-2">{error}</p>}
          <Button className="col-span-2" disabled={isRunning}>
            {isRunning ? 'AI Running...' : 'Run subdivision'}
          </Button>
        </form>
      </Card>

      {lastRun && (
        <Card title="AI Decision Summary">
          <div className="grid md:grid-cols-2 gap-4 text-sm text-ink/70">
            <div className="space-y-2">
              <p><span className="font-semibold text-ink">Optimization:</span> {lastRun.optimizationMode}</p>
              <p><span className="font-semibold text-ink">Parcel Count:</span> {lastRun.parcelCount}</p>
              <p><span className="font-semibold text-ink">Average Area:</span> {lastRun.avgParcelAreaSqm.toFixed(2)} sqm</p>
              <p><span className="font-semibold text-ink">AI Quality Score:</span> {lastRun.qualityScore?.toFixed ? lastRun.qualityScore.toFixed(1) : lastRun.qualityScore}</p>
            </div>
            <div className="rounded-xl border border-clay/70 p-4 bg-white/70">
              <p className="font-semibold text-ink">AI Interpretation</p>
              <p className="text-xs mt-2">
                {modeSummary[lastRun.optimizationMode] || modeSummary.BALANCED}
              </p>
              <p className="text-xs mt-2">
                Quality score reflects parcel compactness (higher is better for efficient layouts).
              </p>
              {lastRun.aiExplanation?.recommendation && (
                <p className="text-xs mt-2"><span className="font-semibold text-ink">Recommendation:</span> {lastRun.aiExplanation.recommendation}</p>
              )}
            </div>
          </div>
          {lastRun.aiExplanation && (
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-clay/70 p-4 bg-white/70">
                <div className="flex items-center justify-between text-xs text-ink/70">
                  <span>Compactness</span>
                  <span className="font-semibold text-ink">{formatScore(lastRun.aiExplanation.compactnessScore)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-river" style={{ width: `${Math.min(100, Math.max(0, lastRun.aiExplanation.compactnessScore || 0))}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-ink/70 mt-3">
                  <span>Area Uniformity</span>
                  <span className="font-semibold text-ink">{formatScore(lastRun.aiExplanation.areaUniformityScore)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-water" style={{ width: `${Math.min(100, Math.max(0, lastRun.aiExplanation.areaUniformityScore || 0))}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-clay/70 p-4 bg-white/70">
                <div className="flex items-center justify-between text-xs text-ink/70">
                  <span>Road Access</span>
                  <span className="font-semibold text-ink">{formatScore(lastRun.aiExplanation.roadAccessScore)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-sunrise" style={{ width: `${Math.min(100, Math.max(0, lastRun.aiExplanation.roadAccessScore || 0))}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-ink/70 mt-3">
                  <span>Compliance Readiness</span>
                  <span className="font-semibold text-ink">{formatScore(lastRun.aiExplanation.complianceReadinessScore)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sand">
                  <div className="h-2 rounded-full bg-success" style={{ width: `${Math.min(100, Math.max(0, lastRun.aiExplanation.complianceReadinessScore || 0))}%` }} />
                </div>
                <p className="text-xs text-ink/60 mt-3">{lastRun.aiExplanation.rationale}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card title="Subdivision Runs">
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="border border-clay/60 rounded-lg p-4 bg-white/60">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Run #{run.id}</h4>
                <span className="text-xs px-2 py-1 rounded-full bg-river/20">{run.status}</span>
              </div>
              <p className="text-sm text-ink/70">Parcels: {run.parcelCount}</p>
              <p className="text-sm text-ink/70">Avg Area: {run.avgParcelAreaSqm.toFixed(2)} sqm</p>
              <p className="text-sm text-ink/70">Quality score: {run.qualityScore?.toFixed ? run.qualityScore.toFixed(1) : run.qualityScore}</p>
              {run.aiExplanation && (
                <p className="text-sm text-ink/70">
                  Readiness: {formatScore(run.aiExplanation.complianceReadinessScore)}
                </p>
              )}
              <p className="text-xs text-ink/50 mt-2">AI optimization: {run.optimizationMode}</p>
            </div>
          ))}
          {runs.length === 0 && <p className="text-sm text-ink/70">No subdivision runs yet.</p>}
        </div>
      </Card>

      {result && (
        <Card title="AI Output GeoJSON">
          <pre className="text-xs whitespace-pre-wrap">{result}</pre>
        </Card>
      )}
    </div>
  )
}
