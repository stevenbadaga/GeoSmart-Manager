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
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('geosmart.sessionId'))
  const [busy, setBusy] = useState(false)

  const value = useMemo(() => {
    function updateUser(nextUser) {
      localStorage.setItem('geosmart.user', JSON.stringify(nextUser))
      setUser(nextUser)
    }

    async function login(username, password, mfaCode) {
      setBusy(true)
      try {
        const res = await api.post('/api/auth/login', { username, password, mfaCode: mfaCode || null })
        localStorage.setItem('geosmart.token', res.data.token)
        updateUser(res.data.user)
        localStorage.setItem('geosmart.sessionId', res.data.sessionId)
        setToken(res.data.token)
        setSessionId(res.data.sessionId)
      } finally {
        setBusy(false)
      }
    }

    async function register(payload) {
      setBusy(true)
      try {
        const res = await api.post('/api/auth/register', payload)
        localStorage.setItem('geosmart.token', res.data.token)
        updateUser(res.data.user)
        localStorage.setItem('geosmart.sessionId', res.data.sessionId)
        setToken(res.data.token)
        setSessionId(res.data.sessionId)
      } finally {
        setBusy(false)
      }
    }

    function logout() {
      localStorage.removeItem('geosmart.token')
      localStorage.removeItem('geosmart.user')
      localStorage.removeItem('geosmart.sessionId')
      setToken(null)
      setUser(null)
      setSessionId(null)
    }

    return { token, user, sessionId, busy, login, register, updateUser, logout }
  }, [token, user, sessionId, busy])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
