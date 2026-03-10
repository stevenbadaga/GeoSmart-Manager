import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  return (
    <div className="relative min-h-screen md:grid md:grid-cols-[290px_minmax(0,1fr)]">
      <div className="pointer-events-none absolute left-[-90px] top-[22%] h-72 w-72 rounded-full bg-river/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-90px] right-[-40px] h-72 w-72 rounded-full bg-parcel/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(to_right,rgba(30,41,59,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.18)_1px,transparent_1px)] [background-size:48px_48px]" />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-col">
        <Topbar />
        <main className="px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1480px] space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
