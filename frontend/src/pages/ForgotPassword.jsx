import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/http'
import { publicImages } from '../assets/publicImages'
import BrandLogo from '../components/BrandLogo'

export default function ForgotPassword() {
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
    <div className="relative min-h-screen flex overflow-hidden bg-slate-50">
      {/* LEFT SIDE: IMAGE PANEL (IMAGE ONLY) */}
      <section className="relative hidden lg:block lg:w-1/2 overflow-hidden bg-emerald-950">
        <img
          src={publicImages.sunriseLandscapeImage}
          alt="GeoSmart land planning professional password recovery banner"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/75 via-emerald-950/55 to-slate-950/40" />
      </section>

      {/* RIGHT SIDE: AUTH PANEL */}
      <div className="flex min-h-screen flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl md:p-10">
            {/* Logo Wrapper */}
            <div className="mb-10 text-center">
              <BrandLogo to="/" src={publicImages.newWhiteLogoTransparent} className="mx-auto h-12 w-auto object-contain" />
            </div>


            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Forgot your password?</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">Enter your email address and we’ll help you reset your password.</p>

            {message ? (
              <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-100 p-10 text-center animate-in fade-in zoom-in duration-500">
                <div className="mx-auto flex h-16 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-6">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Check your email</h3>
                <p className="text-slate-600 leading-relaxed">{message}</p>
                {resetLink && (
                  <a
                    href={resetLink}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/10 transition hover:bg-emerald-800"
                  >
                    Continue to reset password
                  </a>
                )}
                <Link to="/login" className="mt-8 inline-flex items-center gap-2 font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
                   Back to sign in
                </Link>
              </div>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2 duration-300">
                     <p className="font-semibold text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-8 w-full rounded-2xl bg-emerald-700 px-6 py-4 text-base font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-700/10"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending link...
                    </span>
                  ) : 'Send reset link'}
                </button>

                <div className="my-8 border-t border-slate-100" />

                <div className="space-y-4 text-center text-sm text-slate-600">
                  <Link className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors" to="/login">
                    Back to sign in
                  </Link>
                  <p>
                  <Link className="inline-flex items-center justify-center gap-2 font-semibold text-slate-400 hover:text-slate-600 transition-colors" to="/">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 12H5m7 7l-7-7 7-7" />
                    </svg>
                    Back to home
                  </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
