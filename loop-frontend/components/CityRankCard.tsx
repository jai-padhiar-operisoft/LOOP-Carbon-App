"use client";

interface Props {
  rank: number | null;
  total: number;
  percentile: number;
  city: string;
  myScore: number;
  topScore: number;
}

export default function CityRankCard({ rank, total, percentile, city, myScore, topScore }: Props) {
  const pct = Math.max(1, Math.min(99, percentile));

  const label =
    pct >= 80 ? "Top performer" :
    pct >= 60 ? "Above average" :
    pct >= 40 ? "Near average"  :
    pct >= 20 ? "Below average" : "Needs improvement";

  const barColor =
    pct >= 80 ? "#22c55e" :
    pct >= 60 ? "#84cc16" :
    pct >= 40 ? "#eab308" :
    pct >= 20 ? "#f97316" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Rank headline */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "13px", color: "var(--text3)", marginBottom: "2px" }}>Your rank in {city}</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "38px", fontWeight: 900, color: barColor, lineHeight: 1 }}>
              #{rank ?? "?"}
            </span>
            <span style={{ fontSize: "15px", color: "var(--text3)" }}>of {total}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "28px", fontWeight: 900, color: "var(--text1)", lineHeight: 1 }}>{pct}th</p>
          <p style={{ fontSize: "12px", color: "var(--text3)" }}>percentile</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ position: "relative", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
            borderRadius: "10px",
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
          }} />
          {/* Marker dot */}
          <div style={{
            position: "absolute", top: "50%", left: `${pct}%`,
            transform: "translate(-50%,-50%)",
            width: "14px", height: "14px",
            borderRadius: "50%", background: barColor,
            border: "2px solid var(--dark2)",
            boxShadow: `0 0 8px ${barColor}`,
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>City bottom</span>
          <span style={{ fontSize: "11px", color: barColor, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: "10px", color: "var(--text3)" }}>City top</span>
        </div>
      </div>

      {/* Score comparison */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
          <p style={{ fontSize: "10px", color: "var(--text3)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your score</p>
          <p style={{ fontSize: "22px", fontWeight: 900, color: barColor, lineHeight: 1 }}>{myScore}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
          <p style={{ fontSize: "10px", color: "var(--text3)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>City best</p>
          <p style={{ fontSize: "22px", fontWeight: 900, color: "var(--text1)", lineHeight: 1 }}>{topScore}</p>
        </div>
      </div>

      {myScore < topScore && (
        <p style={{ fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
          {topScore - myScore} points separate you from the city leader.{" "}
          <span style={{ color: barColor, fontWeight: 600 }}>
            {pct < 50 ? "Focus on your top emission category first." : "You are close — one habit change can close the gap."}
          </span>
        </p>
      )}
    </div>
  );
}
