import React, { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const pageEntries = [
  { match: '/dashboard', crumb: 'Dashboard', title: 'Operations Dashboard', subtitle: 'Live overview of projects, users, and system health.' },
  { match: '/users', crumb: 'Administration', title: 'User Management', subtitle: 'Manage identity, status, and role-based access.' },
  { match: '/projects', crumb: 'Operations', title: 'Project Management', subtitle: 'Plan and monitor projects with clear ownership.' },
  { match: '/clients', crumb: 'Operations', title: 'Client Management', subtitle: 'Maintain client records and engagement activity.' },
  { match: '/datasets', crumb: 'Data', title: 'Geospatial Data', subtitle: 'Upload, inspect, and analyze spatial datasets.' },
  { match: '/map', crumb: 'Workspace', title: 'Map Workspace', subtitle: 'Visualize boundaries and map-based operations.' },
  { match: '/rwanda-layers', crumb: 'Workspace', title: 'Rwanda Layers', subtitle: 'Reference official administrative map layers.' },
  { match: '/subdivision', crumb: 'AI Tools', title: 'AI Subdivision', subtitle: 'Generate optimized parcel subdivision outputs.' },
  { match: '/compliance', crumb: 'Governance', title: 'Compliance', subtitle: 'Run policy checks and review validation findings.' },
  { match: '/workflow', crumb: 'Operations', title: 'Workflow', subtitle: 'Coordinate tasks and monitor execution status.' },
  { match: '/reports', crumb: 'Analytics', title: 'Reports & Analytics', subtitle: 'Generate operational and compliance reports.' },
  { match: '/permissions', crumb: 'Administration', title: 'Role Permissions', subtitle: 'Review the access matrix and governance controls.' },
  { match: '/audit', crumb: 'Governance', title: 'Audit Logs', subtitle: 'Trace critical actions across the platform.' },
  { match: '/account', crumb: 'Profile', title: 'Account', subtitle: 'Manage your personal profile and security settings.' }
]

export default function Topbar() {
  const { presenceNotice, clearPresenceNotice } = useAuth()
  const location = useLocation()

  const pageMeta = useMemo(() => {
    const path = location.pathname.toLowerCase()
    const found = pageEntries.find((item) => path === item.match || path.startsWith(`${item.match}/`))
    return found || {
      crumb: 'Workspace',
      title: 'GeoSmart Workspace',
      subtitle: 'Manage geospatial operations and governance.'
    }
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-20 border-b border-clay/70 bg-white/82 px-4 py-4 backdrop-blur md:px-6">
      {presenceNotice && (
        <div className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
          presenceNotice.tone === 'warning'
            ? 'border-warning/30 bg-warning/10 text-secondary'
            : 'border-success/30 bg-success/10 text-success'
        }`}>
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${presenceNotice.tone === 'warning' ? 'bg-warning' : 'bg-success'}`} />
            {presenceNotice.message}
          </span>
          <button className="text-xs font-semibold opacity-75 hover:opacity-100" onClick={clearPresenceNotice}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink/48">{`GeoSmart / ${pageMeta.crumb}`}</p>
          <h2 className="text-[1.65rem] font-semibold text-ink md:text-[1.9rem]">{pageMeta.title}</h2>
          <p className="mt-1 text-sm text-ink/65">{pageMeta.subtitle}</p>
        </div>
        <p className="hidden rounded-full border border-clay/70 bg-sand/90 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-ink/50 md:block">
          WORKSPACE
        </p>
      </div>
    </header>
  )
}
