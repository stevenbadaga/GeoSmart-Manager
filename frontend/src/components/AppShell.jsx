import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell() {
  return (
    <div className="app-shell relative min-h-screen overflow-x-hidden">
      {/* Background patterns */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-50">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="gis-grid absolute inset-0 opacity-[0.03]" />
      </div>

      {/* Sidebar - Fixed on desktop, normal flow on mobile (Sidebar handle its own mobile height) */}
      <div className="md:fixed md:left-0 md:top-0 md:bottom-0 md:z-40 md:w-[280px]">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex min-h-screen flex-col md:pl-[280px]">
        <Topbar />
        <main className="flex-1 px-6 pb-12 pt-8 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-[1600px] space-y-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
