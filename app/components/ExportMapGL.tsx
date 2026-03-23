"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Port coordinates
const SANTOS: [number, number] = [-46.33, -23.94];
const JEDDAH: [number, number] = [39.17, 21.49];

// Sample a great-circle arc between two lon/lat points
function sampleArc(
  from: [number, number],
  to: [number, number],
  steps = 80
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [lon1, lat1] = from.map(toRad);
  const [lon2, lat2] = to.map(toRad);

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    // Slerp in 3D, project back to lon/lat
    const A = Math.sin((1 - f) * Math.PI) / Math.sin(Math.PI); // simplified linear for display
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
    // Unwrap longitude to avoid antimeridian jump
    if (i > 0) {
      const prev = points[i - 1][0];
      while (lon - prev > 180) lon -= 360;
      while (prev - lon > 180) lon += 360;
    }
    points.push([lon, lat]);
  }
  return points;
}

const ARC_COORDS = sampleArc(SANTOS, JEDDAH, 80);

const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  source: "route",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": "#4ade80",
    "line-width": 2.5,
    "line-opacity": 0.9,
  },
};

const routeGlowLayer: LayerProps = {
  id: "route-glow",
  type: "line",
  source: "route",
  layout: { "line-cap": "round", "line-join": "round" },
  paint: {
    "line-color": "#4ade80",
    "line-width": 7,
    "line-opacity": 0.12,
  },
};

// Animated dash layer — driven by state
function routeDashLayer(offset: number): LayerProps {
  return {
    id: "route-dash",
    type: "line",
    source: "route-full",
    layout: { "line-cap": "butt", "line-join": "round" },
    paint: {
      "line-color": "#4ade80",
      "line-width": 2.5,
      "line-dasharray": [0, 2, offset % 4, 2],
      "line-opacity": 0.6,
    },
  };
}

function PinMarker({ label, sub }: { label: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#0f2d1a",
          border: "2px solid #4ade80",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 12px rgba(74,222,128,0.4)",
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80" }} />
      </div>
      <div style={{ textAlign: "center", lineHeight: 1.2 }}>
        <p style={{ color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: "0.8px", margin: 0 }}>
          {label}
        </p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 8, margin: 0 }}>{sub}</p>
      </div>
    </div>
  );
}

export default function ExportMapGL() {
  const mapRef = useRef<MapRef>(null);
  const [dashOffset, setDashOffset] = useState(0);
  const animRef = useRef<number>(0);

  // Animate dash offset
  useEffect(() => {
    let frame = 0;
    function animate() {
      frame++;
      setDashOffset(frame * 0.06);
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const routeGeoJSON = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: ARC_COORDS },
  };

  function onLoad() {
    if (!mapRef.current) return;
    mapRef.current.getMap().fitBounds(
      [
        [Math.min(SANTOS[0], JEDDAH[0]) - 5, Math.min(SANTOS[1], JEDDAH[1]) - 8],
        [Math.max(SANTOS[0], JEDDAH[0]) + 5, Math.max(SANTOS[1], JEDDAH[1]) + 10],
      ],
      { padding: 48, duration: 1200 }
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl" style={{ height: 300 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialViewState={{ longitude: -3, latitude: 0, zoom: 1.8 }}
        onLoad={onLoad}
        style={{ width: "100%", height: "100%" }}
        interactive={false}
        attributionControl={false}
      >
        {/* Glow + solid route */}
        <Source id="route" type="geojson" data={routeGeoJSON}>
          <Layer {...routeGlowLayer} />
          <Layer {...routeLineLayer} />
        </Source>

        {/* Animated dash overlay */}
        <Source id="route-full" type="geojson" data={routeGeoJSON}>
          <Layer {...routeDashLayer(dashOffset)} />
        </Source>

        {/* Port markers */}
        <Marker longitude={SANTOS[0]} latitude={SANTOS[1]} anchor="bottom">
          <PinMarker label="SANTOS" sub="Brasil" />
        </Marker>
        <Marker longitude={JEDDAH[0]} latitude={JEDDAH[1]} anchor="bottom">
          <PinMarker label="JEDDAH" sub="Arábia Saudita" />
        </Marker>
      </Map>
    </div>
  );
}
