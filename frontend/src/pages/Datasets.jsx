import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const datasetTypes = ['CADASTRAL', 'UPI', 'TOPOGRAPHIC', 'BOUNDARY', 'MASTER_PLAN', 'ADMIN_BOUNDARY', 'ROAD_NETWORK']

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return '0'
  return Number(value).toLocaleString()
}

function layerLabel(layerKey = '') {
  const labels = {
    parcels: 'Kigali Parcels',
    zoning: 'Kigali Masterplan / Zoning',
    buildings: 'Building Footprints',
    building_footprints: 'Building Footprints',
    dem: 'DEM 30m',
    administrative_boundaries: 'Administrative Boundaries',
    constraints: 'Restricted / Constraint Zones',
    zoning_rules: 'Zoning Rules From PDF'
  }
  const key = String(layerKey).toLowerCase()
  return labels[key] || key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function sourceFolder(sourcePath = '') {
  const normalized = sourcePath.replaceAll('\\', '/')
  const index = normalized.toLowerCase().indexOf('requested data/')
  return index >= 0 ? normalized.slice(index) : normalized || 'Generated cache'
}

function statusClass(loaded) {
  return loaded ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
}

export default function Datasets() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [datasets, setDatasets] = useState([])
  const [form, setForm] = useState({ name: '', type: 'CADASTRAL', geoJson: '' })
  const [error, setError] = useState('')
  const [analysisDatasetId, setAnalysisDatasetId] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [analysisError, setAnalysisError] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [layerStatus, setLayerStatus] = useState([])
  const [layerStatusError, setLayerStatusError] = useState('')

  const selectedProjectName = projects.find((project) => String(project.id) === String(selectedProject))?.name
  const totalDatasets = datasets.length
  const datasetTypeCount = new Set(datasets.map((dataset) => dataset.type)).size
  const loadedLayers = useMemo(
    () => layerStatus.filter((layer) => layer.loadedSuccessfully),
    [layerStatus]
  )
  const failedLayers = useMemo(
    () => layerStatus.filter((layer) => !layer.loadedSuccessfully),
    [layerStatus]
  )
  const totalFeatures = useMemo(
    () => loadedLayers.reduce((sum, layer) => sum + (Number(layer.featureCount) || 0), 0),
    [loadedLayers]
  )

  useEffect(() => {
    api.get('/api/projects')
      .then(setProjects)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    api.get('/api/layers/status')
      .then((data) => setLayerStatus(Array.isArray(data) ? data : []))
      .catch((err) => setLayerStatusError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    api.get(`/api/projects/${selectedProject}/datasets`)
      .then(setDatasets)
      .catch((err) => setError(err.message))
  }, [selectedProject])

  useEffect(() => {
    if (datasets.length > 0 && !analysisDatasetId) {
      setAnalysisDatasetId(String(datasets[0].id))
    }
  }, [datasets, analysisDatasetId])

  const analyzeDataset = async () => {
    if (!selectedProject || !analysisDatasetId) return
    setAnalysisError('')
    setAnalysisLoading(true)
    try {
      const result = await api.get(`/api/projects/${selectedProject}/datasets/${analysisDatasetId}/analysis`)
      setAnalysis(result)
    } catch (err) {
      setAnalysisError(err.message)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedProject) {
      setError('Select a project first')
      return
    }
    try {
      await api.post(`/api/projects/${selectedProject}/datasets`, form)
      setForm({ name: '', type: 'CADASTRAL', geoJson: '' })
      const data = await api.get(`/api/projects/${selectedProject}/datasets`)
      setDatasets(data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Geospatial Data Center</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Operational GIS Layer Registry</h1>
        <p className="text-sm text-ink/60">Monitor the verified Kigali layers powering parcel search, zoning checks, building checks, constraints, slope review, and professional reports.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Operational Layers</p>
          <p className="text-2xl font-semibold text-ink mt-2">{layerStatus.length}</p>
          <p className="text-xs text-ink/60 mt-2">Available to the planning engine</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Loaded Successfully</p>
          <p className="text-2xl font-semibold text-ink mt-2">{loadedLayers.length}</p>
          <p className="text-xs text-ink/60 mt-2">Queryable by the planner</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Features</p>
          <p className="text-2xl font-semibold text-ink mt-2">{formatNumber(totalFeatures)}</p>
          <p className="text-xs text-ink/60 mt-2">Parcels, zoning, buildings, boundaries</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Layer Alerts</p>
          <p className="text-2xl font-semibold text-ink mt-2">{failedLayers.length}</p>
          <p className="text-xs text-ink/60 mt-2">Missing or unreadable sources</p>
        </Card>
      </div>

      <Card title="Verified Planning Layers">
        {layerStatusError && <p className="text-sm text-danger">{layerStatusError}</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {layerStatus.map((layer) => (
            <div key={layer.layerKey} className="rounded-2xl border border-clay/70 bg-white/75 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ink">{layerLabel(layer.layerKey)}</h3>
                  <p className="mt-1 text-xs text-ink/50">{layer.geometryType || 'Metadata'} {layer.epsg ? `| EPSG:${layer.epsg}` : ''}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusClass(layer.loadedSuccessfully)}`}>
                  {layer.loadedSuccessfully ? 'READY' : 'CHECK'}
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-[#124E44]">{formatNumber(layer.featureCount)}</p>
              <p className="text-xs text-ink/50">features / records</p>
              <p className="mt-3 break-words text-xs leading-5 text-ink/58">{sourceFolder(layer.sourcePath)}</p>
              {layer.notes && <p className="mt-2 text-xs leading-5 text-ink/55">{layer.notes}</p>}
            </div>
          ))}
          {!layerStatus.length && !layerStatusError && (
            <p className="text-sm text-ink/60">No GIS cache status was returned. Run the data inspection and cache build scripts first.</p>
          )}
        </div>
      </Card>

      <Card title="Data Governance Notes">
        <div className="grid gap-3 text-sm text-ink/70 md:grid-cols-2">
          <p>Main parcel search uses the verified Kigali Parcels layer available in the planning registry.</p>
          <p>Zoning checks use the Kigali Masterplan layer and rules extracted into the zoning-rule table.</p>
          <p>Building, constraint, and DEM availability is reported from the operational GIS cache.</p>
          <p>Uploaded project GeoJSON should only be used as an extension layer, not as a replacement for official source data.</p>
        </div>
      </Card>

      <details className="group rounded-[1.75rem] border border-clay/70 bg-white/72 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.75)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-lg font-bold text-ink">Advanced Layer Extensions</p>
            <p className="mt-1 text-sm text-ink/58">Optional project-specific GeoJSON uploads and analysis tools for technical users.</p>
          </div>
          <span className="rounded-full border border-clay/70 bg-sand/80 px-3 py-1 text-xs font-bold text-ink/55 group-open:hidden">Show tools</span>
          <span className="hidden rounded-full border border-clay/70 bg-sand/80 px-3 py-1 text-xs font-bold text-ink/55 group-open:inline-flex">Hide tools</span>
        </summary>

        <div className="grid gap-6 border-t border-clay/70 p-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card title="Project Extension Library">
              <p className="mb-4 text-sm leading-6 text-ink/60">
                Select a project to review any extra GeoJSON layers added outside the main planning registry.
              </p>
              <label className="block space-y-2 max-w-sm">
                <span className="text-sm font-medium text-ink/80">Project</span>
                <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="">Select project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {datasets.map((dataset) => (
                  <div key={dataset.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{dataset.name}</h4>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-sand border border-clay/70">{dataset.type}</span>
                    </div>
                    <p className="text-xs text-ink/50 mt-2">Project extension GeoJSON</p>
                  </div>
                ))}
                {datasets.length === 0 && <p className="text-sm text-ink/70">No extension layers for this project.</p>}
              </div>
            </Card>

            <Card title="Extension Layer Analysis">
              <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-ink/80">Extension layer</span>
                  <select className="input" value={analysisDatasetId} onChange={(e) => setAnalysisDatasetId(e.target.value)}>
                    <option value="">Select layer</option>
                    {datasets.map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                    ))}
                  </select>
                </label>
                <Button type="button" onClick={analyzeDataset} disabled={analysisLoading || !analysisDatasetId}>
                  {analysisLoading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
              {analysisError && <p className="text-sm text-danger mt-3">{analysisError}</p>}
              {analysis && (
                <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm text-ink/80">
                  <div>
                    <p><span className="font-semibold">Features:</span> {analysis.featureCount}</p>
                    <p><span className="font-semibold">Polygons:</span> {analysis.polygonCount}</p>
                    <p><span className="font-semibold">Total area:</span> {analysis.totalAreaSqm.toFixed(2)} sqm</p>
                    <p><span className="font-semibold">Average area:</span> {analysis.averageAreaSqm.toFixed(2)} sqm</p>
                    <p><span className="font-semibold">Min area:</span> {analysis.minAreaSqm.toFixed(2)} sqm</p>
                    <p><span className="font-semibold">Max area:</span> {analysis.maxAreaSqm.toFixed(2)} sqm</p>
                  </div>
                  <div>
                    <p><span className="font-semibold">Centroid:</span> {analysis.centroidLat.toFixed(5)}, {analysis.centroidLon.toFixed(5)}</p>
                    <p><span className="font-semibold">Bounds:</span></p>
                    <p className="text-xs">Min: {analysis.minLat.toFixed(5)}, {analysis.minLon.toFixed(5)}</p>
                    <p className="text-xs">Max: {analysis.maxLat.toFixed(5)}, {analysis.maxLon.toFixed(5)}</p>
                    <p className="mt-3"><span className="font-semibold">UPI field:</span> {analysis.upiField || 'Not detected'}</p>
                    <p><span className="font-semibold">UPI present:</span> {analysis.upiFeatureCount}</p>
                    <p><span className="font-semibold">Unique UPI:</span> {analysis.uniqueUpiCount}</p>
                    <p><span className="font-semibold">Duplicate UPI:</span> {analysis.duplicateUpiCount}</p>
                    <p><span className="font-semibold">Missing UPI:</span> {analysis.missingUpiCount}</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card title="Upload Project Extension Layer">
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input label="Layer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Layer type</span>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {datasetTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">GeoJSON</span>
                <textarea className="input min-h-[160px] font-mono text-xs" value={form.geoJson} onChange={(e) => setForm({ ...form, geoJson: e.target.value })} required />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full">Save extension layer</Button>
            </form>
          </Card>
        </div>
      </details>
    </div>
  )
}
