"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, RefreshCw, Flame, TrendingUp, Zap, Leaf, Award, Star, Share2, Copy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getStory } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { startLoading } from "@/components/PageLoader";

const P_ICONS: Record<string, any> = {
  "Carbon Heavy": Flame, "Habitual Spender": TrendingUp,
  "Convenience Consumer": Zap, "Mindful Consumer": Leaf,
  "Conscious Optimizer": Award, "Green Pioneer": Star,
};
const P_COLORS: Record<string, string> = {
  "Carbon Heavy": "#ef4444", "Habitual Spender": "#f97316",
  "Convenience Consumer": "#eab308", "Mindful Consumer": "#84cc16",
  "Conscious Optimizer": "#22c55e", "Green Pioneer": "#10b981",
};

export default function StoryPage() {
  const router = useRouter();
  const { ready } = useAuth();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  function load() {
    const uid = localStorage.getItem("loop_user_id");
    if (!uid) { startLoading(); router.push("/login"); return; }
    setLoading(true); setError("");
    getStory(Number(uid))
      .then(setData)
      .catch((e: any) => setError(e.message || "Could not generate story. Is the backend running?"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready]);

  const personality = data?.personality || "Explorer";
  const PIcon       = P_ICONS[personality] || Leaf;
  const pColor      = P_COLORS[personality] || "#22c55e";
  const paragraphs  = data?.story?.split("\n").filter((p: string) => p.trim().length > 0) || [];

  return (
    <div className="page">
      <Navbar />
      <div className="wrap-sm" style={{ paddingTop: "40px", paddingBottom: "80px" }}>

        <div className="row-sb mb-32 fade-up">
          <div>
            <h1 className="page-title">Your Carbon Story</h1>
            <p className="page-sub">AI-generated insight written like a coach, not a report.</p>
          </div>
          {!loading && data && (
            <button className="btn-ghost btn-sm" onClick={load} style={{ gap: "6px" }}>
              <RefreshCw size={13} /> Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="card fade-in" style={{ textAlign: "center", padding: "64px 40px" }}>
            <div className="spinner spinner-light" style={{ width: 36, height: 36, margin: "0 auto 16px" }} />
            <p className="text-muted font-semi" style={{ marginBottom: "4px" }}>Writing your carbon story...</p>
            <p className="text-faint text-sm">This takes about 10 seconds</p>
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="alert-error fade-up">{error}</div>
            <button className="btn-ghost btn-sm" onClick={load} style={{ alignSelf: "flex-start", gap: "6px" }}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Personality header */}
            <div
              className="fade-up"
              style={{
                borderRadius: "var(--radius-lg)",
                padding: "28px",
                border: `1px solid ${pColor}35`,
                background: `linear-gradient(135deg, ${pColor}12 0%, var(--card) 65%)`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, right: 0, width: 180, height: 180, borderRadius: "50%", background: `${pColor}10`, filter: "blur(50px)", pointerEvents: "none" }} />
              <div className="row-sb" style={{ position: "relative", zIndex: 1 }}>
                <div className="row gap-16">
                  <div style={{ width: 52, height: 52, borderRadius: "14px", background: `${pColor}18`, border: `1px solid ${pColor}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <PIcon size={24} color={pColor} />
                  </div>
                  <div>
                    <p className="text-muted text-sm" style={{ marginBottom: "3px" }}>This month you are a</p>
                    <p style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)" }}>{personality}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "36px", fontWeight: 900, color: "var(--text1)", lineHeight: 1 }}>{data.score}</p>
                  <p className="text-faint text-xs" style={{ marginTop: "2px" }}>Loop Score</p>
                </div>
              </div>
            </div>

            {/* Story card */}
            <div className="card fade-up fade-up-1" style={{ padding: "32px" }}>
              <div className="row gap-12" style={{ marginBottom: "24px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={15} color="var(--g400)" />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--g400)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Monthly Carbon Story
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {paragraphs.map((para: string, i: number) => (
                  <p key={i} style={{ fontSize: "15px", color: "var(--text2)", lineHeight: 1.75, animationDelay: `${0.15 + i * 0.1}s` }} className="fade-up">
                    {para}
                  </p>
                ))}
              </div>

              <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

              <div className="row-sb">
                <p className="text-muted text-sm">
                  Total CO₂: <strong style={{ color: "var(--text1)" }}>{data.total_co2?.toFixed(1)} kg</strong>
                </p>
                <button
                  onClick={() => { startLoading(); router.push("/actions"); }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700, color: "var(--g400)", background: "none", border: "none", cursor: "pointer" }}
                >
                  See action plan <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Share card */}
            <div className="card fade-up fade-up-2" style={{ padding: "24px", borderColor: "rgba(74,222,128,0.15)", background: "linear-gradient(135deg, rgba(22,163,74,0.05), var(--card))" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text2)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Share2 size={14} color="var(--g400)" /> Share your carbon story
              </p>

              {/* Visual share card */}
              <div style={{ background: "var(--dark2)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "14px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", borderRadius: "50%", background: `${pColor}12`, filter: "blur(40px)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "-1px", color: "var(--text1)" }}>
                    L<span style={{ color: "var(--g400)" }}>OO</span>P
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    HackOut &apos;26
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "12px", background: `${pColor}18`, border: `1px solid ${pColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <PIcon size={22} color={pColor} />
                  </div>
                  <div>
                    <p style={{ fontSize: "13px", color: "var(--text3)", marginBottom: "2px" }}>I am a</p>
                    <p style={{ fontSize: "18px", fontWeight: 900, color: "var(--text1)", lineHeight: 1 }}>{personality}</p>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <p style={{ fontSize: "28px", fontWeight: 900, color: pColor, lineHeight: 1 }}>{data.score}</p>
                    <p style={{ fontSize: "11px", color: "var(--text3)" }}>Loop Score</p>
                  </div>
                </div>
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: "11px", color: "var(--text3)" }}>
                    Carbon footprint: <span style={{ color: "var(--text2)", fontWeight: 600 }}>{data.total_co2?.toFixed(1)} kg CO₂ this month</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const text = `I am a ${personality} on LOOP with a score of ${data.score}/1000. My carbon footprint this month: ${data.total_co2?.toFixed(1)} kg CO₂. #LOOP #HackOut26 #CarbonFootprint`;
                  navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  });
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 700,
                  background: copied ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "var(--border2)"}`,
                  color: copied ? "var(--g400)" : "var(--text2)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy share text</>}
              </button>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
