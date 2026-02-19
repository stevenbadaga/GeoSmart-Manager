import React, { useEffect, useMemo, useState } from 'react'
import * as turf from '@turf/turf'
import proj4 from 'proj4'
import Card from '../components/Card'
import Button from '../components/Button'
import GeoJsonMap from '../components/GeoJsonMap'
import { api } from '../api/http'

const RW_BOUNDS = {
  minLat: -2.84,
  maxLat: -1.05,
  minLon: 28.86,
  maxLon: 30.9
}

const WGS84 = 'EPSG:4326'
const UTM_35S = '+proj=utm +zone=35 +south +datum=WGS84 +units=m +no_defs'
const UTM_36S = '+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs'

const emptySummary = {
  polygonCount: 0,
  lineCount: 0,
  totalAreaSqm: 0,
  totalLengthKm: 0
}

const roadPalette = {
  national: { color: '#B6862C', weight: 3.5 },
  district: { color: '#C97A1A', weight: 2.8 },
  feeder: { color: '#1F6F5F', weight: 2.2 },
  local: { color: '#5B667A', weight: 1.6 }
}

function normalizeGeoJson(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    return JSON.parse(raw)
  }
  return raw
}

function toFeatureCollection(raw) {
  if (!raw) return null
  if (raw.type === 'FeatureCollection') return raw
  if (raw.type === 'Feature') return { type: 'FeatureCollection', features: [raw] }
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: raw }] }
}

function summarizeSketch(features) {
  let polygonCount = 0
  let lineCount = 0
  let totalAreaSqm = 0
  let totalLengthKm = 0

  features.forEach((feature) => {
    if (!feature?.geometry) return
    const type = feature.geometry.type
    if (type === 'Polygon' || type === 'MultiPolygon') {
      polygonCount += 1
      totalAreaSqm += turf.area(feature)
    }
    if (type === 'LineString' || type === 'MultiLineString') {
      lineCount += 1
      totalLengthKm += turf.length(feature, { units: 'kilometers' })
    }
  })

  return { polygonCount, lineCount, totalAreaSqm, totalLengthKm }
}

function getDatasetHint(name = '', type = '') {
  const source = `${name} ${type}`.toLowerCase()
  if (source.includes('province')) return 'province'
  if (source.includes('district')) return 'district'
  if (source.includes('sector')) return 'sector'
  if (source.includes('cell')) return 'cell'
  if (source.includes('village')) return 'village'
  if (source.includes('kigali')) return 'kigali'
  if (source.includes('road')) return 'road'
  return ''
}

function getAdminType(properties = {}, hint = '') {
  const directType = String(
    properties.type ??
    properties.admin_level ??
    properties.level ??
    properties.adminLevel ??
    properties.boundary ??
    ''
  ).toLowerCase()

  const level = Number(properties.admin_level ?? properties.level ?? properties.adminLevel)
  if (Number.isFinite(level)) {
    if (level === 1) return 'province'
    if (level === 2) return 'district'
    if (level === 3) return 'sector'
    if (level === 4) return 'cell'
    if (level === 5) return 'village'
  }

  if (directType.includes('province')) return 'province'
  if (directType.includes('district')) return 'district'
  if (directType.includes('sector')) return 'sector'
  if (directType.includes('cell')) return 'cell'
  if (directType.includes('village')) return 'village'
  if (directType.includes('city')) return 'kigali'

  return hint || ''
}

function extractAdminLayers(datasets) {
  const layers = {
    provinces: [],
    districts: [],
    sectors: [],
    cells: [],
    villages: [],
    kigali: []
  }

  datasets.forEach((dataset) => {
    const parsed = toFeatureCollection(normalizeGeoJson(dataset.geoJson))
    if (!parsed) return
    const hint = getDatasetHint(dataset.name, dataset.type)

    parsed.features.forEach((feature) => {
      const name = String(feature?.properties?.name || '').toLowerCase()
      const adminType = getAdminType(feature?.properties, hint)

      if (adminType === 'province') {
        layers.provinces.push(feature)
        if (name.includes('kigali')) {
          layers.kigali.push(feature)
        }
        return
      }
      if (adminType === 'district') {
        layers.districts.push(feature)
        return
      }
      if (adminType === 'sector') {
        layers.sectors.push(feature)
        return
      }
      if (adminType === 'cell') {
        layers.cells.push(feature)
        return
      }
      if (adminType === 'village') {
        layers.villages.push(feature)
      }
      if (adminType === 'kigali') {
        layers.kigali.push(feature)
      }
    })
  })

  const toCollection = (features) => (features.length ? { type: 'FeatureCollection', features } : null)

  return {
    provinces: toCollection(layers.provinces),
    districts: toCollection(layers.districts),
    sectors: toCollection(layers.sectors),
    cells: toCollection(layers.cells),
    villages: toCollection(layers.villages),
    kigali: toCollection(layers.kigali)
  }
}

function extractRoadLayers(datasets) {
  const roadFeatures = []

  datasets.forEach((dataset) => {
    const parsed = toFeatureCollection(normalizeGeoJson(dataset.geoJson))
    if (!parsed) return
    const hint = getDatasetHint(dataset.name, dataset.type)

    parsed.features.forEach((feature) => {
      const geomType = feature?.geometry?.type
      const props = feature?.properties || {}
      const hasRoadProps = String(props.road_class || props.highway || props.type || '').toLowerCase().includes('road')
        || Boolean(props.highway)
        || Boolean(props.road_class)

      if (geomType === 'LineString' || geomType === 'MultiLineString') {
        if (hasRoadProps || hint === 'road' || dataset.type === 'TOPOGRAPHIC') {
          roadFeatures.push(feature)
        }
      }
    })
  })

  return roadFeatures.length ? { type: 'FeatureCollection', features: roadFeatures } : null
}

function roadStyle(feature) {
  const raw = String(
    feature?.properties?.road_class ||
    feature?.properties?.highway ||
    feature?.properties?.class ||
    feature?.properties?.type ||
    ''
  ).toLowerCase()

  if (raw.includes('national') || raw.includes('trunk') || raw.includes('primary')) {
    return { ...roadPalette.national }
  }
  if (raw.includes('district') || raw.includes('secondary')) {
    return { ...roadPalette.district }
  }
  if (raw.includes('feeder') || raw.includes('tertiary')) {
    return { ...roadPalette.feeder }
  }
  return { ...roadPalette.local, dashArray: raw.includes('path') ? '4' : undefined }
}

function buildUtmGrid(spacingMeters) {
  const spacing = Number(spacingMeters)
  if (!Number.isFinite(spacing) || spacing <= 0) return null

  const zones = [
    { zone: 35, lonMin: RW_BOUNDS.minLon, lonMax: Math.min(30, RW_BOUNDS.maxLon), proj: UTM_35S },
    { zone: 36, lonMin: Math.max(30, RW_BOUNDS.minLon), lonMax: RW_BOUNDS.maxLon, proj: UTM_36S }
  ]

  const features = []

  zones.forEach((zone) => {
    if (zone.lonMin >= zone.lonMax) return
    const corners = [
      [zone.lonMin, RW_BOUNDS.minLat],
      [zone.lonMin, RW_BOUNDS.maxLat],
      [zone.lonMax, RW_BOUNDS.minLat],
      [zone.lonMax, RW_BOUNDS.maxLat]
    ]

    const projected = corners.map((corner) => proj4(WGS84, zone.proj, corner))
    const eastings = projected.map(([x]) => x)
    const northings = projected.map(([, y]) => y)

    const minE = Math.min(...eastings)
    const maxE = Math.max(...eastings)
    const minN = Math.min(...northings)
    const maxN = Math.max(...northings)

    const startE = Math.floor(minE / spacing) * spacing
    const endE = Math.ceil(maxE / spacing) * spacing
    const startN = Math.floor(minN / spacing) * spacing
    const endN = Math.ceil(maxN / spacing) * spacing

    const segments = 8

    for (let e = startE; e <= endE; e += spacing) {
      const coords = []
      for (let i = 0; i <= segments; i += 1) {
        const n = minN + ((maxN - minN) * i) / segments
        const [lon, lat] = proj4(zone.proj, WGS84, [e, n])
        coords.push([lon, lat])
      }
      features.push({
        type: 'Feature',
        properties: { zone: zone.zone, easting: Math.round(e) },
        geometry: { type: 'LineString', coordinates: coords }
      })
    }

    for (let n = startN; n <= endN; n += spacing) {
      const coords = []
      for (let i = 0; i <= segments; i += 1) {
        const e = minE + ((maxE - minE) * i) / segments
        const [lon, lat] = proj4(zone.proj, WGS84, [e, n])
        coords.push([lon, lat])
      }
      features.push({
        type: 'Feature',
        properties: { zone: zone.zone, northing: Math.round(n) },
        geometry: { type: 'LineString', coordinates: coords }
      })
    }
  })

  if (!features.length) return null
  return { type: 'FeatureCollection', features }
}

function formatCoord(value) {
  return value === null || value === undefined ? '--' : value.toFixed(5)
}

export default function MapView() {
  const [projects, setProjects] = useState([])
  const [datasets, setDatasets] = useState([])
  const [runs, setRuns] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [mode, setMode] = useState('dataset')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [selectedRun, setSelectedRun] = useState('')
  const [geoJson, setGeoJson] = useState('')
  const [basemap, setBasemap] = useState('osm')
  const [error, setError] = useState('')
  const [sketch, setSketch] = useState({ features: [], summary: emptySummary })
  const [copyMessage, setCopyMessage] = useState('')
  const [snapTolerance, setSnapTolerance] = useState(6)
  const [bufferDistance, setBufferDistance] = useState(10)
  const [showBuffer, setShowBuffer] = useState(false)
  const [cursor, setCursor] = useState(null)
  const [showProvinces, setShowProvinces] = useState(true)
  const [showKigali, setShowKigali] = useState(true)
  const [showDistricts, setShowDistricts] = useState(false)
  const [showSectors, setShowSectors] = useState(false)
  const [showCells, setShowCells] = useState(false)
  const [showVillages, setShowVillages] = useState(false)
  const [showAdminLabels, setShowAdminLabels] = useState(true)
  const [showRoads, setShowRoads] = useState(true)
  const [showRoadLabels, setShowRoadLabels] = useState(false)
  const [showUtmGrid, setShowUtmGrid] = useState(false)
  const [utmSpacing, setUtmSpacing] = useState(5000)

  useEffect(() => {
    api.get('/api/projects')
      .then(setProjects)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    Promise.all([
      api.get(`/api/projects/${selectedProject}/datasets`),
      api.get(`/api/projects/${selectedProject}/subdivisions`)
    ])
      .then(([datasetData, runData]) => {
        setDatasets(datasetData)
        setRuns(runData)
        setSelectedDataset(datasetData[0]?.id ? String(datasetData[0].id) : '')
        setSelectedRun(runData[0]?.id ? String(runData[0].id) : '')
      })
      .catch((err) => setError(err.message))
  }, [selectedProject])

  useEffect(() => {
    if (mode === 'dataset') {
      const dataset = datasets.find((item) => String(item.id) === selectedDataset)
      setGeoJson(dataset?.geoJson || '')
    } else {
      const run = runs.find((item) => String(item.id) === selectedRun)
      setGeoJson(run?.resultGeoJson || '')
    }
  }, [mode, datasets, runs, selectedDataset, selectedRun])

  const adminLayers = useMemo(() => extractAdminLayers(datasets), [datasets])
  const roadLayer = useMemo(() => extractRoadLayers(datasets), [datasets])
  const adminLabel = (feature) => {
    if (!feature?.properties) return null
    return feature.properties.name
      || feature.properties.Name
      || feature.properties.code
      || feature.properties.CODE
      || feature.properties.id
      || feature.properties.ID
  }

  const sketchGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: sketch.features || []
    }
  }, [sketch.features])

  const bufferGeoJson = useMemo(() => {
    if (!showBuffer || !sketch.features.length) return null
    const distance = Number(bufferDistance)
    if (!Number.isFinite(distance) || distance <= 0) return null
    try {
      return turf.buffer(sketchGeoJson, distance, { units: 'meters' })
    } catch (err) {
      return null
    }
  }, [bufferDistance, showBuffer, sketch.features.length, sketchGeoJson])

  const utmGrid = useMemo(() => {
    if (!showUtmGrid) return null
    return buildUtmGrid(utmSpacing)
  }, [showUtmGrid, utmSpacing])

  const overlays = useMemo(() => {
    const items = []

    if (showProvinces && adminLayers.provinces) {
      items.push({
        id: 'provinces',
        data: adminLayers.provinces,
        style: { color: '#1E293B', weight: 2.4, fillOpacity: 0.05 },
        showLabels: showAdminLabels,
        labelFn: adminLabel
      })
    }

    if (showKigali && adminLayers.kigali) {
      items.push({
        id: 'kigali',
        data: adminLayers.kigali,
        style: { color: '#B6862C', weight: 3, fillOpacity: 0.08 },
        showLabels: showAdminLabels,
        labelFn: (feature) => adminLabel(feature) || 'Kigali City'
      })
    }

    if (showDistricts && adminLayers.districts) {
      items.push({
        id: 'districts',
        data: adminLayers.districts,
        style: { color: '#1F6F5F', weight: 1.8, fillOpacity: 0.05 },
        showLabels: showAdminLabels,
        labelFn: adminLabel
      })
    }

    if (showSectors && adminLayers.sectors) {
      items.push({
        id: 'sectors',
        data: adminLayers.sectors,
        style: { color: '#2A6FA1', weight: 1.2, fillOpacity: 0.04, dashArray: '4' },
        showLabels: showAdminLabels,
        labelFn: adminLabel
      })
    }

    if (showCells && adminLayers.cells) {
      items.push({
        id: 'cells',
        data: adminLayers.cells,
        style: { color: '#5B667A', weight: 1, fillOpacity: 0.03, dashArray: '3' },
        showLabels: showAdminLabels,
        labelFn: adminLabel
      })
    }

    if (showVillages && adminLayers.villages) {
      items.push({
        id: 'villages',
        data: adminLayers.villages,
        style: { color: '#B6862C', weight: 0.8, fillOpacity: 0.02, dashArray: '2' },
        showLabels: showAdminLabels,
        labelFn: adminLabel
      })
    }

    if (showRoads && roadLayer) {
      items.push({
        id: 'roads',
        data: roadLayer,
        style: roadStyle,
        showLabels: showRoadLabels,
        labelFn: (feature) => feature?.properties?.name || feature?.properties?.Name || feature?.properties?.road_name
      })
    }

    if (utmGrid) {
      items.push({
        id: 'utm-grid',
        data: utmGrid,
        style: { color: '#5B667A', weight: 1, dashArray: '3' },
        showLabels: false
      })
    }

    return items
  }, [
    adminLayers,
    roadLayer,
    showProvinces,
    showKigali,
    showDistricts,
    showSectors,
    showCells,
    showVillages,
    showAdminLabels,
    showRoads,
    showRoadLabels,
    utmGrid
  ])

  const extraSnapGeoJson = useMemo(() => {
    const features = []
    overlays.forEach((overlay) => {
      if (overlay.id === 'utm-grid') return
      if (overlay?.data?.features?.length) {
        features.push(...overlay.data.features)
      }
    })
    return features.length ? { type: 'FeatureCollection', features } : null
  }, [overlays])

  const utmCursor = useMemo(() => {
    if (!cursor) return null
    const zone = cursor.lng < 30 ? 35 : 36
    const proj = zone === 35 ? UTM_35S : UTM_36S
    try {
      const [easting, northing] = proj4(WGS84, proj, [cursor.lng, cursor.lat])
      return { zone, easting, northing }
    } catch (err) {
      return null
    }
  }, [cursor])

  const handleSketchChange = (features) => {
    const safeFeatures = Array.isArray(features) ? features : []
    const summary = summarizeSketch(safeFeatures)
    setSketch({ features: safeFeatures, summary })
    if (copyMessage) setCopyMessage('')
  }

  const downloadSketch = () => {
    if (!sketch.features.length) return
    const blob = new Blob([JSON.stringify(sketchGeoJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `geosmart-rwanda-sketch-${Date.now()}.geojson`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const copySketch = async () => {
    if (!sketch.features.length) {
      setCopyMessage('No sketches to copy yet.')
      return
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(sketchGeoJson, null, 2))
      setCopyMessage('Sketch GeoJSON copied to clipboard.')
    } catch (err) {
      setCopyMessage('Copy failed. Use Download instead.')
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Rwanda Map Workspace">
        <div className="grid md:grid-cols-6 gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Project</span>
            <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Layer</span>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="dataset">Dataset</option>
              <option value="subdivision">Subdivision result</option>
            </select>
          </label>
          {mode === 'dataset' ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Dataset</span>
              <select className="input" value={selectedDataset} onChange={(e) => setSelectedDataset(e.target.value)}>
                <option value="">Select dataset</option>
                {datasets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block space-y-2">
              <span className="text-sm font-medium">Run</span>
              <select className="input" value={selectedRun} onChange={(e) => setSelectedRun(e.target.value)}>
                <option value="">Select run</option>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>Run #{run.id}</option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-2">
            <span className="text-sm font-medium">Basemap</span>
            <select className="input" value={basemap} onChange={(e) => setBasemap(e.target.value)}>
              <option value="osm">OpenStreetMap</option>
              <option value="satellite">Satellite</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Snap (meters)</span>
            <input
              className="input"
              type="number"
              min="0"
              max="50"
              value={snapTolerance}
              onChange={(e) => setSnapTolerance(Number(e.target.value))}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">UTM grid</span>
            <select className="input" value={utmSpacing} onChange={(e) => setUtmSpacing(Number(e.target.value))}>
              <option value={1000}>1 km</option>
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
      </Card>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <Card title="GeoSpatial Map">
          <GeoJsonMap
            geoJson={geoJson}
            basemap={basemap}
            overlays={overlays}
            onSketchChange={handleSketchChange}
            snapTolerance={snapTolerance}
            bufferGeoJson={bufferGeoJson}
            onCursorMove={setCursor}
            extraSnapGeoJson={extraSnapGeoJson}
          />
          <div className="mt-3 text-xs text-ink/60 flex flex-wrap gap-4">
            <span>Rwanda CRS: WGS84 (lat, lon)</span>
            <span>Cursor: {formatCoord(cursor?.lat)}, {formatCoord(cursor?.lng)}</span>
            {utmCursor && (
              <span>UTM Zone {utmCursor.zone}S: {utmCursor.easting.toFixed(1)} E, {utmCursor.northing.toFixed(1)} N</span>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Rwanda Admin Layers">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showProvinces} onChange={(e) => setShowProvinces(e.target.checked)} />
                Provinces
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showKigali} onChange={(e) => setShowKigali(e.target.checked)} />
                Kigali City
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showDistricts} onChange={(e) => setShowDistricts(e.target.checked)} />
                Districts
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showSectors} onChange={(e) => setShowSectors(e.target.checked)} />
                Sectors
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} />
                Cells
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showVillages} onChange={(e) => setShowVillages(e.target.checked)} />
                Villages
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showAdminLabels} onChange={(e) => setShowAdminLabels(e.target.checked)} />
              Show admin labels
            </label>
            <p className="text-xs text-ink/60 mt-2">Upload official Rwanda admin GeoJSON layers to populate these overlays.</p>
          </Card>

          <Card title="Road Hierarchy">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showRoads} onChange={(e) => setShowRoads(e.target.checked)} />
              Show roads layer
            </label>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={showRoadLabels} onChange={(e) => setShowRoadLabels(e.target.checked)} />
              Show road labels
            </label>
            <div className="mt-3 text-xs text-ink/60 space-y-1">
              <p>National/Primary: orange</p>
              <p>District/Secondary: gold</p>
              <p>Feeder/Tertiary: green</p>
              <p>Local/Path: gray</p>
            </div>
          </Card>

          <Card title="Survey Tools">
            <div className="space-y-3 text-sm text-ink/80">
              <p>Draw parcels, roads, or boundaries using the map toolbar. Snapping aligns sketches with existing Rwanda layers.</p>
              <p>Measurements are calculated in meters and kilometers.</p>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="font-semibold">Sketch polygons:</span> {sketch.summary.polygonCount}</p>
              <p><span className="font-semibold">Sketch lines:</span> {sketch.summary.lineCount}</p>
              <p><span className="font-semibold">Total area:</span> {sketch.summary.totalAreaSqm.toFixed(2)} sqm</p>
              <p><span className="font-semibold">Total length:</span> {sketch.summary.totalLengthKm.toFixed(3)} km</p>
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showBuffer} onChange={(e) => setShowBuffer(e.target.checked)} />
                Show buffer overlay
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-medium">Buffer distance (meters)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={bufferDistance}
                  onChange={(e) => setBufferDistance(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showUtmGrid} onChange={(e) => setShowUtmGrid(e.target.checked)} />
                Show UTM grid (35S/36S)
              </label>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={downloadSketch} disabled={!sketch.features.length}>Download GeoJSON</Button>
              <Button variant="secondary" onClick={copySketch} disabled={!sketch.features.length}>Copy GeoJSON</Button>
              {copyMessage && <p className="text-xs text-ink/60">{copyMessage}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
