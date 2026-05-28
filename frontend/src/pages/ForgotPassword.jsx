import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { api } from '../api/http'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await api.post('/api/auth/password/forgot', { email })
      setMessage(data?.message || 'If the account exists, a reset email has been sent.')
    } catch (err) {
      setMessage('If this email exists, a reset link has been sent.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute left-[-90px] top-[-70px] h-64 w-64 rounded-full bg-river/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-70px] h-72 w-72 rounded-full bg-parcel/20 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1fr_0.95fr]">
        <section className="animate-rise space-y-6">
          <Link to="/" className="inline-flex items-center gap-3 text-ink">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-river text-lg font-semibold text-white shadow-sm">G</div>
            <div>
              <p className="text-base font-semibold">GeoSmart Manager</p>
              <p className="text-xs text-ink/60">Land Intelligence Platform</p>
            </div>
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-river">Password Recovery</p>
            <h1 className="mt-2 text-4xl leading-tight text-ink sm:text-5xl">Reset your password safely.</h1>
            <p className="mt-4 max-w-xl text-base text-ink/70">
              Enter the email address used on your GeoSmart account. If the account exists, we will send a password reset link.
            </p>
          </div>
          <div className="rounded-2xl border border-clay/70 bg-white/80 p-4">
            <p className="text-sm font-semibold text-ink">Email delivery</p>
            <p className="mt-1 text-xs text-ink/65">
              This flow uses the configured SMTP mailbox and app password on the backend to send the reset link.
            </p>
          </div>
        </section>

        <Card className="animate-rise stagger-2 w-full max-w-xl justify-self-center p-8 sm:p-10">
          <h2 className="text-3xl font-semibold text-ink">Forgot password</h2>
          <p className="mt-2 text-sm text-ink/65">Request a secure password reset link.</p>
          <form className="mt-7 space-y-5" onSubmit={onSubmit}>
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && <p className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
            {message && <p className="rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">{message}</p>}
            <Button className="w-full" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</Button>
          </form>
          <p className="mt-6 text-sm text-ink/70">
            Remembered it? <Link className="font-semibold text-river hover:text-moss transition-colors" to="/login">Back to sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
