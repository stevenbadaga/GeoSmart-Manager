import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Button from './Button'

const coreLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/projects', label: 'Project Management', icon: 'briefcase' },
  { to: '/clients', label: 'Client Management', icon: 'building' },
  { to: '/map', label: 'Map Workspace', icon: 'map' },
]

const operationsLinks = [
  { to: '/datasets', label: 'Geospatial Data', icon: 'layers' },
  { to: '/workflow', label: 'Workflow', icon: 'check' },
  { to: '/reports', label: 'Reports & Analytics', icon: 'chart' },
]

const advancedLinks = [
  { to: '/subdivision', label: 'AI Subdivision', icon: 'sparkles' },
  { to: '/compliance', label: 'Compliance', icon: 'shield' },
  { to: '/rwanda-layers', label: 'Rwanda Layers', icon: 'globe' }
]

const adminLinks = [
  { to: '/users', label: 'User Management', icon: 'users' },
  { to: '/permissions', label: 'Role Permissions', icon: 'shield' },
  { to: '/audit', label: 'Audit Logs', icon: 'lock' }
]

const accountLinks = [
  { to: '/account', label: 'Account', icon: 'user' }
]

function filterLinks(links, query) {
  const value = query.trim().toLowerCase()
  if (!value) return links
  return links.filter((link) => link.label.toLowerCase().includes(value))
}

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M16 17c0-2.2-2-4-4-4s-4 1.8-4 4" />
      <circle cx="12" cy="8" r="3.5" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16v11H4z" />
      <path d="M9 7V5h6v2" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 20h16" />
      <path d="M6 20V6h12v14" />
      <path d="M9 9h.01M12 9h.01M15 9h.01M9 13h.01M12 13h.01M15 13h.01" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l8 4-8 4-8-4 8-4z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 17l8 4 8-4" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 4 3 14 0 18M12 3c-3 4-3 14 0 18" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M20 7l-9 10-4-4" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 19h16" />
      <path d="M7 16V9M12 16V5M17 16v-6" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.8-3 5-4 8-4s6.2 1 8 4" />
    </svg>
  )
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `group flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        isActive
          ? 'border-river/80 bg-gradient-to-r from-river to-moss text-white shadow-[0_16px_26px_-20px_rgba(24,88,76,0.82)]'
          : 'border-transparent text-ink/70 hover:border-clay/80 hover:bg-white/92 hover:text-ink'
      }`}
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-6 w-6 place-items-center rounded-lg text-base transition ${
            isActive
              ? 'bg-white/18 text-white'
              : 'bg-sand/80 text-ink/55 group-hover:bg-white group-hover:text-ink/75'
          }`}>
            {icons[icon]}
          </span>
          <span className="tracking-[0.01em]">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')
  const isAdmin = user?.role === 'ADMIN'
  const advancedActive = useMemo(
    () => advancedLinks.some((link) => location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)),
    [location.pathname]
  )
  const hasSearch = navQuery.trim().length > 0

  const visibleCoreLinks = useMemo(() => filterLinks(coreLinks, navQuery), [navQuery])
  const visibleOperationsLinks = useMemo(() => filterLinks(operationsLinks, navQuery), [navQuery])
  const visibleAdvancedLinks = useMemo(() => filterLinks(advancedLinks, navQuery), [navQuery])
  const visibleAdminLinks = useMemo(() => (isAdmin ? filterLinks(adminLinks, navQuery) : []), [isAdmin, navQuery])
  const visibleAccountLinks = useMemo(() => filterLinks(accountLinks, navQuery), [navQuery])
  const searchResults = useMemo(() => {
    const map = new Map()
    const mergedLinks = [
      ...visibleCoreLinks,
      ...visibleOperationsLinks,
      ...visibleAdvancedLinks,
      ...visibleAdminLinks,
      ...visibleAccountLinks
    ]
    mergedLinks.forEach((link) => map.set(link.to, link))
    return Array.from(map.values())
  }, [visibleCoreLinks, visibleOperationsLinks, visibleAdvancedLinks, visibleAdminLinks, visibleAccountLinks])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (advancedActive) {
      setAdvancedOpen(true)
    }
  }, [advancedActive])

  const userStatus = (user?.status || 'ACTIVE').toUpperCase()
  const isUserOnline = userStatus === 'ACTIVE'

  return (
    <aside className="relative z-20 w-full shrink-0 border-b border-clay/70 bg-white/74 backdrop-blur md:min-h-screen md:w-[290px] md:border-b-0 md:border-r">
      <div className="px-4 py-4 sm:px-6 md:sticky md:top-0 md:max-h-screen md:overflow-y-auto md:p-6">
        <div className="flex items-center justify-between rounded-2xl border border-clay/70 bg-white/82 px-3 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-river to-moss text-[15px] font-bold tracking-[0.08em] text-white shadow-sm">
              GS
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-ink">GeoSmart</h1>
              <p className="truncate text-xs text-ink/58">Rwanda Land Intelligence</p>
            </div>
          </div>

          <button
            className="grid h-9 w-9 place-items-center rounded-xl border border-clay/70 bg-white/90 text-ink/70 md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              {mobileOpen
                ? <path d="M6 6l12 12M18 6L6 18" />
                : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        <div className={`${mobileOpen ? 'mt-5 block' : 'hidden'} md:mt-8 md:block`}>
          <label className="mb-5 mt-1 block space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-ink/45">NAVIGATION</span>
            <div className="flex items-center gap-2 rounded-xl border border-clay/70 bg-white/92 px-3 py-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink/45" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                className="w-full bg-transparent text-sm text-ink/75 placeholder:text-ink/40 focus:outline-none"
                placeholder="Find module..."
                value={navQuery}
                onChange={(event) => setNavQuery(event.target.value)}
              />
            </div>
          </label>

          <div className="space-y-6">
            {hasSearch && (
              <div>
                <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink/42">RESULTS</p>
                <nav className="space-y-2">
                  {searchResults.map((link) => (
                    <NavItem key={link.to} {...link} />
                  ))}
                </nav>
                {searchResults.length === 0 && (
                  <p className="text-xs text-ink/55">No modules found for "{navQuery}".</p>
                )}
              </div>
            )}

            {!hasSearch && (
              <>
                <div>
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink/42">CORE</p>
                  <nav className="space-y-2">
                    {visibleCoreLinks.map((link) => (
                      <NavItem key={link.to} {...link} />
                    ))}
                  </nav>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink/42">OPERATIONS</p>
                  <nav className="space-y-2">
                    {visibleOperationsLinks.map((link) => (
                      <NavItem key={link.to} {...link} />
                    ))}
                  </nav>
                </div>

                <div>
                  <button
                    type="button"
                    className="mb-3 flex w-full items-center justify-between text-[11px] font-semibold tracking-[0.2em] text-ink/42"
                    onClick={() => setAdvancedOpen((open) => !open)}
                  >
                    ADVANCED
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {advancedOpen && (
                    <nav className="space-y-2">
                      {visibleAdvancedLinks.map((link) => (
                        <NavItem key={link.to} {...link} />
                      ))}
                    </nav>
                  )}
                </div>
              </>
            )}

            {!hasSearch && isAdmin && (
              <div>
                <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink/42">ADMIN</p>
                <nav className="space-y-2">
                  {visibleAdminLinks.map((link) => (
                    <NavItem key={link.to} {...link} />
                  ))}
                </nav>
              </div>
            )}

            {!hasSearch && (
              <div>
                <p className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-ink/42">PROFILE</p>
                <nav className="space-y-2">
                  {visibleAccountLinks.map((link) => (
                    <NavItem key={link.to} {...link} />
                  ))}
                </nav>
              </div>
            )}
          </div>

          <div className="mt-7 rounded-2xl border border-clay/70 bg-white/92 p-3 shadow-[0_16px_28px_-24px_rgba(30,41,59,0.45)]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-clay/80 bg-sand text-ink/60">
                {(user?.fullName || 'Admin').slice(0, 1)}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{user?.fullName || 'Badaga'}</p>
                <p className="text-xs text-ink/60">{user?.role || 'System Admin'}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-clay/70 bg-sand/70 px-2.5 py-1.5 text-[11px]">
              <span className="font-semibold text-ink/65">Session</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                isUserOnline ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isUserOnline ? 'bg-success' : 'bg-warning'}`} />
                {isUserOnline ? 'Online' : userStatus}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="w-full px-2 py-2 text-xs" onClick={() => navigate('/account')}>
                Account
              </Button>
              <Button variant="secondary" className="w-full px-2 py-2 text-xs" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
