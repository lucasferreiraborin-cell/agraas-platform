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

// Brazil full bounds
const BRAZIL_BOUNDS = L.latLngBounds(
  L.latLng(-33.75, -73.99), // SW
  L.latLng(5.27, -28.84)    // NE
);

function pinIcon(score: number, selected = false) {
  const color = score >= 75 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
  const r = selected ? 10 : 7;
  const ring = selected ? 22 : 16;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ring * 2}" height="${ring * 2 + 8}" viewBox="0 0 ${ring * 2} ${ring * 2 + 8}">
      <circle cx="${ring}" cy="${ring}" r="${ring - 1}" fill="${color}" opacity="0.18"/>
      <circle cx="${ring}" cy="${ring}" r="${r}" fill="${color}" stroke="white" stroke-width="${selected ? 2.5 : 2}"/>
      <line x1="${ring}" y1="${ring + r}" x2="${ring}" y2="${ring * 2 + 6}" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [ring * 2, ring * 2 + 8],
    iconAnchor: [ring, ring * 2 + 8],
    popupAnchor: [0, -(ring * 2 + 8)],
    className: "",
  });
}

function FitBounds({ pins }: { pins: PropertyPin[] }) {
  const map = useMap();
  useEffect(() => {
    // Always start with full Brazil view, with min zoom 3
    map.fitBounds(BRAZIL_BOUNDS, { padding: [24, 24], maxZoom: 5 });
  }, [map, pins]);
  return null;
}

export default function BrazilMap({
  properties,
  selectedId,
  onSelect,
}: {
  properties: PropertyPin[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <MapContainer
      bounds={BRAZIL_BOUNDS}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      attributionControl={false}
      minZoom={3}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution=""
      />
      <FitBounds pins={properties} />
      {properties.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={pinIcon(p.scoreAvg, p.id === selectedId)}
          eventHandlers={onSelect ? { click: () => onSelect(p.id) } : {}}
        >
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
