"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";

// Maritime route: Santos (BR) → Cape of Good Hope (ZA) → Jeddah (SA)
// Waypoints follow real shipping lane through South Atlantic, around Cape,
// up East Africa coast, through Red Sea to Jeddah
const MARITIME_ROUTE: [number, number][] = [
  [-23.94, -46.33], // Santos, Brazil
  [-27.60, -48.55], // Florianópolis coast
  [-32.10, -50.80], // Rio Grande do Sul coast
  [-34.90, -51.20], // Rio Grande port area
  [-38.50, -52.00], // South Atlantic, heading SE
  [-42.00, -48.00], // Deep South Atlantic
  [-44.50, -38.00], // Mid South Atlantic
  [-44.00, -20.00], // South Atlantic (east)
  [-42.00,  -5.00], // Approaching Africa
  [-38.00,  14.00], // Gulf of Guinea approach
  [-34.36,  18.47], // Cape of Good Hope, South Africa
  [-32.00,  27.00], // South Indian Ocean, east of Cape
  [-26.00,  34.00], // Mozambique channel south
  [-18.00,  37.00], // Mozambique channel mid
  [-11.00,  41.00], // Off Tanzania coast
  [ -4.00,  41.00], // Mombasa area, Kenya
  [  2.00,  45.00], // Somalia coast
  [ 11.00,  44.00], // Gulf of Aden west
  [ 12.50,  43.50], // Bab-el-Mandeb strait
  [ 14.00,  42.50], // Red Sea south
  [ 17.00,  41.50], // Red Sea mid
  [ 19.50,  37.30], // Red Sea central
  [ 21.49,  39.17], // Jeddah, Saudi Arabia
];

const SANTOS = MARITIME_ROUTE[0];
const JEDDAH = MARITIME_ROUTE[MARITIME_ROUTE.length - 1];

function portIcon(label: string, sub: string) {
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="width:30px;height:30px;border-radius:50%;background:#0f2d1a;border:2px solid #4ade80;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(74,222,128,0.4)">
          <div style="width:8px;height:8px;border-radius:50%;background:#4ade80"></div>
        </div>
        <div style="text-align:center;line-height:1.2">
          <p style="color:#4ade80;font-size:9px;font-weight:700;letter-spacing:0.8px;margin:0">${label}</p>
          <p style="color:rgba(255,255,255,0.45);font-size:8px;margin:0">${sub}</p>
        </div>
      </div>`,
    iconSize: [60, 52],
    iconAnchor: [30, 30],
    className: "",
  });
}

export default function ExportMapGL() {
  const allLat = MARITIME_ROUTE.map((p) => p[0]);
  const allLng = MARITIME_ROUTE.map((p) => p[1]);
  const bounds = L.latLngBounds(
    [Math.min(...allLat) - 3, Math.min(...allLng) - 5],
    [Math.max(...allLat) + 3, Math.max(...allLng) + 5]
  );

  return (
    <div className="overflow-hidden rounded-2xl" style={{ height: 300 }}>
      <MapContainer
        bounds={bounds}
        style={{ width: "100%", height: "100%", background: "#111827" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        {/* Glow */}
        <Polyline
          positions={MARITIME_ROUTE}
          pathOptions={{ color: "#4ade80", weight: 8, opacity: 0.12 }}
        />
        {/* Main route line */}
        <Polyline
          positions={MARITIME_ROUTE}
          pathOptions={{ color: "#4ade80", weight: 2.5, opacity: 0.9, dashArray: "8 4" }}
        />
        <Marker position={SANTOS} icon={portIcon("SANTOS", "Brasil")} />
        <Marker position={JEDDAH} icon={portIcon("JEDDAH", "Arábia Saudita")} />
      </MapContainer>
    </div>
  );
}
