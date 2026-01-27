import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Badge } from '../components/Badge'
import { useToast } from '../components/ToastProvider'

const KIGALI_CENTER = [-1.944, 30.061]

const schema = z.object({
  targetParcels: z.coerce.number().int().min(2).max(50),
  minParcelArea: z.coerce.number().min(1),
})

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

function statusTone(status) {
  if (status === 'COMPLETED') return 'green'
  if (status === 'FAILED') return 'red'
  if (status === 'RUNNING') return 'amber'
  return 'slate'
}

function severityTone(severity) {
  if (severity === 'ERROR') return 'red'
  if (severity === 'WARNING') return 'amber'
  return 'slate'
}

function parseIssues(issuesJson) {
  if (!issuesJson) return []
  try {
    const v = JSON.parse(issuesJson)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function countIssues(issues) {
  return issues.reduce(
    (acc, it) => {
      const sev = String(it?.severity || '').toUpperCase()
      if (sev === 'ERROR') acc.errors += 1
      else if (sev === 'WARNING') acc.warnings += 1
      else acc.other += 1
      return acc
    },
    { errors: 0, warnings: 0, other: 0 },
  )
}

export function SubdivisionPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { projectId } = useProject()

  const [map, setMap] = useState(null)
  const [runId, setRunId] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [showBoundary, setShowBoundary] = useState(true)
  const [showParcels, setShowParcels] = useState(true)

  const datasetsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['datasets', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/datasets`)).data,
  })

  const datasets = useMemo(() => datasetsQuery.data ?? [], [datasetsQuery.data])

  const selectedDatasetId = useMemo(() => {
    if (!projectId) return ''
    if (datasetId) return datasetId

    const cadastral = datasets
      .filter((d) => d.type === 'CADASTRAL')
      .slice()
      .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    if (cadastral[0]?.id) return cadastral[0].id

    const all = datasets.slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
    return all[0]?.id || ''
  }, [datasetId, datasets, projectId])

  const selectedDataset = useMemo(() => {
    if (!selectedDatasetId) return null
    return datasets.find((d) => d.id === selectedDatasetId) ?? null
  }, [datasets, selectedDatasetId])

  const canPreviewBoundary = useMemo(() => {
    if (!selectedDataset) return false
    return isGeoJsonFilename(selectedDataset.originalFilename) || selectedDataset.hasGeojsonPreview
  }, [selectedDataset])

  const boundaryGeoJsonQuery = useQuery({
    enabled: !!selectedDatasetId && canPreviewBoundary,
    queryKey: ['dataset-geojson', selectedDatasetId],
    queryFn: async () => {
      const res = await api.get(`/api/datasets/${selectedDatasetId}/geojson`, { responseType: 'text' })
      return JSON.parse(res.data)
    },
  })

  const boundaryGeojson = useMemo(() => withFeatureIds(boundaryGeoJsonQuery.data, 'boundary'), [boundaryGeoJsonQuery.data])

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data])
  const selectedRunId = useMemo(() => runId || runs[0]?.id || '', [runId, runs])

  const runDetailQuery = useQuery({
    enabled: !!selectedRunId,
    queryKey: ['subdivision-run-detail', selectedRunId],
    queryFn: async () => (await api.get(`/api/subdivisions/${selectedRunId}`)).data,
  })

  const resultGeojson = useMemo(() => {
    const raw = runDetailQuery.data?.resultGeojson
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [runDetailQuery.data])

  const resultGeojsonWithIds = useMemo(() => withFeatureIds(resultGeojson, 'parcel'), [resultGeojson])
  const parcels = useMemo(() => resultGeojsonWithIds?.features ?? [], [resultGeojsonWithIds])

  const issues = useMemo(() => parseIssues(runDetailQuery.data?.issuesJson), [runDetailQuery.data?.issuesJson])
  const issueCounts = useMemo(() => countIssues(issues), [issues])

  const parcelByNo = useMemo(() => {
    const map = new Map()
    parcels.forEach((f, idx) => {
      const parcelNoRaw = f?.properties?.parcelNo ?? idx + 1
      const parcelNo = Number(parcelNoRaw)
      if (Number.isFinite(parcelNo)) map.set(parcelNo, f)
    })
    return map
  }, [parcels])

  const filteredParcels = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parcels
    return parcels.filter((f, idx) => {
      const id = String(f?.id || '').toLowerCase()
      const parcelNo = String(f?.properties?.parcelNo ?? idx + 1).toLowerCase()
      return id.includes(q) || parcelNo.includes(q)
    })
  }, [parcels, query])

  const selectedFeature = useMemo(() => {
    if (!selected) return null
    return parcels.find((f) => f?.id === selected.id) ?? null
  }, [parcels, selected])

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

  function zoomToFeatures(features) {
    if (!map || !Array.isArray(features) || features.length === 0) return
    try {
      const layer = L.geoJSON({ type: 'FeatureCollection', features })
      const bounds = layer.getBounds()
      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] })
      }
    } catch {
      // ignore
    }
  }

  const boundaryStyle = () => ({
    color: '#0f172a',
    weight: 2,
    fillColor: '#0f172a',
    fillOpacity: 0.06,
  })

  const parcelStyle = (feature) => {
    const isSelected = selected?.id && feature?.id === selected.id
    return {
      color: '#4f46e5',
      weight: isSelected ? 4 : 2,
      fillColor: '#4f46e5',
      fillOpacity: isSelected ? 0.22 : 0.1,
    }
  }

  const onParcelEach = (feature, layer) => {
    layer.on({
      click: () => {
        setSelected({ id: feature?.id })
        zoomToFeature(feature)
      },
    })
  }

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { targetParcels: 4, minParcelArea: 200 },
  })

  const minParcelArea = Number(form.watch('minParcelArea') || 0)
  const targetParcels = Number(form.watch('targetParcels') || 0)

  const suggestQuery = useQuery({
    enabled: !!projectId && Number.isFinite(minParcelArea) && minParcelArea > 0,
    queryKey: ['subdivision-suggest', projectId, minParcelArea, targetParcels],
    queryFn: async () => {
      const payload = {
        minParcelArea,
        targetParcels: Number.isFinite(targetParcels) && targetParcels > 0 ? targetParcels : null,
      }
      return (await api.post(`/api/projects/${projectId}/subdivisions/suggest`, payload)).data
    },
    staleTime: 10_000,
  })

  const runMutation = useMutation({
    mutationFn: async (values) => {
      return (await api.post(`/api/projects/${projectId}/subdivisions/run`, values)).data
    },
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['subdivision-runs', projectId] })
      setRunId(saved.id)
      toast.success('Subdivision complete', 'Subdivision run created successfully.')
    },
    onError: (e) =>
      toast.error('Subdivision failed', e?.response?.data?.message || 'Make sure you uploaded a cadastral GeoJSON first.'),
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to run subdivision.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">AI Land Subdivision</h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate an automated subdivision proposal (prototype: clipped strip parcels inside the cadastral boundary).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-900">Run settings</div>
            <div className="mt-1 text-xs text-slate-500">
              Tip: if you set a large minimum area, the system may reduce the maximum allowed parcel count.
            </div>
            <form className="mt-4 space-y-3" onSubmit={form.handleSubmit((v) => runMutation.mutate(v))}>
              <div>
                <label className="text-sm font-medium text-slate-700">Target parcels</label>
                <Input type="number" min={2} max={50} {...form.register('targetParcels')} />
                {form.formState.errors.targetParcels ? (
                  <div className="mt-1 text-xs text-rose-600">{form.formState.errors.targetParcels.message}</div>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Minimum parcel area (sqm)</label>
                <Input type="number" min={1} step="1" {...form.register('minParcelArea')} />
                {form.formState.errors.minParcelArea ? (
                  <div className="mt-1 text-xs text-rose-600">{form.formState.errors.minParcelArea.message}</div>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">AI suggestion</div>
                  {suggestQuery.isLoading ? <div className="text-xs text-slate-500">Calculating…</div> : null}
                </div>

                {suggestQuery.isError ? (
                  <div className="mt-2 text-xs text-rose-600">Unable to compute suggestions. Upload a cadastral GeoJSON dataset first.</div>
                ) : null}

                {suggestQuery.data ? (
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-slate-600">Boundary area</div>
                      <div className="font-medium text-slate-900">
                        {Number.isFinite(suggestQuery.data.boundaryAreaSqm) ? suggestQuery.data.boundaryAreaSqm.toFixed(2) : '—'} sqm
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-slate-600">Max parcels (by min area)</div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-900">{suggestQuery.data.maxParcels}</div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            form.setValue('targetParcels', suggestQuery.data.maxParcels, { shouldDirty: true, shouldValidate: true })
                          }
                        >
                          Use max
                        </Button>
                      </div>
                    </div>

                    {suggestQuery.data.estimatedParcelAreaSqm != null ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-slate-600">Estimated area / parcel</div>
                        <div className="font-medium text-slate-900">{suggestQuery.data.estimatedParcelAreaSqm.toFixed(2)} sqm</div>
                      </div>
                    ) : null}

                    {Number.isFinite(targetParcels) && targetParcels > suggestQuery.data.maxParcels ? (
                      <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Target parcels is above the maximum allowed for the selected minimum area.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-600">Enter a minimum area to see suggested limits.</div>
                )}
              </div>

              {runMutation.isError ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {runMutation.error?.response?.data?.message || 'Subdivision failed.'}
                </div>
              ) : null}

              <Button className="w-full" type="submit" disabled={runMutation.isPending}>
                {runMutation.isPending ? 'Running...' : 'Run subdivision'}
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">Boundary dataset</div>
              <div className="text-xs text-slate-500">{datasets.length}</div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-medium text-slate-700">Preview dataset</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={selectedDatasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                disabled={datasets.length === 0}
              >
                <option value="">{datasets.length === 0 ? 'No datasets yet' : 'Select a dataset...'}</option>
                {datasets
                  .slice()
                  .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.type})
                    </option>
                  ))}
              </select>

              {selectedDataset && !canPreviewBoundary ? (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  This dataset has no GeoJSON preview, so it cannot be shown on the map. Upload a GeoJSON preview for it in Map Workspace.
                </div>
              ) : null}

              <div className="mt-2 text-xs text-slate-500">
                Subdivision uses the latest CADASTRAL dataset; this selector is for map preview.
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Runs</div>
              <div className="text-xs text-slate-500">{runs.length}</div>
            </div>
            <div className="mt-4 space-y-2">
              {runsQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
              {runsQuery.isError ? <div className="text-sm text-rose-600">Failed to load runs.</div> : null}
              {!runsQuery.isLoading && runs.length === 0 ? <div className="text-sm text-slate-600">No runs yet.</div> : null}
              {runs.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  className={[
                    'w-full rounded-xl border px-3 py-3 text-left transition',
                    r.id === selectedRunId ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                  onClick={() => setRunId(r.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">Run {r.id.slice(0, 8)}</div>
                      <div className="mt-1 text-xs text-slate-600">Parcels: {r.targetParcels}</div>
                    </div>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="mb-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={showBoundary}
                    onChange={(e) => setShowBoundary(e.target.checked)}
                  />
                  Boundary
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={showParcels}
                    onChange={(e) => setShowParcels(e.target.checked)}
                  />
                  Parcels
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedRunId}
                  onClick={async () => {
                    try {
                      await downloadBlob(`/api/subdivisions/${selectedRunId}/download`, `subdivision-${selectedRunId.slice(0, 8)}.geojson`)
                      toast.success('Downloaded', 'Subdivision GeoJSON downloaded.')
                    } catch {
                      toast.error('Download failed', 'Unable to download subdivision.')
                    }
                  }}
                >
                  Download GeoJSON
                </Button>
              </div>
            </div>
          </Card>

          <Card className="h-[70vh] overflow-hidden sm:h-[75vh]">
            <MapContainer center={KIGALI_CENTER} zoom={12} className="h-full w-full" whenCreated={setMap}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitToGeoJson data={(showParcels && resultGeojsonWithIds) || (showBoundary && boundaryGeojson) || null} />
              {showBoundary && boundaryGeojson ? <GeoJSON data={boundaryGeojson} style={boundaryStyle} /> : null}
              {showParcels && resultGeojsonWithIds ? (
                <GeoJSON data={resultGeojsonWithIds} style={parcelStyle} onEachFeature={onParcelEach} />
              ) : null}
            </MapContainer>
          </Card>

          <Card className="mt-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Parcels</div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedFeature ? (
                    <>
                      Selected parcel:{' '}
                      <span className="font-medium text-slate-900">{selectedFeature?.properties?.parcelNo ?? '—'}</span>
                    </>
                  ) : (
                    'Click a parcel on the map or in the table to inspect it.'
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input className="sm:w-56" placeholder="Search parcels..." value={query} onChange={(e) => setQuery(e.target.value)} />
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
                <Button variant="outline" size="sm" disabled={!selected} onClick={() => setSelected(null)}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Parcel</th>
                    <th className="px-3 py-2">Area (sqm)</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {runDetailQuery.isLoading ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-600" colSpan={3}>
                        Loading...
                      </td>
                    </tr>
                  ) : null}
                  {!runDetailQuery.isLoading && parcels.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-600" colSpan={3}>
                        No result yet.
                      </td>
                    </tr>
                  ) : null}
                  {parcels.length > 0 && filteredParcels.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-600" colSpan={3}>
                        No matches for "{query}".
                      </td>
                    </tr>
                  ) : null}
                  {filteredParcels.map((f, idx) => {
                    const isSel = selected?.id === f.id
                    const parcelNo = f?.properties?.parcelNo ?? idx + 1
                    const area = typeof f?.properties?.areaSqm === 'number' ? f.properties.areaSqm : null
                    return (
                      <tr key={f.id || idx} className={isSel ? 'bg-indigo-50' : ''}>
                        <td className="px-3 py-2 font-medium text-slate-900">{parcelNo}</td>
                        <td className="px-3 py-2 text-slate-700">{area == null ? '—' : area.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected({ id: f.id })
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
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Validation & conflicts</div>
                <div className="mt-1 text-sm text-slate-600">
                  Automatic checks on the generated parcels (geometry validity, minimum area, overlaps).
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={issueCounts.errors > 0 ? 'red' : 'green'}>{issueCounts.errors} errors</Badge>
                <Badge tone={issueCounts.warnings > 0 ? 'amber' : 'slate'}>{issueCounts.warnings} warnings</Badge>
                {issueCounts.other > 0 ? <Badge tone="slate">{issueCounts.other} notes</Badge> : null}
              </div>
            </div>

            {!selectedRunId ? <div className="mt-4 text-sm text-slate-600">Run subdivision first to see validation results.</div> : null}

            {selectedRunId && runDetailQuery.isLoading ? <div className="mt-4 text-sm text-slate-600">Loading…</div> : null}
            {selectedRunId && runDetailQuery.isError ? (
              <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Failed to load validation results.</div>
            ) : null}

            {selectedRunId && !runDetailQuery.isLoading && !runDetailQuery.isError && issues.length === 0 ? (
              <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                No issues detected for this run.
              </div>
            ) : null}

            {issues.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Severity</th>
                      <th className="px-3 py-2">Rule</th>
                      <th className="px-3 py-2">Message</th>
                      <th className="px-3 py-2">Parcels</th>
                      <th className="px-3 py-2">Details</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {issues.map((it, idx) => {
                      const sev = String(it?.severity || '').toUpperCase()
                      const rule = String(it?.rule || '—')
                      const message = String(it?.message || '—')

                      const parcelNo = Number(it?.parcelNo)
                      const parcelA = Number(it?.parcelA)
                      const parcelB = Number(it?.parcelB)

                      const focusFeature = Number.isFinite(parcelNo) ? parcelByNo.get(parcelNo) : null
                      const focusA = Number.isFinite(parcelA) ? parcelByNo.get(parcelA) : null
                      const focusB = Number.isFinite(parcelB) ? parcelByNo.get(parcelB) : null

                      const parcelsLabel = Number.isFinite(parcelNo)
                        ? `#${parcelNo}`
                        : Number.isFinite(parcelA) && Number.isFinite(parcelB)
                          ? `#${parcelA} & #${parcelB}`
                          : '—'

                      const detailParts = []
                      if (it?.areaSqm != null && Number.isFinite(Number(it.areaSqm))) detailParts.push(`area ${Number(it.areaSqm).toFixed(2)} sqm`)
                      if (it?.minParcelArea != null && Number.isFinite(Number(it.minParcelArea)))
                        detailParts.push(`min ${Number(it.minParcelArea).toFixed(0)} sqm`)
                      if (it?.overlapSqm != null && Number.isFinite(Number(it.overlapSqm)))
                        detailParts.push(`overlap ${Number(it.overlapSqm).toFixed(2)} sqm`)
                      if (it?.targetParcels != null) detailParts.push(`target ${it.targetParcels}`)
                      if (it?.actualParcels != null) detailParts.push(`actual ${it.actualParcels}`)
                      const details = detailParts.length ? detailParts.join(' · ') : '—'

                      return (
                        <tr key={`${rule}-${idx}`}>
                          <td className="px-3 py-2">
                            <Badge tone={severityTone(sev)}>{sev || '—'}</Badge>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">{rule}</td>
                          <td className="px-3 py-2 text-slate-700">{message}</td>
                          <td className="px-3 py-2 text-slate-700">{parcelsLabel}</td>
                          <td className="px-3 py-2 text-slate-700">{details}</td>
                          <td className="px-3 py-2">
                            {focusFeature ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelected({ id: focusFeature.id })
                                  zoomToFeature(focusFeature)
                                }}
                              >
                                Focus
                              </Button>
                            ) : focusA || focusB ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const features = [focusA, focusB].filter(Boolean)
                                  if (features.length === 0) return
                                  setSelected({ id: features[0].id })
                                  zoomToFeatures(features)
                                }}
                              >
                                Focus
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}
