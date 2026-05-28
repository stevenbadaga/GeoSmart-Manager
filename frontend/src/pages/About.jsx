import React from 'react'
import PublicLayout from '../components/PublicLayout'
import PublicImagePlaceholder from '../components/PublicImagePlaceholder'

export default function About() {
  return (
    <PublicLayout>
      <div className="space-y-8">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">About</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-ink">An academic prototype for Rwanda land planning support</h1>
            <p className="mt-4 text-sm leading-7 text-ink/65">GeoSmart Manager was developed to explore how GIS data and planning rules can support preliminary land subdivision assessment in Kigali.</p>
          </div>
          <PublicImagePlaceholder label="GIS map illustration placeholder" />
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['Purpose', 'Help users understand parcel context, zoning, constraints, and report outcomes before official review.'],
            ['GIS role', 'Use available parcels, masterplan zones, boundaries, buildings, and regulation rules to guide checks.'],
            ['Limitations', 'The system is not an official approval platform and cannot replace competent authorities or licensed professionals.']
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-clay/70 bg-white p-6">
              <h2 className="text-xl font-black text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/60">{text}</p>
            </div>
          ))}
        </section>
        <PublicImagePlaceholder label="Land planning workflow illustration placeholder" />
      </div>
    </PublicLayout>
  )
}
