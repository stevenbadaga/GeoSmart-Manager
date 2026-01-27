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
    defaultValues: { username: 'admin', password: 'Admin123!', mfaCode: '' },
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
    <div className="min-h-full bg-gradient-to-b from-indigo-50 to-white px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">GeoSmart-Manager</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to manage clients, projects, geospatial datasets, and automated subdivision workflows.
          </p>
        </div>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="text-sm font-medium text-slate-700">Username</label>
              <Input placeholder="admin" {...register('username')} />
              {errors.username ? <div className="mt-1 text-xs text-rose-600">{errors.username.message}</div> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input type="password" placeholder="••••••••" {...register('password')} />
              {errors.password ? <div className="mt-1 text-xs text-rose-600">{errors.password.message}</div> : null}
            </div>

            {needsMfa ? (
              <div>
                <label className="text-sm font-medium text-slate-700">MFA code</label>
                <Input placeholder="123456" inputMode="numeric" autoComplete="one-time-code" {...register('mfaCode')} />
              </div>
            ) : null}

            {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
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

            <div className="text-xs text-slate-500">
              Default dev account: <span className="font-mono">admin / Admin123!</span>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
