import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import GeoJsonMap from '../components/GeoJsonMap'
import TopNavTabs from '../components/TopNavTabs'
import { api } from '../api/http'

const DEFAULT_LAYER_STATE = {
  PARCELS: false,
  ZONING: true,
  ROADS: true,
  ADMIN_BOUNDARIES: false,
  CONSTRAINTS: true
}

const LAYER_STYLE = {
  PARCELS: { color: '#1F6F5F', weight: 2, fillOpacity: 0.08 },
  ZONING: { color: '#8E5A2B', weight: 2, fillOpacity: 0.06, dashArray: '4' },
  ROADS: { color: '#5E6472', weight: 3, fillOpacity: 0.12 },
  ADMIN_BOUNDARIES: { color: '#2B4C7E', weight: 2, fillOpacity: 0.02, dashArray: '6' },
  CONSTRAINTS: { color: '#AD2E24', weight: 2, fillOpacity: 0.16, dashArray: '3' }
}

function parseGeoJson(value) {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

function toFeatureCollection(value) {
  const parsed = parseGeoJson(value)
  if (!parsed) return null
  if (parsed.type === 'FeatureCollection') return parsed
  if (parsed.type === 'Feature') {
    return { type: 'FeatureCollection', features: [parsed] }
  }
  if (parsed.type) {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: parsed }]
    }
  }
  return null
}

function classifyProposal(value) {
  const proposal = toFeatureCollection(value)
  if (!proposal) {
    return { proposal: null, plots: [], servitudes: [], error: 'Invalid GeoJSON proposal.' }
  }

  const plots = []
  const servitudes = []
  for (const feature of proposal.features || []) {
    const geometryType = feature?.geometry?.type || ''
    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      plots.push(feature)
    } else if (geometryType) {
      servitudes.push(feature)
    }
  }

  if (!plots.length) {
    return { proposal, plots, servitudes, error: 'At least one polygon plot is required.' }
  }

  return { proposal, plots, servitudes, error: '' }
}

function formatArea(value) {
  if (!Number.isFinite(value)) return '--'
  return `${Math.round(value).toLocaleString()} sqm`
}

function formatDateTime(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

function statusPill(status) {
  if (status === 'PASS') return 'bg-success/10 text-success'
  if (status === 'WARN') return 'bg-warning/15 text-warning'
  if (status === 'FAIL') return 'bg-danger/10 text-danger'
  return 'bg-clay/20 text-ink/70'
}

function layerLabel(key) {
  return key.replaceAll('_', ' ')
}

export default function Subdivision() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [bundle, setBundle] = useState(null)
  const [runs, setRuns] = useState([])
  const [selectedParentUpi, setSelectedParentUpi] = useState('')
  const [parentUpiInput, setParentUpiInput] = useState('')
  const [proposalLandUse, setProposalLandUse] = useState('')
  const [proposalSource, setProposalSource] = useState('upload')
  const [uploadedGeoJsonText, setUploadedGeoJsonText] = useState('')
  const [sketchFeatures, setSketchFeatures] = useState([])
  const [mapResetKey, setMapResetKey] = useState(1)
  const [layerState, setLayerState] = useState(DEFAULT_LAYER_STATE)
  const [areaToleranceSqm, setAreaToleranceSqm] = useState(5)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')

  useEffect(() => {
    api.get('/api/projects')
      .then((data) => setProjects(data))
      .catch((err) => setError(err.message || 'Unable to load projects.'))
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setBundle(null)
      setRuns([])
      setSelectedParentUpi('')
      setParentUpiInput('')
      setProposalLandUse('')
      setResult(null)
      return
    }

    setLoading(true)
    setError('')
    Promise.all([
      api.get(`/api/projects/${selectedProject}/subdivisions/demo-bundle`),
      api.get(`/api/projects/${selectedProject}/subdivisions`)
    ])
      .then(([bundleData, runData]) => {
        const orderedRuns = [...runData].sort((a, b) => (b.id || 0) - (a.id || 0))
        const firstParent = bundleData.parentParcels?.[0]
        setBundle(bundleData)
        setRuns(orderedRuns)
        setSelectedParentUpi(firstParent?.upi || '')
        setParentUpiInput(firstParent?.upi || '')
        setProposalLandUse(firstParent?.zoningRule?.allowedLandUses?.[0] || firstParent?.currentLandUse || '')
        setUploadedGeoJsonText(bundleData.sampleProposalGeoJson || '')
        setResult(orderedRuns[0] || null)
      })
      .catch((err) => setError(err.message || 'Unable to load subdivision demo data.'))
      .finally(() => setLoading(false))
  }, [selectedProject])

  useEffect(() => {
    if (!bundle?.parentParcels?.length) return
    const match = bundle.parentParcels.find((parcel) => parcel.upi === selectedParentUpi) || bundle.parentParcels[0]
    if (!match) return
    setSelectedParentUpi(match.upi)
    setParentUpiInput(match.upi)
    setProposalLandUse((current) => {
      if (match.zoningRule?.allowedLandUses?.includes(current)) return current
      return match.zoningRule?.allowedLandUses?.[0] || match.currentLandUse || current
    })
  }, [bundle, selectedParentUpi])

  const selectedParent = bundle?.parentParcels?.find((parcel) => parcel.upi === selectedParentUpi) || null
  const uploadClassification = classifyProposal(uploadedGeoJsonText)
  const sketchProposal = sketchFeatures.length ? { type: 'FeatureCollection', features: sketchFeatures } : null
  const sketchClassification = classifyProposal(sketchProposal)
  const activeProposal = proposalSource === 'draw' ? sketchClassification : uploadClassification

  const layerOverlays = (bundle?.layers || [])
    .filter((layer) => layerState[layer.layerKey])
    .map((layer) => ({
      id: layer.layerKey,
      data: parseGeoJson(layer.geoJson),
      style: LAYER_STYLE[layer.layerKey],
      showLabels: layer.layerKey === 'ADMIN_BOUNDARIES',
      labelKey: 'name'
    }))

  if (proposalSource === 'upload' && uploadClassification.proposal) {
    layerOverlays.push({
      id: 'proposal-preview',
      data: uploadClassification.proposal,
      style: { color: '#C46B2A', weight: 3, fillOpacity: 0.12 },
      showLabels: false
    })
  }

  const latestSummary = result?.validationSummary
  const passCount = latestSummary?.ruleResults?.filter((rule) => rule.status === 'PASS').length || 0
  const totalRules = latestSummary?.ruleResults?.length || 0

  const loadDemoProposal = () => {
    if (!bundle?.sampleProposalGeoJson) return
    const demoParent = bundle.parentParcels?.find((parcel) => parcel.upi === '1/01/02/03/0001') || bundle.parentParcels?.[0]
    if (demoParent) {
      setSelectedParentUpi(demoParent.upi)
      setParentUpiInput(demoParent.upi)
      setProposalLandUse(demoParent.zoningRule?.allowedLandUses?.[0] || demoParent.currentLandUse || '')
    }
    setProposalSource('upload')
    setUploadedGeoJsonText(bundle.sampleProposalGeoJson)
    setUploadMessage('Demo proposal loaded for parcel 1/01/02/03/0001.')
  }

  const resetSketch = () => {
    setSketchFeatures([])
    setMapResetKey((value) => value + 1)
  }

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setUploadedGeoJsonText(text)
      setProposalSource('upload')
      setUploadMessage(`${file.name} loaded.`)
    } catch {
      setUploadMessage('Unable to read the selected file.')
    }
  }

  const useTypedUpi = () => {
    const match = bundle?.parentParcels?.find((parcel) => parcel.upi.toLowerCase() === parentUpiInput.trim().toLowerCase())
    if (!match) {
      setError(`No demo parent parcel matches UPI ${parentUpiInput.trim()}.`)
      return
    }
    setError('')
    setSelectedParentUpi(match.upi)
  }

  const runValidation = async () => {
    if (!selectedProject) {
      setError('Select a project first.')
      return
    }
    if (!selectedParentUpi) {
      setError('Select or enter a parent parcel UPI.')
      return
    }
    if (!proposalLandUse) {
      setError('Select a proposed land use.')
      return
    }
    if (activeProposal.error) {
      setError(activeProposal.error)
      return
    }

    setValidating(true)
    setError('')
    try {
      const payload = JSON.stringify(activeProposal.proposal, null, 2)
      const response = await api.post(`/api/projects/${selectedProject}/subdivisions/validate`, {
        parentUpi: selectedParentUpi,
        proposedLandUse: proposalLandUse,
        proposalGeoJson: payload,
        areaToleranceSqm: Number(areaToleranceSqm)
      })
      setResult(response)
      const updatedRuns = await api.get(`/api/projects/${selectedProject}/subdivisions`)
      setRuns([...updatedRuns].sort((a, b) => (b.id || 0) - (a.id || 0)))
    } catch (err) {
      setError(err.message || 'Validation failed.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Subdivision Demo Module</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">GeoSmart Manager Subdivision Workflow</h1>
        <p className="text-sm text-ink/60 mt-2">
          Mock Rwanda-style parcels, zoning, roads, administrative boundaries, and constraint layers are loaded automatically.
          The structure is ready for later GeoJSON, Shapefile, and GeoPackage imports.
        </p>
      </div>

      <TopNavTabs className="mt-1" size="sm" />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Parent Parcel</p>
          <p className="text-lg font-semibold text-ink mt-2">{selectedParent?.upi || '--'}</p>
          <p className="text-xs text-ink/60 mt-2">{selectedParent ? formatArea(selectedParent.areaSqm) : 'Select a demo parcel.'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Draft Proposal</p>
          <p className="text-lg font-semibold text-ink mt-2">{activeProposal.plots.length} plots</p>
          <p className="text-xs text-ink/60 mt-2">{activeProposal.servitudes.length} servitude feature(s)</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Latest Validation</p>
          <p className="text-lg font-semibold text-ink mt-2">{latestSummary?.overallStatus || '--'}</p>
          <p className="text-xs text-ink/60 mt-2">{totalRules ? `${passCount}/${totalRules} rules passed` : 'No validation run yet.'}</p>
        </Card>
      </div>

      <Card title="Project And Parent Parcel">
        <div className="grid lg:grid-cols-4 gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">Project</span>
            <select className="input" value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}>
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">Select demo parent</span>
            <select
              className="input"
              value={selectedParentUpi}
              onChange={(event) => setSelectedParentUpi(event.target.value)}
              disabled={!bundle?.parentParcels?.length}
            >
              <option value="">Select parent parcel</option>
              {(bundle?.parentParcels || []).map((parcel) => (
                <option key={parcel.upi} value={parcel.upi}>
                  {parcel.upi} | {parcel.village}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <Input
              label="Enter parent UPI"
              value={parentUpiInput}
              onChange={(event) => setParentUpiInput(event.target.value)}
              placeholder="1/01/02/03/0001"
            />
            <Button type="button" variant="secondary" className="w-full" onClick={useTypedUpi}>
              Use typed UPI
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Proposed land use</span>
              <select
                className="input"
                value={proposalLandUse}
                onChange={(event) => setProposalLandUse(event.target.value)}
                disabled={!selectedParent}
              >
                {(selectedParent?.zoningRule?.allowedLandUses || [selectedParent?.currentLandUse || '']).filter(Boolean).map((landUse) => (
                  <option key={landUse} value={landUse}>{landUse}</option>
                ))}
              </select>
            </label>
            <Input
              label="Area tolerance (sqm)"
              type="number"
              min="0"
              value={areaToleranceSqm}
              onChange={(event) => setAreaToleranceSqm(event.target.value)}
            />
          </div>
        </div>

        {selectedParent && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm text-ink/70">
            <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
              <p className="font-semibold text-ink">Parcel Context</p>
              <p className="mt-2">District: {selectedParent.district}</p>
              <p>Sector: {selectedParent.sector}</p>
              <p>Cell: {selectedParent.cell}</p>
              <p>Village: {selectedParent.village}</p>
              <p>Current land use: {selectedParent.currentLandUse}</p>
            </div>
            <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
              <p className="font-semibold text-ink">Applicable Zoning Rule</p>
              <p className="mt-2">Zone: {selectedParent.zoningRule?.zoneCode || 'N/A'}</p>
              <p>Allowed uses: {selectedParent.zoningRule?.allowedLandUses?.join(', ') || 'N/A'}</p>
              <p>Minimum plot size: {formatArea(selectedParent.zoningRule?.minimumPlotSizeSqm)}</p>
              <p>Setbacks: front {selectedParent.zoningRule?.frontSetbackM || 0}m, side {selectedParent.zoningRule?.sideSetbackM || 0}m</p>
              <p>Coverage/FAR/Height: {selectedParent.zoningRule?.maximumCoveragePct || 0}% / {selectedParent.zoningRule?.far || 0} / {selectedParent.zoningRule?.heightLimitM || 0}m</p>
            </div>
          </div>
        )}
      </Card>

      <Card title="Proposal Workspace">
        <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="proposalSource"
                  checked={proposalSource === 'upload'}
                  onChange={() => setProposalSource('upload')}
                />
                Upload or paste GeoJSON
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="proposalSource"
                  checked={proposalSource === 'draw'}
                  onChange={() => setProposalSource('draw')}
                />
                Draw plots and servitudes
              </label>
            </div>

            <GeoJsonMap
              key={`subdivision-map-${mapResetKey}-${selectedParentUpi}`}
              geoJson={selectedParent?.geoJson}
              overlays={layerOverlays}
              onSketchChange={setSketchFeatures}
            />

            <div className="grid md:grid-cols-4 gap-3 text-xs text-ink/70">
              {Object.keys(DEFAULT_LAYER_STATE).map((key) => (
                <label key={key} className="inline-flex items-center gap-2 rounded-lg border border-clay/60 bg-white/70 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={layerState[key]}
                    onChange={(event) => setLayerState((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  {layerLabel(key)}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-clay/70 bg-white/70 p-4 text-sm text-ink/70">
              <p className="font-semibold text-ink">Draft Rules</p>
              <p className="mt-2">Use polygon features for plots.</p>
              <p>Use line features for access servitudes. A servitude must connect to a road reserve to count as access.</p>
              <p>The validator checks parcel containment, area balance, zoning minimum size, access, restrictions, and land-use match.</p>
            </div>

            <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={loadDemoProposal}>Load demo proposal</Button>
                <Button type="button" variant="secondary" onClick={resetSketch}>Reset sketch</Button>
              </div>

              <label className="block mt-4">
                <span className="text-sm font-medium text-ink/80">Upload GeoJSON file</span>
                <input className="input mt-2" type="file" accept=".geojson,.json" onChange={handleUploadFile} />
              </label>

              <label className="block mt-4">
                <span className="text-sm font-medium text-ink/80">Paste or edit proposal GeoJSON</span>
                <textarea
                  className="input mt-2 min-h-[260px] font-mono text-xs"
                  value={uploadedGeoJsonText}
                  onChange={(event) => setUploadedGeoJsonText(event.target.value)}
                />
              </label>

              {uploadMessage && <p className="text-xs text-ink/60 mt-2">{uploadMessage}</p>}
            </div>

            <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
              <p className="text-sm font-semibold text-ink">Proposal Summary</p>
              <p className="text-xs text-ink/60 mt-2">Source: {proposalSource === 'draw' ? 'Map sketch' : 'Uploaded/pasted GeoJSON'}</p>
              <p className="text-xs text-ink/60 mt-1">Plots: {activeProposal.plots.length}</p>
              <p className="text-xs text-ink/60 mt-1">Servitudes: {activeProposal.servitudes.length}</p>
              {activeProposal.error && <p className="text-xs text-danger mt-2">{activeProposal.error}</p>}
              <Button type="button" className="w-full mt-4" onClick={runValidation} disabled={validating || loading}>
                {validating ? 'Validating...' : 'Validate subdivision proposal'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="border border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {latestSummary && (
        <>
          <Card title="Validation Summary">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Status</p>
                <p className="text-lg font-semibold text-ink mt-2">{latestSummary.overallStatus}</p>
              </div>
              <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Area Delta</p>
                <p className="text-lg font-semibold text-ink mt-2">{formatArea(latestSummary.areaDeltaSqm)}</p>
              </div>
              <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Plots</p>
                <p className="text-lg font-semibold text-ink mt-2">{latestSummary.plotCount}</p>
              </div>
              <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Quality Score</p>
                <p className="text-lg font-semibold text-ink mt-2">
                  {result?.qualityScore?.toFixed ? result.qualityScore.toFixed(1) : result?.qualityScore || '--'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-clay/70 bg-white/70 p-4 text-sm text-ink/70">
              <p>Parent area: {formatArea(latestSummary.parentAreaSqm)}</p>
              <p>Proposed area: {formatArea(latestSummary.proposedAreaSqm)}</p>
              <p>Tolerance: {formatArea(latestSummary.areaToleranceSqm)}</p>
              <p>Zone: {latestSummary.zoningRule?.zoneCode || 'N/A'}</p>
            </div>
          </Card>

          <Card title="Rule Results">
            <div className="space-y-3">
              {(latestSummary.ruleResults || []).map((rule) => (
                <div key={rule.code} className="rounded-xl border border-clay/60 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{rule.label}</p>
                      <p className="text-xs text-ink/50 mt-1">{rule.code}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusPill(rule.status)}`}>
                      {rule.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink/70 mt-3">{rule.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Plot Checks">
            <div className="space-y-3">
              {(latestSummary.plots || []).map((plot) => (
                <div key={`${plot.plotNumber}-${plot.featureId}`} className="rounded-xl border border-clay/60 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">Plot {plot.plotNumber}</p>
                      <p className="text-xs text-ink/50 mt-1">{plot.featureId}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusPill(plot.status)}`}>
                      {plot.status}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-4 gap-3 mt-3 text-sm text-ink/70">
                    <p>Area: {formatArea(plot.areaSqm)}</p>
                    <p>Inside parent: {plot.insideParent ? 'Yes' : 'No'}</p>
                    <p>Min size: {plot.minimumPlotSizePass ? 'Pass' : 'Fail'}</p>
                    <p>Road access: {plot.roadAccessPass ? 'Pass' : 'Fail'}</p>
                  </div>
                  <p className="text-sm text-ink/70 mt-2">
                    Restricted overlaps: {plot.overlaps?.length ? plot.overlaps.join(', ') : 'None'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card title="Validation History">
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="rounded-xl border border-clay/60 bg-white/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">Run #{run.id}</p>
                  <p className="text-xs text-ink/50 mt-1">
                    Parent UPI: {run.parentUpi || 'Legacy run'} | Created: {formatDateTime(run.createdAt)}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${statusPill(run.validationSummary?.overallStatus || run.status)}`}>
                  {run.validationSummary?.overallStatus || run.status}
                </span>
              </div>
              <div className="grid md:grid-cols-4 gap-3 mt-3 text-sm text-ink/70">
                <p>Plots: {run.parcelCount}</p>
                <p>Avg area: {formatArea(run.avgParcelAreaSqm)}</p>
                <p>Land use: {run.proposedLandUse || 'N/A'}</p>
                <p>Quality: {run.qualityScore?.toFixed ? run.qualityScore.toFixed(1) : run.qualityScore || '--'}</p>
              </div>
            </div>
          ))}
          {!runs.length && <p className="text-sm text-ink/60">No validation history yet.</p>}
        </div>
      </Card>
    </div>
  )
}
