import React, { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { publicImages } from '../assets/publicImages'

const primaryLinks = [
  { to: '/dashboard', label: 'Dashboard', helper: 'System overview', icon: 'grid', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/projects', label: 'Projects', helper: 'Case management', icon: 'briefcase', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/subdivision', label: 'Land Subdivision', helper: 'AI planning checks', icon: 'sparkles', featured: true, roles: ['ADMIN', 'SURVEYOR'] },
  { to: '/map', label: 'GIS Workspace', helper: 'Interactive map tools', icon: 'map', roles: ['ADMIN', 'SURVEYOR'] },
  { to: '/datasets', label: 'GIS Datasets', helper: 'Data inventory', icon: 'layers', roles: ['ADMIN', 'SURVEYOR'] },
  { to: '/compliance', label: 'Planning Rules', helper: 'Zoning & compliance', icon: 'shield', roles: ['ADMIN', 'SURVEYOR'] },
  { to: '/reports', label: 'Reports', helper: 'Generated outputs', icon: 'chart', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/messages', label: 'Messages', helper: 'Team inbox', icon: 'message', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] },
  { to: '/notifications', label: 'Notifications', helper: 'System alerts', icon: 'bell', roles: ['ADMIN', 'SURVEYOR', 'CLIENT'] }
]

const adminLinks = [
  { to: '/users', label: 'Users', helper: 'Account management', icon: 'users' },
  { to: '/contact-messages', label: 'Contact Messages', helper: 'Public inquiries', icon: 'mail' },
  { to: '/audit', label: 'Audit Logs', helper: 'System history', icon: 'lock' },
  { to: '/settings', label: 'Settings', helper: 'System configuration', icon: 'settings' }
]

function filterLinks(links, query) {
  const value = query.trim().toLowerCase()
  if (!value) return links
  return links.filter((link) => `${link.label} ${link.helper}`.toLowerCase().includes(value))
}

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4" width="7" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="7" height="16" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="6.5" rx="1.6" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8.5l7-4 7 4v7l-7 4-7-4z" />
      <path d="M12 4.5v15M5 8.5l7 4 7-4M12 12.5v7" />
      <path d="M8.5 10.5v7M15.5 10.5v7" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 6.5l5-2.2 7 2.2 5-2.2v13.2l-5 2.2-7-2.2-5 2.2z" />
      <path d="M8.5 4.3v13.2M15.5 6.5v13.2" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l8 4.2-8 4.2-8-4.2z" />
      <path d="M4 12l8 4.2 8-4.2M4 16.5l8 4.2 8-4.2" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 3.5h8L19.5 8v12.5h-13z" />
      <path d="M14.5 3.5V8h5" />
      <path d="M9.5 16.5v-3M12.5 16.5v-5M15.5 16.5v-2" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7.5h16v10.8a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <path d="M9 7.5V5.8a2 2 0 012-2h2a2 2 0 012 2v1.7M4 12.5h16" />
    </svg>
  ),
  files: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4M10 12h5M10 15.5h5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 19c0-2.5 1.9-4.3 4-4.3s4 1.8 4 4.3" />
      <circle cx="12" cy="8.5" r="3" />
      <path d="M4.5 18c.1-1.8 1.2-3.2 2.8-3.8M19.5 18c-.1-1.8-1.2-3.2-2.8-3.8" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l7 3v5.7c0 4.3-2.8 7.2-7 8.8-4.2-1.6-7-4.5-7-8.8V6.5z" />
      <path d="M9 12.2l2 2 4-4.4" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.2 13.5a7.6 7.6 0 000-3l2-1.2-2-3.4-2.2.9a8 8 0 00-2.6-1.5L14 3h-4l-.4 2.3A8 8 0 007 6.8l-2.2-.9-2 3.4 2 1.2a7.6 7.6 0 000 3l-2 1.2 2 3.4 2.2-.9a8 8 0 002.6 1.5L10 21h4l.4-2.3a8 8 0 002.6-1.5l2.2.9 2-3.4z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 9a6 6 0 00-12 0c0 5.2-2 6.8-2 6.8h16S18 14.2 18 9z" />
      <path d="M14.3 19a2.5 2.5 0 01-4.6 0" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 5.5h15a1.8 1.8 0 011.8 1.8v8.5a1.8 1.8 0 01-1.8 1.8H9l-4.5 3v-3.8a1.8 1.8 0 01-1.8-1.8V7.3a1.8 1.8 0 011.8-1.8z" />
      <path d="M7.5 9.5h9M7.5 13h5.5" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="M4.5 7l7.5 5.5L19.5 7" />
    </svg>
  )
}

function NavItem({ to, label, helper, icon, featured }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `sidebar-nav-item group ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-idle'}`}
    >
      {({ isActive }) => (
        <>
          <span className={`sidebar-nav-icon ${isActive ? 'sidebar-nav-icon-active' : 'sidebar-nav-icon-idle'}`}>
            {icons[icon]}
          </span>
          <div className="min-w-0 flex-1">
            <span className="sidebar-nav-label">{label}</span>
            <span className="sidebar-nav-helper">
              {helper}
            </span>
          </div>
          {featured && (
            <span className="sidebar-nav-badge">
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

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <aside className={`relative flex w-full max-w-full flex-col overflow-hidden border-r border-emerald-100/10 bg-[linear-gradient(155deg,#001f1a_0%,#00372f_46%,#05261f_100%)] text-white shadow-[18px_0_54px_-34px_rgba(0,0,0,0.82)] transition-all duration-300 ${mobileOpen ? 'fixed inset-0 z-50 h-screen' : 'h-auto md:h-full'}`}>
      {/* Decorative Elements */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.16),transparent_38%),radial-gradient(circle_at_100%_38%,rgba(20,184,166,0.1),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.055),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-emerald-100/[0.18] to-transparent" />

      {/* Header / Brand Area */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-5 py-5 md:justify-center md:px-6 md:py-6">
        <Link to="/dashboard" className="group block min-w-0 rounded-2xl px-2 py-1 transition active:scale-95">
          <div className="flex min-h-[72px] items-center justify-center">
            <img
              src={publicImages.newBlackLogoTransparent}
              alt="GeoSmart Manager"
              className="mx-auto h-[74px] w-auto max-w-[210px] object-contain drop-shadow-[0_14px_26px_rgba(0,0,0,0.2)] transition-transform duration-500 group-hover:scale-[1.018]"
            />
          </div>
        </Link>

        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.075] text-white shadow-[0_14px_28px_-22px_rgba(0,0,0,0.7)] transition hover:bg-white/[0.12] md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </div>

      <div className={`${mobileOpen ? 'flex' : 'hidden'} relative z-10 min-h-0 flex-1 flex-col md:flex`}>
        {/* Search Box */}
        <div className="sidebar-search-panel group relative px-5 pb-4 md:px-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-100/[0.48] transition-colors group-focus-within:text-emerald-200" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Find module..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.075] px-4 py-3 pl-10 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_30px_-28px_rgba(0,0,0,0.88)] outline-none backdrop-blur-md transition placeholder:text-emerald-50/[0.42] focus:border-emerald-200/[0.28] focus:bg-white/[0.105] focus:ring-2 focus:ring-emerald-300/[0.14]"
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
          />
        </div>

        <nav className="custom-scrollbar sidebar-scrollbar sidebar-nav-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-4 md:px-4">
          {/* Primary Workspace Links */}
          <div>
            <p className="mb-2.5 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/[0.5]">
              Core Workspace
            </p>
            <div className="space-y-1">
              {visiblePrimaryLinks.map((link) => (
                <NavItem key={link.to} {...link} />
              ))}
            </div>
          </div>

          {/* Administration Links */}
          {isAdmin && visibleAdminLinks.length > 0 && (
            <div>
              <p className="mb-2.5 px-4 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/[0.5]">
                Administration
              </p>
              <div className="space-y-1">
                {visibleAdminLinks.map((link) => (
                  <NavItem key={link.to} {...link} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Account Card - Sticky sidebar footer */}
        <div className="sidebar-account-footer shrink-0 px-4 pb-4 pt-3">
          <div className="sidebar-account-card relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.105] to-white/[0.035] p-3.5 shadow-[0_20px_46px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-100/[0.32] to-transparent" />
            <div className="relative flex items-center gap-3">
              <div className="relative">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-xs font-black uppercase text-[#04251f] shadow-[0_12px_28px_-16px_rgba(52,211,153,0.9)] ring-1 ring-white/25">
                  {(user?.fullName || user?.email || 'U').slice(0, 1)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-[#05261f] bg-emerald-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-white">{user?.fullName || 'GeoSmart User'}</p>
                <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-emerald-100/[0.48]">{user?.role?.replace('_', ' ') || 'Planner'}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.065] px-2 py-2 text-center text-[8px] font-black uppercase leading-tight tracking-[0.12em] text-white transition hover:bg-white/[0.12] active:scale-95"
              >
                View Public Site
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-rose-300/[0.12] bg-rose-400/10 px-2 py-2 text-[9px] font-black uppercase tracking-widest text-rose-200 transition hover:bg-rose-400/[0.18] active:scale-95"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
