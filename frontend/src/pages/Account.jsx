import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { useToast } from '../components/ToastProvider'

function toneAction(action) {
  if (!action) return 'slate'
  const v = String(action).toUpperCase()
  if (v.includes('DELETED') || v.includes('DISABLED') || v.includes('FAILED')) return 'red'
  if (v.includes('CREATED') || v.includes('ENABLED') || v.includes('UPLOADED')) return 'green'
  return 'slate'
}

function ProfileTab({ user, onUserUpdated }) {
  const toast = useToast()
  const [profile, setProfile] = useState(() => ({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    licenseNumber: user?.licenseNumber || '',
    certification: user?.certification || '',
    specialization: user?.specialization || '',
  }))

  const updateProfileMutation = useMutation({
    mutationFn: async () => (await api.put('/api/auth/profile', profile)).data,
    onSuccess: async (updated) => {
      onUserUpdated(updated)
      setProfile({
        fullName: updated.fullName || '',
        phone: updated.phone || '',
        licenseNumber: updated.licenseNumber || '',
        certification: updated.certification || '',
        specialization: updated.specialization || '',
      })
      toast.success('Saved', 'Profile updated.')
    },
    onError: (e) => toast.error('Save failed', e?.response?.data?.message || 'Unable to update profile.'),
  })

  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">Username</label>
          <Input value={user?.username || ''} readOnly />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input value={user?.email || ''} readOnly />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Role</label>
          <div className="mt-1">
            <Badge tone={user?.role === 'ADMIN' ? 'blue' : 'slate'}>{user?.role || '-'}</Badge>
          </div>
        </div>
        <div />

        <div>
          <label className="text-sm font-medium text-slate-700">Full name</label>
          <Input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Phone</label>
          <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">License number (optional)</label>
          <Input
            value={profile.licenseNumber}
            onChange={(e) => setProfile((p) => ({ ...p, licenseNumber: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Certification</label>
          <Input value={profile.certification} onChange={(e) => setProfile((p) => ({ ...p, certification: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Specialization</label>
          <Input
            value={profile.specialization}
            onChange={(e) => setProfile((p) => ({ ...p, specialization: e.target.value }))}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
        </Button>
      </div>
    </Card>
  )
}

function SecurityTab({ user, sessionId, onUserUpdated, onLogout }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [mfaSetup, setMfaSetup] = useState(null)
  const [mfaCode, setMfaCode] = useState('')

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/api/auth/sessions')).data,
  })

  const startMfaMutation = useMutation({
    mutationFn: async () => (await api.get('/api/auth/mfa/setup')).data,
    onSuccess: (data) => {
      setMfaSetup(data)
      setMfaCode('')
      toast.success('MFA setup started', 'Scan the QR in your authenticator app or copy the secret.')
    },
    onError: (e) => toast.error('MFA failed', e?.response?.data?.message || 'Unable to start MFA setup.'),
  })

  const enableMfaMutation = useMutation({
    mutationFn: async () => (await api.post('/api/auth/mfa/enable', { code: mfaCode })).data,
    onSuccess: async (updated) => {
      onUserUpdated(updated)
      setMfaSetup(null)
      setMfaCode('')
      toast.success('MFA enabled', 'Multi-factor authentication is now enabled.')
    },
    onError: (e) => toast.error('Enable failed', e?.response?.data?.message || 'Invalid code.'),
  })

  const disableMfaMutation = useMutation({
    mutationFn: async () => (await api.post('/api/auth/mfa/disable', { code: mfaCode })).data,
    onSuccess: async (updated) => {
      onUserUpdated(updated)
      setMfaSetup(null)
      setMfaCode('')
      toast.success('MFA disabled', 'Multi-factor authentication has been disabled.')
    },
    onError: (e) => toast.error('Disable failed', e?.response?.data?.message || 'Invalid code.'),
  })

  const revokeSessionMutation = useMutation({
    mutationFn: async (id) => (await api.post(`/api/auth/sessions/${id}/revoke`)).data,
    onSuccess: async (_, id) => {
      await qc.invalidateQueries({ queryKey: ['sessions'] })
      if (String(id) === String(sessionId)) {
        onLogout()
      } else {
        toast.success('Session revoked', 'Device signed out.')
      }
    },
    onError: (e) => toast.error('Revoke failed', e?.response?.data?.message || 'Unable to revoke session.'),
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Multi-factor authentication (MFA)</div>
            <div className="mt-1 text-sm text-slate-600">Protect your account with a time-based one-time password (TOTP).</div>
          </div>
          <Badge tone={user?.mfaEnabled ? 'green' : 'slate'}>{user?.mfaEnabled ? 'Enabled' : 'Disabled'}</Badge>
        </div>

        {!user?.mfaEnabled ? (
          <div className="mt-4 space-y-3">
            <Button variant="outline" onClick={() => startMfaMutation.mutate()} disabled={startMfaMutation.isPending}>
              {startMfaMutation.isPending ? 'Starting...' : 'Start MFA setup'}
            </Button>

            {mfaSetup ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-900">Setup info</div>
                <div className="mt-2 text-xs text-slate-600">Secret</div>
                <div className="mt-1 flex items-center gap-2">
                  <Input value={mfaSetup.secret} readOnly />
                  <Button variant="outline" size="sm" type="button" onClick={() => navigator.clipboard.writeText(mfaSetup.secret)}>
                    Copy
                  </Button>
                </div>
                <div className="mt-2 text-xs text-slate-600">OTPAuth URL</div>
                <div className="mt-1 flex items-center gap-2">
                  <Input value={mfaSetup.otpauthUrl} readOnly />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(mfaSetup.otpauthUrl)}
                  >
                    Copy
                  </Button>
                </div>

                <div className="mt-3">
                  <label className="text-sm font-medium text-slate-700">Enter 6-digit code</label>
                  <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" inputMode="numeric" />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={() => enableMfaMutation.mutate()} disabled={enableMfaMutation.isPending || !mfaCode}>
                      {enableMfaMutation.isPending ? 'Enabling...' : 'Enable MFA'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Enter code to disable MFA</label>
              <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" inputMode="numeric" />
            </div>
            <div className="flex justify-end">
              <Button variant="danger" onClick={() => disableMfaMutation.mutate()} disabled={disableMfaMutation.isPending || !mfaCode}>
                {disableMfaMutation.isPending ? 'Disabling...' : 'Disable MFA'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Devices & sessions</div>
          <div className="mt-1 text-sm text-slate-600">Review your active sessions and revoke access to devices.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sessionsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-5 text-slate-600" colSpan={3}>
                    Loading...
                  </td>
                </tr>
              ) : null}
              {(sessionsQuery.data ?? []).map((s) => {
                const isCurrent = String(s.id) === String(sessionId)
                const revoked = !!s.revokedAt
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {s.id.slice(0, 8)} {isCurrent ? <Badge className="ml-2" tone="blue">Current</Badge> : null}
                          {revoked ? <Badge className="ml-2" tone="red">Revoked</Badge> : null}
                        </div>
                        <div className="truncate text-xs text-slate-600">{s.userAgent || 'Unknown device'}</div>
                        <div className="truncate text-xs text-slate-500">{s.ipAddress || ''}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      {!revoked ? (
                        <Button
                          size="sm"
                          variant={isCurrent ? 'danger' : 'outline'}
                          onClick={() => revokeSessionMutation.mutate(s.id)}
                          disabled={revokeSessionMutation.isPending}
                        >
                          {isCurrent ? 'Sign out' : 'Revoke'}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function ActivityTab() {
  const activityQuery = useQuery({
    queryKey: ['my-activity'],
    queryFn: async () => (await api.get('/api/auth/activity', { params: { page: 0, size: 50 } })).data,
  })

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">Activity log</div>
        <div className="mt-1 text-sm text-slate-600">Your recent actions in the system (audit trail).</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {activityQuery.isLoading ? (
              <tr>
                <td className="px-4 py-5 text-slate-600" colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : null}
            {(activityQuery.data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-slate-700">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}</td>
                <td className="px-4 py-3">
                  <Badge tone={toneAction(a.action)}>{a.action}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-700">{a.entityType}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{a.entityId || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function AccountPage() {
  const { user, sessionId, logout, updateUser } = useAuth()
  const [tab, setTab] = useState('profile')
  const effectiveUser = user

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Account</h1>
          <p className="mt-1 text-sm text-slate-600">Profile, MFA security, devices, and your activity log.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === 'profile' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('profile')}>
            Profile
          </Button>
          <Button variant={tab === 'security' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('security')}>
            Security
          </Button>
          <Button variant={tab === 'activity' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('activity')}>
            Activity
          </Button>
        </div>
      </div>

      {tab === 'profile' ? <ProfileTab user={effectiveUser} onUserUpdated={updateUser} /> : null}

      {tab === 'security' ? (
        <SecurityTab user={effectiveUser} sessionId={sessionId} onUserUpdated={updateUser} onLogout={logout} />
      ) : null}

      {tab === 'activity' ? <ActivityTab /> : null}
    </div>
  )
}
