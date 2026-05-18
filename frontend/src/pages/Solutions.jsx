import React from 'react'
import PublicLayout from '../components/PublicLayout'
import Card from '../components/Card'

const solutionBlocks = [
  {
    id: 'urban-planning',
    title: 'Urban Planning',
    body: 'Scenario plans, parcel simulations, and compliance overlays to accelerate approvals.',
    bullets: ['Preset policies per district', 'Parcel density what-ifs', 'Road/utility alignment notes']
  },
  {
    id: 'land-tenure',
    title: 'Land Tenure Digitization',
    body: 'Clean, auditable parcel records with role-aware access and exportable registries.',
    bullets: ['GeoJSON-first data intake', 'Versioned changesets', 'Evidence attachments']
  },
  {
    id: 'municipal-review',
    title: 'Municipal Review',
    body: 'Structured submission pipeline with trackable decisions and review SLAs.',
    bullets: ['Checklists mapped to RLMUA', 'Reviewer assignments', 'Stamped PDF outputs']
  },
  {
    id: 'geospatial-analytics',
    title: 'Geospatial Analytics',
    body: 'Dashboards for parcel efficiency, road footprint, and compliance readiness.',
    bullets: ['Lot size distribution', 'Access/road ratios', 'Live compliance scoring']
  }
]

export default function Solutions() {
  return (
    <PublicLayout>
      <div className="space-y-8 py-16">
        <header className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400">Solutions</p>
          <h1 className="text-4xl text-ink leading-tight">Purpose-built modules for land projects.</h1>
          <p className="text-sm text-gray-500 max-w-md">Pick a track to see how GeoSmart fits your workflow and approval process.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {solutionBlocks.map((block) => (
            <Card key={block.id} className="bg-white border-l-4 border-l-river" title={block.title} id={block.id}>
              <p className="text-sm text-gray-500">{block.body}</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-500">
                {block.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-river" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
