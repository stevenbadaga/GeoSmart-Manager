import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { useToast } from '../components/ToastProvider'

const OFFLINE_QUEUE_KEY = 'geosmart.offlineObservations.v1'

function readOfflineQueue() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeOfflineQueue(items) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items || []))
  } catch {
    // ignore
  }
}

function statusTone(status) {
  if (status === 'OK') return 'green'
  if (status === 'DUE') return 'amber'
  if (status === 'OUT_OF_SERVICE') return 'red'
  return 'slate'
}

async function openBlob(url, filename) {
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

export function FieldPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { projectId } = useProject()

  const [view, setView] = useState('observations')
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [offlineQueue, setOfflineQueue] = useState(() => readOfflineQueue())

  const [obsDraft, setObsDraft] = useState({
    title: '',
    latitude: '',
    longitude: '',
    altitudeM: '',
    accuracyM: '',
    notes: '',
    observedAt: '',
  })
  const [photoFile, setPhotoFile] = useState(null)

  const [equipDraft, setEquipDraft] = useState({
    equipmentName: '',
    serialNumber: '',
    calibrationDate: '',
    status: 'OK',
    notes: '',
  })

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    writeOfflineQueue(offlineQueue)
  }, [offlineQueue])

  const observationsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['field-observations', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/field/observations`)).data,
  })

  const observations = useMemo(() => observationsQuery.data ?? [], [observationsQuery.data])

  const equipmentQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['field-equipment', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/field/equipment`)).data,
  })

  const equipmentLogs = useMemo(() => equipmentQuery.data ?? [], [equipmentQuery.data])

  const createObservationMutation = useMutation({
    mutationFn: async ({ payload, photo }) => {
      const created = (await api.post(`/api/projects/${projectId}/field/observations`, payload)).data
      if (photo) {
        const form = new FormData()
        form.set('file', photo)
        return (await api.post(`/api/projects/${projectId}/field/observations/${created.id}/photo`, form)).data
      }
      return created
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['field-observations', projectId] })
      toast.success('Saved', 'Field observation created.')
      setObsDraft({ title: '', latitude: '', longitude: '', altitudeM: '', accuracyM: '', notes: '', observedAt: '' })
      setPhotoFile(null)
    },
    onError: (e) => toast.error('Save failed', e?.response?.data?.message || 'Unable to create observation.'),
  })

  const syncOfflineMutation = useMutation({
    mutationFn: async () => {
      const items = [...offlineQueue]
      for (const it of items) {
        await api.post(`/api/projects/${projectId}/field/observations`, {
          title: it.title || null,
          latitude: it.latitude,
          longitude: it.longitude,
          altitudeM: it.altitudeM == null ? null : it.altitudeM,
          accuracyM: it.accuracyM == null ? null : it.accuracyM,
          observedAt: it.observedAt || null,
          notes: it.notes || null,
        })
      }
      return items.length
    },
    onSuccess: async (count) => {
      setOfflineQueue([])
      await qc.invalidateQueries({ queryKey: ['field-observations', projectId] })
      toast.success('Synced', `Uploaded ${count} offline observation(s).`)
    },
    onError: (e) => toast.error('Sync failed', e?.response?.data?.message || 'Unable to sync offline items.'),
  })

  const createEquipmentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        equipmentName: equipDraft.equipmentName,
        serialNumber: equipDraft.serialNumber || null,
        calibrationDate: equipDraft.calibrationDate ? equipDraft.calibrationDate : null,
        status: equipDraft.status,
        notes: equipDraft.notes || null,
      }
      return (await api.post(`/api/projects/${projectId}/field/equipment`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['field-equipment', projectId] })
      toast.success('Saved', 'Equipment log created.')
      setEquipDraft({ equipmentName: '', serialNumber: '', calibrationDate: '', status: 'OK', notes: '' })
    },
    onError: (e) => toast.error('Save failed', e?.response?.data?.message || 'Unable to create equipment log.'),
  })

  async function useGps() {
    if (!navigator.geolocation) {
      toast.error('GPS unavailable', 'This browser/device does not support geolocation.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const acc = pos.coords.accuracy
        setObsDraft((p) => ({
          ...p,
          latitude: String(lat),
          longitude: String(lon),
          accuracyM: p.accuracyM || (Number.isFinite(acc) ? String(Math.round(acc)) : ''),
        }))
        toast.success('GPS captured', 'Location added to the form.')
      },
      (err) => {
        toast.error('GPS error', err?.message || 'Unable to fetch current location.')
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function queueOffline() {
    const latitude = Number(obsDraft.latitude)
    const longitude = Number(obsDraft.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error('Missing coordinates', 'Latitude and longitude are required.')
      return
    }
    const item = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: obsDraft.title || '',
      latitude,
      longitude,
      altitudeM: obsDraft.altitudeM === '' ? null : Number(obsDraft.altitudeM),
      accuracyM: obsDraft.accuracyM === '' ? null : Number(obsDraft.accuracyM),
      observedAt: obsDraft.observedAt ? new Date(obsDraft.observedAt).toISOString() : new Date().toISOString(),
      notes: obsDraft.notes || '',
      createdAt: new Date().toISOString(),
    }
    setOfflineQueue((q) => [item, ...q])
    setObsDraft({ title: '', latitude: '', longitude: '', altitudeM: '', accuracyM: '', notes: '', observedAt: '' })
    setPhotoFile(null)
    toast.success('Saved offline', 'Observation queued. Sync when back online.')
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to capture field data.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Field Survey & Mobile</h1>
          <p className="mt-1 text-sm text-slate-600">Capture GPS-based field observations, photos, and equipment logs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isOnline ? 'green' : 'amber'}>{isOnline ? 'Online' : 'Offline'}</Badge>
          {offlineQueue.length > 0 ? <Badge tone="slate">Queued: {offlineQueue.length}</Badge> : null}
          <div className="flex gap-2">
            <Button variant={view === 'observations' ? 'secondary' : 'outline'} onClick={() => setView('observations')}>
              Observations
            </Button>
            <Button variant={view === 'equipment' ? 'secondary' : 'outline'} onClick={() => setView('equipment')}>
              Equipment
            </Button>
          </div>
        </div>
      </div>

      {view === 'observations' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">New observation</div>
                <div className="mt-1 text-sm text-slate-600">Mobile-friendly form with GPS fill and optional photo attachment.</div>
              </div>
              <Button variant="outline" size="sm" onClick={useGps}>
                Use GPS
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <Input value={obsDraft.title} onChange={(e) => setObsDraft((p) => ({ ...p, title: e.target.value }))} placeholder="e.g., Corner point A" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Latitude</label>
                <Input value={obsDraft.latitude} onChange={(e) => setObsDraft((p) => ({ ...p, latitude: e.target.value }))} placeholder="-1.944" inputMode="decimal" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Longitude</label>
                <Input value={obsDraft.longitude} onChange={(e) => setObsDraft((p) => ({ ...p, longitude: e.target.value }))} placeholder="30.061" inputMode="decimal" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Altitude (m)</label>
                <Input value={obsDraft.altitudeM} onChange={(e) => setObsDraft((p) => ({ ...p, altitudeM: e.target.value }))} placeholder="(optional)" inputMode="decimal" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Accuracy (m)</label>
                <Input value={obsDraft.accuracyM} onChange={(e) => setObsDraft((p) => ({ ...p, accuracyM: e.target.value }))} placeholder="(optional)" inputMode="decimal" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Observed at</label>
                <Input type="datetime-local" value={obsDraft.observedAt} onChange={(e) => setObsDraft((p) => ({ ...p, observedAt: e.target.value }))} />
                <div className="mt-1 text-xs text-slate-500">Leave empty to use the current time.</div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={obsDraft.notes}
                  onChange={(e) => setObsDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Field notes…"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Photo (optional)</label>
                <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                {!isOnline && photoFile ? (
                  <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Photos can’t be queued offline in the web prototype. Save the observation offline, then attach the photo when back online.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {!isOnline ? (
                <Button variant="outline" onClick={queueOffline} disabled={createObservationMutation.isPending}>
                  Save offline
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const latitude = Number(obsDraft.latitude)
                    const longitude = Number(obsDraft.longitude)
                    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                      toast.error('Missing coordinates', 'Latitude and longitude are required.')
                      return
                    }
                    const payload = {
                      title: obsDraft.title || null,
                      latitude,
                      longitude,
                      altitudeM: obsDraft.altitudeM === '' ? null : Number(obsDraft.altitudeM),
                      accuracyM: obsDraft.accuracyM === '' ? null : Number(obsDraft.accuracyM),
                      observedAt: obsDraft.observedAt ? new Date(obsDraft.observedAt).toISOString() : null,
                      notes: obsDraft.notes || null,
                    }
                    createObservationMutation.mutate({ payload, photo: photoFile || null })
                  }}
                  disabled={createObservationMutation.isPending}
                >
                  {createObservationMutation.isPending ? 'Saving…' : 'Save observation'}
                </Button>
              )}

              {isOnline && offlineQueue.length > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => syncOfflineMutation.mutate()}
                  disabled={syncOfflineMutation.isPending || offlineQueue.length === 0}
                >
                  {syncOfflineMutation.isPending ? 'Syncing…' : 'Sync offline queue'}
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Observations</div>
                <div className="mt-1 text-sm text-slate-600">Latest field records for this project.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => observationsQuery.refetch()} disabled={observationsQuery.isFetching}>
                Refresh
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {observationsQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
              {observationsQuery.isError ? <div className="text-sm text-rose-600">Failed to load observations.</div> : null}
              {!observationsQuery.isLoading && observations.length === 0 ? <div className="text-sm text-slate-600">No observations yet.</div> : null}

              {observations.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{o.title || 'Untitled observation'}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {o.latitude.toFixed(6)}, {o.longitude.toFixed(6)}
                        {o.accuracyM != null ? ` · ±${Math.round(o.accuracyM)}m` : ''}
                        {o.altitudeM != null ? ` · ${o.altitudeM.toFixed(1)}m` : ''}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {o.observedAt ? `Observed: ${new Date(o.observedAt).toLocaleString()}` : ''}
                        {o.createdAt ? ` · Saved: ${new Date(o.createdAt).toLocaleString()}` : ''}
                      </div>
                      {o.notes ? <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{o.notes}</div> : null}
                      <div className="mt-2 text-xs text-slate-500">{o.createdByUsername ? `By ${o.createdByUsername}` : ''}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {o.hasPhoto ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await openBlob(`/api/projects/${projectId}/field/observations/${o.id}/photo`, `observation-${o.id}.jpg`)
                            } catch {
                              toast.error('Download failed', 'Unable to download photo.')
                            }
                          }}
                        >
                          Photo
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {offlineQueue.length > 0 ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Offline queue</div>
                    <div className="mt-1 text-xs text-slate-600">Stored locally on this device until synced.</div>
                  </div>
                  <Badge tone="slate">{offlineQueue.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {offlineQueue.slice(0, 5).map((it) => (
                    <div key={it.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{it.title || 'Untitled observation'}</div>
                      <div className="text-xs text-slate-600">
                        {Number(it.latitude).toFixed(6)}, {Number(it.longitude).toFixed(6)}
                      </div>
                    </div>
                  ))}
                  {offlineQueue.length > 5 ? <div className="text-xs text-slate-500">…and {offlineQueue.length - 5} more</div> : null}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="text-sm font-semibold text-slate-900">Equipment calibration log</div>
            <div className="mt-1 text-sm text-slate-600">Track field equipment calibration and status.</div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Equipment name</label>
                <Input value={equipDraft.equipmentName} onChange={(e) => setEquipDraft((p) => ({ ...p, equipmentName: e.target.value }))} placeholder="e.g., RTK GPS Rover" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Serial number</label>
                <Input value={equipDraft.serialNumber} onChange={(e) => setEquipDraft((p) => ({ ...p, serialNumber: e.target.value }))} placeholder="(optional)" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Calibration date</label>
                <Input type="date" value={equipDraft.calibrationDate} onChange={(e) => setEquipDraft((p) => ({ ...p, calibrationDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={equipDraft.status}
                  onChange={(e) => setEquipDraft((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="OK">OK</option>
                  <option value="DUE">DUE</option>
                  <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={equipDraft.notes}
                  onChange={(e) => setEquipDraft((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Calibration notes…"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => createEquipmentMutation.mutate()} disabled={createEquipmentMutation.isPending}>
                {createEquipmentMutation.isPending ? 'Saving…' : 'Save log'}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Equipment logs</div>
                <div className="mt-1 text-sm text-slate-600">Latest equipment entries for this project.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => equipmentQuery.refetch()} disabled={equipmentQuery.isFetching}>
                Refresh
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {equipmentQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
              {equipmentQuery.isError ? <div className="text-sm text-rose-600">Failed to load equipment logs.</div> : null}
              {!equipmentQuery.isLoading && equipmentLogs.length === 0 ? <div className="text-sm text-slate-600">No equipment logs yet.</div> : null}

              {equipmentLogs.map((e) => (
                <div key={e.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{e.equipmentName}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {e.serialNumber ? `SN ${e.serialNumber}` : ''}
                        {e.calibrationDate ? ` · Calibrated: ${e.calibrationDate}` : ''}
                      </div>
                      {e.notes ? <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{e.notes}</div> : null}
                      <div className="mt-2 text-xs text-slate-500">{e.createdByUsername ? `By ${e.createdByUsername}` : ''}</div>
                    </div>
                    <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

