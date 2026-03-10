import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/Card'

export default function NotFound() {
  const { token } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold">Page not found</h2>
        <p className="text-sm text-ink/70 mt-2">The page you are looking for does not exist.</p>
        <Link className="text-river font-medium mt-4 inline-block" to={token ? '/dashboard' : '/'}>
          Return {token ? 'to dashboard' : 'home'}
        </Link>
      </Card>
    </div>
  )
}
