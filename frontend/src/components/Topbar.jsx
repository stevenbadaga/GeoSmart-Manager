import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/http'
import Button from './Button'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [metrics, setMetrics] = useState({ complianceCritical: 0, serverLoadPercent: 0, storagePercent: 0 })
  const [events, setEvents] = useState([])
  const containerRef = useRef(null)

  useEffect(() => {
    const onClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSearch(false)
        setShowNotifications(false)
        setShowHelp(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    let active = true
    api.get('/api/metrics/overview')
      .then((data) => active && setMetrics((current) => ({ ...current, ...data })))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    if (!showNotifications) return () => {}
    if (user?.role !== 'ADMIN') {
      setEvents([])
      return () => {}
    }
    api.get('/api/audit')
      .then((data) => {
        if (!active) return
        setEvents((data || []).slice(0, 5))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [showNotifications, user?.role])

  useEffect(() => {
    let active = true
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return () => {}
    }
    const timer = setTimeout(async () => {
      try {
        const requests = [api.get('/api/projects'), api.get('/api/clients')]
        if (user?.role === 'ADMIN') {
          requests.push(api.get('/api/users'))
        }
        const [projects, clients, users] = await Promise.all(requests)
        if (!active) return
        const lower = trimmed.toLowerCase()
        const mapped = []
        projects?.filter((project) =>
          [project.name, project.code, project.description].some((value) => value?.toLowerCase().includes(lower))
        ).slice(0, 4).forEach((project) => {
          mapped.push({ type: 'Project', label: project.name, sub: project.code, route: '/projects' })
        })
        clients?.filter((client) =>
          [client.name, client.contactEmail, client.address].some((value) => value?.toLowerCase().includes(lower))
        ).slice(0, 4).forEach((client) => {
          mapped.push({ type: 'Client', label: client.name, sub: client.address || client.contactEmail, route: '/clients' })
        })
        users?.filter((u) =>
          [u.fullName, u.email].some((value) => value?.toLowerCase().includes(lower))
        ).slice(0, 4).forEach((u) => {
          mapped.push({ type: 'User', label: u.fullName, sub: u.email, route: '/users' })
        })
        setResults(mapped)
      } catch {
        setResults([])
      }
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, user?.role])

  const notificationCount = useMemo(() => metrics.complianceCritical || 0, [metrics])

  const onSubmitSearch = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    const destination = results[0]?.route || '/projects'
    navigate(`${destination}?q=${encodeURIComponent(trimmed)}`)
    setShowSearch(false)
  }

  return (
    <header ref={containerRef} className="relative z-30 flex flex-col gap-4 px-6 py-4 border-b border-clay/70 bg-white/70 backdrop-blur">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs text-ink/50">Home / Admin Dashboard</p>
          <h2 className="text-xl font-semibold text-ink">Admin Dashboard</h2>
        </div>
        <div className="flex flex-1 md:justify-end gap-3 items-center">
          <div className="relative hidden lg:flex flex-col">
            <div className="flex items-center gap-2 bg-white/90 border border-clay/70 rounded-xl px-3 py-2 w-72">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink/50" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                className="bg-transparent text-sm text-ink/70 placeholder:text-ink/40 focus:outline-none w-full"
                placeholder="Search projects, clients..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setShowSearch(true)}
                onKeyDown={(event) => event.key === 'Enter' && onSubmitSearch()}
              />
            </div>
            {showSearch && query.trim().length > 0 && (
              <div className="absolute top-12 left-0 w-80 rounded-xl border border-clay/70 bg-white shadow-lg p-2 text-xs text-ink/70 z-20">
                {results.length === 0 && <p className="px-3 py-2">No matches. Press Enter to search.</p>}
                {results.map((item, index) => (
                  <button
                    key={`${item.type}-${item.label}-${index}`}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-sand"
                    onClick={() => {
                      navigate(`${item.route}?q=${encodeURIComponent(query.trim())}`)
                      setShowSearch(false)
                    }}
                  >
                    <p className="font-semibold text-ink">{item.label}</p>
                    <p className="text-[11px] text-ink/50">{item.type} - {item.sub || 'GeoSmart'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              className="h-9 w-9 rounded-xl border border-clay/70 bg-white/80 flex items-center justify-center text-ink/60"
              onClick={() => {
                setShowNotifications((open) => !open)
                setShowHelp(false)
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 22a2.5 2.5 0 002.5-2.5h-5A2.5 2.5 0 0012 22z" />
                <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" />
              </svg>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-danger text-white text-[10px] flex items-center justify-center px-1">
                  {notificationCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-72 rounded-xl border border-clay/70 bg-white shadow-lg p-3 text-xs text-ink/70 z-20">
                <p className="text-xs font-semibold text-ink/50 mb-2">Notifications</p>
                {events.length === 0 && <p>No recent alerts.</p>}
                {events.map((event) => (
                  <div key={event.id} className="mb-2 last:mb-0">
                    <p className="font-semibold text-ink">{event.action} {event.entityType}</p>
                    <p className="text-[11px] text-ink/50">{event.details || 'Activity logged'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              className="h-9 w-9 rounded-xl border border-clay/70 bg-white/80 flex items-center justify-center text-ink/60"
              onClick={() => {
                setShowHelp((open) => !open)
                setShowNotifications(false)
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </button>
            {showHelp && (
              <div className="absolute right-0 top-12 w-[320px] md:w-[360px] max-h-[70vh] overflow-y-auto rounded-xl border border-clay/70 bg-white shadow-xl p-3 text-xs text-ink/70 z-40">
                <p className="text-xs font-semibold text-ink/50 mb-2">Quick Help</p>
                <div className="space-y-2">
                  <div className="rounded-lg bg-sand/70 border border-clay/70 p-2">
                    <p className="font-semibold text-ink">1) Start a Project</p>
                    <p className="text-[11px] text-ink/60">
                      Go to Projects, click New Project, select a client, and save.
                    </p>
                  </div>
                  <div className="rounded-lg bg-sand/70 border border-clay/70 p-2">
                    <p className="font-semibold text-ink">2) Upload GeoData</p>
                    <p className="text-[11px] text-ink/60">
                      Open Geospatial Data, choose your project, paste GeoJSON, and save.
                    </p>
                  </div>
                  <div className="rounded-lg bg-sand/70 border border-clay/70 p-2">
                    <p className="font-semibold text-ink">3) Run AI Subdivision</p>
                    <p className="text-[11px] text-ink/60">
                      Select dataset, choose optimization mode, run, then review quality score.
                    </p>
                  </div>
                  <div className="rounded-lg bg-sand/70 border border-clay/70 p-2">
                    <p className="font-semibold text-ink">4) Check Compliance</p>
                    <p className="text-[11px] text-ink/60">
                      Use Compliance to validate parcel limits and Rwanda standards.
                    </p>
                  </div>
                  <div className="rounded-lg bg-sand/70 border border-clay/70 p-2">
                    <p className="font-semibold text-ink">5) Export Reports</p>
                    <p className="text-[11px] text-ink/60">
                      Reports page generates PDF summaries for clients and regulators.
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-clay/70 p-2">
                    <p className="font-semibold text-ink">Tips</p>
                    <p className="text-[11px] text-ink/60">
                      Search works across projects, clients, and users. Map Workspace helps visualize boundaries.
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-ink/50 mt-3">Need support? contact@venus.rw</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 bg-white/80 border border-clay/70 rounded-xl px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-sand border border-clay/70 flex items-center justify-center text-ink/60">
              {(user?.fullName || 'Admin').slice(0, 1)}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold">{user?.fullName || 'Survey Engineer'}</p>
              <p className="text-xs text-ink/60">{user?.role || 'ENGINEER'}</p>
            </div>
            <Button variant="secondary" className="px-3 py-1 text-xs" onClick={logout}>Logout</Button>
          </div>
        </div>
      </div>
    </header>
  )
}
