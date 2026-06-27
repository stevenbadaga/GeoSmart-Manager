import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { publicImages } from '../assets/publicImages'
import BrandLogo from '../components/BrandLogo'

const registrationRoleOptions = [
  { value: 'SURVEYOR', label: 'Land Surveyor' },
  { value: 'CLIENT', label: 'Client' }
]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('SURVEYOR')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="relative min-h-screen flex overflow-hidden bg-slate-50">
      {/* LEFT SIDE: IMAGE PANEL (IMAGE ONLY) */}
      <section className="relative hidden lg:block lg:w-1/2 overflow-hidden bg-emerald-950">
        <img
          src={publicImages.sunriseLandscapeImage}
          alt="GeoSmart land planning professional registration banner"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/75 via-emerald-950/55 to-slate-950/40" />
      </section>

      {/* RIGHT SIDE: AUTH PANEL */}
      <div className="flex min-h-screen flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl md:p-10">
            {/* Logo Wrapper */}
            <div className="mb-10 text-center">
              <BrandLogo to="/" src={publicImages.newWhiteLogoTransparent} className="mx-auto h-12 w-auto object-contain" />
            </div>


            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Create your account</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">Use your details to open your GeoSmart Manager workspace.</p>

            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-700 transition-colors"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="role">Role</label>
                <select
                  id="role"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {registrationRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
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
                    Creating...
                  </span>
                ) : 'Create account'}
              </button>
            </form>

            <div className="my-8 border-t border-slate-100" />

            <div className="space-y-4 text-center text-sm text-slate-600">
              <p>
                Already registered?{' '}
                <Link className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors" to="/login">
                  Sign in
                </Link>
              </p>
              <Link className="inline-flex items-center justify-center gap-2 font-semibold text-slate-400 hover:text-slate-600 transition-colors" to="/">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5m7 7l-7-7 7-7" />
                </svg>
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
