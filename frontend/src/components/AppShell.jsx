import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { cn } from '../lib/utils'

export function AppShell({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-full">
      <div className="flex min-h-full">
        <div className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white lg:block">
          <Sidebar />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">{children}</main>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className={cn('absolute left-0 top-0 h-full w-80 bg-white shadow-2xl')}>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
