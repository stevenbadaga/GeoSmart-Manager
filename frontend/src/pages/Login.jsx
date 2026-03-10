import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/http'

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
      setError(err.message)
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
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute left-[-90px] top-[-70px] h-64 w-64 rounded-full bg-river/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-70px] h-72 w-72 rounded-full bg-parcel/20 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="animate-rise space-y-6">
          <Link to="/" className="inline-flex items-center gap-3 text-ink">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-river text-lg font-semibold text-white shadow-sm">G</div>
            <div>
              <p className="text-base font-semibold">GeoSmart Manager</p>
              <p className="text-xs text-ink/60">Land Intelligence Platform</p>
            </div>
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-river">Welcome Back</p>
            <h1 className="mt-2 text-4xl leading-tight text-ink sm:text-5xl">Sign in to your workspace.</h1>
            <p className="mt-4 max-w-xl text-base text-ink/70">
              Continue project monitoring, map analysis, and compliance workflows from your GeoSmart dashboard.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-clay/70 bg-white/80 p-4">
              <p className="text-sm font-semibold text-ink">Fast access</p>
              <p className="mt-1 text-xs text-ink/65">Everything from datasets to reports in one panel.</p>
            </div>
            <div className="rounded-2xl border border-clay/70 bg-white/80 p-4">
              <p className="text-sm font-semibold text-ink">Role-based controls</p>
              <p className="mt-1 text-xs text-ink/65">Admin and engineer permissions stay clearly separated.</p>
            </div>
          </div>
        </section>

        <Card className="animate-rise stagger-2 w-full max-w-xl justify-self-center p-8 sm:p-10">
          <h2 className="text-3xl font-semibold text-ink">Sign in</h2>
          <p className="mt-2 text-sm text-ink/65">Use your registered email and password.</p>
          <div className="mt-6 rounded-2xl border border-clay/70 bg-white/90 px-4 py-4">
            {googleConfigLoading && (
              <p className="text-xs text-center text-ink/55">Checking Google Sign-In configuration...</p>
            )}
            {!googleConfigLoading && !googleConfigured && (
              <p className="text-xs text-ink/60">
                Google Sign-In is not configured. Set <code className="font-semibold">GOOGLE_CLIENT_ID</code> on backend
                or <code className="font-semibold">VITE_GOOGLE_CLIENT_ID</code> on frontend.
              </p>
            )}
            {!googleConfigLoading && googleConfigured && (
              <div className={`flex justify-center ${googleLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <div ref={googleButtonRef} className="w-full max-w-[360px]" />
              </div>
            )}
            {!googleConfigLoading && googleConfigured && !googleReady && (
              <p className="mt-2 text-center text-xs text-ink/55">Preparing Google Sign-In...</p>
            )}
          </div>
          <div className="mt-5 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-ink/45">
            <span className="h-px flex-1 bg-clay/80" />
            or use email
            <span className="h-px flex-1 bg-clay/80" />
          </div>
          <form className="mt-7 space-y-5" onSubmit={onSubmit}>
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Password</span>
              <div className="relative">
                <input
                  className="input pr-16"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink/55 hover:text-ink/80"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {error && <p className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          </form>
          <p className="mt-6 text-sm text-ink/70">
            New here? <Link className="font-semibold text-river hover:text-moss transition-colors" to="/register">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
