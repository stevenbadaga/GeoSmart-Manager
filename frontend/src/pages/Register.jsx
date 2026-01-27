import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Card } from '../components/Card'
import { Link } from 'react-router-dom'

const schema = z
  .object({
    role: z.enum(['SURVEYOR', 'ENGINEER', 'PROJECT_MANAGER', 'CLIENT']),
    username: z.string().min(2, 'Username is required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    licenseNumber: z.string().optional(),
    certification: z.string().optional(),
    specialization: z.string().optional(),
    clientName: z.string().optional(),
    clientAddress: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === 'CLIENT') {
      if (!v.clientName || v.clientName.trim().length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Client/organization name is required', path: ['clientName'] })
      }
    }
  })

export function RegisterPage() {
  const { register: registerAccount, busy } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState('')

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'ENGINEER',
      username: '',
      email: '',
      password: '',
      fullName: '',
      phone: '',
      licenseNumber: '',
      certification: '',
      specialization: '',
      clientName: '',
      clientAddress: '',
    },
  })

  const role = form.watch('role')
  const isClient = role === 'CLIENT'

  async function onSubmit(values) {
    setError('')
    try {
      await registerAccount({
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role,
        fullName: values.fullName || null,
        phone: values.phone || null,
        licenseNumber: values.licenseNumber || null,
        certification: values.certification || null,
        specialization: values.specialization || null,
        clientName: values.clientName || null,
        clientAddress: values.clientAddress || null,
      })
      nav('/', { replace: true })
    } catch (e) {
      setError(e?.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-indigo-50 to-white px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600">Register as a survey professional or client stakeholder.</p>
        </div>

        <Card className="p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                {...form.register('role')}
              >
                <option value="SURVEYOR">Surveyor</option>
                <option value="ENGINEER">Engineer</option>
                <option value="PROJECT_MANAGER">Project Manager</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>

            {isClient ? (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">Client/Organization name</label>
                  <Input {...form.register('clientName')} />
                  {form.formState.errors.clientName ? (
                    <div className="mt-1 text-xs text-rose-600">{form.formState.errors.clientName.message}</div>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Address</label>
                  <Input {...form.register('clientAddress')} />
                </div>
              </>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Username</label>
                <Input {...form.register('username')} />
                {form.formState.errors.username ? (
                  <div className="mt-1 text-xs text-rose-600">{form.formState.errors.username.message}</div>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <Input {...form.register('phone')} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email ? <div className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</div> : null}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <div className="mt-1 text-xs text-rose-600">{form.formState.errors.password.message}</div>
              ) : null}
            </div>

            {!isClient ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Full name</label>
                    <Input {...form.register('fullName')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">License number (optional)</label>
                    <Input {...form.register('licenseNumber')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Certification</label>
                    <Input {...form.register('certification')} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Specialization</label>
                    <Input {...form.register('specialization')} />
                  </div>
                </div>
              </>
            ) : null}

            {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? 'Creating...' : 'Create account'}
            </Button>

            <div className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link className="font-medium text-indigo-700 hover:text-indigo-900" to="/login">
                Sign in
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
