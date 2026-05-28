import React from 'react'
import PublicLayout from '../components/PublicLayout'
import PublicImagePlaceholder from '../components/PublicImagePlaceholder'

const steps = [
  ['Select or search parcel', 'Use UPI search to identify the parent parcel from available Kigali parcel data.'],
  ['Review parcel and zoning information', 'Inspect administrative location and intersecting masterplan zones.'],
  ['Draw or upload proposed subdivision', 'Create proposed plot polygons or provide GeoJSON where available.'],
  ['Run checks', 'Evaluate boundary, area, overlap, zoning, buildings, constraints, slope, and access warnings.'],
  ['Review warnings and recommendations', 'Understand likely compliant, needs review, and not recommended outcomes.'],
  ['Generate report', 'Export a preliminary compliance report for planning discussion.'],
  ['Proceed with official review outside the system', 'Submit through the required official channels and licensed professionals.']
]

export default function HowItWorks() {
  return (
    <PublicLayout>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <PublicImagePlaceholder label="Subdivision workflow image placeholder" />
        <section className="rounded-[2rem] border border-clay/70 bg-white p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">Workflow</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-ink">From parcel search to preliminary report</h1>
          <div className="mt-6 space-y-3">
            {steps.map(([title, detail], index) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-clay/60 bg-sand/35 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#124E44] text-xs font-black text-white">{index + 1}</span>
                <div>
                  <h2 className="font-black text-ink">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink/60">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  )
}
