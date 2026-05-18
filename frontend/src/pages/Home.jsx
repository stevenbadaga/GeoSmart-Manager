import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import PublicLayout from '../components/PublicLayout'

const highlights = [
  {
    title: 'End-to-End Land Workflows',
    description: 'Track projects from intake to compliance reporting in one operational workspace.',
    color: '#0f5c3a',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 7h16M4 12h16M4 17h9" />
        <circle cx="16" cy="17" r="1.2" />
      </svg>
    )
  },
  {
    title: 'Geospatial Intelligence',
    description: 'Analyze parcels, boundaries, and administrative layers with interactive mapping tools.',
    color: '#0e7560',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
        <path d="M9 3v15M15 6v15" />
      </svg>
    )
  },
  {
    title: 'Audit-Ready Operations',
    description: 'Keep role permissions, event logs, and generated reports aligned with governance requirements.',
    color: '#1f7a8c',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }
]

const workflow = [
  {
    step: '01',
    title: 'Create a Project',
    copy: 'Start with a client, assign teams, and define delivery milestones.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    )
  },
  {
    step: '02',
    title: 'Upload Spatial Data',
    copy: 'Bring in GeoJSON data and visualize it instantly in map workspace.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 16V6M8.5 9.5L12 6l3.5 3.5" />
        <path d="M5 18h14" />
      </svg>
    )
  },
  {
    step: '03',
    title: 'Run Validation',
    copy: 'Check compliance and quality before approvals or handover.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 7l-9 10-4-4" />
      </svg>
    )
  }
]

export default function Home() {
  const { token, isApproved } = useAuth()
  const primaryHighlight = highlights[0]
  const secondaryHighlights = highlights.slice(1)

  return (
    <PublicLayout>
      <section className="relative grid items-center gap-12 py-16 lg:grid-cols-[55%_1fr]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
          <svg viewBox="0 0 1200 360" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 40 C 120 10 240 70 360 40 C 480 10 600 70 720 40 C 840 10 960 70 1200 40" stroke="#0D6B50" />
            <path d="M0 80 C 120 50 240 110 360 80 C 480 50 600 110 720 80 C 840 50 960 110 1200 80" stroke="#0D6B50" />
            <path d="M0 120 C 120 90 240 150 360 120 C 480 90 600 150 720 120 C 840 90 960 150 1200 120" stroke="#0D6B50" />
            <path d="M0 160 C 120 130 240 190 360 160 C 480 130 600 190 720 160 C 840 130 960 190 1200 160" stroke="#0D6B50" />
            <path d="M0 200 C 120 170 240 230 360 200 C 480 170 600 230 720 200 C 840 170 960 230 1200 200" stroke="#0D6B50" />
            <path d="M0 240 C 120 210 240 270 360 240 C 480 210 600 270 720 240 C 840 210 960 270 1200 240" stroke="#0D6B50" />
            <path d="M0 280 C 120 250 240 310 360 280 C 480 250 600 310 720 280 C 840 250 960 310 1200 280" stroke="#0D6B50" />
            <path d="M0 320 C 120 290 240 350 360 320 C 480 290 600 350 720 320 C 840 290 960 350 1200 320" stroke="#0D6B50" />
          </svg>
        </div>
        <div className="relative z-10 space-y-8">
          <span className="animate-rise inline-flex items-center gap-1.5 rounded-full border border-[#c4ddd6] bg-[#f0f8f5] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0D6B50]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0D6B50]" />
            GEOSPATIAL OPERATIONS
          </span>
          <h1 className="animate-rise stagger-1 text-4xl leading-tight text-ink sm:text-5xl">
            Build, monitor, and deliver
            <span className="mt-2 block w-fit text-[#0D6B50] underline decoration-[#0D6B50] underline-offset-4 decoration-2">smarter</span>
            land projects.
          </h1>
          <p className="animate-rise stagger-2 max-w-md text-[15px] text-gray-500 leading-relaxed">
            GeoSmart Manager gives your team one clean system for project coordination, map analysis, compliance checks, and reporting.
          </p>
          <div className="animate-rise stagger-3 flex flex-wrap gap-3">
            {!token && (
              <Link
                className="btn-primary group cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
                to="/register"
              >
                Get started
                <span className="translate-x-0 transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
              </Link>
            )}
            {!token && (
              <Link
                className="text-[13px] text-gray-500 underline underline-offset-4 hover:text-gray-700 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none"
                to="/login"
              >
                I already have an account
              </Link>
            )}
            {token && !isApproved && <Link className="btn-secondary" to="/pending-approval">Awaiting approval</Link>}
            {token && isApproved && <Link className="btn-primary" to="/dashboard">Go to dashboard</Link>}
          </div>
        </div>

        <div className="relative z-10 animate-rise stagger-2 translate-x-5 rounded-3xl bg-gradient-to-br from-[#0b5241] via-[#0c6950] to-[#0e7a7a] p-6 text-white ring-1 ring-green-700/30 shadow-[0_30px_70px_-30px_rgba(12,64,62,0.8)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.22em] text-white/70 flex items-center gap-2 cursor-default select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-success/80 animate-pulse" />
              Live Snapshot
            </p>
            <span className="text-[10px] font-mono tracking-wide rounded border border-white/20 px-2 py-0.5 text-white/50 cursor-default select-none">Realtime</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border-l-2 border-[#5DCAA5]/40 bg-white/8 p-4 backdrop-blur shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/70 cursor-default select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-success/80 animate-pulse" /> Visibility
              </div>
              <p className="text-3xl font-semibold mt-2">24/7</p>
              <p className="text-xs text-white/70 mt-1">Realtime project visibility</p>
            </div>
            <div className="rounded-2xl border-l-2 border-[#5DCAA5]/40 bg-white/8 p-4 backdrop-blur shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
              <p className="text-xs uppercase tracking-[0.15em] text-white/70 cursor-default select-none">Access</p>
              <p className="text-3xl font-semibold mt-2">Secure</p>
              <p className="text-xs text-white/70 mt-1">Role-aware access controls</p>
            </div>
            <div className="rounded-2xl border-l-2 border-[#5DCAA5]/40 bg-white/8 p-4 sm:col-span-2 backdrop-blur flex items-start gap-3 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.35)]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold">Audit Traceability</p>
                <p className="text-xs text-white/75 mt-1">Every major action is logged for review and compliance.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 space-y-4">
        <article
          className="group rounded-2xl border border-gray-100 bg-white p-7 transition-colors duration-200 hover:border-[#a8d4c5]"
          style={{ borderTop: `3px solid ${primaryHighlight.color}` }}
        >
          <div className="flex flex-row items-start gap-5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 transition group-hover:bg-[#e6f5f0]"
              style={{ color: primaryHighlight.color }}
            >
              {primaryHighlight.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">{primaryHighlight.title}</h2>
              <p className="mt-2 text-sm text-ink/70">{primaryHighlight.description}</p>
            </div>
          </div>
        </article>

        <div className="grid gap-3 md:grid-cols-2">
          {secondaryHighlights.map((item, index) => (
            <article
              key={item.title}
              className={`group rounded-2xl border border-gray-100 bg-white p-6 transition-colors duration-200 hover:border-[#a8d4c5] ${
                index === 0 ? 'stagger-2' : 'stagger-3'
              }`}
              style={{ borderTop: `3px solid ${item.color}` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 transition group-hover:bg-[#e6f5f0]" style={{ color: item.color }}>
                  {item.icon}
                </div>
                <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
              </div>
              <p className="mt-3 text-sm text-ink/70">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-clay/70 bg-white/80 px-6 py-16 shadow-sm sm:px-8">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400 mb-2">Workflow</p>
          <h2 className="mt-2 text-2xl text-ink">How teams use GeoSmart</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((item, index) => (
            <article
              key={item.step}
              className={`animate-rise rounded-2xl border border-clay/60 border-t-2 border-transparent bg-sand/75 p-5 min-h-[180px] transition-colors duration-200 hover:border-[#0D6B50] ${
                index === 0 ? 'stagger-1' : index === 1 ? 'stagger-2' : 'stagger-3'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] font-semibold text-[#0D6B50] tracking-wider">
                  {item.step}
                </p>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-river/10 text-river">{item.icon}</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-ink/70">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}
