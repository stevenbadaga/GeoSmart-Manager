import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/http'
import { publicImages } from '../assets/publicImages'
import BrandLogo from '../components/BrandLogo'

const GOOGLE_SCRIPT_SOURCE = 'https://accounts.google.com/gsi/client'

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google)
      return
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SOURCE}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Google Sign-In script.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SOURCE
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Unable to load Google Sign-In script.'))
    document.head.appendChild(script)
  })
}

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
  const { login, googleLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [googleConfigLoading, setGoogleConfigLoading] = useState(true)
  const googleButtonRef = useRef(null)
  const [googleClientId, setGoogleClientId] = useState((import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim())

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadGoogleClientId = async () => {
      if (googleClientId) {
        setGoogleConfigured(true)
        setGoogleConfigLoading(false)
        return
      }
      try {
        const config = await api.get('/api/auth/google/config')
        if (!active) return
        const clientId = (config?.clientId || '').trim()
        setGoogleClientId(clientId)
        setGoogleConfigured(Boolean(config?.enabled && clientId))
      } catch {
        if (!active) return
        setGoogleConfigured(false)
      } finally {
        if (active) setGoogleConfigLoading(false)
      }
    }

    loadGoogleClientId()

    return () => {
      active = false
    }
  }, [googleClientId])

  useEffect(() => {
    let active = true

    if (!googleConfigured || !googleClientId) {
      setGoogleReady(false)
      return () => {
        active = false
      }
    }

    const initializeGoogleSignIn = async () => {
      try {
        const google = await loadGoogleIdentityScript()
        if (!active || !google?.accounts?.id || !googleButtonRef.current) return

        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response?.credential) return
            setError('')
            setGoogleLoading(true)
            try {
              await googleLogin({ idToken: response.credential })
              navigate('/dashboard')
            } catch (err) {
              setError(err.message || 'Google sign-in failed.')
            } finally {
              setGoogleLoading(false)
            }
          },
          ux_mode: 'popup',
          auto_select: false
        })

        googleButtonRef.current.innerHTML = ''
        const buttonWidth = Math.min(360, Math.max(250, Math.floor(googleButtonRef.current.getBoundingClientRect().width || 360)))
        google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'outline',
          text: 'continue_with',
          shape: 'pill',
          size: 'large',
          width: buttonWidth
        })

        setGoogleReady(true)
      } catch {
        if (!active) return
        setGoogleReady(false)
      }
    }

    initializeGoogleSignIn()

    return () => {
      active = false
    }
  }, [googleConfigured, googleClientId, googleLogin, navigate])

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-slate-50">
      {/* LEFT SIDE: IMAGE PANEL (IMAGE ONLY) */}
      <section className="relative hidden lg:block lg:w-1/2 overflow-hidden bg-emerald-950">
        <img
          src={publicImages.sunriseLandscapeImage}
          alt="GeoSmart land planning professional banner"
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


            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">Sign in to continue to your GeoSmart Manager workspace.</p>

            {/* Google Sign-In Area (Only if configured) */}
            {!googleConfigLoading && googleConfigured && (
              <div className="mt-8 space-y-6">
                <div className={`flex justify-center ${googleLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                  <div ref={googleButtonRef} className="w-full" />
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-slate-400 font-bold">
                  <span className="h-px flex-1 bg-slate-100" />
                  or sign in with email
                  <span className="h-px flex-1 bg-slate-100" />
                </div>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={onSubmit}>
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
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
                  <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors" to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
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
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            <div className="my-8 border-t border-slate-100" />

            <div className="space-y-4 text-center text-sm text-slate-600">
              <p>
                New to GeoSmart?{' '}
                <Link className="font-semibold text-emerald-700 hover:text-emerald-800 transition-colors" to="/register">
                  Create an account
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
