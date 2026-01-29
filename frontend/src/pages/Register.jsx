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
import { Building2, IdCard, Mail, Phone, Shield, User2, UserCog } from 'lucide-react'

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
                  <div className="text-xs text-white/70">Teams, projects, and geospatial data</div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div className="text-2xl font-semibold leading-tight">Create an account in minutes.</div>
                <div className="text-sm text-white/80">
                  Choose your role and get access to geospatial workflows, compliance validation, reporting, and stakeholder collaboration.
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
                {['Role-based access', 'MFA ready', 'Audit log', 'Projects', 'Compliance', 'Field sync'].map((t) => (
                  <div key={t} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-white/70">Create a staff account or a client stakeholder portal login.</div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm lg:hidden" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create account</h1>
                  <p className="mt-1 text-sm text-slate-600">Register as staff (surveyor/engineer/PM) or as a client.</p>
                </div>
              </div>
            </div>

            <Card className="p-6">
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <div>
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <UserCog className="h-4 w-4 text-slate-400" />
                    <select
                      className="h-11 w-full bg-transparent pr-2 text-sm text-slate-900 focus:outline-none"
                      {...form.register('role')}
                    >
                      <option value="SURVEYOR">Surveyor</option>
                      <option value="ENGINEER">Engineer</option>
                      <option value="PROJECT_MANAGER">Project Manager</option>
                      <option value="CLIENT">Client</option>
                    </select>
                  </div>
                </div>

                {isClient ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Client/Organization name</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <Input
                          className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                          placeholder="Company or organization name"
                          {...form.register('clientName')}
                        />
                      </div>
                      {form.formState.errors.clientName ? (
                        <div className="mt-1 text-xs text-rose-600">{form.formState.errors.clientName.message}</div>
                      ) : null}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Address</label>
                      <Input className="mt-1" placeholder="Street, district, city" {...form.register('clientAddress')} />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Username</label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                      <User2 className="h-4 w-4 text-slate-400" />
                      <Input
                        className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                        placeholder="Choose a username"
                        autoComplete="username"
                        {...form.register('username')}
                      />
                    </div>
                    {form.formState.errors.username ? (
                      <div className="mt-1 text-xs text-rose-600">{form.formState.errors.username.message}</div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Email</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <Input
                          className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                          type="email"
                          placeholder="name@example.com"
                          autoComplete="email"
                          {...form.register('email')}
                        />
                      </div>
                      {form.formState.errors.email ? (
                        <div className="mt-1 text-xs text-rose-600">{form.formState.errors.email.message}</div>
                      ) : null}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">Phone</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <Input
                          className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                          placeholder="+250 7xx xxx xxx"
                          autoComplete="tel"
                          {...form.register('phone')}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <Input
                        className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                        type="password"
                        placeholder="Create a password"
                        autoComplete="new-password"
                        {...form.register('password')}
                      />
                    </div>
                    {form.formState.errors.password ? (
                      <div className="mt-1 text-xs text-rose-600">{form.formState.errors.password.message}</div>
                    ) : null}
                  </div>
                </div>

                {!isClient ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">Professional profile</div>
                      <div className="mt-1 text-xs text-slate-600">Optional fields for certifications and specialization.</div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Full name</label>
                          <Input className="mt-1" placeholder="Your full name" {...form.register('fullName')} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">License number</label>
                          <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                            <IdCard className="h-4 w-4 text-slate-400" />
                            <Input
                              className="h-11 border-0 bg-transparent px-0 shadow-none focus:ring-0"
                              placeholder="Optional"
                              {...form.register('licenseNumber')}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Certification</label>
                          <Input className="mt-1" placeholder="Optional" {...form.register('certification')} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-700">Specialization</label>
                          <Input className="mt-1" placeholder="Optional" {...form.register('specialization')} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

                <Button className="w-full" type="submit" disabled={busy}>
                  {busy ? 'Creating...' : 'Create account'}
                </Button>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Already have an account?{' '}
                    <Link className="font-medium text-indigo-700 hover:text-indigo-900" to="/login">
                      Sign in
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
