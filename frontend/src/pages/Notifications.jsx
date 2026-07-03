import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/notifications')
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, {})
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (err) {
      console.error('Failed to mark as read', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all', {})
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

  const getNotificationRoute = (n) => {
    const title = (n.title || '').toLowerCase()
    const message = (n.message || '').toLowerCase()

    // 1. Messages / Conversation
    if (n.relatedConversationId) {
      return `/messages?conversationId=${n.relatedConversationId}`
    }
    if (title.includes('message') || message.includes('message') || title.includes('chat') || title.includes('contact')) {
      return '/messages'
    }

    // 2. Report
    if (title.includes('report') || message.includes('report') || title.includes('pdf')) {
      if (n.relatedProjectId) {
        return `/reports?project=${n.relatedProjectId}`
      }
      return '/reports'
    }

    // 3. Compliance / GIS
    if (title.includes('compliance') || message.includes('compliance') || title.includes('rule') || title.includes('violation')) {
      return '/compliance'
    }
    if (title.includes('gis') || message.includes('gis') || title.includes('subdivision') || title.includes('map') || title.includes('parcel')) {
      return '/subdivision'
    }

    // 4. Project
    if (n.relatedProjectId) {
      return `/projects?project=${n.relatedProjectId}`
    }
    if (title.includes('project') || message.includes('project') || title.includes('submission') || title.includes('signal')) {
      return '/projects'
    }

    // Default Fallback
    return '/dashboard'
  }

  const handleCardClick = (n) => {
    if (!n.isRead) {
      markAsRead(n.id)
    }
    navigate(getNotificationRoute(n))
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case 'SUCCESS': return 'badge-success'
      case 'WARNING': return 'badge-warning'
      case 'DANGER': return 'badge-danger'
      default: return 'badge-info'
    }
  }

  return (
    <div className="space-y-10 animate-rise">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <section className="flex-1 rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">Activity Hub</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Technical Signals</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">Stay updated with planning progress, compliance alerts, and system activity.</p>
        </section>
        <div className="flex flex-wrap items-center gap-6">
           <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm">{notifications.length} total signals</span>
           {notifications.some(n => !n.isRead) && (
             <Button variant="secondary" className="px-6 shadow-sm" onClick={markAllAsRead}>Clear Unread Queue</Button>
           )}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center animate-pulse">
             <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Polling technical logs...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="py-24 text-center shadow-premium bg-slate-50/50 border-2 border-dashed border-slate-200 transition-colors hover:bg-white hover:border-emerald-200">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[2rem] bg-white text-slate-300 shadow-xl shadow-slate-900/5 mb-8">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">No active signals</h3>
            <p className="mt-4 text-base text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
              Your planning workspace is currently quiet. We'll alert you when there are technical updates to your projects or team activity.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCardClick(n)
                  }
                }}
                className={`group relative rounded-2xl border p-7 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 select-none ${
                  n.isRead 
                    ? 'bg-slate-50/40 border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 opacity-80' 
                    : 'bg-white border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/5 shadow-premium hover:shadow-md'
                }`}
              >
                {!n.isRead && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50 shadow-lg shadow-emerald-500/20 animate-pulse" />
                )}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pl-6">
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex items-center gap-4">
                      <span className={`status-badge ${getTypeStyles(n.type)}`}>
                        <span className={`status-dot dot-${n.type.toLowerCase() === 'success' ? 'success' : n.type.toLowerCase() === 'warning' ? 'warning' : 'danger'}`} />
                        {n.type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-emerald-700 transition-colors font-display">{n.title}</h4>
                    </div>
                    <p className="text-[14px] leading-relaxed text-slate-600 font-medium max-w-4xl">{n.message}</p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                       {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-3 self-end md:self-start">
                    {!n.isRead && (
                      <button 
                        className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 text-[11px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100/50 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(n.id)
                        }}
                      >
                        Dismiss
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                      </button>
                    )}
                    <div className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card title="Signal Parameters" premium className="shadow-premium bg-[#002a23] border-none text-white overflow-hidden relative">
         <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition-transform hover:scale-125 duration-700" />
         <div className="grid md:grid-cols-2 gap-10 relative z-10">
            <div className="space-y-4">
               <h4 className="text-lg font-bold tracking-tight font-display">Classification Logic</h4>
               <p className="text-[13px] leading-relaxed text-slate-400 font-medium">GeoSmart categorization uses success (green), warning (amber), and danger (rose) signals to communicate the importance of technical events and system status alerts.</p>
            </div>
            <div className="space-y-4">
               <h4 className="text-lg font-bold tracking-tight font-display">Archive Persistence</h4>
               <p className="text-[13px] leading-relaxed text-slate-400 font-medium">Read notifications are retained in the signal log for 30 days. You can clear your unread queue at any time using the "Clear Unread" action.</p>
            </div>
         </div>
      </Card>
    </div>
  )
}
