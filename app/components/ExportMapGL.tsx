"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";

const SANTOS: [number, number] = [-23.94, -46.33];
const JEDDAH: [number, number] = [21.49, 39.17];

function sampleArc(
  from: [number, number],
  to: [number, number],
  steps = 80
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [lat1, lon1] = from.map(toRad);
  const [lat2, lon2] = to.map(toRad);

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const d =
      2 *
      Math.asin(
        Math.sqrt(
          Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
        )
      );
    const sinD = Math.sin(d) || 1e-10;
    const a = Math.sin((1 - f) * d) / sinD;
    const b = Math.sin(f * d) / sinD;
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    let lon = toDeg(Math.atan2(y, x));
    if (i > 0) {
      const prev = points[i - 1][1];
      while (lon - prev > 180) lon -= 360;
      while (prev - lon > 180) lon += 360;
    }
    points.push([lat, lon]);
  }
  return points;
}

const ARC = sampleArc(SANTOS, JEDDAH, 80);

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
  const bounds = L.latLngBounds([SANTOS, JEDDAH]).pad(0.15);

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
        <Polyline
          positions={ARC}
          pathOptions={{ color: "#4ade80", weight: 2.5, opacity: 0.9 }}
        />
        <Polyline
          positions={ARC}
          pathOptions={{ color: "#4ade80", weight: 8, opacity: 0.12 }}
        />
        <Marker position={SANTOS} icon={portIcon("SANTOS", "Brasil")} />
        <Marker position={JEDDAH} icon={portIcon("JEDDAH", "Arábia Saudita")} />
      </MapContainer>
    </div>
  );
}
