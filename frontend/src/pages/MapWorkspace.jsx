import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Badge } from '../components/Badge'

const KIGALI_CENTER = [-1.944, 30.061] // lat, lon

function DatasetRow({ active, d, onSelect }) {
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
          <div className="mt-1 truncate text-xs text-slate-600">{d.originalFilename}</div>
        </div>
        <Badge tone="blue">{d.type}</Badge>
      </div>
    </button>
  )
}

export function MapWorkspacePage() {
  const qc = useQueryClient()
  const { projectId } = useProject()

  const [datasetId, setDatasetId] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState('CADASTRAL')
  const [uploadFile, setUploadFile] = useState(null)

  const datasetsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['datasets', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/datasets`)).data,
  })

  const datasets = datasetsQuery.data || []

  const selectedDatasetId = useMemo(() => {
    if (!projectId) return ''
    if (datasetId) return datasetId
    return datasets[0]?.id || ''
  }, [projectId, datasetId, datasets])

  const datasetGeoJsonQuery = useQuery({
    enabled: !!selectedDatasetId,
    queryKey: ['dataset-geojson', selectedDatasetId],
    queryFn: async () => {
      const res = await api.get(`/api/datasets/${selectedDatasetId}/download`, { responseType: 'text' })
      return JSON.parse(res.data)
    },
  })

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const latestRunId = runsQuery.data?.[0]?.id

  const runDetailQuery = useQuery({
    enabled: !!latestRunId,
    queryKey: ['subdivision-run-detail', latestRunId],
    queryFn: async () => (await api.get(`/api/subdivisions/${latestRunId}`)).data,
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

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.set('name', uploadName || uploadFile?.name || 'Dataset')
      fd.set('type', uploadType)
      fd.set('file', uploadFile)
      const res = await api.post(`/api/projects/${projectId}/datasets/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['datasets', projectId] })
      setDatasetId(saved.id)
      setUploadFile(null)
      setUploadName('')
    },
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">
            Use the “Active Project” selector in the top bar, or create a project first.
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
                  <option value="UPI">UPI</option>
                  <option value="SURVEY">SURVEY</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">GeoJSON file</label>
                <input
                  type="file"
                  accept=".json,.geojson,application/geo+json,application/json"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <div className="mt-1 text-xs text-slate-500">Tip: upload a FeatureCollection with a Polygon boundary.</div>
              </div>
              <Button
                className="w-full"
                disabled={!uploadFile || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
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
              {datasetsQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
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
          <Card className="h-[70vh] overflow-hidden sm:h-[75vh]">
            <MapContainer center={KIGALI_CENTER} zoom={12} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {datasetGeoJsonQuery.data ? <GeoJSON data={datasetGeoJsonQuery.data} style={{ color: '#0f172a' }} /> : null}
              {subdivisionGeojson ? <GeoJSON data={subdivisionGeojson} style={{ color: '#4f46e5' }} /> : null}
            </MapContainer>
          </Card>

          <div className="mt-3 text-xs text-slate-500">
            Showing dataset (dark) and latest subdivision output (indigo) when available.
          </div>
        </div>
      </div>
    </div>
  )
}

