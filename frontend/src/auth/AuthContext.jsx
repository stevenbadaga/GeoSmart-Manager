/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { api } from '../api/http'

const AuthContext = createContext(null)

function loadUser() {
  try {
    const raw = localStorage.getItem('geosmart.user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('geosmart.token'))
  const [user, setUser] = useState(() => loadUser())
  const [busy, setBusy] = useState(false)

  const value = useMemo(() => {
    async function login(username, password) {
      setBusy(true)
      try {
        const res = await api.post('/api/auth/login', { username, password })
        localStorage.setItem('geosmart.token', res.data.token)
        localStorage.setItem('geosmart.user', JSON.stringify(res.data.user))
        setToken(res.data.token)
        setUser(res.data.user)
      } finally {
        setBusy(false)
      }
    }

    function logout() {
      localStorage.removeItem('geosmart.token')
      localStorage.removeItem('geosmart.user')
      setToken(null)
      setUser(null)
    }

    return { token, user, busy, login, logout }
  }, [token, user, busy])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
