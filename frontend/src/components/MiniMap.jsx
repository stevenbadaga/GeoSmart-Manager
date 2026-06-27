import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

export default function MiniMap() {
  return (
    <MapContainer
      center={[-1.9441, 30.0619]}
      zoom={12}
      className="h-full w-full rounded-b-2xl"
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[-1.9441, 30.0619]}>
        <Popup>Kigali, Rwanda</Popup>
      </Marker>
    </MapContainer>
  )
}
