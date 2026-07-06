import React from 'react'
import PublicFooter from './PublicFooter'
import PublicNavbar from './PublicNavbar'

export default function PublicLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--surface-0)] antialiased">
      <div className="flex min-h-screen flex-col">
        <PublicNavbar />

        <div className="flex-1 w-full px-3 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>

        <PublicFooter />
      </div>
    </div>
  )
}
