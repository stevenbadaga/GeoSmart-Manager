import React from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import PublicImagePlaceholder from '../components/PublicImagePlaceholder'

const features = [
  'Parcel Search by UPI',
  'Zoning & Masterplan Checks',
  'AI-Assisted Subdivision Review',
  'Building Footprint Conflict Checks',
  'GIS Layer Management',
  'Compliance Reports',
  'Data Limitation Alerts',
  'Project & Document Tracking'
]

const steps = [
  'Search or select a parcel',
  'Review zoning and location',
  'Draw or upload proposed plots',
  'Run compliance checks',
  'Generate preliminary report',
  'Submit to official channels separately'
]

export default function Home() {
  return (
    <PublicLayout>
      <div className="space-y-16">
        <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">GeoSmart Manager</p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-0.06em] text-ink sm:text-6xl">
              AI-Assisted Land Subdivision Planning and Zoning Compliance
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/65">
              Run preliminary land subdivision checks using parcel data, zoning rules, administrative boundaries, building footprints, and planning constraints for Kigali.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="btn-primary" to="/subdivision">Start Subdivision Check</Link>
              <Link className="btn-secondary" to="/how-it-works">View How It Works</Link>
            </div>
          </div>
          <PublicImagePlaceholder label="Map preview image placeholder" />
        </section>

        <section className="rounded-[2rem] border border-clay/70 bg-white p-6 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.75)]">
          <h2 className="text-2xl font-black text-ink">Built for preliminary planning support</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-ink/65">
            GeoSmart Manager supports students, land surveyors, clients, and planning reviewers. It helps organize GIS-based checks, but it does not replace official approval by NLA, District One Stop Centre, Irembo, or licensed land surveyors.
          </p>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#124E44]/60">Capabilities</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Everything around the protected subdivision planner</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div key={feature} className="rounded-3xl border border-clay/70 bg-white p-5">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-[#124E44]/10 text-[#124E44]">◆</div>
                <h3 className="font-black text-ink">{feature}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/58">Professional support for preliminary land planning and review workflows.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <PublicImagePlaceholder label="Subdivision workflow image placeholder" />
          <div className="rounded-[2rem] border border-clay/70 bg-white p-6">
            <h2 className="text-3xl font-black text-ink">How it works</h2>
            <div className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-clay/60 bg-sand/35 p-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#124E44] text-xs font-black text-white">{index + 1}</span>
                  <p className="pt-1 text-sm font-semibold text-ink">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] border border-success/20 bg-success/5 p-6">
            <h2 className="text-2xl font-black text-ink">Available data</h2>
            <p className="mt-3 text-sm leading-7 text-ink/65">Kigali Parcels, Kigali Masterplan, Administrative Boundaries, Building Footprints, and Land Use Zoning Regulations.</p>
          </div>
          <div className="rounded-[2rem] border border-warning/20 bg-warning/10 p-6">
            <h2 className="text-2xl font-black text-ink">Limited or missing data</h2>
            <p className="mt-3 text-sm leading-7 text-ink/65">Official roads and reserves, utility corridors, ownership verification, full approval workflow, and some DEM-derived slope calculations may require official confirmation.</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-8 text-white">
          <h2 className="text-3xl font-black text-white">Preliminary-use disclaimer</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">
            GeoSmart Manager provides preliminary planning and compliance support only. It does not replace official approval by the National Land Authority, District One Stop Centre, Irembo, or a licensed land surveyor.
          </p>
        </section>

        <section className="grid items-center gap-6 rounded-[2rem] border border-clay/70 bg-white p-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h2 className="text-3xl font-black text-ink">Ready to test a parcel?</h2>
            <p className="mt-3 text-sm leading-7 text-ink/65">Use the protected Subdivision Planner to search a parent parcel by UPI and generate a preliminary report.</p>
            <Link className="btn-primary mt-5" to="/subdivision">Open Planner</Link>
          </div>
          <PublicImagePlaceholder label="Compliance report preview placeholder" />
        </section>
      </div>
    </PublicLayout>
  )
}
