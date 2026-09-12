"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, TrendingDown, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getActions } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { startLoading } from "@/components/PageLoader";

const EFFORT: Record<string, { label: string; cls: string }> = {
  low:    { label: "Easy win",    cls: "tag-green"  },
  medium: { label: "Some effort", cls: "tag-yellow" },
  high:   { label: "Commitment",  cls: "tag-orange" },
};

const CAT_COLORS: Record<string, string> = {
  food_delivery:"#22c55e", ride_hailing:"#3b82f6", fuel:"#f97316",
  flights:"#8b5cf6", electricity:"#eab308", shopping_fashion:"#ec4899",
  electronics:"#06b6d4", grocery:"#84cc16", restaurant:"#f59e0b",
  other:"#6b7280",
};

export default function ActionsPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  function load() {
    const uid = localStorage.getItem("loop_user_id");
    if (!uid) {
      setLoading(false);
      setError("Session not found. Please log in again.");
      return;
    }
    setLoading(true);
    setError("");
    getActions(Number(uid))
      .then(d => setActions(d.actions || []))
      .catch((e: any) => setError(e.message || "Could not reach the backend. Make sure it is running."))
      .finally(() => setLoading(false));
  }

  // Only load after auth is confirmed
  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready]);

  const total = actions.reduce((s, a) => s + (a.co2_saving_kg || 0), 0);

  return (
    <div className="page">
      <Navbar />
      <div className="wrap-md" style={{ paddingTop: "40px", paddingBottom: "80px" }}>

        {/* Header */}
        <div className="row-sb mb-32 fade-up">
          <div>
            <h1 className="page-title">Your Action Plan</h1>
            <p className="page-sub">Generated from your actual spending. Not generic tips.</p>
          </div>
          <button className="btn-ghost btn-sm" onClick={load} style={{ gap: "6px" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Savings banner */}
        {!loading && actions.length > 0 && (
          <div className="card fade-up fade-up-1" style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px", borderColor: "rgba(74,222,128,0.2)", background: "linear-gradient(90deg, rgba(22,163,74,0.08), var(--card))" }}>
            <div style={{ width: 48, height: 48, borderRadius: "12px", background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(74,222,128,0.2)" }}>
              <TrendingDown size={20} color="var(--g400)" />
            </div>
            <div>
              <p style={{ fontSize: "18px", fontWeight: 900, color: "var(--text1)" }}>
                {total.toFixed(1)} kg CO₂ potential saving
              </p>
              <p className="text-muted text-sm">If you act on all suggestions this month</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert-error fade-up" style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span>{error}</span>
            <button className="btn-ghost btn-sm" onClick={load} style={{ flexShrink: 0 }}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Action cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {loading
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: "106px", animationDelay: `${i * 0.07}s` }} />
              ))
            : actions.map((action, i) => {
                const effort = EFFORT[action.effort_level] || EFFORT.medium;
                const color  = CAT_COLORS[action.category] || "#6b7280";
                return (
                  <div key={i} className="action-card fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="action-rank" style={{ background: `${color}15`, color }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-sb" style={{ marginBottom: "5px", gap: "12px", alignItems: "flex-start" }}>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text1)", lineHeight: 1.3 }}>
                          {action.title}
                        </p>
                        <span className={`tag ${effort.cls}`} style={{ flexShrink: 0 }}>{effort.label}</span>
                      </div>
                      <p style={{ fontSize: "13.5px", color: "var(--text2)", lineHeight: 1.6, marginBottom: "10px" }}>
                        {action.description}
                      </p>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "8px", padding: "4px 10px" }}>
                        <Leaf size={12} color="var(--g400)" />
                        <span style={{ fontSize: "12px", color: "var(--g400)", fontWeight: 700 }}>
                          Saves {action.co2_saving_kg} kg CO₂/month
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          {loading && (
            <p style={{ textAlign: "center", color: "var(--text3)", fontSize: "13px", paddingTop: "8px" }}>
              AI is reading your spending patterns...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
