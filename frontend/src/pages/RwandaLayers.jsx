import React from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'

export default function RwandaLayers() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Rwanda Layers</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Administrative Boundaries</h1>
        <p className="text-sm text-ink/60">Upload verified boundary layers to power compliance and mapping workflows.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card title="Layer Preparation Guide">
          <div className="space-y-3 text-sm text-ink/80">
            <p>This module is ready to host Rwanda administrative boundaries (province, district, sector, cell) once official GeoJSON layers are provided.</p>
            <p>To keep data authoritative, we do not embed external layers without verified sources. Upload official GeoJSON files and they will appear on the Map page.</p>
            <p>Recommended properties for filtering: <span className="font-semibold">name</span> and <span className="font-semibold">type</span> (e.g., type: district).</p>
            <p>Road styling uses <span className="font-semibold">road_class</span> or <span className="font-semibold">highway</span> properties (national, district, feeder, local).</p>
          </div>
          <div className="mt-4">
            <Link className="text-sm font-semibold text-river" to="/map">Open Map Workspace →</Link>
          </div>
        </Card>
        <Card title="Checklist">
          <div className="space-y-2 text-sm text-ink/70">
            <p>Confirm CRS is WGS84 (EPSG:4326).</p>
            <p>Include attribute fields for name and administrative level.</p>
            <p>Simplify geometry for faster web rendering.</p>
            <p>Validate boundaries against RLMUA datasets before upload.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
