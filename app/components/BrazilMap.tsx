"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

export type PropertyPin = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  scoreAvg: number;
  animalsCount: number;
};

function pinIcon(score: number) {
  const color =
    score >= 75 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <circle cx="14" cy="13" r="12" fill="${color}" opacity="0.15"/>
      <circle cx="14" cy="13" r="7" fill="${color}"/>
      <line x1="14" y1="20" x2="14" y2="34" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
    className: "",
  });
}

function FitBounds({ pins }: { pins: PropertyPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.setView([-14.5, -51.5], 4);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 8 });
  }, [map, pins]);
  return null;
}

export default function BrazilMap({ properties }: { properties: PropertyPin[] }) {
  return (
    <MapContainer
      center={[-14.5, -51.5]}
      zoom={4}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution=""
      />
      <FitBounds pins={properties} />
      {properties.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.scoreAvg)}>
          <Popup>
            <div style={{ minWidth: 140 }}>
              <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 4px" }}>{p.name}</p>
              {(p.city || p.state) && (
                <p style={{ fontSize: 11, color: "#666", margin: "0 0 4px" }}>
                  {[p.city, p.state].filter(Boolean).join(", ")}
                </p>
              )}
              <p style={{ fontSize: 11, margin: 0 }}>
                Score médio: <strong>{p.scoreAvg}</strong>
              </p>
              <p style={{ fontSize: 11, margin: 0 }}>
                Animais: <strong>{p.animalsCount}</strong>
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
