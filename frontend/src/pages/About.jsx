import React from 'react'
import Card from '../components/Card'
import PublicLayout from '../components/PublicLayout'

const stack = ['React 18', 'Vite', 'Tailwind', 'Leaflet', 'FastAPI (AI service)', 'PostgreSQL/GeoJSON ready']

export default function About() {
  return (
    <PublicLayout>
      <section className="grid gap-8 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50">About</p>
          <h1 className="text-4xl text-ink leading-tight">Mission-driven land intelligence for Rwanda.</h1>
          <p className="text-sm text-gray-500 max-w-md">
            GeoSmart Manager streamlines parcel design, compliance, and delivery so agencies and consultants can focus on sustainable urban growth.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-clay/60 bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">Policy aligned</p>
              <p className="mt-1 text-2xl font-semibold text-river">RLMUA</p>
            </div>
            <div className="rounded-2xl border border-clay/60 bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">Coverage</p>
              <p className="mt-1 text-2xl font-semibold text-river">Geo + Ops</p>
            </div>
            <div className="rounded-2xl border border-clay/60 bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink/45">Output quality</p>
              <p className="mt-1 text-2xl font-semibold text-river">Audit-ready</p>
            </div>
          </div>

          <Card className="bg-white border-l-4 border-l-river" title="Mission">
            <p className="text-sm text-gray-500">
              Deliver transparent, auditable land subdivision workflows that align with Rwanda Land Management and Use Authority (RLMUA) standards.
            </p>
          </Card>
        </div>

        <Card className="bg-white" title="Compliance & Trust">
          <ul className="space-y-3 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-river" />
              <span><span className="font-semibold text-ink">RLMUA basis:</span> Workflows mirror current parcel sizing, road width, and setback expectations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-river" />
              <span><span className="font-semibold text-ink">Auditability:</span> Role-aware permissions, event logs, and exportable reports keep every decision traceable.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-river" />
              <span><span className="font-semibold text-ink">Data hygiene:</span> GeoJSON-first validation prevents malformed geometries entering workflows.</span>
            </li>
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 pb-16 md:grid-cols-3">
        <Card className="bg-white border-t-4 border-t-river" title="Tech Stack">
          <div className="flex flex-wrap gap-2">
            {stack.map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/75 border border-clay/60">
                {item}
              </span>
            ))}
          </div>
        </Card>

        <Card className="bg-white border-t-4 border-t-[#0e7560]" title="AI Subdivision">
          <p className="text-sm text-gray-500">
            Optimizer balances parcel compactness, uniform area, and road efficiency while staying within Rwanda policy presets.
          </p>
        </Card>

        <Card className="bg-white border-t-4 border-t-[#1f7a8c]" title="Partners & Delivery">
          <p className="text-sm text-gray-500">
            Built with local planning teams and survey partners; ready to plug into compliance review or municipal review workflows.
          </p>
        </Card>
      </section>
    </PublicLayout>
  )
}
