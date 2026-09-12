"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Wrench, Recycle, Zap, Train, Leaf, Navigation,
  Filter, TrendingDown, Clock, Phone, Globe, ChevronRight, Search,
} from "lucide-react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { getMapPoints } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { startLoading } from "@/components/PageLoader";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const ICON_MAP: Record<string, any> = {
  wrench: Wrench, recycle: Recycle, zap: Zap,
  train: Train, leaf: Leaf, shirt: Recycle,
  sun: Zap, bike: Navigation, tag: Recycle,
  default: MapPin,
};

const WALK_SPEED_KMH = 5;
const BIKE_SPEED_KMH = 15;

function formatTime(km: number, speed: number) {
  const min = Math.round((km / speed) * 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default function MapPage() {
  const router  = useRouter();
  const { ready } = useAuth();
  const geoRef  = useRef<{ lat: number; lon: number } | null>(null);
  const [points, setPoints]         = useState<any[]>([]);
  const [filtered, setFiltered]     = useState<any[]>([]);
  const [center, setCenter]         = useState({ lat: 12.9716, lon: 77.5946 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [categories, setCategories] = useState<Record<string, any>>({});
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity]             = useState("");
  const [totalSaving, setTotalSaving] = useState(0);

  // Start requesting geolocation immediately on mount — don't wait for useAuth
  // so the browser prompt appears right away instead of after auth round-trip
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { geoRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude }; },
        ()  => { geoRef.current = { lat: 12.9716, lon: 77.5946 }; },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const uid = localStorage.getItem("loop_user_id");
    if (!uid) { setLoading(false); setError("Session not found. Please log in again."); return; }
    const numUid = Number(uid);

    if (navigator.geolocation) {
      // If we already got coords from the early request, use them immediately
      if (geoRef.current) {
        load(numUid, geoRef.current.lat, geoRef.current.lon);
        return;
      }
      // Otherwise wait for it (race: 6s then fall back to city default)
      const fallbackTimer = setTimeout(() => load(numUid, 12.9716, 77.5946), 6000);
      navigator.geolocation.getCurrentPosition(
        pos => { clearTimeout(fallbackTimer); load(numUid, pos.coords.latitude, pos.coords.longitude); },
        ()  => { clearTimeout(fallbackTimer); load(numUid, 12.9716, 77.5946); },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      load(numUid, 12.9716, 77.5946);
    }
  }, [ready]);

  async function load(uid: number, lat: number, lon: number) {
    setLoading(true);
    setError("");
    try {
      const d = await getMapPoints(uid, lat, lon);
      setPoints(d.points || []);
      setFiltered(d.points || []);
      if (d.center) setCenter(d.center);
      if (d.categories) setCategories(d.categories);
      if (d.city) setCity(d.city);
      const saving = (d.points || []).reduce((s: number, p: any) => s + (p.co2_saving_kg || 0), 0);
      setTotalSaving(Math.round(saving * 10) / 10);
      setError(""); // clear any stale error
    } catch (e: any) {
      setError(e.message || "Could not load map data. Check your connection.");
    } finally { setLoading(false); }
  }

  // Apply filter + search
  useEffect(() => {
    let result = points;
    if (activeFilter !== "all") result = result.filter(p => p.category === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category_label.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
    if (selectedPoint && !result.find((p: any) => p.lat === selectedPoint.lat)) {
      setSelectedPoint(null);
    }
  }, [activeFilter, searchQuery, points]);

  const filterTabs = [
    { key: "all", label: "All", count: points.length, color: "#22c55e" },
    ...Object.entries(categories).map(([k, v]: any) => ({
      key: k, label: v.label.split("/")[0].trim(), count: v.count, color: v.color,
    })),
  ];

  return (
    <div style={{ background: "var(--dark)", minHeight: "100vh" }}>
      <Navbar />
      <div style={{ paddingTop: "60px", height: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Header bar */}
        <div style={{ padding: "20px 28px 0", flexShrink: 0 }}>
          <div className="row-sb" style={{ marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text1)", letterSpacing: "-0.3px" }}>
                Circular Action Map
              </h1>
              <p style={{ fontSize: "13px", color: "var(--text2)", marginTop: "2px" }}>
                {city && `${city} · `}
                {loading ? "Loading nearby points..." : `${points.length} points found · `}
                {!loading && totalSaving > 0 && (
                  <span style={{ color: "var(--g400)", fontWeight: 600 }}>
                    {totalSaving} kg CO₂ saving potential nearby
                  </span>
                )}
              </p>
            </div>
            {/* Search */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={14} color="var(--text3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                className="input"
                placeholder="Search points..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "34px", padding: "9px 14px 9px 34px", fontSize: "13px", borderRadius: "10px", height: "38px" }}
              />
            </div>
          </div>

          {/* Category filter tabs */}
          {!loading && filterTabs.length > 1 && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none" }}>
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", borderRadius: "100px", flexShrink: 0,
                    background: activeFilter === tab.key ? `${tab.color}20` : "var(--dark3)",
                    border: `1px solid ${activeFilter === tab.key ? tab.color + "50" : "var(--border)"}`,
                    color: activeFilter === tab.key ? tab.color : "var(--text2)",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <Filter size={11} />
                  {tab.label}
                  <span style={{ background: activeFilter === tab.key ? `${tab.color}30` : "rgba(255,255,255,0.06)", borderRadius: "100px", padding: "1px 6px", fontSize: "11px" }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content: map + sidebar */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 360px", gap: "0", overflow: "hidden", padding: "0 28px 20px" }}>

          {/* Map */}
          <div style={{ background: "var(--card)", borderRadius: "14px 0 0 14px", border: "1px solid var(--border)", borderRight: "none", overflow: "hidden", position: "relative" }}>
            {loading ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
                <div className="spinner spinner-light" style={{ width: 32, height: 32 }} />
                <p className="text-muted text-sm">Finding points near you...</p>
              </div>
            ) : error && points.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", padding: "32px" }}>
                <MapPin size={36} color="var(--text3)" />
                <p className="text-muted text-sm" style={{ textAlign: "center" }}>{error}</p>
                <button className="btn-ghost btn-sm" onClick={() => {
                  const uid = localStorage.getItem("loop_user_id");
                  if (uid) load(Number(uid), geoRef.current?.lat ?? 12.9716, geoRef.current?.lon ?? 77.5946);
                }}>Retry</button>
              </div>
            ) : (
              <MapView
                center={center}
                points={filtered}
                selectedPoint={selectedPoint}
                onSelectPoint={setSelectedPoint}
              />
            )}

            {/* Map stats overlay */}
            {!loading && filtered.length > 0 && (
              <div style={{
                position: "absolute", bottom: "16px", left: "16px",
                background: "rgba(8,11,15,0.88)", backdropFilter: "blur(12px)",
                border: "1px solid var(--border2)", borderRadius: "10px",
                padding: "10px 16px", display: "flex", gap: "20px",
              }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "18px", fontWeight: 900, color: "var(--g400)", lineHeight: 1 }}>{filtered.length}</p>
                  <p style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>points</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "18px", fontWeight: 900, color: "var(--text1)", lineHeight: 1 }}>
                    {filtered.length > 0 ? `${filtered[0].distance_km} km` : "–"}
                  </p>
                  <p style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>nearest</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "18px", fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>
                    {filtered.reduce((s: number, p: any) => s + (p.co2_saving_kg || 0), 0).toFixed(1)}
                  </p>
                  <p style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>kg saveable</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{
            background: "var(--card)", borderRadius: "0 14px 14px 0",
            border: "1px solid var(--border)", overflowY: "auto",
            display: "flex", flexDirection: "column",
          }}>
            {/* Selected point detail */}
            {selectedPoint && (
              <div style={{
                padding: "18px 18px 14px",
                background: `${selectedPoint.color}08`,
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}>
                <div className="row-sb" style={{ marginBottom: "10px" }}>
                  <div className="row gap-10">
                    <div style={{ width: 36, height: 36, borderRadius: "9px", background: `${selectedPoint.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {(() => { const I = ICON_MAP[selectedPoint.icon] || MapPin; return <I size={16} color={selectedPoint.color} />; })()}
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text1)", lineHeight: 1.3 }}>{selectedPoint.name}</p>
                      <p style={{ fontSize: "11px", color: selectedPoint.color, marginTop: "2px" }}>{selectedPoint.category_label}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedPoint(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "16px" }}>×</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "8px 10px" }}>
                    <p style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "2px" }}>Distance</p>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text1)" }}>{selectedPoint.distance_km} km</p>
                    <p style={{ fontSize: "10px", color: "var(--text3)" }}>{formatTime(selectedPoint.distance_km, WALK_SPEED_KMH)} walk</p>
                  </div>
                  <div style={{ background: "rgba(74,222,128,0.08)", borderRadius: "8px", padding: "8px 10px", border: "1px solid rgba(74,222,128,0.15)" }}>
                    <p style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "2px" }}>CO₂ saving</p>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--g400)" }}>{selectedPoint.co2_saving_kg} kg</p>
                    <p style={{ fontSize: "10px", color: "var(--text3)" }}>if you {selectedPoint.action}</p>
                  </div>
                </div>

                {selectedPoint.address && (
                  <p style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "8px" }}>📍 {selectedPoint.address}</p>
                )}
                {selectedPoint.opening_hours && (
                  <p style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "4px" }}>
                    <Clock size={11} style={{ display: "inline", marginRight: "4px" }} />{selectedPoint.opening_hours}
                  </p>
                )}
                {selectedPoint.phone && (
                  <p style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "4px" }}>
                    <Phone size={11} style={{ display: "inline", marginRight: "4px" }} />{selectedPoint.phone}
                  </p>
                )}

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.lat},${selectedPoint.lon}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", marginTop: "10px", background: "var(--g600)", color: "#fff", fontWeight: 700, fontSize: "13px", padding: "9px", borderRadius: "9px", textDecoration: "none" }}
                >
                  <Navigation size={13} /> Get directions
                </a>
              </div>
            )}

            {/* Points list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "10px" }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <MapPin size={32} color="var(--text3)" style={{ margin: "0 auto 12px" }} />
                  <p className="text-muted text-sm">No points match your filter.</p>
                </div>
              ) : (
                <div style={{ padding: "10px" }}>
                  {filtered.map((pt: any, i: number) => {
                    const Icon = ICON_MAP[pt.icon] || MapPin;
                    const isSelected = selectedPoint?.lat === pt.lat && selectedPoint?.lon === pt.lon;
                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedPoint(isSelected ? null : pt)}
                        className="fade-up"
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "10px",
                          padding: "11px 12px", borderRadius: "10px", marginBottom: "4px",
                          background: isSelected ? `${pt.color}10` : "transparent",
                          border: `1px solid ${isSelected ? pt.color + "35" : "transparent"}`,
                          cursor: "pointer", transition: "all 0.15s",
                          animationDelay: `${i * 0.04}s`,
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: "8px", background: `${pt.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                          <Icon size={14} color={pt.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "2px" }}>
                            {pt.name}
                          </p>
                          <p style={{ fontSize: "11px", color: pt.color, marginBottom: "4px" }}>{pt.category_label}</p>
                          <div className="row gap-8">
                            <span style={{ fontSize: "11px", color: "var(--text3)" }}>📍 {pt.distance_km} km</span>
                            <span style={{ fontSize: "11px", color: "var(--text3)" }}>·</span>
                            <span style={{ fontSize: "11px", color: "var(--text3)" }}>🚶 {formatTime(pt.distance_km, WALK_SPEED_KMH)}</span>
                            {pt.co2_saving_kg > 0 && (
                              <>
                                <span style={{ fontSize: "11px", color: "var(--text3)" }}>·</span>
                                <span style={{ fontSize: "11px", color: "var(--g400)", fontWeight: 600 }}>
                                  -{pt.co2_saving_kg} kg CO₂
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} color="var(--text3)" style={{ flexShrink: 0, marginTop: "10px" }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {!loading && filtered.length > 0 && (
              <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                <p style={{ fontSize: "11px", color: "var(--text3)", textAlign: "center" }}>
                  Click a point to see distance, CO₂ saving, and directions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
