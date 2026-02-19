import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/http'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }

    let active = true
    setLoading(true)
    api.get('/api/users/me')
      .then((data) => {
        if (active) setUser(data)
      })
      .catch(() => {
        if (active) {
          setToken(null)
          localStorage.removeItem('token')
          setUser(null)
        }
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [token])

  const login = async (credentials) => {
    const data = await api.post('/api/auth/login', credentials)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const register = async (payload) => {
    const data = await api.post('/api/auth/register', payload)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    if (token) {
      api.post('/api/users/me/offline').catch(() => {})
    }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, loading, login, register, logout }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
