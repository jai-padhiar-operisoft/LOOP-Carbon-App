"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix webpack broken default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored marker factory
function makeIcon(color: string, selected = false) {
  const size = selected ? 38 : 30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${size}">
    <path d="M12 0C7.589 0 4 3.589 4 8c0 6.627 8 16 8 16s8-9.373 8-16c0-4.411-3.589-8-8-8z"
      fill="${color}" stroke="${selected ? '#fff' : color}" stroke-width="${selected ? 1.5 : 0}" opacity="${selected ? 1 : 0.9}"/>
    <circle cx="12" cy="8" r="4" fill="white" opacity="0.95"/>
  </svg>`;
  return L.divIcon({
    className: "",
    html: `<div style="filter:drop-shadow(0 2px 6px ${color}88)">${svg}</div>`,
    iconSize:   [size, size * 1.2],
    iconAnchor: [size / 2, size * 1.2],
    popupAnchor: [0, -size * 1.1],
  });
}

// User location marker
const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
  iconSize:   [16, 16],
  iconAnchor: [8, 8],
});

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 14); }, [center, map]);
  return null;
}

interface Point {
  lat: number; lon: number;
  name: string; type: string;
  category_label: string;
  color: string;
  address?: string;
  distance_km?: number;
  co2_saving_kg?: number;
  action?: string;
  opening_hours?: string;
}

interface Props {
  center: { lat: number; lon: number };
  points: Point[];
  selectedPoint?: Point | null;
  onSelectPoint?: (p: Point) => void;
}

export default function MapView({ center, points, selectedPoint, onSelectPoint }: Props) {
  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap center={[center.lat, center.lon]} />

      {/* User location */}
      <Marker position={[center.lat, center.lon]} icon={userIcon}>
        <Popup>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>You are here</div>
        </Popup>
      </Marker>

      {/* Radius circle */}
      <Circle
        center={[center.lat, center.lon]}
        radius={3000}
        pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.04, weight: 1, dashArray: "4 4" }}
      />

      {/* Action points */}
      {points.map((pt, i) => {
        const isSelected = selectedPoint?.lat === pt.lat && selectedPoint?.lon === pt.lon;
        return (
          <Marker
            key={i}
            position={[pt.lat, pt.lon]}
            icon={makeIcon(pt.color || "#22c55e", isSelected)}
            eventHandlers={{ click: () => onSelectPoint?.(pt) }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <div style={{ minWidth: "180px", fontFamily: "system-ui, sans-serif" }}>
                <strong style={{ display: "block", fontSize: "13px", marginBottom: "4px", color: "#111" }}>
                  {pt.name}
                </strong>
                <span style={{ fontSize: "11px", color: pt.color, fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  {pt.category_label}
                </span>
                {pt.distance_km && (
                  <p style={{ fontSize: "12px", color: "#555", marginBottom: "2px" }}>
                    📍 {pt.distance_km} km away
                  </p>
                )}
                {pt.co2_saving_kg && (
                  <p style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, marginBottom: "6px" }}>
                    Saves {pt.co2_saving_kg} kg CO₂
                  </p>
                )}
                {pt.address && (
                  <p style={{ fontSize: "11px", color: "#777", marginBottom: "6px" }}>{pt.address}</p>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lon}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: "block", fontSize: "12px", color: "#16a34a", fontWeight: 700, textDecoration: "underline" }}
                >
                  Get directions →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
