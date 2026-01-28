import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function RequireStaff() {
  const { user } = useAuth()
  if (user?.role === 'CLIENT') return <Navigate to="/" replace />
  return <Outlet />
}

