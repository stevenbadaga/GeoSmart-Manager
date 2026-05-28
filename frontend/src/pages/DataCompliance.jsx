import React from 'react'
import PublicLayout from '../components/PublicLayout'
import PublicImagePlaceholder from '../components/PublicImagePlaceholder'

const available = ['Kigali Parcels', 'Kigali Masterplan', 'Administrative Boundaries', 'Building Footprints', 'Land Use Plans Zoning Regulations']
const limited = ['Official road centerlines', 'Road reserve / right-of-way widths', 'Utility corridors', 'Survey control points', 'Official ownership verification', 'Official approval workflow', 'Road access servitudes']

export default function DataCompliance() {
  return (
    <PublicLayout>
      <div className="space-y-8">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/70">Data & Compliance</p>
            <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] text-ink">Transparent GIS-based preliminary checks</h1>
            <p className="mt-4 text-sm leading-7 text-ink/65">The system reports what data is available, what is limited, and where official verification is still required.</p>
          </div>
          <PublicImagePlaceholder label="GIS map preview placeholder" />
        </section>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[2rem] border border-success/20 bg-success/5 p-6">
            <h2 className="text-2xl font-black text-ink">Available data</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink/65">
              {available.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="rounded-[2rem] border border-warning/20 bg-warning/10 p-6">
            <h2 className="text-2xl font-black text-ink">Limited or missing data</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink/65">
              {limited.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>
        <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-8 text-white">
          <h2 className="text-3xl font-black text-white">Official approval remains separate</h2>
          <p className="mt-3 text-sm leading-7 text-white/75">GeoSmart Manager provides preliminary planning and compliance support only. It does not replace official approval by the National Land Authority, District One Stop Centre, Irembo, or a licensed land surveyor.</p>
        </section>
      </div>
    </PublicLayout>
  )
}
