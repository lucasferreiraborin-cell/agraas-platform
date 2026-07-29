"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Pin verde da marca (divIcon SVG — não depende dos assets default do Leaflet,
// que quebram no bundler do Next).
const pinIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
      <path d="M15 0C7.3 0 1 6.3 1 14c0 9.6 12.2 22.6 13 23.4a1.4 1.4 0 0 0 2 0C16.8 36.6 29 23.6 29 14 29 6.3 22.7 0 15 0z" fill="#2E8B3E" stroke="#fff" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="#fff"/>
    </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  popupAnchor: [0, -34],
  className: "",
});

export default function PassportPropertyMap({
  lat,
  lng,
  name,
  city,
  state,
}: {
  lat: number;
  lng: number;
  name: string | null;
  city?: string | null;
  state?: string | null;
}) {
  const local = [city, state].filter(Boolean).join("/");
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={9}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
        detectRetina
        maxZoom={19}
      />
      <Marker position={[lat, lng]} icon={pinIcon}>
        <Popup>
          <span style={{ fontWeight: 600 }}>{name ?? "Propriedade"}</span>
          {local && <span style={{ display: "block", fontSize: 11, color: "#666" }}>{local}</span>}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
