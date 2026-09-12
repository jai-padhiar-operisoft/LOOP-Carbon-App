"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Crown, Plus, Hash, Flame, TrendingUp, Zap, Leaf, Award, Star, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getCircles, joinCircle, createCircle } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { startLoading } from "@/components/PageLoader";

const P_ICONS: Record<string, any> = {
  "Carbon Heavy": Flame, "Habitual Spender": TrendingUp,
  "Convenience Consumer": Zap, "Mindful Consumer": Leaf,
  "Conscious Optimizer": Award, "Green Pioneer": Star, "Explorer": Zap,
};
const P_COLORS: Record<string, string> = {
  "Carbon Heavy": "#ef4444", "Habitual Spender": "#f97316",
  "Convenience Consumer": "#eab308", "Mindful Consumer": "#84cc16",
  "Conscious Optimizer": "#22c55e", "Green Pioneer": "#10b981", "Explorer": "#818cf8",
};

export default function CirclesPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const [circles, setCircles]  = useState<any[]>([]);
  const [loading, setLoading]  = useState(true);
  const [modal, setModal]      = useState<"join"|"create"|null>(null);
  const [input, setInput]      = useState("");
  const [actionLoading, setAL] = useState(false);
  const [toast, setToast]      = useState("");
  const [error, setError]      = useState("");
  const [userId,    setUserId]    = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Read localStorage only after mount to avoid hydration mismatch
  useEffect(() => {
    const uid = Number(localStorage.getItem("loop_user_id"));
    setUserId(uid || null);
    try {
      const s = JSON.parse(localStorage.getItem("loop_session") || "{}");
      setUserEmail(s.email || "");
    } catch { setUserEmail(""); }
  }, []);

  // Load circles only after both auth is ready AND userId is set
  useEffect(() => {
    if (!ready || !userId) return;
    setLoading(true);
    getCircles(userId)
      .then(d => setCircles(d.circles || []))
      .catch((e: any) => setError(e.message || "Could not load circles. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [ready, userId]);

  function load() {
    if (!userId) return;
    setLoading(true);
    setError("");
    getCircles(userId)
      .then(d => setCircles(d.circles || []))
      .catch((e: any) => setError(e.message || "Could not load circles. Is the backend running?"))
      .finally(() => setLoading(false));
  }

  async function handleJoin() {
    if (!userId || !input.trim()) return;
    setAL(true); setError("");
    try {
      const r = await joinCircle(userId, input.trim().toUpperCase());
      setToast(`Joined "${r.circle_name}"`);
      setModal(null); setInput(""); load();
    } catch (e: any) { setError(e.message); }
    finally { setAL(false); }
  }

  async function handleCreate() {
    if (!userId || !input.trim()) return;
    setAL(true); setError("");
    try {
      const r = await createCircle(userId, input.trim());
      setToast(`Circle created! Code: ${r.code}`);
      setModal(null); setInput(""); load();
    } catch (e: any) { setError(e.message); }
    finally { setAL(false); }
  }

  return (
    <div className="page">
      <Navbar />
      <div className="wrap" style={{ paddingTop: "40px", paddingBottom: "80px" }}>

        {/* Header */}
        <div className="row-sb mb-32 fade-up">
          <div>
            <h1 className="page-title">Circles</h1>
            <p className="page-sub">Compete with people you know. Social accountability beats individual guilt.</p>
          </div>
          <div className="row gap-12">
            <button className="btn-ghost btn-sm" onClick={() => { setModal("join"); setInput(""); setError(""); }}>
              <Hash size={13} /> Join
            </button>
            <button className="btn-primary btn-sm" onClick={() => { setModal("create"); setInput(""); setError(""); }}>
              <Plus size={13} /> Create
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="alert-success fade-up" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{toast}</span>
            <button onClick={() => setToast("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}><X size={14} /></button>
          </div>
        )}

        {/* Error state */}
        {!loading && error && circles.length === 0 && (
          <div className="card fade-up" style={{ textAlign: "center", padding: "48px 40px", borderColor: "rgba(239,68,68,0.2)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Users size={22} color="#f87171" />
            </div>
            <p className="font-semi" style={{ color: "var(--text1)", marginBottom: "6px" }}>Could not load circles</p>
            <p className="text-faint text-sm" style={{ marginBottom: "20px" }}>{error}</p>
            <button className="btn-ghost btn-sm" onClick={load}>Retry</button>
          </div>
        )}

        {/* Circles list / empty state */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading
            ? [...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: "280px" }} />)
            : !error && circles.length === 0
            ? (
              <div className="card fade-up" style={{ textAlign: "center", padding: "64px 40px" }}>
                <Users size={40} color="var(--text3)" style={{ margin: "0 auto 16px" }} />
                <p className="text-muted font-semi" style={{ marginBottom: "4px" }}>No circles yet</p>
                <p className="text-faint text-sm">Create one or join with a code like <strong style={{ color: "var(--text2)", fontFamily: "monospace" }}>BGS2026</strong></p>
              </div>
            )
            : circles.map((circle, ci) => (
              <div key={circle.id} className="card fade-up" style={{ padding: 0, overflow: "hidden", animationDelay: `${ci * 0.08}s` }}>

                {/* Circle header */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="row gap-14">
                    <div style={{ width: 42, height: 42, borderRadius: "10px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={18} color="var(--g400)" />
                    </div>
                    <div>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text1)" }}>{circle.name}</p>
                      <p className="text-faint text-sm">
                        Code: <span style={{ fontFamily: "monospace", color: "var(--text2)", fontWeight: 700 }}>{circle.code}</span>
                        &nbsp;·&nbsp; {circle.member_count} members
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "20px", fontWeight: 900, color: "var(--g400)" }}>{circle.total_co2_avoided} kg</p>
                    <p className="text-faint text-xs">CO₂ avoided together</p>
                  </div>
                </div>

                {/* Leaderboard */}
                {circle.members.map((m: any, rank: number) => {
                  const isMe     = m.email && userEmail ? m.email === userEmail : m.user_id === userId;
                  const Icon     = P_ICONS[m.personality] || Zap;
                  const color    = P_COLORS[m.personality] || "#6b7280";
                  const isFirst  = rank === 0;
                  const streak   = m.streak_days || 0;
                  const rewarded = m.reward_earned;
                  const daysLeft = streak > 0 && streak < 10 ? 10 - streak : 0;

                  return (
                    <div key={m.user_id} className={`member-row ${isMe ? "is-me" : ""}`}
                      style={{ borderBottom: rank < circle.members.length - 1 ? "1px solid var(--border)" : "none" }}>

                      {/* Rank */}
                      <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                        {isFirst
                          ? <Crown size={16} color="#facc15" />
                          : <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text3)" }}>{rank + 1}</span>}
                      </div>

                      {/* Personality icon */}
                      <div style={{ width: 36, height: 36, borderRadius: "10px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={15} color={color} />
                      </div>

                      {/* Name + streak */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: isMe ? "var(--g400)" : "var(--text1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.name}
                          </p>
                          {isMe && <span className="tag tag-green" style={{ fontSize: "10px" }}>you</span>}
                          {/* Reward badge */}
                          {rewarded && (
                            <span title="10-day #1 streak reward earned!" style={{
                              display: "inline-flex", alignItems: "center", gap: "3px",
                              fontSize: "10px", fontWeight: 700,
                              background: "linear-gradient(135deg, #f59e0b22, #f9731622)",
                              border: "1px solid #f59e0b55",
                              color: "#fbbf24",
                              padding: "2px 8px", borderRadius: "100px",
                            }}>
                              🏅 10-Day Champion
                            </span>
                          )}
                          {/* Streak counter — only show for rank #1 with active streak */}
                          {isFirst && streak > 0 && !rewarded && (
                            <span title={`${streak} days at #1. ${daysLeft} more to earn the reward!`} style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              fontSize: "10px", fontWeight: 700,
                              background: "rgba(251,191,36,0.1)",
                              border: "1px solid rgba(251,191,36,0.25)",
                              color: "#fbbf24",
                              padding: "2px 8px", borderRadius: "100px",
                              cursor: "help",
                            }}>
                              🔥 {streak}d streak
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "12px", color, marginTop: "1px" }}>{m.personality}</p>
                        {/* Progress bar toward reward — only for rank #1 */}
                        {isFirst && streak > 0 && !rewarded && (
                          <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min((streak / 10) * 100, 100)}%`,
                                background: "linear-gradient(90deg, #f59e0b, #f97316)",
                                borderRadius: "3px",
                                transition: "width 0.4s ease",
                              }} />
                            </div>
                            <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {streak}/10
                            </span>
                          </div>
                        )}
                        {/* Reward earned message for current user */}
                        {rewarded && isMe && (
                          <p style={{ fontSize: "11px", color: "#fbbf24", marginTop: "4px" }}>
                            Reward earned on {m.reward_date}. Keep leading to retain your title.
                          </p>
                        )}
                      </div>

                      {/* CO2 */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text1)" }}>{m.total_co2} kg</p>
                        <p className="text-faint text-xs">CO₂</p>
                      </div>
                      {/* Score */}
                      <div style={{ width: 56, textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: "20px", fontWeight: 900, color, lineHeight: 1 }}>{m.score}</p>
                        <p className="text-faint text-xs">score</p>
                      </div>
                    </div>
                  );
                })}

                {/* Footer */}
                <div style={{ padding: "14px 24px", background: "rgba(74,222,128,0.03)", borderTop: "1px solid var(--border)", textAlign: "center" }}>
                  <p style={{ fontSize: "13px", color: "var(--g400)", fontWeight: 500 }}>
                    Together this circle absorbed the equivalent of{" "}
                    <strong>{Math.round(circle.total_co2_avoided / 1.81)} tree-months</strong> of CO₂
                  </p>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="row-sb" style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)" }}>
                {modal === "join" ? "Join a Circle" : "Create a Circle"}
              </h2>
              <button onClick={() => setModal(null)} style={{ color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <label className="label">{modal === "join" ? "Circle code" : "Circle name"}</label>
            <input
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={modal === "join" ? "e.g. BGS2026" : "e.g. Office Green Squad"}
              onKeyDown={e => e.key === "Enter" && (modal === "join" ? handleJoin() : handleCreate())}
              style={{ fontFamily: modal === "join" ? "monospace" : "inherit", marginBottom: "16px" }}
            />
            {modal === "join" && (
              <p className="text-faint text-sm" style={{ marginBottom: "16px" }}>
                Demo code: <span style={{ fontFamily: "monospace", color: "var(--text2)", fontWeight: 700 }}>BGS2026</span>
              </p>
            )}
            {error && <div className="alert-error" style={{ marginBottom: "16px" }}>{error}</div>}
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }}
              onClick={modal === "join" ? handleJoin : handleCreate}
              disabled={actionLoading || !input.trim()}>
              {actionLoading ? <span className="spinner" /> : modal === "join" ? "Join Circle" : "Create Circle"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
