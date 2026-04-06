import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'

const registrationRoleOptions = [
  { value: 'SURVEYOR', label: 'Surveyor' },
  { value: 'ENGINEER', label: 'Engineer' },
  { value: 'CIVIL_ENGINEER', label: 'Civil Engineer' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'ADMIN', label: 'Administrator (first account only)' }
]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('SURVEYOR')
  const [professionalLicense, setProfessionalLicense] = useState('')
  const [organization, setOrganization] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [certifications, setCertifications] = useState('')
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
        role,
        professionalLicense,
        organization,
        specialization,
        certifications
      })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute left-[-100px] top-[-80px] h-72 w-72 rounded-full bg-water/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[-80px] h-72 w-72 rounded-full bg-river/20 blur-3xl" />

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
            <p className="text-xs uppercase tracking-[0.2em] text-river">Start Here</p>
            <h1 className="mt-2 text-4xl leading-tight text-ink sm:text-5xl">Create your GeoSmart account.</h1>
            <p className="mt-4 max-w-xl text-base text-ink/70">
              Register once and access operational dashboards, map tools, and project workflows in one secure space with your professional profile attached.
            </p>
          </div>
          <div className="rounded-2xl border border-clay/70 bg-white/80 p-4">
            <p className="text-sm font-semibold text-ink">Account setup note</p>
            <p className="mt-1 text-xs text-ink/65">
              Survey and engineering roles can include license, specialization, and certifications during sign-up. Administrator is still restricted to the first account.
            </p>
          </div>
        </section>

        <Card className="animate-rise stagger-2 w-full max-w-xl justify-self-center p-8 sm:p-10">
          <h2 className="text-3xl font-semibold text-ink">Create account</h2>
          <p className="mt-2 text-sm text-ink/65">Set up your profile to access GeoSmart tools.</p>
          <form className="mt-7 space-y-5" onSubmit={onSubmit}>
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
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
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Role</span>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                {registrationRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <Input label="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            <Input label="Professional license" value={professionalLicense} onChange={(e) => setProfessionalLicense(e.target.value)} />
            <Input label="Specialization" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Certifications</span>
              <textarea
                className="input min-h-24"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="List certifications, memberships, or registration details"
              />
            </label>
            {error && <p className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
          </form>
          <p className="mt-6 text-sm text-ink/70">
            Already registered? <Link className="font-semibold text-river hover:text-moss transition-colors" to="/login">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
