"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

// Maritime route: Santos (BR) → Cape of Good Hope (ZA) → Jeddah (SA)
// Waypoints follow real shipping lane through South Atlantic, around Cape,
// up East Africa coast, through Red Sea to Jeddah
const MARITIME_ROUTE: [number, number][] = [
  [-23.9, -46.3], // Santos, Brazil
  [-30,   -42],   // South Atlantic
  [-34,   -28],   // Mid South Atlantic
  [-34.8,  19.9], // Cape of Good Hope
  [-28,    33],   // East Africa coast
  [-20,    37],   // Mozambique channel
  [ -2,    45],   // Indian Ocean, east of Kenya
  [ -2,    50],   // Indian Ocean, offshore Somalia
  [  5,    50],   // Indian Ocean, north Somalia
  [ 11.5,  51.5], // Somalia, Indian Ocean
  [ 12,    50],   // Gulf of Aden east
  [ 13,    47],   // Gulf of Aden
  [ 16,    42],   // Bab-el-Mandeb / Red Sea
  [ 21.5,  39.1], // Jeddah, Saudi Arabia
];

const SANTOS = MARITIME_ROUTE[0];
const JEDDAH = MARITIME_ROUTE[MARITIME_ROUTE.length - 1];

const ROUTE_BOUNDS = L.latLngBounds(L.latLng(-34.8, -46.3), L.latLng(21.5, 50));

function FitRoute() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(ROUTE_BOUNDS, { padding: [60, 60] });
  }, [map]);
  return null;
}

function portIcon(label: string, sub: string) {
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div style="width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid #2d6a27;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.18)">
          <div style="width:8px;height:8px;border-radius:50%;background:#2d6a27"></div>
        </div>
        <div style="text-align:center;line-height:1.2">
          <p style="color:#1a4a17;font-size:9px;font-weight:700;letter-spacing:0.8px;margin:0">${label}</p>
          <p style="color:#666;font-size:8px;margin:0">${sub}</p>
        </div>
      </div>`,
    iconSize: [60, 52],
    iconAnchor: [30, 30],
    className: "",
  });
}

export default function ExportMapGL() {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ height: 300 }}>
      <MapContainer
        center={[-7, -4]}
        zoom={2}
        style={{ width: "100%", height: "100%", background: "#f0f3f0" }}
        zoomControl={false}
        attributionControl={false}
      >
        <FitRoute />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        {/* Shadow */}
        <Polyline
          positions={MARITIME_ROUTE}
          pathOptions={{ color: "#2d6a27", weight: 6, opacity: 0.15 }}
        />
        {/* Main route line */}
        <Polyline
          positions={MARITIME_ROUTE}
          pathOptions={{ color: "#3d7a33", weight: 2.5, opacity: 0.85, dashArray: "8 4" }}
        />
        <Marker position={SANTOS} icon={portIcon("SANTOS", "Brasil")} />
        <Marker position={JEDDAH} icon={portIcon("JEDDAH", "Arábia Saudita")} />
      </MapContainer>
    </div>
  );
}
