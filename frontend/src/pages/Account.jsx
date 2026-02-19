import React from 'react'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'

export default function Account() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Account</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Profile & Access</h1>
        <p className="text-sm text-ink/60">View your account profile, role, and access level.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-sand border border-clay/70 flex items-center justify-center text-ink/60 text-xl font-semibold">
            {(user?.fullName || 'User').slice(0, 1)}
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">{user?.fullName || 'Survey Engineer'}</p>
            <p className="text-sm text-ink/60">{user?.email}</p>
          </div>
        </div>
        <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm text-ink/80">
          <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
            <p className="text-xs text-ink/50">Role</p>
            <p className="text-base font-semibold mt-2">{user?.role || 'ENGINEER'}</p>
          </div>
          <div className="rounded-xl border border-clay/70 bg-white/70 p-4">
            <p className="text-xs text-ink/50">Organization</p>
            <p className="text-base font-semibold mt-2">Venus Surveying & Engineering</p>
          </div>
        </div>
      </Card>

      <Card title="Security Tips">
        <div className="space-y-2 text-sm text-ink/70">
          <p>Keep your password secure and avoid sharing access tokens.</p>
          <p>Log out of shared devices after field operations.</p>
          <p>Contact your administrator to update roles or permissions.</p>
        </div>
      </Card>
    </div>
  )
}
