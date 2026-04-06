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
  fullName: '',
  professionalLicense: '',
  organization: '',
  specialization: '',
  certifications: ''
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
      fullName: user?.fullName || '',
      professionalLicense: user?.professionalLicense || '',
      organization: user?.organization || '',
      specialization: user?.specialization || '',
      certifications: user?.certifications || ''
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Account</p>
          <h1 className="text-2xl font-semibold text-ink mt-2">Profile & Access</h1>
          <p className="text-sm text-ink/60">Manage your professional profile and active device sessions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={revokeOtherSessions}>Revoke Others</Button>
          <Button variant="secondary" onClick={handleLogout}>Sign Out</Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {info && <p className="text-sm text-success">{info}</p>}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-sand border border-clay/70 flex items-center justify-center text-ink/60 text-xl font-semibold">
              {(user?.fullName || 'User').slice(0, 1)}
            </div>
            <div>
              <p className="text-lg font-semibold text-ink">{user?.fullName || 'Survey Engineer'}</p>
              <p className="text-sm text-ink/60">{user?.email}</p>
              <p className="text-xs text-ink/50 mt-1">{user?.organization || 'Organization not set'}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => {
            setEditing((current) => !current)
            setInfo('')
            setError('')
          }}
          >
            {editing ? 'Close Editor' : 'Edit Profile'}
          </Button>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm text-ink/80">
          <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
            <p className="text-xs text-ink/50">Role</p>
            <p className="text-base font-semibold mt-2">{user?.role || 'ENGINEER'}</p>
          </div>
          <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
            <p className="text-xs text-ink/50">Professional License</p>
            <p className="text-base font-semibold mt-2">{user?.professionalLicense || 'Not set'}</p>
          </div>
          <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
            <p className="text-xs text-ink/50">Specialization</p>
            <p className="text-base font-semibold mt-2">{user?.specialization || 'Not set'}</p>
          </div>
        </div>

        {editing && (
          <form className="mt-6 space-y-4" onSubmit={saveProfile}>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Full name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required />
              <Input label="Organization" value={profile.organization} onChange={(event) => setProfile({ ...profile, organization: event.target.value })} />
              <Input label="Professional license" value={profile.professionalLicense} onChange={(event) => setProfile({ ...profile, professionalLicense: event.target.value })} />
              <Input label="Specialization" value={profile.specialization} onChange={(event) => setProfile({ ...profile, specialization: event.target.value })} />
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Certifications</span>
              <textarea
                className="input min-h-28"
                value={profile.certifications}
                onChange={(event) => setProfile({ ...profile, certifications: event.target.value })}
                placeholder="List certifications, registrations, or professional memberships"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Active Sessions">
        <div className="space-y-3">
          {sessionLoading && <p className="text-sm text-ink/60">Loading sessions...</p>}
          {!sessionLoading && sessions.map((session) => (
            <div key={session.sessionId} className="rounded-xl border border-clay/60 bg-white/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{session.deviceLabel || 'Unknown device'}</p>
                    {session.current && <span className="rounded-full bg-river/10 px-2 py-1 text-[11px] font-semibold text-river">Current</span>}
                    {session.revoked && <span className="rounded-full bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">Revoked</span>}
                  </div>
                  <p className="text-xs text-ink/55 mt-1">{session.userAgent || 'User agent unavailable'}</p>
                  <p className="text-xs text-ink/50 mt-2">
                    IP: {session.ipAddress || 'Unknown'} | Started: {formatDateTime(session.createdAt)} | Last seen: {formatDateTime(session.lastSeenAt)}
                  </p>
                </div>
                {!session.revoked && (
                  <Button variant="secondary" onClick={() => revokeSession(session)}>
                    {session.current ? 'End Current Session' : 'Revoke Session'}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!sessionLoading && !sessions.length && (
            <p className="text-sm text-ink/60">No active sessions recorded yet.</p>
          )}
        </div>
      </Card>

      <Card title="Security Tips">
        <div className="space-y-2 text-sm text-ink/70">
          <p>Review your active devices regularly and revoke anything unfamiliar.</p>
          <p>Keep professional license and certification details current for project assignments.</p>
          <p>Use sign out on shared devices after field operations or review sessions.</p>
        </div>
      </Card>
    </div>
  )
}
