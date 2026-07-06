import React, { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api/http'
import { useTheme } from '../theme/ThemeContext'
import BrandLogo from '../components/BrandLogo'
import { publicImages, AUTH_BACKGROUND_IMAGE_URL } from '../assets/publicImages'

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
  const { isDark } = useTheme()
  
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [bgUrl, setBgUrl] = useState(AUTH_BACKGROUND_IMAGE_URL)

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

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-8 md:py-12">
      {/* Background Image and Premium Gradients */}
      <div className="absolute inset-0 z-0 select-none overflow-hidden">
        <img
          src={bgUrl}
          onError={() => setBgUrl(publicImages.authBgImage)}
          alt="GeoSmart land planning background"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            isDark ? 'opacity-[0.35]' : 'opacity-[0.65]'
          }`}
        />
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            isDark
              ? 'bg-gradient-to-br from-[#051411]/65 via-[#063F35]/40 to-[#071F1A]/70'
              : 'bg-gradient-to-br from-white/40 via-emerald-50/20 to-[#d1fae5]/35'
          }`}
        />
      </div>

      {/* Main Glass/Soft Card */}
      <div
        className={`relative z-10 w-full max-w-[420px] rounded-3xl p-6 sm:p-8 transition-all duration-300 border shadow-2xl ${
          isDark
            ? 'bg-[#0D2F27]/75 border-emerald-500/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl'
            : 'bg-white/85 border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-xl'
        }`}
      >
        {/* Logo wrapper */}
        <div className="mb-6 text-center">
          <BrandLogo
            to="/"
            src={publicImages.newWhiteLogoTransparent}
            className="mx-auto h-10 w-auto object-contain"
          />
        </div>

        {validating ? (
          <div className="space-y-4 text-center py-6">
            <div className={`mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent ${
              isDark ? 'border-emerald-500' : 'border-emerald-600'
            }`} />
            <p className={`text-sm ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>Validating reset token...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold tracking-tight ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}>
                Set New Password
              </h2>
              <p className={`mt-1.5 text-xs ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Choose a secure password for your account.
              </p>
            </div>

            {!valid && !success ? (
              <div className="text-center space-y-4 py-2">
                <p className="text-xs font-bold text-red-500">{error || 'This reset link is no longer valid.'}</p>
                <Link
                  to="/forgot-password"
                  className="w-full inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  Request New Link
                </Link>
              </div>
            ) : success ? (
              <div className="space-y-4 animate-in fade-in zoom-in duration-500 text-center">
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className={`text-lg font-bold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>Success!</h3>
                <p className={`text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>Password reset successfully.</p>
                <p className={`text-[10px] ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}>Redirecting to login...</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`} htmlFor="newPassword">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition duration-200 ${
                      isDark
                        ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                    }`}
                    value={form.newPassword}
                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`} htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition duration-200 ${
                      isDark
                        ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                    }`}
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                {error && (
                  <div className={`rounded-xl border p-3 text-xs text-center animate-in fade-in slide-in-from-top-2 duration-300 ${
                    isDark
                      ? 'border-red-900/30 bg-red-950/20 text-red-400'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}>
                     <p className="font-semibold">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98] mt-6"
                >
                  {loading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
