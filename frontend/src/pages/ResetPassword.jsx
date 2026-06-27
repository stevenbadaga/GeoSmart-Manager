import React, { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Input from '../components/Input'
import Button from '../components/Button'
import { api } from '../api/http'

function passwordResetErrorMessage(err, fallback) {
  if (err?.status === 403) {
    return 'Your reset session is not available. Please request a new reset link.'
  }
  if (err?.status >= 500) {
    return 'Password reset is temporarily unavailable. Please try again.'
  }
  return err?.message || fallback
}

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')
  
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('No reset token found.')
      setValidating(false)
      return
    }

    api.get(`/api/auth/reset-password/validate?token=${token}`)
      .then(() => {
        setValid(true)
      })
      .catch(err => {
        setError(passwordResetErrorMessage(err, 'Invalid or expired token.'))
      })
      .finally(() => {
        setValidating(false)
      })
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      return setError('Passwords do not match.')
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/reset-password', {
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(passwordResetErrorMessage(err, 'Failed to reset password.'))
    } finally {
      setLoading(false)
    }
  }

  if (validating) return <div className="p-12 text-center text-ink/40">Validating reset token...</div>

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="text-center">
          <h1 className="text-3xl font-black text-ink tracking-tight">Set New Password</h1>
          <p className="mt-2 text-sm text-ink/50">Choose a secure password for your account.</p>
        </div>

        {!valid && !success ? (
          <div className="text-center space-y-4 p-4">
            <p className="text-sm font-bold text-danger">{error || 'This reset link is no longer valid.'}</p>
            <Link to="/forgot-password" title="Request new link" className="btn-secondary w-full block">Request New Link</Link>
          </div>
        ) : success ? (
          <div className="rounded-2xl bg-success/5 border border-success/20 p-6 text-center">
             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success mb-4">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
             </div>
             <p className="text-sm font-bold text-success">Password reset successfully!</p>
             <p className="mt-2 text-xs text-ink/50">Redirecting to login...</p>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <Input label="New Password" type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} required />
            <Input label="Confirm New Password" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
            
            {error && <p className="text-sm text-danger font-bold">{error}</p>}
            
            <Button className="w-full py-4 text-base" disabled={loading}>
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
