import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const highlights = [
  {
    title: 'End-to-End Land Workflows',
    description: 'Track projects from intake to compliance reporting in one operational workspace.'
  },
  {
    title: 'Geospatial Intelligence',
    description: 'Analyze parcels, boundaries, and administrative layers with interactive mapping tools.'
  },
  {
    title: 'Audit-Ready Operations',
    description: 'Keep role permissions, event logs, and generated reports aligned with governance requirements.'
  }
]

const workflow = [
  { step: '01', title: 'Create a Project', copy: 'Start with a client, assign teams, and define delivery milestones.' },
  { step: '02', title: 'Upload Spatial Data', copy: 'Bring in GeoJSON data and visualize it instantly in map workspace.' },
  { step: '03', title: 'Run Validation', copy: 'Check compliance and quality before approvals or handover.' }
]

export default function Home() {
  const { token } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-sand px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute left-[-100px] top-[-80px] h-64 w-64 rounded-full bg-river/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-100px] right-[-80px] h-72 w-72 rounded-full bg-parcel/20 blur-3xl" />

      <div className="mx-auto flex max-w-7xl flex-col gap-16">
        <header className="animate-rise flex items-center justify-between rounded-2xl border border-clay/70 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-river text-lg font-semibold text-white shadow-sm">G</div>
            <div>
              <p className="text-sm font-semibold text-ink">GeoSmart Manager</p>
              <p className="text-xs text-ink/60">Land Intelligence Platform</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            {!token && (
              <>
                <Link className="btn-secondary px-3 py-2 text-xs sm:text-sm" to="/login">Sign in</Link>
                <Link className="btn-primary px-3 py-2 text-xs sm:text-sm" to="/register">Create account</Link>
              </>
            )}
            {token && (
              <Link className="btn-primary px-3 py-2 text-xs sm:text-sm" to="/dashboard">Open dashboard</Link>
            )}
          </nav>
        </header>

        <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <span className="animate-rise inline-flex rounded-full border border-river/20 bg-river/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-river">
              GEOSPATIAL OPERATIONS
            </span>
            <h1 className="animate-rise stagger-1 text-4xl leading-tight text-ink sm:text-5xl">
              Build, monitor, and deliver smarter land projects.
            </h1>
            <p className="animate-rise stagger-2 max-w-2xl text-base text-ink/75 sm:text-lg">
              GeoSmart Manager gives your team one clean system for project coordination, map analysis, compliance checks, and reporting.
            </p>
            <div className="animate-rise stagger-3 flex flex-wrap gap-3">
              {!token && <Link className="btn-primary" to="/register">Get started</Link>}
              {!token && <Link className="btn-secondary" to="/login">I already have an account</Link>}
              {token && <Link className="btn-primary" to="/dashboard">Go to dashboard</Link>}
            </div>
          </div>

          <div className="animate-rise stagger-2 rounded-3xl border border-river/15 bg-gradient-to-br from-river via-moss to-water p-6 text-white shadow-[0_30px_70px_-30px_rgba(24,88,76,0.75)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Live Snapshot</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-2xl font-semibold">24/7</p>
                <p className="text-xs text-white/70">Realtime project visibility</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <p className="text-2xl font-semibold">Secure</p>
                <p className="text-xs text-white/70">Role-aware access controls</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 sm:col-span-2">
                <p className="text-2xl font-semibold">Audit Traceability</p>
                <p className="text-xs text-white/70">Every major action is logged for review and compliance.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, index) => (
            <article
              key={item.title}
              className={`animate-rise rounded-2xl border border-clay/70 bg-white/85 p-6 shadow-sm ${
                index === 0 ? 'stagger-1' : index === 1 ? 'stagger-2' : 'stagger-3'
              }`}
            >
              <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm text-ink/70">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-clay/70 bg-white/80 p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Workflow</p>
            <h2 className="mt-2 text-2xl text-ink">How teams use GeoSmart</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflow.map((item, index) => (
              <article
                key={item.step}
                className={`animate-rise rounded-2xl border border-clay/60 bg-sand/75 p-5 ${
                  index === 0 ? 'stagger-1' : index === 1 ? 'stagger-2' : 'stagger-3'
                }`}
              >
                <p className="text-xs font-semibold tracking-[0.14em] text-river">{item.step}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-ink/70">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
