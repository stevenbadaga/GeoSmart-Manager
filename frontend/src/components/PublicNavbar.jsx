import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/http'
import BrandLogo from './BrandLogo'
import { publicImages } from '../assets/publicImages'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../theme/ThemeContext'

const navItems = [
  { label: 'HOME', to: '/' },
  { label: 'ABOUT', to: '/about' },
  { label: 'FEATURES', to: '/features' }
]

function isActive(pathname, target) {
  if (!target) return false
  return pathname === target.split('#')[0]
}

function isHashActive(pathname, hash, target) {
  if (!target.includes('#')) return isActive(pathname, target)
  const [base, targetHash] = target.split('#')
  return pathname === base && hash === `#${targetHash}`
}

export default function PublicNavbar() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const hashScopedActive = navItems.some(
    (item) => item.to.includes('#') && isHashActive(location.pathname, location.hash, item.to)
  )

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    const fetchCount = () => {
      api.get('/api/notifications/unread-count')
        .then(count => setUnreadCount(Number(count)))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <header className="public-navbar sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative h-24 flex items-center">
          {/* Left: Logo */}
          <div className="flex shrink-0 items-center">
            <BrandLogo
              to="/"
              src={publicImages.newWhiteLogoTransparent}
              darkSrc={publicImages.newBlackLogoTransparent}
              className="h-14 w-auto object-contain"
              linkClassName="flex items-center"
            />
          </div>

          {/* Center: Navigation Tabs (Desktop) */}
          <div className="hidden lg:flex items-center justify-center gap-12 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const active = item.to.includes('#')
                ? isHashActive(location.pathname, location.hash, item.to)
                : isActive(location.pathname, item.to) && !hashScopedActive
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`relative text-[15px] font-bold tracking-[0.18em] uppercase transition-all duration-300 ${
                    active
                      ? 'text-emerald-800 after:absolute after:left-0 after:-bottom-2 after:h-0.5 after:w-full after:bg-emerald-700'
                      : 'text-slate-600 hover:text-emerald-800'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center gap-3 md:gap-4">
            <ThemeToggle className="hidden sm:inline-flex" />

            {/* Notification Bell (Always visible) */}
            <button
              type="button"
              onClick={() => user ? navigate('/notifications') : navigate('/login')}
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 shadow-sm active:scale-95"
              title={user ? 'Notifications' : 'Login to view notifications'}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {user && unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <Link
              to="/contact"
              className="hidden sm:inline-flex items-center justify-center rounded-xl border-2 border-emerald-700 px-6 py-3 text-sm font-bold text-emerald-800 transition-all hover:bg-emerald-700 hover:text-white active:scale-95"
            >
              Contact Us
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 active:scale-95"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all lg:hidden hover:border-emerald-200 hover:text-emerald-800 active:scale-95"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl">
              {navItems.map((item) => {
                const active = item.to.includes('#')
                  ? isHashActive(location.pathname, location.hash, item.to)
                  : isActive(location.pathname, item.to) && !hashScopedActive
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`block rounded-xl px-5 py-4 text-sm font-bold tracking-[0.12em] uppercase transition ${
                      active ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
              <div className="pt-6 mt-6 border-t border-slate-50 space-y-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-800 shadow-sm"
                  onClick={toggleTheme}
                >
                  {isDark ? 'Light Theme' : 'Dark Theme'}
                </button>
                <Link
                  to="/contact"
                  className="flex w-full items-center justify-center rounded-xl border-2 border-emerald-700 py-4 text-sm font-bold text-emerald-800 transition hover:bg-emerald-700 hover:text-white"
                >
                  Contact Us
                </Link>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-4 text-sm font-bold text-white transition hover:bg-slate-800 shadow-lg"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-800 transition hover:bg-emerald-50 hover:text-emerald-800 shadow-sm"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
