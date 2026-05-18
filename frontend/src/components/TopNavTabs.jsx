import React from 'react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/subdivision', label: 'AI Subdivision' }
]

export default function TopNavTabs({ className = '', size = 'md' }) {
  const basePadding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
  return (
    <nav className={`flex flex-wrap items-center gap-2 rounded-2xl border border-clay/70 bg-white/70 p-1.5 shadow-sm backdrop-blur ${className}`}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `rounded-xl font-semibold transition ${basePadding} ${
            isActive
              ? 'bg-river text-white shadow-[0_10px_24px_-16px_rgba(24,88,76,0.8)]'
              : 'text-ink/70 hover:bg-white hover:text-ink'
          }`}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
