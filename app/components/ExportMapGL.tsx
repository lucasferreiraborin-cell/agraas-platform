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
  [-15,    40],   // Mozambique
  [ -8,    40],   // Tanzania
  [ -2,    42],   // Kenya
  [ 11.5,  43],   // Djibouti
  [ 12.5,  43.3], // Bab-el-Mandeb
  [ 16,    41],   // Red Sea
  [ 18,    40],   // Red Sea north
  [ 21.5,  39.1], // Jeddah, Saudi Arabia
];

const SANTOS = MARITIME_ROUTE[0];
const JEDDAH = MARITIME_ROUTE[MARITIME_ROUTE.length - 1];

const ROUTE_BOUNDS = L.latLngBounds(L.latLng(-34.8, -46.3), L.latLng(21.5, 43.3));

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
  return (
    <div className="overflow-hidden rounded-2xl" style={{ height: 300 }}>
      <MapContainer
        center={[-7, -4]}
        zoom={2}
        style={{ width: "100%", height: "100%", background: "#111827" }}
        zoomControl={false}
        attributionControl={false}
      >
        <FitRoute />
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
