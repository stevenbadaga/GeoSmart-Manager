import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import MiniMap from '../components/MiniMap'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

const workflowSteps = [
  { title: 'Search Parcel', detail: 'Find parent parcel by UPI and load cadastral geometry.' },
  { title: 'Read Zoning', detail: 'Intersect the parcel with Kigali Masterplan zones.' },
  { title: 'Generate Plots', detail: 'Draw, upload, or generate proposed subdivision polygons.' },
  { title: 'Run Checks', detail: 'Validate area, overlaps, buildings, constraints, slope, and land use.' },
  { title: 'Export Report', detail: 'Download PDF with layout, measurements, recommendation, and disclaimer.' }
]

const quickActions = [
  { label: 'Start New Subdivision Check', detail: 'Search UPI and run preliminary checks', path: '/subdivision', primary: true, roles: ['ADMIN', 'SURVEYOR'] },
  { label: 'Create Project', detail: 'Open a planning case file', path: '/projects', roles: ['ADMIN', 'SURVEYOR'] },
  { label: 'View GIS Layers', detail: 'Check parcels, zoning, DEM, and constraints', path: '/datasets', roles: ['ADMIN', 'SURVEYOR'] },
  { label: 'Open Reports', detail: 'Review generated report outputs', path: '/reports', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { label: 'Upload Document', detail: 'Store reference documents for a project', path: '/documents', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { label: 'Data Limitations', detail: 'Review missing data warnings', path: '/data-limitations', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] }
]

const demoParcels = [
  { upi: '1/01/08/02/941', zone: 'R1A', note: 'Good residential demo parcel' },
  { upi: '1/01/08/01/706', zone: 'R2', note: 'Lot-size rule demo parcel' },
  { upi: '1/01/05/04/3041', zone: 'A1 / P3C', note: 'Constraint and slope warning demo' }
]

function formatNumber(value) {
  if (!Number.isFinite(value)) return '0'
  return Math.round(value).toLocaleString()
}

function statusTone(loaded) {
  return loaded ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
}

function layerLabel(layerKey) {
  return layerKey
    ?.replaceAll('_', ' ')
    ?.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'GIS Layer'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [layerStatus, setLayerStatus] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')
      try {
        const [layers, metricData] = await Promise.all([
          api.get('/api/layers/status'),
          api.get('/api/metrics/overview').catch(() => null)
        ])
        if (!active) return
        setLayerStatus(Array.isArray(layers) ? layers : [])
        setMetrics(metricData)
        setLastUpdated(new Date())
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [])

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

  const importantLayers = useMemo(() => {
    const wanted = ['PARCELS', 'ZONING', 'BUILDING_FOOTPRINTS', 'CONSTRAINTS', 'DEM']
    return wanted.map((key) => {
      const exact = layerStatus.find((layer) => layer.layerKey === key)
      const fuzzy = layerStatus.find((layer) => layer.layerKey?.includes(key))
      return exact || fuzzy || { layerKey: key, loadedSuccessfully: false, featureCount: 0, notes: 'Layer not found in status report.' }
    })
  }, [layerStatus])

  const readinessScore = layerStatus.length
    ? Math.round((loadedLayers.length / layerStatus.length) * 100)
    : 0
  const role = user?.role || 'CLIENT'
  const visibleQuickActions = quickActions.filter((action) => !action.roles || action.roles.includes(role))

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-[#124E44]/20 bg-white shadow-[0_28px_70px_-52px_rgba(15,23,42,0.85)]">
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative overflow-hidden bg-[#123E36] p-6 text-white sm:p-8">
            <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#E8C46A]/18 blur-2xl" />
            <div className="absolute bottom-0 right-0 h-28 w-52 rounded-tl-full bg-white/8" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#E8C46A]">GeoSmart Manager</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Kigali Subdivision Planning Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                Monitor real GIS data readiness, launch parcel subdivision checks, and export preliminary zoning compliance reports with measured plot layouts.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" className="bg-[#E8C46A] text-[#123E36] hover:bg-[#f0d783]" onClick={() => navigate('/subdivision')}>
                  Start Subdivision Check
                </Button>
                <Button type="button" variant="secondary" className="border-white/25 bg-white/10 text-white hover:bg-white/15" onClick={() => navigate('/datasets')}>
                  View GIS Layer Status
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-[#F6F1E7] p-6 sm:p-8">
            <div className="rounded-[1.5rem] border border-[#124E44]/15 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.65)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#124E44]/65">Data Readiness</p>
              <div className="mt-4 flex items-end gap-3">
                <p className="text-5xl font-black tracking-[-0.05em] text-[#123E36]">{readinessScore}%</p>
                <p className="pb-2 text-sm font-semibold text-ink/58">loaded successfully</p>
              </div>
              <div className="mt-4 h-3 rounded-full bg-[#E6DDCD]">
                <div className="h-3 rounded-full bg-[#124E44]" style={{ width: `${readinessScore}%` }} />
              </div>
              <p className="mt-3 text-sm text-ink/62">
                {loadedLayers.length} of {layerStatus.length || 0} GIS layers ready
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#124E44]/8 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#124E44]/60">Features</p>
                  <p className="mt-1 text-xl font-black text-[#123E36]">{formatNumber(totalFeatures)}</p>
                </div>
                <div className="rounded-2xl bg-[#BC4749]/8 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#BC4749]/70">Alerts</p>
                  <p className="mt-1 text-xl font-black text-[#7A1F20]">{failedLayers.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <Card className="border border-danger/30 bg-danger/5 text-sm text-danger">{error}</Card>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40">GIS Layers</p>
          <p className="mt-3 text-3xl font-black text-ink">{loading ? '--' : loadedLayers.length}</p>
          <p className="mt-2 text-sm text-ink/55">Loaded and queryable layers</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40">Features</p>
          <p className="mt-3 text-3xl font-black text-ink">{loading ? '--' : formatNumber(totalFeatures)}</p>
          <p className="mt-2 text-sm text-ink/55">Total GIS records in cache</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40">Alerts</p>
          <p className="mt-3 text-3xl font-black text-ink">{loading ? '--' : failedLayers.length}</p>
          <p className="mt-2 text-sm text-ink/55">Missing or unreadable layers</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/40">Total Projects</p>
          <p className="mt-3 text-3xl font-black text-ink">{metrics?.totalProjects ?? '--'}</p>
          <p className="mt-2 text-sm text-ink/55">Planning case files</p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5">
            <div>
              <h2 className="text-lg font-bold text-ink">Kigali GIS Workspace</h2>
              <p className="mt-1 text-sm text-ink/58">Use the map workspace for layer inspection and manual subdivision sketches.</p>
            </div>
            <Button variant="secondary" className="text-xs" onClick={() => navigate('/map')}>Open Map</Button>
          </div>
          <div className="relative mt-4 h-80">
            <MiniMap />
            <div className="absolute left-4 top-4 rounded-2xl border border-clay/70 bg-white/90 px-3 py-2 text-xs font-semibold text-ink/70">
              Kigali, Rwanda
            </div>
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-2xl border border-clay/70 bg-white/90 px-3 py-2 text-xs text-ink/65">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#1F6F5F]" />Parcels</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#8B5E34]" />Zoning</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#BC4749]" />Constraints</span>
            </div>
          </div>
        </Card>

        <Card title="Subdivision Workflow">
          <div className="space-y-3">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-2xl border border-clay/60 bg-white/70 p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#124E44] text-xs font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-bold text-ink">{step.title}</p>
                  <p className="mt-1 text-sm leading-5 text-ink/58">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Critical GIS Layers">
          <div className="grid gap-3 sm:grid-cols-2">
            {importantLayers.map((layer) => (
              <div key={layer.layerKey} className="rounded-2xl border border-clay/60 bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{layerLabel(layer.layerKey)}</p>
                    <p className="mt-1 text-xs text-ink/50">{formatNumber(Number(layer.featureCount) || 0)} features</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusTone(layer.loadedSuccessfully)}`}>
                    {layer.loadedSuccessfully ? 'READY' : 'CHECK'}
                  </span>
                </div>
                {layer.notes && <p className="mt-3 text-xs leading-5 text-ink/55">{layer.notes}</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleQuickActions.map((action) => (
              <button
                key={action.label}
                className={`rounded-2xl border p-4 text-left transition ${
                  action.primary
                    ? 'border-[#124E44] bg-[#124E44] text-white shadow-[0_18px_34px_-24px_rgba(18,78,68,0.9)]'
                    : 'border-clay/60 bg-white/70 text-ink hover:bg-white'
                }`}
                onClick={() => navigate(action.path)}
              >
                <p className="font-bold">{action.label}</p>
                <p className={`mt-1 text-sm leading-5 ${action.primary ? 'text-white/65' : 'text-ink/55'}`}>{action.detail}</p>
              </button>
            ))}
          </div>
        </Card>
      </section>

      <Card title="Recommended Test Parcels">
        <div className="grid gap-3 md:grid-cols-3">
          {demoParcels.map((parcel) => (
            <button
              key={parcel.upi}
              className="rounded-2xl border border-clay/60 bg-white/70 p-4 text-left transition hover:border-[#124E44]/40 hover:bg-white"
              onClick={() => navigate('/subdivision')}
            >
              <p className="font-mono text-sm font-black text-ink">{parcel.upi}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#124E44]">{parcel.zone}</p>
              <p className="mt-2 text-sm leading-5 text-ink/58">{parcel.note}</p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink/50">
          Last dashboard refresh: {lastUpdated ? lastUpdated.toLocaleString() : 'not loaded yet'}
        </p>
      </Card>
    </div>
  )
}
