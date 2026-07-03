import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/http'
import { publicImages } from '../assets/publicImages'
import BrandLogo from '../components/BrandLogo'
import { useTheme } from '../theme/ThemeContext'

export default function ForgotPassword() {
  const { isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetLink, setResetLink] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setResetLink('')
    try {
      const res = await api.post('/api/auth/forgot-password', { email })
      setMessage(res.message)
      setResetLink(res.resetLink || '')
    } catch (err) {
      if (err?.status === 403) {
        setError('Password reset could not be sent. Please refresh and try again.')
      } else if (err?.status >= 500) {
        setError('Password reset could not be sent because the server is unavailable. Please try again.')
      } else {
        setError(err.message || 'Password reset could not be sent. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-8 md:py-12">
      {/* Background Image and Premium Gradients */}
      <div className="absolute inset-0 z-0 select-none">
        <img
          src={publicImages.sunriseLandscapeImage}
          alt="GeoSmart land planning"
          className={`h-full w-full object-cover transition-opacity duration-700 scale-105 filter blur-[1px] ${
            isDark ? 'opacity-25' : 'opacity-45'
          }`}
        />
        <div
          className={`absolute inset-0 transition-colors duration-700 ${
            isDark
              ? 'bg-gradient-to-br from-[#051411]/98 via-[#063F35]/85 to-slate-950/98'
              : 'bg-gradient-to-br from-emerald-50/90 via-slate-100/85 to-[#d1fae5]/80'
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

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Forgot your password?
          </h2>
          <p className={`mt-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Enter your email and we'll help you reset it.
          </p>
        </div>

        {message ? (
          <div className="space-y-4 animate-in fade-in zoom-in duration-500 text-center">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Check your email</h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{message}</p>
            {resetLink && (
              <a
                href={resetLink}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
              >
                Continue to reset password
              </a>
            )}
            <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors">
               Back to sign in
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition duration-200 ${
                  isDark
                    ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending link...
                </span>
              ) : 'Send reset link'}
            </button>

            <div className="my-6 border-t border-slate-200/10 dark:border-emerald-500/10" />

            <div className="space-y-3 text-center text-xs">
              <Link className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors block" to="/login">
                Back to sign in
              </Link>
              <Link className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-colors ${
                isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`} to="/">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5m7 7l-7-7 7-7" />
                </svg>
                Back to home
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
