import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const moduleLinks = [
  { to: '/', label: 'Dashboard', icon: 'grid' },
  { to: '/users', label: 'User Management', icon: 'users' },
  { to: '/projects', label: 'Project Management', icon: 'briefcase' },
  { to: '/datasets', label: 'Geospatial Data', icon: 'layers' },
  { to: '/map', label: 'Map Workspace', icon: 'map' },
  { to: '/rwanda-layers', label: 'Rwanda Layers', icon: 'globe' },
  { to: '/subdivision', label: 'AI Subdivision', icon: 'sparkles' },
  { to: '/compliance', label: 'Compliance', icon: 'shield' },
  { to: '/workflow', label: 'Workflow', icon: 'check' }
]

const systemLinks = [
  { to: '/reports', label: 'Reports & Analytics', icon: 'chart' },
  { to: '/permissions', label: 'Role Permissions', icon: 'shield' },
  { to: '/audit', label: 'Audit Logs', icon: 'lock' },
  { to: '/account', label: 'Account', icon: 'user' }
]

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

function NavItem({ to, label, icon, compact = false, forceActive = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const active = isActive || forceActive
        return `flex items-center ${compact ? 'gap-2.5 px-3 py-2 text-[13px]' : 'gap-3 px-4 py-2.5 text-sm'} rounded-xl font-medium transition ${
          active ? 'bg-river text-white shadow-sm' : 'text-ink/70 hover:bg-white/80'
        }`
      }}
    >
      <span className={compact ? 'text-sm' : 'text-base'}>{icons[icon]}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { user } = useAuth()

  return (
    <aside className="w-full md:w-72 shrink-0 p-6 border-b md:border-b-0 md:border-r border-clay/70 bg-white/60 backdrop-blur">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-river text-white flex items-center justify-center shadow-sm">
          <span className="text-lg font-semibold">G</span>
        </div>
        <div>
          <h1 className="text-xl font-semibold">GeoSmart</h1>
          <p className="text-xs text-ink/60">Rwanda Land Intelligence</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-ink/40 tracking-[0.2em] mb-3">MODULES</p>
          <nav className="space-y-2">
            {moduleLinks.map((link) => (
              <NavItem key={link.to} {...link} />
            ))}
          </nav>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink/40 tracking-[0.2em] mb-3">SYSTEM</p>
          <nav className="space-y-2">
            {systemLinks.map((link) => (
              <NavItem key={link.to} {...link} />
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-clay/70 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-sand border border-clay/80 flex items-center justify-center text-ink/60">
          {(user?.fullName || 'Admin').slice(0, 1)}
        </div>
        <div>
          <p className="text-sm font-semibold">{user?.fullName || 'Badaga'}</p>
          <p className="text-xs text-ink/60">{user?.role || 'System Admin'}</p>
        </div>
      </div>
    </aside>
  )
}
