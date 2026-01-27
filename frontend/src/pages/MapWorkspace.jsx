import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, GeoJSON, Polyline, Polygon, CircleMarker, useMapEvents } from 'react-leaflet'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Badge } from '../components/Badge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'

const KIGALI_CENTER = [-1.944, 30.061] // lat, lon

function isGeoJsonFilename(filename) {
  const lower = String(filename || '').toLowerCase()
  return lower.endsWith('.geojson') || lower.endsWith('.json')
}

function withFeatureIds(featureCollection, prefix) {
  if (!featureCollection || featureCollection.type !== 'FeatureCollection' || !Array.isArray(featureCollection.features)) {
    return null
  }

  return {
    ...featureCollection,
    features: featureCollection.features.map((f, idx) => {
      const id = f?.id ?? `${prefix}-${idx + 1}`
      return {
        ...f,
        id,
        properties: { ...(f?.properties || {}), __id: id },
      }
    }),
  }
}

function FitToGeoJson({ data }) {
  const map = useMap()

  useEffect(() => {
    if (!data) return
    try {
      const layer = L.geoJSON(data)
      const bounds = layer.getBounds()
      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] })
      }
    } catch {
      // ignore
    }
  }, [data, map])

  return null
}

function MeasureTool({ mode, points, setPoints }) {
  useMapEvents({
    click(e) {
      if (!mode) return
      setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]])
    },
  })

  if (!mode || points.length === 0) return null

  if (mode === 'distance') {
    return (
      <>
        <Polyline positions={points} pathOptions={{ color: '#4f46e5', weight: 3 }} />
        {points.map((p, idx) => (
          <CircleMarker key={idx} center={p} radius={5} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 1 }} />
        ))}
      </>
    )
  }

  if (mode === 'area' && points.length >= 3) {
    return (
      <>
        <Polygon positions={points} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 0.15, weight: 2 }} />
        {points.map((p, idx) => (
          <CircleMarker key={idx} center={p} radius={5} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 1 }} />
        ))}
      </>
    )
  }

  return (
    <>
      <Polyline positions={points} pathOptions={{ color: '#4f46e5', weight: 3 }} />
      {points.map((p, idx) => (
        <CircleMarker key={idx} center={p} radius={5} pathOptions={{ color: '#4f46e5', fillColor: '#4f46e5', fillOpacity: 1 }} />
      ))}
    </>
  )
}

function formatMeters(m) {
  if (!Number.isFinite(m)) return '-'
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`
  return `${m.toFixed(1)} m`
}

function formatSqm(a) {
  if (!Number.isFinite(a)) return '-'
  if (a >= 1_000_000) return `${(a / 1_000_000).toFixed(2)} km^2`
  if (a >= 10_000) return `${(a / 10_000).toFixed(2)} ha`
  return `${a.toFixed(1)} m^2`
}

function measureDistanceMeters(points) {
  if (!Array.isArray(points) || points.length < 2) return 0
  let sum = 0
  for (let i = 1; i < points.length; i++) {
    const a = L.latLng(points[i - 1][0], points[i - 1][1])
    const b = L.latLng(points[i][0], points[i][1])
    sum += a.distanceTo(b)
  }
  return sum
}

function measureAreaSqm(points) {
  if (!Array.isArray(points) || points.length < 3) return 0
  const deg2rad = Math.PI / 180
  const R = 6378137
  const midLat =
    (points.reduce((acc, p) => acc + p[0], 0) / Math.max(1, points.length)) * deg2rad
  const pts = points.map(([lat, lon]) => {
    const x = lon * deg2rad * Math.cos(midLat) * R
    const y = lat * deg2rad * R
    return [x, y]
  })
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

async function downloadBlob(url, filename) {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(blobUrl)
}

function DatasetRow({ active, d, onSelect }) {
  const format = d.format || (isGeoJsonFilename(d.originalFilename) ? 'GEOJSON' : '')
  return (
    <button
      type="button"
      className={[
        'w-full rounded-xl border px-3 py-3 text-left transition',
        active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50',
      ].join(' ')}
      onClick={() => onSelect(d.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{d.name}</div>
          <div className="mt-1 truncate text-xs text-slate-600">
            {d.originalFilename}
            {d.version ? ` - v${d.version}` : ''}
            {format ? ` - ${format}` : ''}
            {!isGeoJsonFilename(d.originalFilename) && !d.hasGeojsonPreview ? ' - no preview' : ''}
          </div>
        </div>
        <Badge tone="blue">{d.type}</Badge>
      </div>
    </button>
  )
}

export function MapWorkspacePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { projectId } = useProject()

  const [map, setMap] = useState(null)
  const [datasetId, setDatasetId] = useState('')
  const [runId, setRunId] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState('CADASTRAL')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreviewFile, setUploadPreviewFile] = useState(null)
  const [showDataset, setShowDataset] = useState(true)
  const [masterPlanDatasetId, setMasterPlanDatasetId] = useState('')
  const [showMasterPlan, setShowMasterPlan] = useState(true)
  const [showSubdivision, setShowSubdivision] = useState(true)
  const [basemap, setBasemap] = useState('osm')
  const [measureMode, setMeasureMode] = useState('')
  const [measurePoints, setMeasurePoints] = useState([])
  const [activeTable, setActiveTable] = useState('subdivision')
  const [tableQuery, setTableQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirmDeleteDatasetId, setConfirmDeleteDatasetId] = useState('')

  const datasetsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['datasets', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/datasets`)).data,
  })

  const datasets = useMemo(() => datasetsQuery.data ?? [], [datasetsQuery.data])
  const masterPlanDatasets = useMemo(() => datasets.filter((d) => d.type === 'MASTER_PLAN'), [datasets])

  const selectedDatasetId = useMemo(() => {
    if (!projectId) return ''
    if (datasetId && datasets.some((d) => d.id === datasetId)) return datasetId
    const cadastral = datasets.find((d) => d.type === 'CADASTRAL')
    if (cadastral?.id) return cadastral.id
    return datasets[0]?.id || ''
  }, [projectId, datasetId, datasets])

  const selectedDataset = useMemo(() => {
    if (!selectedDatasetId) return null
    return datasets.find((d) => d.id === selectedDatasetId) ?? null
  }, [datasets, selectedDatasetId])

  const canPreviewSelectedDataset = useMemo(() => {
    if (!selectedDataset) return false
    return isGeoJsonFilename(selectedDataset.originalFilename) || selectedDataset.hasGeojsonPreview
  }, [selectedDataset])

  const selectedMasterPlanDatasetId = useMemo(() => {
    if (!projectId) return ''
    if (masterPlanDatasetId && masterPlanDatasets.some((d) => d.id === masterPlanDatasetId)) return masterPlanDatasetId
    return masterPlanDatasets[0]?.id || ''
  }, [masterPlanDatasetId, masterPlanDatasets, projectId])

  const selectedMasterPlanDataset = useMemo(() => {
    if (!selectedMasterPlanDatasetId) return null
    return masterPlanDatasets.find((d) => d.id === selectedMasterPlanDatasetId) ?? null
  }, [masterPlanDatasets, selectedMasterPlanDatasetId])

  const canPreviewMasterPlan = useMemo(() => {
    if (!selectedMasterPlanDataset) return false
    return isGeoJsonFilename(selectedMasterPlanDataset.originalFilename) || selectedMasterPlanDataset.hasGeojsonPreview
  }, [selectedMasterPlanDataset])

  const datasetGeoJsonQuery = useQuery({
    enabled: !!selectedDatasetId && canPreviewSelectedDataset,
    queryKey: ['dataset-geojson', selectedDatasetId],
    queryFn: async () => {
      const res = await api.get(`/api/datasets/${selectedDatasetId}/geojson`, { responseType: 'text' })
      return JSON.parse(res.data)
    },
  })

  const datasetGeojsonWithIds = useMemo(() => withFeatureIds(datasetGeoJsonQuery.data, 'dataset'), [datasetGeoJsonQuery.data])

  const masterPlanGeoJsonQuery = useQuery({
    enabled: !!selectedMasterPlanDatasetId && canPreviewMasterPlan,
    queryKey: ['dataset-geojson', selectedMasterPlanDatasetId],
    queryFn: async () => {
      const res = await api.get(`/api/datasets/${selectedMasterPlanDatasetId}/geojson`, { responseType: 'text' })
      return JSON.parse(res.data)
    },
  })

  const masterPlanGeojsonWithIds = useMemo(
    () => withFeatureIds(masterPlanGeoJsonQuery.data, 'master-plan'),
    [masterPlanGeoJsonQuery.data],
  )

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data])

  const selectedRunId = useMemo(() => {
    if (!projectId) return ''
    if (runId) return runId
    return runs[0]?.id || ''
  }, [projectId, runId, runs])

  const runDetailQuery = useQuery({
    enabled: !!selectedRunId,
    queryKey: ['subdivision-run-detail', selectedRunId],
    queryFn: async () => (await api.get(`/api/subdivisions/${selectedRunId}`)).data,
  })

  const subdivisionGeojson = useMemo(() => {
    const raw = runDetailQuery.data?.resultGeojson
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [runDetailQuery.data])

  const subdivisionGeojsonWithIds = useMemo(
    () => withFeatureIds(subdivisionGeojson, 'parcel'),
    [subdivisionGeojson],
  )

  const fitCollection = useMemo(() => {
    const fcs = []
    if (showDataset && datasetGeojsonWithIds) fcs.push(datasetGeojsonWithIds)
    if (showSubdivision && subdivisionGeojsonWithIds) fcs.push(subdivisionGeojsonWithIds)
    if (showMasterPlan && masterPlanGeojsonWithIds) fcs.push(masterPlanGeojsonWithIds)
    if (fcs.length === 0) return null
    return {
      type: 'FeatureCollection',
      features: fcs.flatMap((fc) => fc.features || []),
    }
  }, [datasetGeojsonWithIds, masterPlanGeojsonWithIds, showDataset, showMasterPlan, showSubdivision, subdivisionGeojsonWithIds])

  const datasetFeatures = useMemo(() => datasetGeojsonWithIds?.features ?? [], [datasetGeojsonWithIds])
  const subdivisionFeatures = useMemo(() => subdivisionGeojsonWithIds?.features ?? [], [subdivisionGeojsonWithIds])

  const selectedFeature = useMemo(() => {
    if (!selected) return null
    const list = selected.layer === 'dataset' ? datasetFeatures : subdivisionFeatures
    return list.find((f) => f?.id === selected.id) ?? null
  }, [datasetFeatures, selected, subdivisionFeatures])

  const filteredDatasetFeatures = useMemo(() => {
    const q = tableQuery.trim().toLowerCase()
    if (!q) return datasetFeatures
    return datasetFeatures.filter((f) => {
      const id = String(f?.id || '').toLowerCase()
      const name = String(f?.properties?.name || '').toLowerCase()
      return id.includes(q) || name.includes(q)
    })
  }, [datasetFeatures, tableQuery])

  const filteredSubdivisionFeatures = useMemo(() => {
    const q = tableQuery.trim().toLowerCase()
    if (!q) return subdivisionFeatures
    return subdivisionFeatures.filter((f, idx) => {
      const id = String(f?.id || '').toLowerCase()
      const parcelNo = String(f?.properties?.parcelNo ?? idx + 1).toLowerCase()
      return id.includes(q) || parcelNo.includes(q)
    })
  }, [subdivisionFeatures, tableQuery])

  const resolvedTable = useMemo(() => {
    if (activeTable === 'dataset') {
      if (datasetFeatures.length > 0) return 'dataset'
      if (subdivisionFeatures.length > 0) return 'subdivision'
      return 'dataset'
    }

    if (subdivisionFeatures.length > 0) return 'subdivision'
    if (datasetFeatures.length > 0) return 'dataset'
    return 'subdivision'
  }, [activeTable, datasetFeatures.length, subdivisionFeatures.length])

  const measuredDistance = useMemo(() => {
    if (measureMode !== 'distance') return null
    return measureDistanceMeters(measurePoints)
  }, [measureMode, measurePoints])

  const measuredArea = useMemo(() => {
    if (measureMode !== 'area') return null
    return measureAreaSqm(measurePoints)
  }, [measureMode, measurePoints])

  function zoomToFeature(feature) {
    if (!map || !feature) return
    try {
      const layer = L.geoJSON(feature)
      const bounds = layer.getBounds()
      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] })
      }
    } catch {
      // ignore
    }
  }

  function fitAll() {
    if (!map) return
    if (!fitCollection) return
    try {
      const layer = L.geoJSON(fitCollection)
      const bounds = layer.getBounds()
      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] })
      }
    } catch {
      // ignore
    }
  }

  const datasetStyle = (feature) => {
    const isSelected = selected?.layer === 'dataset' && feature?.id === selected?.id
    return {
      color: '#0f172a',
      weight: isSelected ? 4 : 2,
      fillColor: '#0f172a',
      fillOpacity: isSelected ? 0.18 : 0.06,
    }
  }

  const subdivisionStyle = (feature) => {
    const isSelected = selected?.layer === 'subdivision' && feature?.id === selected?.id
    return {
      color: '#4f46e5',
      weight: isSelected ? 4 : 2,
      fillColor: '#4f46e5',
      fillOpacity: isSelected ? 0.2 : 0.08,
    }
  }

  const masterPlanStyle = () => {
    return {
      color: '#16a34a',
      weight: 2,
      fillColor: '#16a34a',
      fillOpacity: 0.08,
      dashArray: '4 3',
    }
  }

  const onDatasetEach = (feature, layer) => {
    layer.on({
      click: () => {
        setSelected({ layer: 'dataset', id: feature?.id })
        setActiveTable('dataset')
        zoomToFeature(feature)
      },
    })
  }

  const onSubdivisionEach = (feature, layer) => {
    layer.on({
      click: () => {
        setSelected({ layer: 'subdivision', id: feature?.id })
        setActiveTable('subdivision')
        zoomToFeature(feature)
      },
    })
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.set('name', uploadName || uploadFile?.name || 'Dataset')
      fd.set('type', uploadType)
      fd.set('file', uploadFile)
      if (uploadPreviewFile) {
        fd.set('previewGeojson', uploadPreviewFile)
      }
      const res = await api.post(`/api/projects/${projectId}/datasets/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['datasets', projectId] })
      setDatasetId(saved.id)
      setUploadFile(null)
      setUploadPreviewFile(null)
      setUploadName('')
      toast.success('Uploaded', 'Dataset uploaded successfully.')
    },
    onError: () => toast.error('Upload failed', 'Unable to upload dataset.'),
  })

  const deleteDatasetMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/datasets/${id}`)
    },
    onSuccess: async (_data, id) => {
      await qc.invalidateQueries({ queryKey: ['datasets', projectId] })
      await qc.invalidateQueries({ queryKey: ['dataset-geojson', id] })
      if (selected?.layer === 'dataset') {
        setSelected(null)
      }
      setDatasetId('')
      toast.success('Deleted', 'Dataset deleted successfully.')
    },
    onError: (e) => toast.error('Delete failed', e?.response?.data?.message || 'Unable to delete dataset.'),
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">
            Use the "Active Project" selector in the top bar, or create a project first.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Map Workspace</h1>
        <p className="mt-1 text-sm text-slate-600">Upload datasets, visualize parcels, and preview subdivision outputs.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-900">Upload dataset</div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Cadastral boundary" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                >
                  <option value="CADASTRAL">CADASTRAL</option>
                  <option value="MASTER_PLAN">MASTER_PLAN</option>
                  <option value="UPI">UPI</option>
                  <option value="SURVEY">SURVEY</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Dataset file</label>
                <input
                  type="file"
                  accept=".json,.geojson,.kml,.kmz,.gpx,.csv,.zip,.dxf,application/geo+json,application/json"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null)
                    setUploadPreviewFile(null)
                  }}
                />
                <div className="mt-1 text-xs text-slate-500">
                  Supported: GeoJSON, KML/KMZ, GPX, CSV, Shapefile (ZIP), DXF. For non-GeoJSON sources, a GeoJSON preview will
                  be generated when possible.
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">GeoJSON preview (optional)</label>
                <input
                  type="file"
                  accept=".json,.geojson,application/geo+json,application/json"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setUploadPreviewFile(e.target.files?.[0] || null)}
                />
                <div className="mt-1 text-xs text-slate-500">
                  Recommended for Shapefile ZIP and DXF so the map can display the layer and AI subdivision can run.
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!uploadFile || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
              {uploadMutation.isError ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Upload failed.</div>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Datasets</div>
              <div className="text-xs text-slate-500">{datasets.length}</div>
            </div>
            <div className="mt-4 space-y-2">
              {datasetsQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
              {datasetsQuery.isError ? <div className="text-sm text-rose-600">Failed to load datasets.</div> : null}
              {!datasetsQuery.isLoading && datasets.length === 0 ? (
                <div className="text-sm text-slate-600">No datasets yet. Upload one above.</div>
              ) : null}
              {datasets.map((d) => (
                <DatasetRow key={d.id} d={d} active={d.id === selectedDatasetId} onSelect={setDatasetId} />
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Basemap</span>
                  <select
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={basemap}
                    onChange={(e) => setBasemap(e.target.value)}
                  >
                    <option value="osm">OSM</option>
                    <option value="satellite">Satellite</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Measure</span>
                  <select
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={measureMode}
                    onChange={(e) => {
                      setMeasureMode(e.target.value)
                      setMeasurePoints([])
                    }}
                  >
                    <option value="">Off</option>
                    <option value="distance">Distance</option>
                    <option value="area">Area</option>
                  </select>
                  {measureMode ? (
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-sm text-slate-700">
                      {measureMode === 'distance' ? formatMeters(measuredDistance) : formatSqm(measuredArea)}
                    </span>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={showDataset}
                    onChange={(e) => setShowDataset(e.target.checked)}
                  />
                  Dataset
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={showSubdivision}
                    onChange={(e) => setShowSubdivision(e.target.checked)}
                  />
                  Subdivision
                </label>

                {masterPlanDatasets.length > 0 ? (
                  <>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={showMasterPlan}
                        onChange={(e) => setShowMasterPlan(e.target.checked)}
                      />
                      Master plan
                    </label>
                    <select
                      className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={masterPlanDatasetId}
                      onChange={(e) => setMasterPlanDatasetId(e.target.value)}
                      title="Select master plan dataset"
                    >
                      <option value="">{selectedMasterPlanDataset ? 'Selected master plan' : 'Latest master plan'}</option>
                      {masterPlanDatasets.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.id.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                <select
                  className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={runId}
                  onChange={(e) => setRunId(e.target.value)}
                  disabled={runs.length === 0}
                  title={runs.length === 0 ? 'Run subdivision first' : 'Select subdivision run'}
                >
                  <option value="">Latest run</option>
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id.slice(0, 8)} - {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fitAll}
                  disabled={!datasetGeojsonWithIds && !subdivisionGeojsonWithIds && !masterPlanGeojsonWithIds}
                >
                  Fit all
                </Button>
                {measureMode ? (
                  <Button variant="outline" size="sm" onClick={() => setMeasurePoints([])}>
                    Clear measure
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedDatasetId}
                  onClick={async () => {
                    try {
                      const d = datasets.find((x) => x.id === selectedDatasetId)
                      await downloadBlob(`/api/datasets/${selectedDatasetId}/download`, d?.originalFilename || 'dataset.geojson')
                      toast.success('Downloaded', 'Dataset downloaded.')
                    } catch {
                      toast.error('Download failed', 'Unable to download dataset.')
                    }
                  }}
                >
                  Download dataset
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!selectedDatasetId || deleteDatasetMutation.isPending}
                  onClick={() => setConfirmDeleteDatasetId(selectedDatasetId)}
                >
                  Delete dataset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedRunId}
                  onClick={async () => {
                    try {
                      await downloadBlob(
                        `/api/subdivisions/${selectedRunId}/download`,
                        `subdivision-${selectedRunId.slice(0, 8)}.geojson`,
                      )
                      toast.success('Downloaded', 'Subdivision downloaded.')
                    } catch {
                      toast.error('Download failed', 'Unable to download subdivision.')
                    }
                  }}
                >
                  Download subdivision
                </Button>
              </div>
            </div>
            {showDataset && selectedDataset && !canPreviewSelectedDataset ? (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                The selected dataset "{selectedDataset.name}" has no GeoJSON preview. Upload a GeoJSON preview (or use GeoJSON/KML/GPX/CSV)
                so it can be displayed on the map.
              </div>
            ) : null}
            {showMasterPlan && selectedMasterPlanDataset && !canPreviewMasterPlan ? (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                The selected master plan dataset "{selectedMasterPlanDataset.name}" has no GeoJSON preview.
              </div>
            ) : null}
          </Card>

          <Card className="h-[70vh] overflow-hidden sm:h-[75vh]">
            <MapContainer center={KIGALI_CENTER} zoom={12} className="h-full w-full" whenCreated={setMap}>
              {basemap === 'osm' ? (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              ) : (
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              )}

              <FitToGeoJson data={fitCollection} />
              <MeasureTool mode={measureMode} points={measurePoints} setPoints={setMeasurePoints} />
              {showMasterPlan && masterPlanGeojsonWithIds ? (
                <GeoJSON data={masterPlanGeojsonWithIds} style={masterPlanStyle} />
              ) : null}
              {showDataset && datasetGeojsonWithIds ? (
                <GeoJSON data={datasetGeojsonWithIds} style={datasetStyle} onEachFeature={onDatasetEach} />
              ) : null}
              {showSubdivision && subdivisionGeojsonWithIds ? (
                <GeoJSON data={subdivisionGeojsonWithIds} style={subdivisionStyle} onEachFeature={onSubdivisionEach} />
              ) : null}
            </MapContainer>
          </Card>

          <div className="mt-3 text-xs text-slate-500">
            Showing dataset (dark), subdivision output (indigo), and master plan overlay (green) when available.
          </div>

          <Card className="mt-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Selection</div>
                {selectedFeature ? (
                  <div className="mt-1 text-sm text-slate-700">
                    {selected?.layer === 'subdivision'
                      ? `Parcel ${selectedFeature?.properties?.parcelNo ?? '-'}`
                      : `Dataset feature ${selectedFeature?.properties?.name || selectedFeature?.id || '-'}`}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-slate-600">Click a parcel or a dataset feature on the map to inspect it.</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedFeature}
                  onClick={() => {
                    zoomToFeature(selectedFeature)
                  }}
                >
                  Zoom
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedFeature}
                  onClick={async () => {
                    if (!selectedFeature) return
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(selectedFeature, null, 2))
                      toast.success('Copied', 'Selected feature copied to clipboard.')
                    } catch {
                      toast.error('Copy failed', 'Unable to copy to clipboard.')
                    }
                  }}
                >
                  Copy JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selected}
                  onClick={() => {
                    setSelected(null)
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>

          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Attribute table</div>
              <div className="flex flex-1 items-center justify-end gap-2">
                <div className="hidden w-64 sm:block">
                  <Input placeholder="Search..." value={tableQuery} onChange={(e) => setTableQuery(e.target.value)} />
                </div>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                    resolvedTable === 'dataset'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}
                  onClick={() => setActiveTable('dataset')}
                  disabled={datasetFeatures.length === 0}
                >
                  Dataset ({datasetFeatures.length})
                </button>
                <button
                  type="button"
                  className={[
                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                    resolvedTable === 'subdivision'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
                  ].join(' ')}
                  onClick={() => setActiveTable('subdivision')}
                  disabled={subdivisionFeatures.length === 0}
                >
                  Subdivision ({subdivisionFeatures.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {resolvedTable === 'dataset' ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {datasetFeatures.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No dataset features to show.
                        </td>
                      </tr>
                    ) : null}
                    {datasetFeatures.length > 0 && filteredDatasetFeatures.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No matches for "{tableQuery}".
                        </td>
                      </tr>
                    ) : null}
                    {filteredDatasetFeatures.map((f, idx) => {
                      const isSel = selected?.layer === 'dataset' && selected?.id === f.id
                      return (
                        <tr key={f.id || idx} className={isSel ? 'bg-indigo-50' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-900">{f.id || idx + 1}</td>
                          <td className="px-4 py-3 text-slate-700">{f?.properties?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected({ layer: 'dataset', id: f.id })
                                zoomToFeature(f)
                              }}
                            >
                              Zoom
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Parcel</th>
                      <th className="px-4 py-3">Area (sqm)</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {subdivisionFeatures.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No subdivision result yet.
                        </td>
                      </tr>
                    ) : null}
                    {subdivisionFeatures.length > 0 && filteredSubdivisionFeatures.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={3}>
                          No matches for "{tableQuery}".
                        </td>
                      </tr>
                    ) : null}
                    {filteredSubdivisionFeatures.map((f, idx) => {
                      const isSel = selected?.layer === 'subdivision' && selected?.id === f.id
                      const parcelNo = f?.properties?.parcelNo ?? idx + 1
                      const area = typeof f?.properties?.areaSqm === 'number' ? f.properties.areaSqm : null
                      return (
                        <tr key={f.id || idx} className={isSel ? 'bg-indigo-50' : ''}>
                          <td className="px-4 py-3 font-medium text-slate-900">{parcelNo}</td>
                          <td className="px-4 py-3 text-slate-700">{area == null ? '-' : area.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected({ layer: 'subdivision', id: f.id })
                                zoomToFeature(f)
                              }}
                            >
                              Zoom
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteDatasetId}
        title="Delete dataset?"
        message={`This will permanently delete the dataset${selectedDataset ? ` "${selectedDataset.name}"` : ''}.`}
        confirmLabel={deleteDatasetMutation.isPending ? 'Deleting...' : 'Delete'}
        danger
        onClose={() => setConfirmDeleteDatasetId('')}
        onConfirm={() => {
          deleteDatasetMutation.mutate(confirmDeleteDatasetId, { onSettled: () => setConfirmDeleteDatasetId('') })
        }}
      />
    </div>
  )
}
