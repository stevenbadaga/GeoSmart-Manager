import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { api } from '../api/http'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    if (!token) {
      setChecking(false)
      setTokenValid(false)
      setError('Password reset token is missing.')
      return () => {
        active = false
      }
    }

    setChecking(true)
    setError('')
    api.get(`/api/auth/password/reset/validate?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (!active) return
        setTokenValid(Boolean(data?.valid))
        setInfo(data?.message || 'Reset link is valid.')
      })
      .catch((err) => {
        if (!active) return
        setTokenValid(false)
        setError(err.message || 'This password reset link is invalid.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const data = await api.post('/api/auth/password/reset', {
        token,
        newPassword,
        confirmPassword
      })
      setSuccess(data?.message || 'Password updated successfully.')
      setTokenValid(false)
    } catch (err) {
      setError(err.message || 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute left-[-90px] top-[-70px] h-64 w-64 rounded-full bg-water/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-70px] h-72 w-72 rounded-full bg-river/20 blur-3xl" />

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
            <p className="text-xs uppercase tracking-[0.2em] text-river">Set New Password</p>
            <h1 className="mt-2 text-4xl leading-tight text-ink sm:text-5xl">Choose a new sign-in password.</h1>
            <p className="mt-4 max-w-xl text-base text-ink/70">
              Use a strong password you can remember. After the reset, previous sessions will be revoked for security.
            </p>
          </div>
        </section>

        <Card className="animate-rise stagger-2 w-full max-w-xl justify-self-center p-8 sm:p-10">
          <h2 className="text-3xl font-semibold text-ink">Reset password</h2>
          <p className="mt-2 text-sm text-ink/65">This reset link works once and expires automatically.</p>

          {checking && <p className="mt-6 text-sm text-ink/60">Checking reset link...</p>}
          {!checking && info && <p className="mt-6 rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">{info}</p>}
          {!checking && error && <p className="mt-6 rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
          {!checking && success && <p className="mt-6 rounded-xl border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">{success}</p>}

          {!checking && tokenValid && !success && (
            <form className="mt-7 space-y-5" onSubmit={onSubmit}>
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
              <Button className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</Button>
            </form>
          )}

          <p className="mt-6 text-sm text-ink/70">
            Return to <Link className="font-semibold text-river hover:text-moss transition-colors" to="/login">sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
