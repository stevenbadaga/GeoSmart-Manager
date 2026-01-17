import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Badge } from '../components/Badge'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const KIGALI_CENTER = [-1.944, 30.061]

const schema = z.object({
  targetParcels: z.coerce.number().int().min(2).max(50),
  minParcelArea: z.coerce.number().min(1),
})

function statusTone(status) {
  if (status === 'COMPLETED') return 'green'
  if (status === 'FAILED') return 'red'
  if (status === 'RUNNING') return 'amber'
  return 'slate'
}

export function SubdivisionPage() {
  const qc = useQueryClient()
  const { projectId } = useProject()
  const [runId, setRunId] = useState('')

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const runs = runsQuery.data || []
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

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { targetParcels: 4, minParcelArea: 200 },
  })

  const runMutation = useMutation({
    mutationFn: async (values) => {
      return (await api.post(`/api/projects/${projectId}/subdivisions/run`, values)).data
    },
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['subdivision-runs', projectId] })
      setRunId(saved.id)
    },
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
          Generate an automated subdivision proposal (prototype: equal-width parcels within the uploaded boundary bbox).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="p-5">
            <div className="text-sm font-semibold text-slate-900">Run settings</div>
            <form className="mt-4 space-y-3" onSubmit={form.handleSubmit((v) => runMutation.mutate(v))}>
              <div>
                <label className="text-sm font-medium text-slate-700">Target parcels</label>
                <Input type="number" min={2} max={50} {...form.register('targetParcels')} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Minimum parcel area (sqm)</label>
                <Input type="number" min={1} step="1" {...form.register('minParcelArea')} />
              </div>
              {runMutation.isError ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {runMutation.error?.response?.data?.message ||
                    'Failed to run. Make sure you uploaded a cadastral GeoJSON first.'}
                </div>
              ) : null}
              <Button className="w-full" type="submit" disabled={runMutation.isPending}>
                {runMutation.isPending ? 'Running…' : 'Run subdivision'}
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Runs</div>
              <div className="text-xs text-slate-500">{runs.length}</div>
            </div>
            <div className="mt-4 space-y-2">
              {runsQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
              {runsQuery.isError ? <div className="text-sm text-rose-600">Failed to load runs.</div> : null}
              {!runsQuery.isLoading && runs.length === 0 ? (
                <div className="text-sm text-slate-600">No runs yet.</div>
              ) : null}
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
          <Card className="h-[70vh] overflow-hidden sm:h-[75vh]">
            <MapContainer center={KIGALI_CENTER} zoom={12} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {resultGeojson ? <GeoJSON data={resultGeojson} style={{ color: '#4f46e5' }} /> : null}
            </MapContainer>
          </Card>
          <Card className="mt-4 p-5">
            <div className="text-sm font-semibold text-slate-900">Result</div>
            <div className="mt-2 text-sm text-slate-700">
              {runDetailQuery.isLoading ? 'Loading…' : null}
              {!runDetailQuery.isLoading && !resultGeojson ? 'No result yet.' : null}
            </div>
            {resultGeojson?.features ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Parcel</th>
                      <th className="px-3 py-2">Area (sqm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {resultGeojson.features.map((f, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-3 py-2 text-slate-900">{f?.properties?.parcelNo ?? idx + 1}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {typeof f?.properties?.areaSqm === 'number' ? f.properties.areaSqm.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
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

