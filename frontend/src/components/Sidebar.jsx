import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Button from './Button'

const primaryLinks = [
  { to: '/dashboard', label: 'Dashboard', helper: 'Planning overview', icon: 'grid', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/subdivision', label: 'Subdivision Planner', helper: 'Parcel zoning checks', icon: 'sparkles', featured: true, roles: ['ADMIN', 'SURVEYOR'] },
  { to: '/projects', label: 'Projects', helper: 'Planning case files', icon: 'briefcase', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/datasets', label: 'GIS Data Manager', helper: 'Parcels, zoning, DEM', icon: 'layers', roles: ['ADMIN', 'SURVEYOR'] },
  { to: '/reports', label: 'Reports', helper: 'PDF compliance center', icon: 'chart', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/documents', label: 'Documents', helper: 'Project evidence files', icon: 'briefcase', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/data-limitations', label: 'Data Limitations', helper: 'Missing data warnings', icon: 'layers', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/settings', label: 'Settings', helper: 'Profile and notifications', icon: 'shield', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] }
]

const adminLinks = [
  { to: '/users', label: 'Users / Admin', helper: 'Accounts and roles', icon: 'users' },
  { to: '/audit', label: 'Audit Log', helper: 'System activity', icon: 'lock' }
]

function filterLinks(links, query) {
  const value = query.trim().toLowerCase()
  if (!value) return links
  return links.filter((link) => `${link.label} ${link.helper}`.toLowerCase().includes(value))
}

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l8 4-8 4-8-4 8-4z" />
      <path d="M4 12l8 4 8-4M4 17l8 4 8-4" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19h16" />
      <path d="M7 16V9M12 16V5M17 16v-6" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16v11H4z" />
      <path d="M9 7V5h6v2" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 17c0-2.2-2-4-4-4s-4 1.8-4 4" />
      <circle cx="12" cy="8" r="3.5" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3z" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  )
}

function NavItem({ to, label, helper, icon, featured }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `group relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition ${
        isActive
          ? 'border-[#124E44] bg-[#124E44] text-white shadow-[0_18px_34px_-24px_rgba(18,78,68,0.9)]'
          : featured
            ? 'border-[#1F6F5F]/25 bg-[#1F6F5F]/7 text-ink hover:border-[#1F6F5F]/50 hover:bg-[#1F6F5F]/10'
            : 'border-transparent text-ink/72 hover:border-clay/80 hover:bg-white/85 hover:text-ink'
      }`}
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
            isActive ? 'bg-white/16 text-white' : 'bg-white text-[#124E44] shadow-sm group-hover:bg-sand'
          }`}>
            {icons[icon]}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{label}</span>
            <span className={`mt-0.5 block truncate text-xs ${isActive ? 'text-white/65' : 'text-ink/45'}`}>
              {helper}
            </span>
          </span>
          {featured && !isActive && (
            <span className="ml-auto rounded-full bg-[#124E44]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#124E44]">
              AI
            </span>
          )}
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
  const [navQuery, setNavQuery] = useState('')
  const isAdmin = user?.role === 'ADMIN'
  const role = user?.role || 'CLIENT'
  const visiblePrimaryLinks = useMemo(
    () => filterLinks(primaryLinks.filter((link) => !link.roles || link.roles.includes(role)), navQuery),
    [navQuery, role]
  )
  const visibleAdminLinks = useMemo(() => (isAdmin ? filterLinks(adminLinks, navQuery) : []), [isAdmin, navQuery])
  const userStatus = (user?.status || 'ACTIVE').toUpperCase()
  const isUserOnline = userStatus === 'ACTIVE'

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <aside className="relative z-20 w-full shrink-0 border-b border-clay/70 bg-[#F8F7F1]/90 backdrop-blur md:min-h-screen md:w-[304px] md:border-b-0 md:border-r">
      <div className="px-4 py-4 sm:px-6 md:sticky md:top-0 md:flex md:max-h-screen md:flex-col md:overflow-y-auto md:p-5">
        <div className="rounded-[1.35rem] border border-clay/70 bg-white/88 p-3 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => navigate('/dashboard')}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#124E44] text-sm font-black tracking-[0.1em] text-white">
                GS
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-black tracking-[-0.03em] text-ink">GeoSmart</span>
                <span className="block truncate text-xs font-medium text-ink/50">Kigali land planning suite</span>
              </span>
            </button>

            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-clay/70 bg-white text-ink/70 md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#D8E8DC] to-[#F7E7C6] p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#124E44]/65">Active Focus</p>
            <p className="mt-1 text-sm font-bold text-ink">Subdivision compliance</p>
            <p className="mt-1 text-xs leading-5 text-ink/58">Search UPI, generate plots, check zoning, and export PDF reports.</p>
          </div>
        </div>

        <div className={`${mobileOpen ? 'mt-5 block' : 'hidden'} md:mt-5 md:block`}>
          <label className="block">
            <span className="sr-only">Search navigation</span>
            <div className="flex items-center gap-2 rounded-2xl border border-clay/70 bg-white/85 px-3 py-2.5 shadow-sm">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink/42" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                className="w-full bg-transparent text-sm font-medium text-ink placeholder:text-ink/35 focus:outline-none"
                placeholder="Search modules"
                value={navQuery}
                onChange={(event) => setNavQuery(event.target.value)}
              />
            </div>
          </label>

          <div className="mt-5 space-y-6">
            <div>
              <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-ink/38">Workspace</p>
              <nav className="space-y-2">
                {visiblePrimaryLinks.map((link) => (
                  <NavItem key={link.to} {...link} />
                ))}
              </nav>
              {!visiblePrimaryLinks.length && !visibleAdminLinks.length && (
                <p className="rounded-2xl border border-clay/70 bg-white/70 p-3 text-xs text-ink/55">No modules found.</p>
              )}
            </div>

            {isAdmin && !!visibleAdminLinks.length && (
              <div>
                <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-ink/38">Administration</p>
                <nav className="space-y-2">
                  {visibleAdminLinks.map((link) => (
                    <NavItem key={link.to} {...link} />
                  ))}
                </nav>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-clay/70 bg-white/88 p-3 shadow-[0_24px_45px_-38px_rgba(15,23,42,0.65)]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#124E44]/10 text-sm font-black text-[#124E44]">
                {(user?.fullName || user?.email || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{user?.fullName || 'GeoSmart User'}</p>
                <p className="truncate text-xs text-ink/52">{user?.role || 'Planner'}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-sand/70 px-3 py-2 text-xs">
              <span className="font-semibold text-ink/58">Session</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-bold ${
                isUserOnline ? 'bg-success/12 text-success' : 'bg-warning/14 text-warning'
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
