import React from 'react'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">System Preferences</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Settings</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">Manage profile context, notification preferences, and system disclaimer visibility.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile Settings">
          <div className="space-y-2 text-sm text-ink/68">
            <p><span className="font-bold text-ink">Name:</span> {user?.fullName || 'Not available'}</p>
            <p><span className="font-bold text-ink">Email:</span> {user?.email || 'Not available'}</p>
            <p><span className="font-bold text-ink">Role:</span> {user?.role === 'SURVEYOR' ? 'Land Surveyor' : user?.role || 'Not available'}</p>
            <p><span className="font-bold text-ink">Status:</span> {user?.status || 'Not available'}</p>
          </div>
        </Card>
        <Card title="Notification Preferences">
          <div className="space-y-3 text-sm text-ink/68">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email me when a project is assigned</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email me when a report is generated</label>
            <label className="flex items-center gap-2"><input type="checkbox" /> Email me weekly project summaries</label>
          </div>
        </Card>
        {isAdmin && (
          <Card title="Email Configuration Status">
            <p className="text-sm leading-7 text-ink/68">SMTP delivery is enabled only when environment variables are configured. SMTP passwords are never shown in the UI.</p>
            <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-3 text-sm text-ink/68">
              Email service is disabled until SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM are configured.
            </div>
          </Card>
        )}
        <Card title="System Disclaimer">
          <p className="text-sm leading-7 text-ink/68">GeoSmart Manager provides preliminary planning and compliance support only. It does not replace official approval by NLA, District One Stop Centre, Irembo, or a licensed land surveyor.</p>
        </Card>
      </div>
    </div>
  )
}
