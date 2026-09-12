"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Flame, TrendingUp, Zap, Leaf, Award, Star,
  ArrowRight, Upload, RefreshCw, MapPin, Users,
  ShieldCheck, BookOpen, TrendingDown, BarChart2,
  Globe, AlertCircle, CheckCircle2, ChevronRight, Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import CarbonCalendar from "@/components/CarbonCalendar";
import CityRankCard from "@/components/CityRankCard";
import ImpactEquivalents from "@/components/ImpactEquivalents";
import ExpenseLogger from "@/components/ExpenseLogger";
import { getUser, getCalendar, getCityRank } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { startLoading } from "@/components/PageLoader";

// ── Constants ─────────────────────────────────────────────────────────────────
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
const CAT_LABELS: Record<string, string> = {
  food_delivery: "Food Delivery", ride_hailing: "Ride Hailing", fuel: "Fuel",
  flights: "Flights", electricity: "Electricity", shopping_fashion: "Fashion",
  electronics: "Electronics", grocery: "Grocery", restaurant: "Dining",
  hotel: "Hotels", streaming: "Streaming", gym_wellness: "Wellness",
  public_transport: "Transit", other: "Other",
};
const CHART_COLORS = ["#22c55e","#16a34a","#4ade80","#86efac","#bbf7d0","#6b7280","#374151"];

// ── Scroll reveal hook ─────────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

// ── Mock trend data ────────────────────────────────────────────────────────────
const TREND_DATA = [
  { month: "Aug", co2: 68 }, { month: "Sep", co2: 72 }, { month: "Oct", co2: 65 },
  { month: "Nov", co2: 59 }, { month: "Dec", co2: 63 }, { month: "Jan", co2: null },
];

// ── Feature list ──────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BarChart2, title: "Auto Carbon Parsing",      desc: "Upload any bank or UPI CSV. Every transaction is classified automatically using AI. No manual input, no guesswork." },
  { icon: Zap,       title: "Carbon Personality",        desc: "You get a named archetype, not an abstract number. Personas evolve as behavior changes, creating a real sense of progress." },
  { icon: MapPin,    title: "Hyper-local Action Map",    desc: "Recycling centers, repair cafes, and e-waste drop-offs near you, filtered by what you actually bought this month." },
  { icon: BookOpen,  title: "Weekly Carbon Story",       desc: "An AI coach writes your footprint narrative every week. Specific, honest, and actionable. Not a guilt trip." },
  { icon: Users,     title: "Circle Leaderboards",       desc: "Compete with friends, colleagues, or your apartment building. Social accountability drives 10x more behavior change than solo guilt." },
  { icon: ShieldCheck, title: "Verified Offset Links",  desc: "When reduction hits its limit, LOOP connects you to local, visible offset projects. Not distant rainforest credits." },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Upload your transactions",   desc: "Export a CSV from your bank or UPI app and upload it. LOOP reads merchant names, amounts, and dates. Nothing else." },
  { num: "02", title: "AI classifies everything",   desc: "Every transaction is mapped to a carbon category using LLM-powered classification backed by GHG Protocol emission factors." },
  { num: "03", title: "Your footprint is revealed", desc: "A Loop Score, a carbon personality, a breakdown chart, and real-world equivalents. Your month, told in carbon." },
  { num: "04", title: "Take action",                desc: "Personalised suggestions, a local recycling map, and a social leaderboard give you three different paths to reduce." },
];

const PROBLEMS_SOLVED = [
  { icon: AlertCircle, text: "Most people have no idea where their personal carbon comes from" },
  { icon: AlertCircle, text: "Existing tools require manual entry and compare against meaningless global averages" },
  { icon: AlertCircle, text: "Generic tips like 'take public transport' ignore what's actually available locally" },
  { icon: AlertCircle, text: "Individual guilt without social context doesn't change behavior at scale" },
];

const PROBLEMS_FIXED = [
  { icon: CheckCircle2, text: "Transactions parsed automatically, zero manual input" },
  { icon: CheckCircle2, text: "Benchmarked against your city and neighborhood peer group" },
  { icon: CheckCircle2, text: "Actions derived from your actual spending, filtered by your city" },
  { icon: CheckCircle2, text: "Social circles make it a shared challenge, not a solo chore" },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { ready } = useAuth();
  const [result, setResult]   = useState<any>(null);
  const [user, setUser]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [calMaxCo2, setCalMaxCo2] = useState(0);
  const [cityRank, setCityRank] = useState<any>(null);
  const [showExpenseLogger, setShowExpenseLogger] = useState(false);

  useReveal();

  useEffect(() => {
    if (!ready) return;
    const stored = localStorage.getItem("loop_result");
    const userId = localStorage.getItem("loop_user_id");
    if (!userId) { startLoading(); router.push("/login"); return; }
    if (stored) setResult(JSON.parse(stored));
    const uid = Number(userId);
    Promise.all([
      getUser(uid).then(setUser),
      getCalendar(uid).then(d => { setCalendar(d.calendar || []); setCalMaxCo2(d.max_co2 || 0); }).catch(() => {}),
      getCityRank(uid).then(setCityRank).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [ready, router]);

  // Handle expense logger success - refresh data
  const handleExpenseSuccess = useCallback((data: any) => {
    setShowExpenseLogger(false);
    // Update result with new stats
    if (data.updated_stats) {
      setResult((prev: any) => prev ? {
        ...prev,
        total_co2: data.updated_stats.total_co2,
        score: data.updated_stats.score,
        personality: data.updated_stats.personality,
      } : {
        total_co2: data.updated_stats.total_co2,
        score: data.updated_stats.score,
        personality: data.updated_stats.personality,
        breakdown: {},
        equivalents: {},
        transaction_count: 1,
      });
      // Also update localStorage
      const stored = localStorage.getItem("loop_result");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem("loop_result", JSON.stringify({
          ...parsed,
          total_co2: data.updated_stats.total_co2,
          score: data.updated_stats.score,
          personality: data.updated_stats.personality,
        }));
      }
    }
    // Refresh calendar
    const userId = localStorage.getItem("loop_user_id");
    if (userId) {
      getCalendar(Number(userId)).then(d => {
        setCalendar(d.calendar || []);
        setCalMaxCo2(d.max_co2 || 0);
      }).catch(() => {});
    }
  }, []);

  if (!ready || loading) return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner spinner-light" style={{ width: 36, height: 36, margin: "0 auto 12px" }} />
        <p className="text-muted text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  const hasData      = !!result;
  const breakdown    = result?.breakdown || {};
  const pieData      = Object.entries(breakdown)
    .map(([k, v]: any) => ({ name: CAT_LABELS[k] || k, value: parseFloat(v.co2_kg.toFixed(2)), pct: v.percentage }))
    .sort((a, b) => b.value - a.value).slice(0, 7);
  const personality  = result?.personality || {};
  const PIcon        = P_ICONS[personality.name] || Leaf;
  const pColor       = P_COLORS[personality.name] || "#22c55e";
  const score        = result?.score || 0;
  const eq           = result?.equivalents || {};
  const maxVal       = pieData[0]?.value || 1;
  const trendWithCurrent = hasData
    ? [...TREND_DATA.slice(0,-1), { month: "Jan", co2: result.total_co2 }]
    : TREND_DATA;

  return (
    <div style={{ background: "var(--dark)", minHeight: "100vh" }}>
      <Navbar />

      {/* Expense Logger Modal */}
      {showExpenseLogger && (
        <ExpenseLogger
          userId={Number(localStorage.getItem("loop_user_id"))}
          onClose={() => setShowExpenseLogger(false)}
          onSuccess={handleExpenseSuccess}
        />
      )}

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <div style={{ paddingTop: "60px" }}>
        <div className="wrap" style={{ paddingTop: "40px", paddingBottom: "0" }}>

          {/* Header */}
          <div className="row-sb fade-up" style={{ marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <p className="text-muted text-sm" style={{ marginBottom: "4px" }}>
                Welcome back,{" "}
                <span style={{ color: "var(--text1)", fontWeight: 600 }}>{user?.name}</span>
                {user?.username && <span style={{ color: "var(--text3)" }}> · @{user.username}</span>}
              </p>
              <h1 className="page-title">Your Carbon Dashboard</h1>
            </div>
            <div className="row gap-12">
              {hasData && (
                <>
                  <button className="btn-primary btn-sm" onClick={() => setShowExpenseLogger(true)} style={{ gap: "6px" }}>
                    <Plus size={13} /> Log Expense
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => { startLoading(); router.push("/upload"); }} style={{ gap: "6px" }}>
                    <RefreshCw size={13} /> Re-upload
                  </button>
                </>
              )}
              {!hasData && (
                <>
                  <button className="btn-primary" onClick={() => setShowExpenseLogger(true)} style={{ gap: "6px" }}>
                    <Plus size={15} /> Log Expense
                  </button>
                  <button className="btn-ghost" onClick={() => { startLoading(); router.push("/upload"); }}>
                    <Upload size={15} /> Upload CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── IF NO DATA: Onboarding prompt ────────────────────────────────── */}
          {!hasData && (
            <div className="fade-up fade-up-1">
              <div className="card" style={{ padding: "48px 40px", textAlign: "center", borderColor: "rgba(74,222,128,0.15)", background: "linear-gradient(135deg, rgba(22,163,74,0.06), var(--card))", marginBottom: "48px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Upload size={28} color="var(--g400)" />
                </div>
                <h2 style={{ fontSize: "22px", fontWeight: 900, color: "var(--text1)", marginBottom: "8px" }}>
                  Upload your first CSV to get started
                </h2>
                <p className="text-muted" style={{ maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.7 }}>
                  Export a transaction CSV from your bank or UPI app. LOOP reads every merchant, classifies the carbon footprint, and builds your profile in under 30 seconds.
                </p>
                <button className="btn-primary" onClick={() => { startLoading(); router.push("/upload"); }} style={{ fontSize: "16px", padding: "13px 28px" }}>
                  Upload transactions <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── IF HAS DATA: Score + Personality ─────────────────────────────── */}
          {hasData && (
            <>
              {/* Row 1: Score + Personality */}
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", marginBottom: "16px" }}>
                {/* Score radial */}
                <div className="card fade-up fade-up-1" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px" }}>
                  <p className="text-muted text-sm font-semi" style={{ marginBottom: "16px" }}>Loop Score</p>
                  <div style={{ position: "relative", width: 150, height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="68%" outerRadius="90%"
                        startAngle={90} endAngle={-270} data={[{ value: score, fill: pColor }]} barSize={9}>
                        <RadialBar background={{ fill: "#1f2937" }} dataKey="value" max={1000} cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "34px", fontWeight: 900, color: "var(--text1)", lineHeight: 1 }}>{score}</span>
                      <span style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>/1000</span>
                    </div>
                  </div>
                  <p className="text-sm font-semi" style={{ color: pColor, marginTop: "14px" }}>
                    {score > 600 ? "Above average" : score > 400 ? "Near average" : "Below average"}
                  </p>
                  <p className="text-faint text-xs" style={{ marginTop: "3px" }}>vs {user?.city}</p>
                </div>

                {/* Personality */}
                <div className="personality-card fade-up fade-up-1"
                  style={{ background: `linear-gradient(135deg, ${pColor}14 0%, var(--card) 65%)`, borderColor: `${pColor}35` }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 220, height: 220, borderRadius: "50%", background: `${pColor}10`, filter: "blur(60px)", pointerEvents: "none" }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <p className="text-muted text-sm font-semi" style={{ marginBottom: "16px" }}>Carbon Personality</p>
                    <div className="row gap-16" style={{ marginBottom: "20px" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "16px", background: `${pColor}18`, border: `1px solid ${pColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <PIcon size={26} color={pColor} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: "24px", fontWeight: 900, color: "var(--text1)", letterSpacing: "-0.3px", marginBottom: "6px" }}>{personality.name}</h2>
                        <p style={{ fontSize: "14px", color: "var(--text2)", lineHeight: 1.6, maxWidth: "460px" }}>{personality.description}</p>
                      </div>
                    </div>
                    <div className="row gap-12">
                      <button className="btn-sm" onClick={() => { startLoading(); router.push("/story"); }}
                        style={{ background: `${pColor}18`, color: pColor, border: `1px solid ${pColor}30`, borderRadius: "10px", padding: "8px 16px", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                        Read your story <ArrowRight size={13} />
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => { startLoading(); router.push("/actions"); }}>See actions <ArrowRight size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid-4 fade-up fade-up-2" style={{ marginBottom: "16px" }}>
                {[
                  { label: "Total CO₂",     value: `${result.total_co2} kg`, sub: "this month" },
                  { label: "Trees needed",  value: `${eq.trees_month}`,      sub: "to offset /month" },
                  { label: "km equivalent", value: `${(eq.km_driven||0).toLocaleString()}`, sub: "driven by car" },
                  { label: "Transactions",  value: result.transaction_count, sub: "analysed" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="stat-card">
                    <p className="stat-label">{label}</p>
                    <p className="stat-num">{value}</p>
                    <p className="stat-sub">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid-2-1 fade-up fade-up-3" style={{ marginBottom: "0" }}>
                <div className="card">
                  <p className="font-semi text-white" style={{ marginBottom: "20px" }}>Footprint breakdown</p>
                  <div className="row gap-24">
                    <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "var(--dark3)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text1)", fontSize: "13px" }}
                            formatter={(v: any) => [`${v} kg CO₂`]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1 }}>
                      {pieData.slice(0, 5).map((item, i) => (
                        <div key={item.name} style={{ marginBottom: "10px" }}>
                          <div className="row-sb" style={{ marginBottom: "5px" }}>
                            <div className="row gap-8">
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontSize: "13px", color: "var(--text2)" }}>{item.name}</span>
                            </div>
                            <span style={{ fontSize: "12px", color: "var(--text3)", fontWeight: 600 }}>{item.pct}%</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${(item.value / maxVal) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <p className="font-semi text-white" style={{ marginBottom: "20px" }}>Month-over-month trend</p>
                  <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendWithCurrent} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="co2grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "var(--dark3)", border: "1px solid var(--border2)", borderRadius: "8px", color: "var(--text1)", fontSize: "13px" }} />
                        <Area type="monotone" dataKey="co2" stroke="#22c55e" strokeWidth={2} fill="url(#co2grad)" dot={{ fill: "#22c55e", r: 3 }} connectNulls={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-faint text-xs" style={{ marginTop: "8px" }}>kg CO₂ · last 6 months</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── SECTION: CARBON CALENDAR + CITY RANK ────────────────────────────── */}
      {hasData && (
        <div className="dash-section">
          <div className="wrap">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* Carbon Calendar */}
              <div className="card reveal" style={{ padding: "28px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <p className="section-eyebrow" style={{ marginBottom: "4px" }}>Activity</p>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text1)", letterSpacing: "-0.2px" }}>
                    Carbon Calendar
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text2)", marginTop: "4px" }}>
                    Daily CO₂ intensity from your transactions. Darker = higher carbon day.
                  </p>
                </div>
                <CarbonCalendar calendar={calendar} maxCo2={calMaxCo2} />
              </div>

              {/* City Rank */}
              <div className="card reveal reveal-d1" style={{ padding: "28px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <p className="section-eyebrow" style={{ marginBottom: "4px" }}>Ranking</p>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text1)", letterSpacing: "-0.2px" }}>
                    Your City Rank
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text2)", marginTop: "4px" }}>
                    How you compare to other LOOP users in your city.
                  </p>
                </div>
                {cityRank ? (
                  <CityRankCard
                    rank={cityRank.rank}
                    total={cityRank.total}
                    percentile={cityRank.percentile}
                    city={cityRank.city}
                    myScore={cityRank.my_score}
                    topScore={cityRank.top_score}
                  />
                ) : (
                  <div style={{ textAlign: "center", padding: "24px", color: "var(--text3)", fontSize: "13px" }}>
                    Upload a CSV to see your city rank
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: IMPACT EQUIVALENTS ────────────────────────────────────── */}
      {hasData && eq && (
        <div className="dash-section">
          <div className="wrap">
            <div className="card reveal" style={{ padding: "28px" }}>
              <ImpactEquivalents equivalents={eq} totalCo2={result.total_co2} />
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: QUICK ACTIONS ───────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="wrap">
          <p className="section-eyebrow reveal">Explore LOOP</p>
          <h2 className="section-heading reveal">Everything at your fingertips</h2>
          <p className="section-body reveal" style={{ marginBottom: "40px" }}>
            Five tools that work together to show you your footprint, explain it, and help you reduce it.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { icon: Upload,      href: "/upload",    label: "Upload CSV",       sub: "Analyse a new month of transactions", color: "#22c55e" },
              { icon: BarChart2,   href: "/dashboard", label: "Dashboard",        sub: "Your score, personality, and breakdown", color: "#4ade80" },
              { icon: Zap,         href: "/actions",   label: "Action Plan",      sub: "AI-generated, city-specific suggestions", color: "#a3e635" },
              { icon: MapPin,      href: "/map",       label: "Action Map",       sub: "Nearby recycling and repair points", color: "#34d399" },
              { icon: BookOpen,    href: "/story",     label: "Carbon Story",     sub: "Your weekly AI-written narrative", color: "#6ee7b7" },
              { icon: Users,       href: "/circles",   label: "Circles",          sub: "Compete with your social group", color: "#86efac" },
            ].map(({ icon: Icon, href, label, sub, color }, i) => (
              <button
                key={label}
                onClick={() => { startLoading(); router.push(href); }}
                className={`feat-card reveal reveal-d${(i % 3) + 1}`}
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              >
                <div className="feat-icon-box" style={{ background: `${color}12`, borderColor: `${color}20`, color }}>
                  <Icon size={20} />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text1)", marginBottom: "5px" }}>{label}</p>
                <p style={{ fontSize: "13px", color: "var(--text2)" }}>{sub}</p>
                <div className="row gap-6" style={{ marginTop: "14px", color }}>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>Open</span>
                  <ChevronRight size={13} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION: PROBLEM vs SOLUTION ────────────────────────────────────── */}
      <div className="dash-section section-accent">
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "start" }}>
            <div>
              <p className="section-eyebrow reveal-left">The Problem</p>
              <h2 className="section-heading reveal-left" style={{ marginBottom: "28px" }}>
                Why every other carbon tool fails
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {PROBLEMS_SOLVED.map(({ icon: Icon, text }, i) => (
                  <div key={i} className={`row gap-14 reveal-left reveal-d${i+1}`} style={{ alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color="#f87171" />
                    </div>
                    <p style={{ fontSize: "14px", color: "var(--text2)", lineHeight: 1.6, paddingTop: "6px" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="section-eyebrow reveal-right">The LOOP Fix</p>
              <h2 className="section-heading reveal-right" style={{ marginBottom: "28px" }}>
                How LOOP does it differently
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {PROBLEMS_FIXED.map(({ icon: Icon, text }, i) => (
                  <div key={i} className={`row gap-14 reveal-right reveal-d${i+1}`} style={{ alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color="var(--g400)" />
                    </div>
                    <p style={{ fontSize: "14px", color: "var(--text2)", lineHeight: 1.6, paddingTop: "6px" }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: HOW IT WORKS ────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p className="section-eyebrow reveal-left">How It Works</p>
              <h2 className="section-heading reveal-left">From CSV to clarity in four steps</h2>
              <p className="section-body reveal-left" style={{ marginBottom: "36px" }}>
                No bank integrations to configure, no manual entry to fill in, no account to connect.
                Just a CSV and 30 seconds.
              </p>
              <button className="btn-primary reveal-left" onClick={() => { startLoading(); router.push("/upload"); }}>
                Try it now <ArrowRight size={15} />
              </button>
            </div>
            <div className="timeline reveal-right">
              {HOW_IT_WORKS.map(({ num, title, desc }, i) => (
                <div key={num} className={`timeline-item reveal-right reveal-d${i+1}`}>
                  <div className="timeline-dot" />
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--g400)", opacity: 0.5, letterSpacing: "0.05em", paddingTop: "2px", flexShrink: 0 }}>{num}</span>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text1)", marginBottom: "5px" }}>{title}</p>
                      <p style={{ fontSize: "13.5px", color: "var(--text2)", lineHeight: 1.65 }}>{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: IMPACT NUMBERS ─────────────────────────────────────────── */}
      <div className="dash-section section-accent">
        <div className="wrap">
          <p className="section-eyebrow reveal" style={{ textAlign: "center" }}>Real-World Impact</p>
          <h2 className="section-heading reveal" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
            The numbers behind why this matters
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", marginBottom: "48px" }}>
            {[
              { num: "72%",  label: "of personal carbon comes from traceable consumer purchases" },
              { num: "3B+",  label: "people globally with smartphone and banking access" },
              { num: "10x",  label: "higher behavior change when actions are socially visible" },
              { num: "₹0",   label: "cost to use, no subscriptions, no hidden fees" },
            ].map(({ num, label }, i) => (
              <div key={num} className={`big-stat card reveal reveal-d${i+1}`} style={{ borderRadius: i === 0 ? "var(--radius-lg) 0 0 var(--radius-lg)" : i === 3 ? "0 var(--radius-lg) var(--radius-lg) 0" : "0" }}>
                <div className="big-stat-num">{num}</div>
                <p className="big-stat-label">{label}</p>
              </div>
            ))}
          </div>
          <div className="quote-block reveal" style={{ maxWidth: 640, margin: "0 auto" }}>
            <p className="quote-text">
              "Your transactions already contain your carbon story. LOOP reads it, names it, and hands you a path forward."
            </p>
            <p className="quote-source">LOOP · HackOut &apos;26 · Circular Carbon Ecosystem</p>
          </div>
        </div>
      </div>

      {/* ── SECTION: FEATURES ───────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="wrap">
          <p className="section-eyebrow reveal">Features</p>
          <h2 className="section-heading reveal">Built for real behavior change</h2>
          <p className="section-body reveal" style={{ marginBottom: "40px" }}>
            Each feature was designed around a specific failure point of existing carbon tools.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`feat-card reveal reveal-d${(i % 3) + 1}`}>
                <div className="feat-icon-box"><Icon size={20} /></div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text1)", marginBottom: "8px" }}>{title}</p>
                <p style={{ fontSize: "13.5px", color: "var(--text2)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION: WHO IS IT FOR ───────────────────────────────────────────── */}
      <div className="dash-section" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p className="section-eyebrow reveal-left">Who It Is For</p>
              <h2 className="section-heading reveal-left">Anyone who wants to know the truth about their footprint</h2>
              <p className="section-body reveal-left" style={{ marginBottom: "24px" }}>
                LOOP does not require you to be an environmentalist. It just requires a bank statement and a few minutes of curiosity.
              </p>
              <div className="pill-list reveal-left">
                {["Urban professionals","Students","EV owners","Frequent flyers","Apartment communities","Office teams","Sustainability teams","Anyone with a bank account"].map(p => (
                  <span key={p} className="pill">{p}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { title: "You spend, LOOP tracks",       desc: "Every Swiggy order, every Uber ride, every electricity bill. Mapped to its carbon cost automatically." },
                { title: "You see, LOOP explains",       desc: "Not just numbers. A personality, a rank, a narrative. Context that makes the data land." },
                { title: "You act, LOOP guides",         desc: "Specific, local, effort-ranked suggestions. The nearest e-waste point for that old laptop you just bought." },
                { title: "You share, LOOP motivates",    desc: "Circles turn private guilt into shared competition. The most powerful driver of sustained behavior change." },
              ].map(({ title, desc }, i) => (
                <div key={title} className={`card reveal-right reveal-d${i+1}`} style={{ padding: "18px 20px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--g400)", marginBottom: "4px" }}>{title}</p>
                  <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: CTA ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "80px 0", background: "linear-gradient(135deg, rgba(22,163,74,0.08) 0%, var(--dark) 60%)" }}>
        <div className="wrap" style={{ textAlign: "center" }}>
          <div className="glow-blob" style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(22,163,74,0.08)", filter: "blur(80px)", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <p className="section-eyebrow reveal" style={{ justifyContent: "center", display: "flex" }}>Get Started</p>
            <h2 className="section-heading reveal" style={{ maxWidth: 560, margin: "0 auto 14px" }}>
              Your carbon story is waiting
            </h2>
            <p className="section-body reveal" style={{ maxWidth: 440, margin: "0 auto 36px", textAlign: "center" }}>
              Upload a CSV. Get your Loop Score, personality, action plan, and a personal carbon story. All in under 30 seconds.
            </p>
            <div className="row gap-16 reveal" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={() => { startLoading(); router.push("/upload"); }} style={{ fontSize: "16px", padding: "14px 30px" }}>
                Upload transactions <ArrowRight size={16} />
              </button>
              <button className="btn-ghost" onClick={() => { startLoading(); router.push("/circles"); }} style={{ fontSize: "15px" }}>
                <Users size={15} /> Join a Circle
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
