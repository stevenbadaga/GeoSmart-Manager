import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card } from '../components/Card'
import { Link } from 'react-router-dom'
import { Lock, User2 } from 'lucide-react'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
})

export function LoginPage() {
  const { login, busy } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [error, setError] = useState('')
  const [needsMfa, setNeedsMfa] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', mfaCode: '' },
  })

  async function onSubmit(values) {
    setError('')
    setNeedsMfa(false)
    try {
      await login(values.username, values.password, values.mfaCode)
      const from = loc.state?.from || '/'
      nav(from, { replace: true })
    } catch (e) {
      const code = e?.response?.data?.code
      if (code === 'MFA_REQUIRED') {
        setNeedsMfa(true)
        setError('Enter the 6-digit code from your authenticator app.')
      } else {
        setError(e?.response?.data?.message || 'Login failed')
      }
    }
  }

  return (
    <div className="min-h-full bg-[radial-gradient(1200px_circle_at_0%_0%,#e0e7ff,transparent_55%),radial-gradient(900px_circle_at_100%_0%,#ede9fe,transparent_50%),linear-gradient(to_bottom,#ffffff,#f8fafc)] px-4 py-10 sm:py-14">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600" />
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.65)_1px,transparent_0)] [background-size:16px_16px]" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/15 ring-1 ring-white/20" />
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-wide text-white/90">GeoSmart-Manager</div>
                  <div className="text-xs text-white/70">AI-integrated geospatial ERP</div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="text-2xl font-semibold leading-tight">Land subdivision and survey operations, unified.</div>
                <div className="text-sm text-white/80">
                  Manage projects, geospatial datasets, compliance checks, field workflows, and stakeholder collaboration in one place.
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
                {['Projects', 'Geospatial data', 'AI subdivision', 'Compliance', 'Workflow/MIS', 'Reporting'].map((t) => (
                  <div key={t} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-white/70">Secure access with role-based permissions and MFA.</div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm lg:hidden" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
                  <p className="mt-1 text-sm text-slate-600">Use your account to access GeoSmart-Manager.</p>
                </div>
              </div>
            </div>

            <Card className="p-6">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <User2 className="h-4 w-4 text-slate-400" />
                    <Input
                      className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                      placeholder="Enter your username"
                      autoComplete="username"
                      {...register('username')}
                    />
                  </div>
                  {errors.username ? <div className="mt-1 text-xs text-rose-600">{errors.username.message}</div> : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Password</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <Input
                      className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      {...register('password')}
                    />
                  </div>
                  {errors.password ? <div className="mt-1 text-xs text-rose-600">{errors.password.message}</div> : null}
                </div>

                {needsMfa ? (
                  <div>
                    <label className="text-sm font-medium text-slate-700">MFA code</label>
                    <Input className="mt-1" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" {...register('mfaCode')} />
                  </div>
                ) : null}

                {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

                <Button className="w-full" type="submit" disabled={busy}>
                  {busy ? 'Signing in...' : 'Sign in'}
                </Button>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>
                    New here?{' '}
                    <Link className="font-medium text-indigo-700 hover:text-indigo-900" to="/register">
                      Create an account
                    </Link>
                  </span>
                  <span className="text-slate-500">MFA supported</span>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
