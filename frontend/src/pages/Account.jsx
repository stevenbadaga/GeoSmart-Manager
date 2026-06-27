import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/http'

function formatDateTime(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

const emptyProfile = {
  fullName: ''
}

export default function Account() {
  const navigate = useNavigate()
  const { user, refreshUser, logout } = useAuth()
  const [profile, setProfile] = useState(emptyProfile)
  const [sessions, setSessions] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    setProfile({
      fullName: user?.fullName || ''
    })
  }, [user])

  const loadSessions = async () => {
    setSessionLoading(true)
    try {
      const data = await api.get('/api/users/me/sessions')
      setSessions(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setSessionLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setSaving(true)
    try {
      await api.put('/api/users/me', profile)
      await refreshUser()
      setEditing(false)
      setInfo('Profile updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const revokeSession = async (session) => {
    setError('')
    setInfo('')
    try {
      const result = await api.post(`/api/users/me/sessions/${session.sessionId}/revoke`, {})
      if (result.currentSessionRevoked) {
        await logout()
        navigate('/login')
        return
      }
      setInfo(result.message || 'Session revoked.')
      loadSessions()
    } catch (err) {
      setError(err.message)
    }
  }

  const revokeOtherSessions = async () => {
    setError('')
    setInfo('')
    try {
      const result = await api.post('/api/users/me/sessions/revoke-others', {})
      setInfo(result.message || 'Other sessions revoked.')
      loadSessions()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-10 max-w-5xl animate-rise">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personal Account</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-2 font-display">Identity & Access</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage your professional profile and monitor active platform sessions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="px-6 shadow-sm" onClick={revokeOtherSessions}>Revoke Other Devices</Button>
          <Button variant="secondary" className="px-6 border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 shadow-sm" onClick={handleLogout}>Sign Out</Button>
        </div>
      </div>

      <Card className="shadow-premium overflow-hidden border-none p-0">
        <div className="bg-[#063F35] p-10 lg:p-14 text-white relative">
           <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
           <div className="gis-grid absolute inset-0 opacity-[0.03]" />
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                 <div className="h-24 w-24 rounded-[2rem] bg-white/10 border border-white/20 flex items-center justify-center text-white text-3xl font-bold shadow-2xl backdrop-blur-md uppercase font-display">
                   {(user?.fullName || 'U').slice(0, 1)}
                 </div>
                 <div className="text-center md:text-left">
                    <p className="text-3xl font-bold tracking-tight font-display">{user?.fullName || 'Survey Engineer'}</p>
                    <p className="text-emerald-100/60 font-medium mt-2 text-lg">{user?.email}</p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
                       <span className="px-3 py-1 rounded-lg bg-emerald-400/20 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest text-emerald-400">{user?.role?.replace('_', ' ') || 'PLANNER'}</span>
                       <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">EST. {new Date().getFullYear()}</span>
                    </div>
                 </div>
              </div>
              <Button variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10 px-8 py-4 font-black backdrop-blur-sm shadow-xl" onClick={() => {
                setEditing((current) => !current)
                setInfo('')
                setError('')
              }}>
                {editing ? 'Close Settings' : 'Modify Profile'}
              </Button>
           </div>
        </div>

        <div className="p-10 lg:p-14 bg-white">
           <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-emerald-200 group">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Account Role</p>
                 <p className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-emerald-700 transition-colors font-display">{user?.role?.replace('_', ' ') || 'ENGINEER'}</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-emerald-200 group">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Auth Identifier</p>
                 <p className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-emerald-700 transition-colors truncate font-display">{user?.email || 'Not set'}</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-emerald-200 group">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">System Status</p>
                 <p className="font-bold text-slate-900 text-lg tracking-tight group-hover:text-emerald-700 transition-colors font-display">{user?.status || 'ACTIVE'}</p>
              </div>
           </div>

           {editing && (
             <form className="mt-12 space-y-8 p-10 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 animate-rise" onSubmit={saveProfile}>
                <div className="max-w-md space-y-6">
                   <h3 className="text-xl font-bold text-slate-900 tracking-tight font-display">Profile Details</h3>
                   <Input label="Professional Full Name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required placeholder="e.g. Jean Pierre" />
                   <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60">
                      <button type="button" className="px-8 py-3 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setEditing(false)}>Cancel</button>
                      <Button className="px-10 py-4 shadow-xl" type="submit" disabled={saving}>{saving ? 'Syncing...' : 'Update Identity'}</Button>
                   </div>
                </div>
             </form>
           )}
        </div>
      </Card>

      <Card title="Active Device Sessions" premium className="shadow-premium">
        <div className="space-y-4">
          {sessionLoading && (
            <div className="py-12 text-center animate-pulse">
               <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Auditing session security...</p>
            </div>
          )}
          {!sessionLoading && sessions.map((session) => (
            <div key={session.sessionId} className="group rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:border-emerald-200 hover:shadow-xl">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-slate-900 text-lg tracking-tight font-display">{session.deviceLabel || 'Secured Workstation'}</p>
                    {session.current && <span className="status-badge badge-success"><span className="status-dot dot-success" /> Active</span>}
                    {session.revoked && <span className="status-badge badge-danger"><span className="status-dot dot-danger" /> Revoked</span>}
                  </div>
                  <p className="text-[13px] text-slate-400 font-medium mt-2 leading-relaxed max-w-2xl">{session.userAgent || 'Encrypted user agent string'}</p>
                  <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                       <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /></svg>
                       {session.ipAddress || '127.0.0.1'}
                    </span>
                    <span className="flex items-center gap-2">
                       <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                       {formatDateTime(session.createdAt)}
                    </span>
                    <span className="flex items-center gap-2">
                       <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                       Seen: {formatDateTime(session.lastSeenAt)}
                    </span>
                  </div>
                </div>
                {!session.revoked && (
                  <Button variant="secondary" className="px-6 whitespace-nowrap shadow-sm" onClick={() => revokeSession(session)}>
                    {session.current ? 'Sign Out Device' : 'End Session'}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!sessionLoading && !sessions.length && (
            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 transition-colors hover:bg-white hover:border-emerald-200">
               <p className="text-[13px] font-bold text-slate-400 italic">No historical device sessions found.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
