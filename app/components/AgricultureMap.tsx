"use client";

import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Farm = {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  total_area_ha: number | null;
};

type Field = {
  id: string;
  field_name: string | null;
  field_code: string;
  culture: string;
  area_ha: number | null;
  status: string;
  polygon_coordinates: { lat: number; lng: number }[] | null;
  farm_id: string;
};

const CULTURE_COLORS: Record<string, string> = {
  soja:   "#5d9c44",
  milho:  "#d4930a",
  trigo:  "#92400e",
  acucar: "#7c3aed",
  cafe:   "#6b3a2a",
};

const CULTURE_LABELS: Record<string, string> = {
  soja: "Soja", milho: "Milho", trigo: "Trigo", acucar: "Açúcar", cafe: "Café",
};

function makeFarmIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
    "><div style="transform:rotate(45deg);color:white;font-size:12px;font-weight:700;margin-left:1px;margin-top:1px">🌾</div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

export default function AgricultureMap({ farms, fields }: { farms: Farm[]; fields: Field[] }) {

  const center: [number, number] = farms.length > 0
    ? [farms[0].lat, farms[0].lng]
    : [-17.797, -50.981];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%", borderRadius: "0 0 1.5rem 1.5rem" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Field polygons */}
      {fields.map(field => {
        if (!field.polygon_coordinates?.length) return null;
        const positions = field.polygon_coordinates.map(p => [p.lat, p.lng] as [number, number]);
        const color = CULTURE_COLORS[field.culture] ?? "#5d9c44";
        return (
          <Polygon
            key={field.id}
            positions={positions}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
          >
            <Popup>
              <strong>{field.field_name ?? field.field_code}</strong><br />
              {CULTURE_LABELS[field.culture] ?? field.culture} · {field.area_ha} ha<br />
              <span style={{ textTransform: "capitalize" }}>{field.status.replace("_", " ")}</span>
            </Popup>
          </Polygon>
        );
      })}

      {/* Farm markers */}
      {farms.map(farm => {
        const farmFields = fields.filter(f => f.farm_id === farm.id);
        const primaryCulture = farmFields[0]?.culture ?? "soja";
        const color = CULTURE_COLORS[primaryCulture] ?? "#5d9c44";
        return (
          <Marker key={farm.id} position={[farm.lat, farm.lng]} icon={makeFarmIcon(color)}>
            <Popup>
              <strong>{farm.name}</strong><br />
              {farm.city}, {farm.state}<br />
              {farm.total_area_ha != null ? `${farm.total_area_ha} ha` : ""}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
