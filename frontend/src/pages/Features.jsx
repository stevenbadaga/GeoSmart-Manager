import React from 'react'
import PublicLayout from '../components/PublicLayout'
import PublicImagePlaceholder from '../components/PublicImagePlaceholder'

const items = [
  'UPI parcel search',
  'Zoning compliance support',
  'AI-assisted subdivision review',
  'GIS layer manager',
  'Building footprint conflict checks',
  'Project management',
  'Document tracking',
  'Compliance reporting',
  'Data limitation warnings'
]

export default function Features() {
  return (
    <PublicLayout>
      <div className="space-y-10">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">Features</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-ink">Preliminary land planning tools in one workspace</h1>
            <p className="mt-4 text-sm leading-7 text-ink/65">GeoSmart Manager organizes GIS data, project context, and compliance support around the protected subdivision planner.</p>
          </div>
          <PublicImagePlaceholder label="Dashboard preview placeholder" />
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-3xl border border-clay/70 bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#124E44]/55">GeoSmart</p>
              <h2 className="mt-2 text-xl font-black text-ink">{item}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/60">Supports preliminary assessment based on available GIS data and planning rules. Official verification remains separate.</p>
            </div>
          ))}
        </div>
        <PublicImagePlaceholder label="Data layers illustration placeholder" />
      </div>
    </PublicLayout>
  )
}
