import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/Card'
import Button from '../components/Button'
import MiniMap from '../components/MiniMap'
import { api } from '../api/http'

const icons = {
  projects: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16v11H4z" />
      <path d="M9 7V5h6v2" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2-3 5-4 8-4s6 1 8 4" />
    </svg>
  ),
  alerts: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l9 16H3L12 3z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  storage: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  )
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB'
  const units = ['MB', 'GB', 'TB']
  let size = bytes / (1024 * 1024)
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

function formatRelativeTime(value) {
  if (!value) return '--'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return '--'
  const diffMs = Date.now() - time
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
}

function formatEventTitle(event) {
  if (!event) return 'System activity recorded'
  const entity = event.entityType ? event.entityType.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Entity'
  return `${event.action} ${entity}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    totalUsers: 0,
    activeUsers: 0,
    complianceAlerts: 0,
    complianceCritical: 0,
    workflowBacklog: 0,
    workflowTotal: 0,
    storageUsedBytes: 0,
    storagePercent: 0,
    projectsCreatedThisMonth: 0,
    usersCreatedToday: 0,
    serverLoadPercent: 0,
    apiLatencyMs: 0
  })
  const [metricsLoaded, setMetricsLoaded] = useState(false)
  const [metricsError, setMetricsError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [events, setEvents] = useState([])

  const metricCards = useMemo(() => ([
    {
      key: 'projects',
      title: 'Total Projects',
      value: metricsLoaded ? metrics.totalProjects : '--',
      meta: metricsLoaded ? `${metrics.projectsCreatedThisMonth} new this month` : 'Loading live data...',
      metaTone: 'text-success',
      icon: icons.projects
    },
    {
      key: 'users',
      title: 'Total Users',
      value: metricsLoaded ? metrics.totalUsers : '--',
      meta: metricsLoaded ? `${metrics.activeUsers} currently active` : 'Loading live data...',
      metaTone: 'text-success',
      icon: icons.users
    },
    {
      key: 'alerts',
      title: 'Compliance Alerts',
      value: metricsLoaded ? metrics.complianceAlerts : '--',
      meta: metricsLoaded ? `${metrics.complianceCritical} critical issues` : 'Loading live data...',
      metaTone: metrics.complianceCritical > 0 ? 'text-danger' : 'text-success',
      icon: icons.alerts
    },
    {
      key: 'storage',
      title: 'Data Storage',
      value: metricsLoaded ? formatBytes(metrics.storageUsedBytes) : '--',
      meta: metricsLoaded ? `${formatPercent(metrics.storagePercent)} of capacity` : 'Loading live data...',
      metaTone: 'text-success',
      icon: icons.storage
    }
  ]), [metrics, metricsLoaded])

  useEffect(() => {
    let active = true
    let refreshing = false

    const loadMetrics = async () => {
      try {
        const data = await api.get('/api/metrics/overview')
        if (!active) return
        let totalUsers = Number.isFinite(data?.totalUsers) ? data.totalUsers : null
        if (totalUsers === null && user?.role === 'ADMIN') {
          try {
            const users = await api.get('/api/users')
            if (Array.isArray(users)) {
              totalUsers = users.length
            }
          } catch {
            // ignore
          }
        }
        if (totalUsers === null) {
          totalUsers = Number.isFinite(data?.activeUsers) ? data.activeUsers : 0
        }

        setMetrics((current) => ({ ...current, ...data, totalUsers }))
        setMetricsLoaded(true)
        setMetricsError('')
        setLastUpdated(new Date())
      } catch (error) {
        if (!active) return
        setMetricsError(error?.message || 'Unable to load live dashboard metrics.')
      }
    }

    const loadEvents = async () => {
      if (user?.role !== 'ADMIN') return
      try {
        const data = await api.get('/api/audit')
        if (!active) return
        setEvents((data || []).slice(0, 4))
      } catch {
        // ignore
      }
    }

    const measureLatency = async () => {
      const start = performance.now()
      try {
        await api.get('/api/health')
        if (!active) return
        const latency = Math.round(performance.now() - start)
        setMetrics((current) => ({ ...current, apiLatencyMs: latency }))
      } catch {
        // ignore
      }
    }

    const refreshDashboard = async () => {
      if (!active || refreshing) return
      refreshing = true
      try {
        await Promise.all([loadMetrics(), loadEvents(), measureLatency()])
      } finally {
        refreshing = false
      }
    }

    refreshDashboard()
    const interval = setInterval(refreshDashboard, 15000)

    const handleFocus = () => {
      refreshDashboard()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshDashboard()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.role])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">System Overview</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Operational Snapshot</h1>
        <p className="text-sm text-ink/60">Monitor active geospatial programs, user activity, and compliance readiness.</p>
        {metricsError && (
          <p className="text-sm text-danger mt-2">{metricsError}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.key} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink/60">{card.title}</p>
              <div className="h-8 w-8 rounded-xl bg-sand border border-clay/70 flex items-center justify-center text-ink/60">
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-semibold text-ink mt-3">
              {card.value}
            </p>
            <p className={`text-xs mt-2 ${card.metaTone}`}>
              {card.meta}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5">
              <div>
                <h3 className="text-lg font-semibold">Live Geospatial Activity</h3>
                <p className="text-sm text-ink/60">Kigali city parcels and subdivision zones</p>
              </div>
              <Button variant="secondary" className="text-xs px-3 py-1" onClick={() => navigate('/map')}>
                View Full Map
              </Button>
            </div>
            <div className="relative mt-4 h-72">
              <MiniMap />
              <div className="absolute top-4 left-4 bg-white/90 border border-clay/70 rounded-xl px-3 py-2 text-xs text-ink/70">
                Kigali, Rwanda
              </div>
              <div className="absolute bottom-4 left-4 bg-white/90 border border-clay/70 rounded-xl px-3 py-2 text-xs text-ink/70 flex gap-3">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Active Survey</span>
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-danger" />Boundary Conflict</span>
              </div>
            </div>
          </Card>

          <Card title="Recent System Events">
            <div className="space-y-4 text-sm text-ink/80">
              {events.length === 0 && (
                <p className="text-sm text-ink/60">No recent system events available.</p>
              )}
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sand border border-clay/70 flex items-center justify-center text-ink/60">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M5 12l5 5L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{formatEventTitle(event)}</p>
                    <p className="text-xs text-ink/50">
                      {event.details || 'Activity recorded'} - {formatRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Quick Actions">
            <div className="space-y-3">
              {[
                { label: 'Add New User', icon: 'user', path: '/users' },
                { label: 'Generate Compliance Report', icon: 'shield', path: '/reports' },
                { label: 'System Configuration', icon: 'settings', path: '/account' }
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center justify-between gap-3 rounded-xl bg-sand border border-clay/70 px-4 py-3 text-sm font-semibold text-ink/80 hover:bg-white/90 transition"
                  onClick={() => navigate(action.path)}
                >
                  <span className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-lg bg-white border border-clay/70 flex items-center justify-center text-ink/60">
                      {action.icon === 'user' && (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c2-3 5-4 8-4s6 1 8 4" />
                        </svg>
                      )}
                      {action.icon === 'shield' && (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3z" />
                        </svg>
                      )}
                      {action.icon === 'settings' && (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
                          <path d="M4 12l2-1 1-2-1-2 1-2 2-1 2 1 2-1 2 1 2-1 2 1-1 2 1 2-1 2-2 1-2-1-2 1-2-1-2 1-1-2-2-1z" />
                        </svg>
                      )}
                    </span>
                    {action.label}
                  </span>
                  <span className="text-ink/40">{'>'}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="System Health">
            <div className="space-y-4 text-sm text-ink/70">
              <div>
                <div className="flex items-center justify-between">
                  <span>Server Load</span>
                  <span className="font-semibold text-ink">{formatPercent(metrics.serverLoadPercent)}</span>
                </div>
                <div className="h-2 rounded-full bg-sand mt-2">
                  <div className="h-2 rounded-full bg-success" style={{ width: formatPercent(metrics.serverLoadPercent) }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span>Database Storage</span>
                  <span className="font-semibold text-ink">{formatPercent(metrics.storagePercent)}</span>
                </div>
                <div className="h-2 rounded-full bg-sand mt-2">
                  <div className="h-2 rounded-full bg-warning" style={{ width: formatPercent(metrics.storagePercent) }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span>API Latency</span>
                  <span className="font-semibold text-ink">{metrics.apiLatencyMs}ms</span>
                </div>
                <div className="h-2 rounded-full bg-sand mt-2">
                  <div className="h-2 rounded-full bg-water" style={{ width: `${Math.min(100, (metrics.apiLatencyMs / 200) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span>Workflow Backlog</span>
                  <span className="font-semibold text-ink">
                    {metrics.workflowBacklog}/{metrics.workflowTotal}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-sand mt-2">
                  <div
                    className="h-2 rounded-full bg-river"
                    style={{
                      width: `${metrics.workflowTotal > 0 ? Math.min(100, (metrics.workflowBacklog / metrics.workflowTotal) * 100) : 0}%`
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-ink/50">
                <span>Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Just now'}</span>
                <span className="px-2 py-1 rounded-full bg-success/10 text-success">Operational</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
