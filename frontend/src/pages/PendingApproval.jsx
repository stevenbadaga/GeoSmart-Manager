import React, { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import PublicLayout from '../components/PublicLayout'
import { useAuth } from '../auth/AuthContext'

export default function PendingApproval() {
  const { token, user, isApproved, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  if (isApproved) return <Navigate to="/dashboard" replace />

  return (
    <PublicLayout>
      <section className="grid gap-6 py-16 lg:grid-cols-[1fr_0.7fr]">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Account pending</p>
          <h1 className="text-4xl leading-tight text-ink">Your account is awaiting admin approval.</h1>
          <p className="text-base text-ink/70">
            Thank you for signing up. An administrator must approve your account before you can access the dashboard or AI Subdivision tools.
          </p>
          <Card className="bg-white/85">
            <p className="text-sm text-ink/70"><span className="font-semibold text-ink">Account:</span> {user?.email || 'Pending user'}</p>
            <p className="mt-2 text-sm text-ink/70">
              We will notify you once approval is complete. If this is urgent, contact your workspace admin.
            </p>
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={logout}>Sign out</Button>
            <Link className="btn-secondary" to="/contact">Contact admin team</Link>
          </div>
        </div>

        <Card className="bg-sand/80">
          <h3 className="mb-3 text-lg font-semibold">Next steps</h3>
          <ul className="space-y-2 text-sm text-ink/70">
            <li>- Approval typically takes one business day.</li>
            <li>- You will receive an email once your status changes to <strong>Approved</strong>.</li>
            <li>- After approval, you can open the dashboard and AI Subdivision modules.</li>
          </ul>
          <div className="mt-4 rounded-xl border border-clay/60 bg-white/90 px-3 py-2 text-xs text-ink/70">
            Want to revise your profile details? You can update them after approval in the Account page.
          </div>
        </Card>
      </section>
    </PublicLayout>
  )
}
