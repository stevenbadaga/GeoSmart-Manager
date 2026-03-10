import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { API_URL, api } from '../api/http'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [presenceNotice, setPresenceNotice] = useState(null)

  const showPresenceNotice = (message, tone) => {
    setPresenceNotice({ id: Date.now(), message, tone })
  }

  const clearPresenceNotice = () => {
    setPresenceNotice(null)
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      clearPresenceNotice()
      return
    }

    let active = true
    setLoading(true)
    api.get('/api/users/me')
      .then((data) => {
        if (active) setUser(data)
      })
      .catch((error) => {
        if (!active) return
        const status = error?.status
        if (status === 401 || status === 403) {
          setToken(null)
          localStorage.removeItem('token')
          setUser(null)
          return
        }
        showPresenceNotice('Unable to reach the server. Working in limited connectivity mode.', 'warning')
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!token) return () => {}

    let active = true
    const markOnline = async (withNotice) => {
      if (!navigator.onLine) return
      try {
        const data = await api.post('/api/users/me/online')
        if (!active) return
        setUser(data)
        if (withNotice) {
          showPresenceNotice('Connection restored. You are back online.', 'success')
        }
      } catch {
        // ignore
      }
    }

    const handleOnline = () => {
      markOnline(true)
    }

    const handleOffline = () => {
      showPresenceNotice('You are offline. Updates will sync when connection returns.', 'warning')
      setUser((current) => (current ? { ...current, status: 'OFFLINE', lastActiveAt: new Date().toISOString() } : current))
    }

    const sendOfflineBeforeUnload = () => {
      if (!token) return
      fetch(`${API_URL}/api/users/me/offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: '{}',
        keepalive: true
      }).catch(() => {})
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeunload', sendOfflineBeforeUnload)

    if (!navigator.onLine) {
      handleOffline()
    } else {
      markOnline(false)
    }

    const heartbeat = setInterval(() => {
      markOnline(false)
    }, 60000)

    return () => {
      active = false
      clearInterval(heartbeat)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', sendOfflineBeforeUnload)
    }
  }, [token])

  useEffect(() => {
    if (!presenceNotice?.id) return () => {}
    const timer = setTimeout(() => {
      setPresenceNotice((current) => (current?.id === presenceNotice.id ? null : current))
    }, 8000)
    return () => clearTimeout(timer)
  }, [presenceNotice?.id])

  const storeSession = (data, successMessage) => {
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    showPresenceNotice(successMessage, 'success')
  }

  const login = async (credentials) => {
    const data = await api.post('/api/auth/login', credentials)
    storeSession(data, 'Signed in successfully.')
  }

  const register = async (payload) => {
    const data = await api.post('/api/auth/register', payload)
    storeSession(data, 'Account created and connected.')
  }

  const googleLogin = async ({ idToken }) => {
    const data = await api.post('/api/auth/google', { idToken })
    storeSession(data, 'Signed in with Google.')
  }

  const logout = () => {
    if (token) {
      api.post('/api/users/me/offline').catch(() => {})
    }
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    clearPresenceNotice()
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      login,
      register,
      googleLogin,
      logout,
      presenceNotice,
      clearPresenceNotice
    }),
    [token, user, loading, presenceNotice]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
