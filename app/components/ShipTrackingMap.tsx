"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Route waypoints Santos → Jeddah ──────────────────────────────────────────

const WAYPOINTS: [number, number][] = [
  [-23.9618, -46.3322], // Santos, Brasil
  [-34.3568,  18.4734], // Cabo da Boa Esperança
  [ 12.6167,  43.4500], // Entrada Mar Vermelho / Golfo de Áden
  [ 21.4858,  39.1925], // Jeddah, Arábia Saudita
];

const PORT_LABELS = ["Santos, Brasil", "Cabo da Boa Esperança", "Golfo de Áden", "Jeddah, Arábia Saudita"];

const JOURNEY_DAYS_ESTIMATE = 25;

// ── Haversine distance (km) ───────────────────────────────────────────────────

function haversine([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Interpolate position along route ─────────────────────────────────────────

function interpolateRoute(progress: number): [number, number] {
  const clamped = Math.max(0, Math.min(1, progress));
  const segments: number[] = [];
  let total = 0;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const d = haversine(WAYPOINTS[i], WAYPOINTS[i + 1]);
    segments.push(d);
    total += d;
  }
  let remaining = clamped * total;
  for (let i = 0; i < segments.length; i++) {
    if (remaining <= segments[i]) {
      const t = remaining / segments[i];
      const [lat1, lng1] = WAYPOINTS[i];
      const [lat2, lng2] = WAYPOINTS[i + 1];
      return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
    }
    remaining -= segments[i];
  }
  return WAYPOINTS[WAYPOINTS.length - 1];
}

// ── Completed route polyline up to current position ───────────────────────────

function completedPolyline(progress: number): [number, number][] {
  const clamped = Math.max(0, Math.min(1, progress));
  const segments: number[] = [];
  let total = 0;
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    segments.push(haversine(WAYPOINTS[i], WAYPOINTS[i + 1]));
    total += segments[i];
  }
  const points: [number, number][] = [WAYPOINTS[0]];
  let remaining = clamped * total;
  for (let i = 0; i < segments.length; i++) {
    if (remaining <= segments[i]) {
      const t = remaining / segments[i];
      const [lat1, lng1] = WAYPOINTS[i];
      const [lat2, lng2] = WAYPOINTS[i + 1];
      points.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
      break;
    }
    remaining -= segments[i];
    points.push(WAYPOINTS[i + 1]);
  }
  return points;
}

// ── DivIcon helpers (avoid webpack icon bug) ─────────────────────────────────

function makeIcon(emoji: string, size = 28): L.DivIcon {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">${emoji}</div>`,
    className: "",
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

// ── Map auto-fit to waypoints ─────────────────────────────────────────────────

function MapFitter() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(WAYPOINTS.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map]);
  return null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  departureDate: string;
  arrivalDate?: string | null;
  shipName?: string | null;
  animalsOnBoard: number;
  lotName: string;
  originPort?: string | null;
  destinationPort?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShipTrackingMap({
  departureDate,
  arrivalDate,
  shipName,
  animalsOnBoard,
  lotName,
  originPort,
  destinationPort,
}: Props) {
  const departure = useMemo(() => new Date(departureDate), [departureDate]);

  const arrival = useMemo(() => {
    if (arrivalDate) return new Date(arrivalDate);
    const d = new Date(departure);
    d.setDate(d.getDate() + JOURNEY_DAYS_ESTIMATE);
    return d;
  }, [arrivalDate, departure]);

  const now = new Date();
  const totalMs = arrival.getTime() - departure.getTime();
  const elapsedMs = now.getTime() - departure.getTime();
  const progress = totalMs > 0 ? elapsedMs / totalMs : 0;
  const progressClamped = Math.max(0, Math.min(1, progress));
  const progressPct = Math.round(progressClamped * 100);

  const shipPos = useMemo(() => interpolateRoute(progressClamped), [progressClamped]);
  const donePolyline = useMemo(() => completedPolyline(progressClamped), [progressClamped]);

  const etaStr = arrival.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const daysLeft = Math.max(0, Math.ceil((arrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const shipIcon  = useMemo(() => makeIcon("🚢", 26), []);
  const portIcon  = useMemo(() => makeIcon("⚓", 20), []);
  const waypointIcon = useMemo(() => makeIcon("📍", 16), []);

  // Status label
  const status =
    progressClamped <= 0 ? "Aguardando embarque"
    : progressClamped >= 1 ? "Entregue"
    : "Em trânsito";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a14]">
      {/* Info bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-white/8">
        <div className="flex items-center gap-3">
          <span className="text-lg">🚢</span>
          <div>
            <p className="text-sm font-semibold text-white/90">
              {shipName ?? "Vessel"} — {lotName}
            </p>
            <p className="text-xs text-white/40">
              {originPort ?? "Santos"} → {destinationPort ?? "Jeddah"} · {animalsOnBoard} animais
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <p className="text-white/35 uppercase tracking-wider text-[10px]">Progresso</p>
            <p className="font-semibold text-emerald-400">{progressPct}%</p>
          </div>
          <div className="text-center">
            <p className="text-white/35 uppercase tracking-wider text-[10px]">ETA</p>
            <p className="font-semibold text-white/80">{etaStr}</p>
          </div>
          <div className="text-center">
            <p className="text-white/35 uppercase tracking-wider text-[10px]">Status</p>
            <p className={`font-semibold ${progressClamped > 0 && progressClamped < 1 ? "text-blue-400" : "text-white/60"}`}>
              {status}
            </p>
          </div>
          {daysLeft > 0 && (
            <div className="text-center">
              <p className="text-white/35 uppercase tracking-wider text-[10px]">Dias restantes</p>
              <p className="font-semibold text-amber-400">{daysLeft}d</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Map */}
      <div style={{ height: 360 }}>
        <MapContainer
          center={[-5, 10]}
          zoom={3}
          style={{ height: "100%", width: "100%", background: "#0d1b2a" }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <MapFitter />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* Full route — dashed grey */}
          <Polyline
            positions={WAYPOINTS}
            pathOptions={{ color: "#ffffff", weight: 1.5, opacity: 0.2, dashArray: "6 8" }}
          />

          {/* Completed route — solid green */}
          {donePolyline.length > 1 && (
            <Polyline
              positions={donePolyline}
              pathOptions={{ color: "#34d399", weight: 2.5, opacity: 0.8 }}
            />
          )}

          {/* Intermediate waypoints */}
          {WAYPOINTS.slice(1, -1).map(([lat, lng], i) => (
            <Marker key={i} position={[lat, lng]} icon={waypointIcon}>
              <Popup>
                <div style={{ fontFamily: "sans-serif", fontSize: 12 }}>
                  <strong>{PORT_LABELS[i + 1]}</strong>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Origin port */}
          <Marker position={WAYPOINTS[0]} icon={portIcon}>
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 12, minWidth: 140 }}>
                <strong>⚓ {originPort ?? "Santos, Brasil"}</strong><br />
                Partida: {departure.toLocaleDateString("pt-BR")}
              </div>
            </Popup>
          </Marker>

          {/* Destination port */}
          <Marker position={WAYPOINTS[WAYPOINTS.length - 1]} icon={portIcon}>
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 12, minWidth: 140 }}>
                <strong>⚓ {destinationPort ?? "Jeddah, Arábia Saudita"}</strong><br />
                ETA: {etaStr}{daysLeft > 0 ? ` (${daysLeft} dias)` : " (entregue)"}
              </div>
            </Popup>
          </Marker>

          {/* Ship marker */}
          {progressClamped > 0 && progressClamped < 1 && (
            <Marker position={shipPos} icon={shipIcon}>
              <Popup>
                <div style={{ fontFamily: "sans-serif", fontSize: 12, minWidth: 160 }}>
                  <strong>🚢 {shipName ?? "Vessel"}</strong><br />
                  <strong>{lotName}</strong><br />
                  {animalsOnBoard} animais a bordo<br />
                  Viagem: {progressPct}% concluída<br />
                  ETA: {etaStr}<br />
                  {daysLeft > 0 ? `${daysLeft} dias restantes` : "Chegada hoje"}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
