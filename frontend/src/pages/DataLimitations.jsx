import React from 'react'
import Card from '../components/Card'

const available = ['Kigali Parcels', 'Kigali Masterplan', 'Administrative Boundaries', 'Building Footprints', 'Land Use Plans Zoning Regulations']
const limited = [
  ['Official road centerlines', 'Road access checks remain preliminary.'],
  ['Road reserve / right-of-way widths', 'Road frontage and reserve compliance require official confirmation.'],
  ['Utility corridors', 'Utility conflict checks may be incomplete.'],
  ['Survey control points', 'Final survey accuracy must be confirmed by licensed professionals.'],
  ['Official ownership verification', 'Documents can be stored for reference but ownership is not officially validated.'],
  ['Official approval workflow', 'Final approval still happens through official institutions.'],
  ['Full DEM slope analysis', 'Slope checks may rely on masterplan steep-slope zones if DEM processing is incomplete.'],
  ['Road access servitudes', 'Access rights require legal and survey confirmation.']
]

export default function DataLimitations() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">Transparency</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Data Limitations</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">
          GeoSmart Manager uses available GIS data for preliminary assessment. Missing or limited data is reported clearly so users understand what still requires official verification.
        </p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Available Data">
          <div className="space-y-2 text-sm text-ink/68">
            {available.map((item) => <p key={item}>• {item}</p>)}
          </div>
        </Card>
        <Card title="Missing Or Limited Data">
          <div className="space-y-3 text-sm text-ink/68">
            {limited.map(([item, effect]) => (
              <div key={item} className="rounded-2xl border border-warning/20 bg-warning/10 p-3">
                <p className="font-bold text-ink">{item}</p>
                <p className="mt-1 text-ink/60">{effect}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Official Review Disclaimer">
        <p className="text-sm leading-7 text-ink/68">
          This system provides preliminary planning and compliance assessment only. It does not replace official approval by the National Land Authority, District One Stop Centre, Irembo, or a licensed land surveyor.
        </p>
      </Card>
    </div>
  )
}
