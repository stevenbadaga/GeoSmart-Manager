import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('ENGINEER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ fullName, email, password, role })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-2">Create account</h2>
        <p className="text-sm text-ink/70 mb-6">Set up your GeoSmart-Manager profile</p>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink/80">Role</span>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="ENGINEER">Engineer</option>
              <option value="ADMIN">Administrator (first account only)</option>
            </select>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
        </form>
        <p className="text-sm text-ink/70 mt-6">
          Already registered? <Link className="text-river font-medium" to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  )
}
