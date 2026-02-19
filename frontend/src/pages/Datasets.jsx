import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const sampleGeoJson = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "upi": "RW-UPI-0001" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[30.040,-1.970],[30.040,-1.940],[30.080,-1.940],[30.080,-1.970],[30.040,-1.970]]]
      }
    }
  ]
}`

const datasetTypes = ['CADASTRAL', 'UPI', 'TOPOGRAPHIC', 'BOUNDARY', 'MASTER_PLAN', 'ADMIN_BOUNDARY', 'ROAD_NETWORK']

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

  const selectedProjectName = projects.find((project) => String(project.id) === String(selectedProject))?.name
  const totalDatasets = datasets.length
  const datasetTypeCount = new Set(datasets.map((dataset) => dataset.type)).size

  useEffect(() => {
    api.get('/api/projects')
      .then(setProjects)
      .catch((err) => setError(err.message))
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
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Geospatial Data</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Dataset Management</h1>
        <p className="text-sm text-ink/60">Organize cadastral, UPI, and master plan data per project.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Selected Project</p>
          <p className="text-lg font-semibold text-ink mt-2">{selectedProjectName || 'No project selected'}</p>
          <p className="text-xs text-ink/60 mt-2">Choose a project to manage datasets.</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Datasets</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalDatasets}</p>
          <p className="text-xs text-ink/60 mt-2">Stored GeoJSON layers</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Dataset Types</p>
          <p className="text-2xl font-semibold text-ink mt-2">{datasetTypeCount}</p>
          <p className="text-xs text-ink/60 mt-2">Coverage across data classes</p>
        </Card>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <Card title="Dataset Library">
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
                  <p className="text-xs text-ink/50 mt-2">GeoJSON stored</p>
                </div>
              ))}
              {datasets.length === 0 && <p className="text-sm text-ink/70">No datasets for this project.</p>}
            </div>
          </Card>

          <Card title="Dataset Analysis">
            <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Dataset</span>
                <select className="input" value={analysisDatasetId} onChange={(e) => setAnalysisDatasetId(e.target.value)}>
                  <option value="">Select dataset</option>
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

        <div className="space-y-6">
          <Card title="Upload New Dataset">
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input label="Dataset name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Dataset type</span>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {datasetTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">GeoJSON</span>
                <textarea className="input min-h-[160px] font-mono text-xs" value={form.geoJson} onChange={(e) => setForm({ ...form, geoJson: e.target.value })} required />
                <Button type="button" variant="secondary" onClick={() => setForm({ ...form, geoJson: sampleGeoJson })}>Use sample polygon</Button>
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full">Save dataset</Button>
            </form>
          </Card>
          <Card title="GeoJSON Tips">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Ensure your GeoJSON is valid and uses WGS84 coordinates (EPSG:4326).</p>
              <p>Include a unique UPI property to improve compliance and parcel tracking.</p>
              <p>Large datasets load faster when simplified or split by administrative unit.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
