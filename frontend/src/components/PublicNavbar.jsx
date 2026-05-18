import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Products', to: '/resources' },
  { label: 'About', to: '/about' },
  { label: 'Case Studies', to: '/resources#release-notes' }
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
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const hashScopedActive = navItems.some(
    (item) => item.to.includes('#') && isHashActive(location.pathname, location.hash, item.to)
  )

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.hash])

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-3 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-river to-moss text-lg font-bold text-white shadow-[0_12px_24px_-14px_rgba(24,111,95,0.75)]">
                G
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-base font-semibold text-ink">GeoSmart Manager</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-gray-400">Land Intelligence</p>
              </div>
            </Link>
            <div className="hidden items-center gap-5 lg:flex">
              {navItems.map((item) => {
                const active = item.to.includes('#')
                  ? isHashActive(location.pathname, location.hash, item.to)
                  : isActive(location.pathname, item.to) && !hashScopedActive
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`inline-flex items-center px-0.5 pb-1 text-[13px] font-semibold transition cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none ${
                      active
                        ? 'border-b-2 border-[#0D6B50] text-ink'
                        : 'border-b-2 border-transparent text-ink/70 hover:border-[#0D6B50]/40 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/contact"
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border-[1.5px] border-[#0D6B50] px-4 py-2 text-[13px] font-medium text-[#0D6B50] transition-all duration-200 hover:bg-[#0D6B50] hover:text-white cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Contact Us
            </Link>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-clay/60 bg-white/90 text-ink/70 transition hover:border-ink/30 hover:text-ink lg:hidden cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <Link
              to="/login"
              className="grid h-10 w-10 place-items-center rounded-xl border border-clay/60 bg-white/80 text-ink/70 transition hover:border-ink/30 hover:text-ink cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Open settings or login"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3l1.8 3.5 3.9.6-2.8 2.9.6 4-3.5-1.8-3.5 1.8.6-4-2.8-2.9 3.9-.6z" />
              </svg>
            </Link>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-3 space-y-2 rounded-xl border border-clay/60 bg-sand/70 p-3 lg:hidden">
            {navItems.map((item) => {
              const active = item.to.includes('#')
                ? isHashActive(location.pathname, location.hash, item.to)
                : isActive(location.pathname, item.to) && !hashScopedActive
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold transition cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none ${
                    active ? 'border-b-2 border-[#0D6B50] text-ink' : 'text-ink/75 hover:bg-white hover:text-ink'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            <Link
              to="/contact"
              className="mt-1 inline-flex w-full items-center justify-center rounded-lg border-[1.5px] border-[#0D6B50] px-4 py-2 text-sm font-semibold text-[#0D6B50] transition-all duration-200 hover:bg-[#0D6B50] hover:text-white cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Contact Us
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
