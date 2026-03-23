"use client";

import { useCallback, useRef, useState } from "react";
import Map, { Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, LayerProps } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type PropertyPin = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  scoreAvg: number;
  animalsCount: number;
};

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Brazil bounding box fallback
const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-73.9, -33.8],
  [-28.8, 5.3],
];

function pinColor(score: number): string {
  if (score >= 70) return "#5d9c44";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

// ── Cluster layers ─────────────────────────────────────────────────────────────

const clusterCircleLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  source: "properties",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#5d9c44",
      5, "#d97706",
      10, "#dc2626",
    ],
    "circle-radius": ["step", ["get", "point_count"], 20, 5, 26, 10, 32],
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#ffffff",
    "circle-opacity": 0.92,
  },
};

const clusterCountLayer: LayerProps = {
  id: "cluster-count",
  type: "symbol",
  source: "properties",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 13,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

export default function BrazilMap({ properties }: { properties: PropertyPin[] }) {
  const mapRef = useRef<MapRef>(null);
  const [hovered, setHovered] = useState<PropertyPin | null>(null);

  // Build GeoJSON for clustering
  const geojson = {
    type: "FeatureCollection" as const,
    features: properties.map((p) => ({
      type: "Feature" as const,
      properties: { id: p.id, scoreAvg: p.scoreAvg },
      geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
    })),
  };

  const onLoad = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    if (properties.length === 0) {
      map.fitBounds(BRAZIL_BOUNDS, { padding: 32, duration: 0 });
      return;
    }

    if (properties.length === 1) {
      map.flyTo({ center: [properties[0].lng, properties[0].lat], zoom: 7, duration: 0 });
      return;
    }

    const lngs = properties.map((p) => p.lng);
    const lats = properties.map((p) => p.lat);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, duration: 0 }
    );
  }, [properties]);

  return (
    <div className="overflow-hidden rounded-2xl" style={{ height: 360 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={{
          longitude: -52,
          latitude: -14,
          zoom: 3.5,
        }}
        onLoad={onLoad}
        interactiveLayerIds={["clusters"]}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Cluster source */}
        <Source
          id="properties"
          type="geojson"
          data={geojson}
          cluster={true}
          clusterMaxZoom={10}
          clusterRadius={50}
        >
          <Layer {...clusterCircleLayer} />
          <Layer {...clusterCountLayer} />
        </Source>

        {/* Individual pins */}
        {properties.map((prop) => (
          <Marker
            key={prop.id}
            longitude={prop.lng}
            latitude={prop.lat}
            anchor="center"
          >
            <button
              type="button"
              aria-label={prop.name}
              onMouseEnter={() => setHovered(prop)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { window.location.href = `/propriedades/${prop.id}`; }}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: pinColor(prop.scoreAvg),
                border: "2.5px solid white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.15s",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.25)"; }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.25)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.88)",
                  display: "block",
                }}
              />
            </button>
          </Marker>
        ))}

        {/* Tooltip popup */}
        {hovered && (
          <Popup
            longitude={hovered.lng}
            latitude={hovered.lat}
            anchor="bottom"
            offset={20}
            closeButton={false}
            closeOnClick={false}
            style={{ zIndex: 10 }}
          >
            <div
              style={{
                fontFamily: "inherit",
                minWidth: 160,
                padding: "12px 14px",
              }}
            >
              <p style={{ fontWeight: 600, fontSize: 14, color: "#1e2a1b", margin: 0 }}>
                {hovered.name}
              </p>
              <p style={{ fontSize: 12, color: "#788473", marginTop: 2 }}>
                {hovered.city}, {hovered.state}
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#788473", margin: 0 }}>
                    Score médio
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#4f8a38", margin: "2px 0 0" }}>
                    {hovered.scoreAvg}
                  </p>
                </div>
                <div style={{ width: 1, background: "rgba(30,42,27,0.08)" }} />
                <div>
                  <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#788473", margin: 0 }}>
                    Animais
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e2a1b", margin: "2px 0 0" }}>
                    {hovered.animalsCount}
                  </p>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
