import React, { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'

const BASEMAPS = {
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    label: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
}

const RW_CENTER = [-1.9536, 30.0605]
const RW_BOUNDS = L.latLngBounds(L.latLng(-2.84, 28.86), L.latLng(-1.05, 30.9))

function normalizeGeoJson(geoJson) {
  if (!geoJson) return null
  if (typeof geoJson === 'string') {
    return JSON.parse(geoJson)
  }
  return geoJson
}

function flattenLatLngs(latlngs, bucket = []) {
  if (!latlngs) return bucket
  if (Array.isArray(latlngs)) {
    latlngs.forEach((entry) => flattenLatLngs(entry, bucket))
    return bucket
  }
  if (latlngs.lat !== undefined && latlngs.lng !== undefined) {
    bucket.push(latlngs)
  }
  return bucket
}

function extractLatLngsFromGeoJson(geoJson) {
  if (!geoJson) return []
  const layer = L.geoJSON(geoJson)
  const points = []
  layer.eachLayer((item) => {
    if (item.getLatLngs) {
      flattenLatLngs(item.getLatLngs(), points)
    }
  })
  return points
}

function snapLatLng(latlng, candidates, map, tolerance) {
  let closest = latlng
  let minDistance = Infinity
  candidates.forEach((candidate) => {
    const distance = map.distance(latlng, candidate)
    if (distance < minDistance) {
      minDistance = distance
      closest = candidate
    }
  })

  return minDistance <= tolerance ? closest : latlng
}

function snapLatLngs(latlngs, candidates, map, tolerance) {
  if (!Array.isArray(latlngs)) return latlngs
  return latlngs.map((entry) => {
    if (Array.isArray(entry)) {
      return snapLatLngs(entry, candidates, map, tolerance)
    }
    return snapLatLng(entry, candidates, map, tolerance)
  })
}

function applySnapping(layer, candidates, map, tolerance) {
  if (!layer?.getLatLngs || !candidates.length || tolerance <= 0) return
  const latlngs = layer.getLatLngs()
  const snapped = snapLatLngs(latlngs, candidates, map, tolerance)
  layer.setLatLngs(snapped)
  if (layer.redraw) {
    layer.redraw()
  }
}

function SketchTools({ onSketchChange, snapTolerance, snapTargets }) {
  const map = useMap()
  const drawnItemsRef = useRef(new L.FeatureGroup())
  const labelIndexRef = useRef(1)

  useEffect(() => {
    const drawnItems = drawnItemsRef.current
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      edit: {
        featureGroup: drawnItems,
        remove: true
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true
        },
        polyline: true,
        rectangle: true,
        circle: false,
        marker: false,
        circlemarker: false
      }
    })

    map.addControl(drawControl)

    const updateSketch = () => {
      const features = []
      drawnItems.eachLayer((layer) => {
        features.push(layer.toGeoJSON())
      })
      onSketchChange?.(features)
    }

    const labelLayer = (layer) => {
      const label = `D${labelIndexRef.current}`
      labelIndexRef.current += 1
      layer.bindTooltip(label, {
        permanent: true,
        direction: 'center',
        className: 'map-label'
      })
    }

    const collectCandidates = (excludeLayer) => {
      const points = []
      drawnItems.eachLayer((layer) => {
        if (excludeLayer && layer === excludeLayer) return
        if (layer.getLatLngs) {
          flattenLatLngs(layer.getLatLngs(), points)
        }
      })
      if (snapTargets?.length) {
        points.push(...snapTargets)
      }
      return points
    }

    const onCreated = (event) => {
      const candidates = collectCandidates()
      applySnapping(event.layer, candidates, map, snapTolerance)
      drawnItems.addLayer(event.layer)
      labelLayer(event.layer)
      updateSketch()
    }

    const onEdited = (event) => {
      event.layers.eachLayer((layer) => {
        const candidates = collectCandidates(layer)
        applySnapping(layer, candidates, map, snapTolerance)
      })
      updateSketch()
    }

    const onDeleted = () => updateSketch()

    map.on(L.Draw.Event.CREATED, onCreated)
    map.on(L.Draw.Event.EDITED, onEdited)
    map.on(L.Draw.Event.DELETED, onDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated)
      map.off(L.Draw.Event.EDITED, onEdited)
      map.off(L.Draw.Event.DELETED, onDeleted)
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map, onSketchChange, snapTolerance, snapTargets])

  return null
}

function FitBounds({ geoJson }) {
  const map = useMap()

  useEffect(() => {
    if (geoJson) {
      const layer = L.geoJSON(geoJson)
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2))
        return
      }
    }
    map.fitBounds(RW_BOUNDS.pad(0.12))
  }, [geoJson, map])

  return null
}

function MapScale() {
  const map = useMap()

  useEffect(() => {
    const control = L.control.scale({ metric: true, imperial: false })
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map])

  return null
}

function CursorTracker({ onMove }) {
  const map = useMap()

  useEffect(() => {
    if (!onMove) return undefined
    const handler = (event) => onMove(event.latlng)
    const reset = () => onMove(null)
    map.on('mousemove', handler)
    map.on('mouseout', reset)
    return () => {
      map.off('mousemove', handler)
      map.off('mouseout', reset)
    }
  }, [map, onMove])

  return null
}

export default function GeoJsonMap({
  geoJson,
  basemap = 'osm',
  overlays = [],
  onSketchChange,
  snapTolerance = 6,
  bufferGeoJson,
  onCursorMove,
  extraSnapGeoJson
}) {
  const parsed = useMemo(() => {
    try {
      return normalizeGeoJson(geoJson)
    } catch (err) {
      return null
    }
  }, [geoJson])

  const overlaySnapPoints = useMemo(() => {
    if (!extraSnapGeoJson) return []
    try {
      return extractLatLngsFromGeoJson(extraSnapGeoJson)
    } catch (err) {
      return []
    }
  }, [extraSnapGeoJson])

  const snapTargets = useMemo(() => {
    const points = []
    if (parsed) {
      points.push(...extractLatLngsFromGeoJson(parsed))
    }
    if (overlaySnapPoints.length) {
      points.push(...overlaySnapPoints)
    }
    return points
  }, [parsed, overlaySnapPoints])

  const tile = BASEMAPS[basemap] || BASEMAPS.osm

  const baseOnEachFeature = (feature, leafletLayer) => {
    const label = feature?.properties?.parcel ?? feature?.properties?.name
    if (label) {
      leafletLayer.bindTooltip(String(label), {
        permanent: true,
        direction: 'center',
        className: 'map-label'
      })
    }
  }

  return (
    <div className="border border-clay/60 rounded-2xl bg-white/70 overflow-hidden">
      <MapContainer
        className="h-[540px] w-full"
        center={RW_CENTER}
        zoom={12}
        minZoom={7}
        maxBounds={RW_BOUNDS.pad(0.4)}
        scrollWheelZoom
      >
        <TileLayer attribution={tile.attribution} url={tile.url} />
        {parsed && (
          <GeoJSON data={parsed} style={{ color: '#1F6F5F', weight: 2, fillOpacity: 0.25 }} onEachFeature={baseOnEachFeature} />
        )}
        {overlays.map((overlay) => {
          if (!overlay?.data) return null
          const onEachOverlayFeature = overlay.showLabels
            ? (feature, leafletLayer) => {
                const label = overlay.labelFn
                  ? overlay.labelFn(feature)
                  : feature?.properties?.[overlay.labelKey] ?? feature?.properties?.name
                if (label) {
                  leafletLayer.bindTooltip(String(label), {
                    permanent: true,
                    direction: 'center',
                    className: 'map-label'
                  })
                }
              }
            : undefined

          return (
            <GeoJSON
              key={overlay.id}
              data={overlay.data}
              style={overlay.style}
              onEachFeature={onEachOverlayFeature}
            />
          )
        })}
        {bufferGeoJson && (
          <GeoJSON data={bufferGeoJson} style={{ color: '#B6862C', weight: 2, fillOpacity: 0.2, dashArray: '4' }} />
        )}
        <SketchTools onSketchChange={onSketchChange} snapTolerance={snapTolerance} snapTargets={snapTargets} />
        <FitBounds geoJson={parsed} />
        <MapScale />
        <CursorTracker onMove={onCursorMove} />
      </MapContainer>
      <div className="px-4 py-2 text-xs text-ink/60">Rwanda basemap: {tile.label}</div>
    </div>
  )
}
