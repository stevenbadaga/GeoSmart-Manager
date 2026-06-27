import React, { useMemo, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/http'
import ThemeToggle from './ThemeToggle'

const pageEntries = [
  { match: '/dashboard', crumb: 'Planning Dashboard', title: 'Subdivision Planning Dashboard', subtitle: 'Live overview of Kigali GIS readiness, parcel checks, and compliance reports.' },
  { match: '/users', crumb: 'Administration', title: 'User Management', subtitle: 'Manage identity, status, and role-based access.' },
  { match: '/projects', crumb: 'Planning Cases', title: 'Project Case Management', subtitle: 'Manage parcel-planning case files, client intake, surveyor assignment, project communication, and delivery readiness.' },
  { match: '/clients', crumb: 'Operations', title: 'Client Management', subtitle: 'Maintain client records and engagement activity.' },
  { match: '/datasets', crumb: 'GIS Data', title: 'Geospatial Data Center', subtitle: 'Monitor the operational GIS layers powering parcel search, zoning checks, constraints, slope review, and reports.' },
  { match: '/map', crumb: 'GIS Workspace', title: 'Kigali GIS Layer Workspace', subtitle: 'Preview imported layers, subdivision outputs, sketches, and spatial context.' },
  { match: '/rwanda-layers', crumb: 'Workspace', title: 'Rwanda Layers', subtitle: 'Reference official administrative map layers.' },
  { match: '/subdivision', crumb: 'AI Tools', title: 'AI Subdivision', subtitle: 'Generate optimized parcel subdivision outputs.' },
  { match: '/compliance', crumb: 'Governance', title: 'Compliance', subtitle: 'Run policy checks and review validation findings.' },
  { match: '/workflow', crumb: 'Operations', title: 'Workflow', subtitle: 'Coordinate tasks and monitor execution status.' },
  { match: '/reports', crumb: 'Reports', title: 'Compliance Report Center', subtitle: 'Generate project summaries and export professional subdivision compliance PDFs.' },
  { match: '/messages', crumb: 'Workspace', title: 'Messages', subtitle: 'Secure role-based conversations with your project team.' },
  { match: '/data-limitations', crumb: 'Transparency', title: 'Data Limitations', subtitle: 'Understand available GIS data, missing layers, and preliminary-check limitations.' },
  { match: '/settings', crumb: 'Settings', title: 'Settings', subtitle: 'Manage profile context, notifications, email readiness, and system disclaimer.' },
  { match: '/permissions', crumb: 'Administration', title: 'Role Permissions', subtitle: 'Review the access matrix and governance controls.' },
  { match: '/audit', crumb: 'Governance', title: 'Audit Logs', subtitle: 'Trace critical actions across the platform.' },
  { match: '/notifications', crumb: 'Workspace', title: 'Notifications', subtitle: 'Stay updated with project changes and system alerts.' },
  { match: '/contact-messages', crumb: 'Administration', title: 'Contact Messages', subtitle: 'Manage inquiries from the public contact form.' },
  { match: '/account', crumb: 'Profile', title: 'Account', subtitle: 'Manage your personal profile and security settings.' }
]

export default function Topbar() {
  const { user, presenceNotice, clearPresenceNotice } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchCount = () => {
      Promise.allSettled([
        api.get('/api/notifications/unread-count'),
        api.get('/api/messages/unread-count')
      ]).then(([notificationsResult, messagesResult]) => {
        if (notificationsResult.status === 'fulfilled') setUnreadCount(Number(notificationsResult.value || 0))
        if (messagesResult.status === 'fulfilled') setMessageUnreadCount(Number(messagesResult.value || 0))
      })
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user, location.pathname])

  const pageMeta = useMemo(() => {
    const path = location.pathname.toLowerCase()
    const found = pageEntries.find((item) => path === item.match || path.startsWith(`${item.match}/`))
    return found || {
      crumb: 'Workspace',
      title: 'GeoSmart Workspace',
      subtitle: 'Manage geospatial operations and governance.'
    }
  }, [location.pathname])

  const getNoticeStyles = (tone) => {
    switch (tone) {
      case 'warning': return 'border-amber-200 bg-amber-50 text-amber-900'
      case 'danger': return 'border-rose-200 bg-rose-50 text-rose-900'
      case 'info': return 'border-blue-200 bg-blue-50 text-blue-900'
      default: return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }
  }

  const getDotStyles = (tone) => {
    switch (tone) {
      case 'warning': return 'bg-amber-500'
      case 'danger': return 'bg-rose-500'
      case 'info': return 'bg-blue-500'
      default: return 'bg-emerald-500'
    }
  }

  const getButtonStyles = (tone) => {
    switch (tone) {
      case 'warning': return 'text-amber-600 hover:bg-amber-100 hover:text-amber-800'
      case 'danger': return 'text-rose-600 hover:bg-rose-100 hover:text-rose-800'
      case 'info': return 'text-blue-600 hover:bg-blue-100 hover:text-blue-800'
      default: return 'text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800'
    }
  }

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/60 bg-white/95 px-4 py-4 backdrop-blur-md shadow-sm sm:px-6">
      {presenceNotice && (
        <div className={`mx-auto mb-6 flex max-w-5xl items-center justify-between gap-4 rounded-2xl border px-5 py-4 shadow-sm transition-all animate-in slide-in-from-top-4 duration-500 ${getNoticeStyles(presenceNotice.tone)}`}>
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full pulse ${getDotStyles(presenceNotice.tone)}`} />
            <p className="text-sm font-semibold tracking-tight">
              {presenceNotice.message}
            </p>
          </div>
          <button
            className={`rounded-full p-1.5 transition-all active:scale-95 ${getButtonStyles(presenceNotice.tone)}`}
            onClick={clearPresenceNotice}
            title="Dismiss"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 sm:gap-8">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-emerald-600 sm:text-[10px] sm:tracking-[0.4em]">
            GEOSMART • {pageMeta.crumb.toUpperCase()}
          </p>
          <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 font-display sm:text-2xl">
            {pageMeta.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <ThemeToggle />

          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 shadow-sm active:scale-95"
            onClick={() => navigate('/messages')}
            title="Messages"
          >
            <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 5.5h15a1.8 1.8 0 011.8 1.8v8.5a1.8 1.8 0 01-1.8 1.8H9l-4.5 3v-3.8a1.8 1.8 0 01-1.8-1.8V7.3a1.8 1.8 0 011.8-1.8z" />
              <path d="M7.5 9.5h9M7.5 13h5.5" />
            </svg>
            {messageUnreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[8px] font-black text-white ring-2 ring-white shadow-sm">
                {messageUnreadCount > 9 ? '9+' : messageUnreadCount}
              </span>
            )}
          </button>

          {/* Notification Button */}
          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 shadow-sm active:scale-95"
            onClick={() => navigate('/notifications')}
            title="Notifications"
          >
            <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[8px] font-black text-white ring-2 ring-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden h-8 w-px bg-slate-200 md:block" />

          {/* User Profile Card */}
          <button
            className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-1.5 pr-4 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md active:scale-95"
            onClick={() => navigate('/account')}
          >
            <div className="relative">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#063F35] text-xs font-bold text-white uppercase shadow-sm">
                {(user?.fullName || user?.email || 'U').slice(0, 1)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="hidden text-left md:block min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                {user?.fullName || 'GeoSmart User'}
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-tight">
                {user?.role?.replace('_', ' ') || 'Planner'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
