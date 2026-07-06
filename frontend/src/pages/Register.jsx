import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { publicImages, AUTH_BACKGROUND_IMAGE_URL } from '../assets/publicImages'
import BrandLogo from '../components/BrandLogo'
import { useTheme } from '../theme/ThemeContext'

const registrationRoleOptions = [
  { value: 'SURVEYOR', label: 'Land Surveyor' },
  { value: 'CLIENT', label: 'Client' }
]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { isDark } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('SURVEYOR')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bgUrl, setBgUrl] = useState(AUTH_BACKGROUND_IMAGE_URL)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({
        fullName,
        email,
        password,
        role
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-6 md:py-10">
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
        className={`relative z-10 w-full max-w-[440px] rounded-3xl p-6 sm:p-8 transition-all duration-300 border shadow-2xl ${
          isDark
            ? 'bg-[#0D2F27]/75 border-emerald-500/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl'
            : 'bg-white/85 border-slate-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur-xl'
        }`}
      >
        {/* Logo wrapper */}
        <div className="mb-4 text-center">
          <BrandLogo
            to="/"
            src={publicImages.newWhiteLogoTransparent}
            className="mx-auto h-9 w-auto object-contain"
          />
        </div>

        <div className="text-center mb-5">
          <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Create your account
          </h2>
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Open your GeoSmart Manager workspace.
          </p>
        </div>

        <form className="space-y-3.5" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition duration-200 ${
                isDark
                  ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
              }`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition duration-200 ${
                isDark
                  ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
              }`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a password"
                className={`w-full rounded-xl border pl-4 pr-12 py-2 text-sm outline-none transition duration-200 ${
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

          <div className="space-y-1">
            <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className={`w-full rounded-xl border px-4 py-2 text-sm outline-none transition duration-200 appearance-none bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat ${
                isDark
                  ? 'border-emerald-800/30 bg-[#091612]/90 text-slate-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2334d399%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E\')]'
                  : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E\')]'
              }`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {registrationRoleOptions.map((option) => (
                <option key={option.value} value={option.value} className={isDark ? 'bg-[#0D2F27] text-slate-100' : 'bg-white text-slate-900'}>
                  {option.label}
                </option>
              ))}
            </select>
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
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-5 py-2 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98] mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="my-5 border-t border-slate-200/10 dark:border-emerald-500/10" />

        <div className="space-y-2.5 text-center text-xs">
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Already registered?{' '}
            <Link className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline" to="/login">
              Sign in
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
