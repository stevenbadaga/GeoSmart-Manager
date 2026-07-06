import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { publicImages, AUTH_BACKGROUND_IMAGE_URL } from '../assets/publicImages'
import BrandLogo from '../components/BrandLogo'
import { useTheme } from '../theme/ThemeContext'

function loginErrorMessage(error) {
  if (!error) return 'Unable to sign in. Please try again.'
  if (error.status === 401 || error.status === 403) {
    return error.message && error.message !== 'Request failed'
      ? error.message
      : 'Invalid email or password.'
  }
  if (error.message === 'Failed to fetch' || error.message === 'NetworkError when attempting to fetch resource.') {
    return 'Unable to reach the GeoSmart server. Check that the backend is running.'
  }
  return error.message || 'Unable to sign in. Please try again.'
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bgUrl, setBgUrl] = useState(AUTH_BACKGROUND_IMAGE_URL)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    // Capture standard form values or browser autofilled values directly from DOM
    const emailValue = event.target.elements.email.value.trim()
    const passwordValue = event.target.elements.password.value

    try {
      await login({ email: emailValue, password: passwordValue })
      navigate('/dashboard')
    } catch (err) {
      setError(loginErrorMessage(err))
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

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Welcome back
          </h2>
          <p className={`mt-1.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Sign in to continue to your GeoSmart workspace.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="password">
                Password
              </label>
              <Link className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors" to="/forgot-password">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full rounded-xl border pl-4 pr-12 py-2.5 text-sm outline-none transition duration-200 ${
                  isDark
                    ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                }`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-700'
                } transition-colors`}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
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
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="my-6 border-t border-slate-200/10 dark:border-emerald-500/10" />

        <div className="space-y-3 text-center text-xs">
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            New to GeoSmart?{' '}
            <Link className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" to="/register">
              Create an account
            </Link>
          </p>
          <Link className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-colors ${
            isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
          }`} to="/">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5m7 7l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
