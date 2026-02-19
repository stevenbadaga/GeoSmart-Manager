import React from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'

const sampleGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { status: 'active' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [30.020, -1.970],
            [30.020, -1.935],
            [30.080, -1.935],
            [30.080, -1.970],
            [30.020, -1.970]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: { status: 'active' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [30.060, -1.950],
            [30.060, -1.925],
            [30.105, -1.925],
            [30.105, -1.950],
            [30.060, -1.950]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: { status: 'conflict' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [30.045, -1.965],
            [30.045, -1.940],
            [30.065, -1.940],
            [30.065, -1.965],
            [30.045, -1.965]
          ]
        ]
      }
    }
  ]
}

const styleFeature = (feature) => {
  const status = feature?.properties?.status
  if (status === 'conflict') {
    return {
      color: '#C0392B',
      weight: 2,
      fillColor: '#C0392B',
      fillOpacity: 0.2
    }
  }
  return {
    color: '#1F8A4C',
    weight: 2,
    fillColor: '#1F8A4C',
    fillOpacity: 0.18
  }
}

export default function MiniMap() {
  return (
    <MapContainer
      center={[-1.944, 30.06]}
      zoom={12}
      className="h-full w-full rounded-b-2xl"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={sampleGeoJson} style={styleFeature} />
    </MapContainer>
  )
}
