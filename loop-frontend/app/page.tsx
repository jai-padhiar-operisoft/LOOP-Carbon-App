"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Zap, Leaf, MapPin, Users, Upload,
  BarChart2, BookOpen, ShieldCheck, TrendingDown,
  CheckCircle2, AlertCircle, ChevronRight,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Upload,
    title: "Zero manual input",
    desc: "Upload a bank or UPI CSV. Every merchant is classified automatically using AI and GHG Protocol emission factors. No forms, no guesswork.",
    tag: "Core",
  },
  {
    icon: Zap,
    title: "Carbon Personality",
    desc: "You get a named archetype: Convenience Consumer, Conscious Optimizer, Green Pioneer. Not an abstract tonne figure. It evolves as your behavior changes.",
    tag: "Differentiator",
  },
  {
    icon: MapPin,
    title: "Hyper-local Action Map",
    desc: "Nearby recycling centers, repair cafes, and e-waste drop-offs filtered by what you actually bought this month. Not a generic directory.",
    tag: "Local",
  },
  {
    icon: BookOpen,
    title: "Weekly Carbon Story",
    desc: "An AI coach writes your footprint narrative every week. Specific, honest, and actionable. Not a dashboard report you will never read.",
    tag: "AI",
  },
  {
    icon: Users,
    title: "Social Circles",
    desc: "Compete with friends, colleagues, or your apartment building on a shared leaderboard. Social accountability drives 10x more behavior change than private guilt.",
    tag: "Social",
  },
  {
    icon: ShieldCheck,
    title: "Local Verified Offsets",
    desc: "When reduction hits its limit, LOOP connects you to city-local offset projects you can see and touch. Not distant rainforest credits.",
    tag: "Circular",
  },
];

const PROBLEMS = [
  { bad: "Manual entry forms no one fills in",          good: "Auto-parsed from your transaction CSV" },
  { bad: "Compared to meaningless global averages",     good: "Benchmarked against your city peer group" },
  { bad: "Generic tips ignoring local infrastructure",  good: "Actions derived from your actual purchases" },
  { bad: "Abstract tonne numbers with no context",      good: "Named personality + score out of 1000" },
  { bad: "No reason to come back after one session",    good: "Weekly story, live score, and Circle competition" },
];

const HOW = [
  { num: "01", title: "Create your account",    desc: "Sign up with your email. OTP verified, password secured in under 2 minutes." },
  { num: "02", title: "Upload a CSV",           desc: "Export from your bank or UPI app. Drop it in. AI reads every merchant." },
  { num: "03", title: "See your footprint",     desc: "Loop Score, carbon personality, breakdown chart, and real-world equivalents. Instantly." },
  { num: "04", title: "Act and compete",        desc: "Personalised suggestions, local map, Carbon Story, and your Circle leaderboard." },
];

const PERSONALITIES = [
  { name: "Carbon Heavy",         color: "#ef4444", range: "0–200" },
  { name: "Habitual Spender",     color: "#f97316", range: "201–350" },
  { name: "Convenience Consumer", color: "#eab308", range: "351–500" },
  { name: "Mindful Consumer",     color: "#84cc16", range: "501–650" },
  { name: "Conscious Optimizer",  color: "#22c55e", range: "651–800" },
  { name: "Green Pioneer",        color: "#10b981", range: "801–1000" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router  = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (getToken()) setLoggedIn(true);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: "var(--dark)", minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 60, background: "rgba(8,11,15,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-1px", color: "var(--text1)" }}>
            L<span style={{ color: "var(--g400)" }}>OO</span>P
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {loggedIn ? (
              <button className="btn-primary btn-sm" onClick={() => { startLoading(); router.push("/dashboard"); }}>
                Go to Dashboard <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <Link href="/login" className="btn-ghost btn-sm" style={{ textDecoration: "none" }}>Sign in</Link>
                <Link href="/auth" className="btn-primary btn-sm" style={{ textDecoration: "none" }}>Create account</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div className="glow-blob glow-1" />
        <div className="glow-blob glow-2" />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "140px 28px 80px", maxWidth: 860, margin: "0 auto" }}>
          <div className="fade-in" style={{ marginBottom: "20px" }}>
            <span className="badge badge-green">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--g400)", display: "inline-block" }} />
              HackOut &apos;26 · Circular Carbon Ecosystem
            </span>
          </div>
          <h1 className="fade-up font-black" style={{ fontSize: "clamp(56px, 10vw, 100px)", letterSpacing: "-4px", lineHeight: 0.9, color: "var(--text1)", marginBottom: "28px" }}>
            L<span style={{ color: "var(--g400)" }}>OO</span>P
          </h1>
          <p className="fade-up fade-up-1" style={{ fontSize: "clamp(17px, 2.5vw, 22px)", color: "var(--text2)", marginBottom: "16px", lineHeight: 1.6 }}>
            Not a carbon tracker.{" "}
            <strong style={{ color: "var(--text1)", fontWeight: 600 }}>A carbon mirror that talks back.</strong>
          </p>
          <p className="fade-up fade-up-2" style={{ fontSize: "16px", color: "var(--text3)", marginBottom: "48px", maxWidth: 520, margin: "0 auto 48px" }}>
            Upload your bank statement. Get your carbon personality, Loop Score, city-benchmarked ranking, personalised actions, and a weekly AI-written narrative. All in under 30 seconds.
          </p>
          <div className="fade-up fade-up-3" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
            {loggedIn ? (
              <button className="btn-primary" onClick={() => { startLoading(); router.push("/dashboard"); }} style={{ fontSize: "17px", padding: "14px 32px" }}>
                Open Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link href="/auth" className="btn-primary" style={{ fontSize: "17px", padding: "14px 32px", textDecoration: "none" }}>
                  Get started free <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn-ghost" style={{ fontSize: "15px", textDecoration: "none" }}>
                  Sign in
                </Link>
              </>
            )}
          </div>
          <p className="fade-up fade-up-4 text-faint text-sm" style={{ marginTop: "14px" }}>
            No credit card · No integrations · Just a CSV
          </p>
        </div>
      </div>

      {/* ── PROBLEM STATEMENT ───────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="wrap">
          <p className="section-eyebrow reveal" style={{ textAlign: "center" }}>The Problem</p>
          <h2 className="section-heading reveal" style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
            Every other carbon tool is broken in the same way
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ borderRight: "1px solid var(--border)", background: "rgba(239,68,68,0.03)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f87171" }}>Typical carbon apps</p>
              </div>
              {PROBLEMS.map(({ bad }, i) => (
                <div key={i} className={`reveal reveal-d${(i % 3) + 1}`} style={{ padding: "14px 24px", borderBottom: i < PROBLEMS.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertCircle size={14} color="#f87171" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: "14px", color: "var(--text3)", textDecoration: "line-through", textDecorationColor: "rgba(239,68,68,0.3)" }}>{bad}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(74,222,128,0.03)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--g400)" }}>LOOP</p>
              </div>
              {PROBLEMS.map(({ good }, i) => (
                <div key={i} className={`reveal reveal-d${(i % 3) + 1}`} style={{ padding: "14px 24px", borderBottom: i < PROBLEMS.length - 1 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={14} color="var(--g400)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: "14px", color: "var(--text2)", fontWeight: 500 }}>{good}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <div className="dash-section section-accent">
        <div className="wrap">
          <p className="section-eyebrow reveal">Features</p>
          <h2 className="section-heading reveal">Six tools. One mission.</h2>
          <p className="section-body reveal" style={{ marginBottom: "40px" }}>
            Each feature targets a specific failure point of existing carbon tools. Together they create a system that actually changes behavior.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {FEATURES.map(({ icon: Icon, title, desc, tag }, i) => (
              <div key={title} className={`feat-card reveal reveal-d${(i % 3) + 1}`}>
                <div className="row-sb" style={{ marginBottom: "18px" }}>
                  <div className="feat-icon-box" style={{ margin: 0 }}><Icon size={20} /></div>
                  <span className="tag tag-green" style={{ fontSize: "10px" }}>{tag}</span>
                </div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text1)", marginBottom: "8px" }}>{title}</p>
                <p style={{ fontSize: "13.5px", color: "var(--text2)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PERSONALITIES ───────────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p className="section-eyebrow reveal-left">Carbon Personalities</p>
              <h2 className="section-heading reveal-left">Your archetype, not your average</h2>
              <p className="section-body reveal-left" style={{ marginBottom: "28px" }}>
                Most tools show you a number. LOOP gives you a named identity based on how you actually spend. Identities evolve as your behavior improves, creating a real sense of progression.
              </p>
              <p className="section-body reveal-left" style={{ marginBottom: "0", fontSize: "14px" }}>
                Your personality is benchmarked against your city peer group, not a global average. Beating the person across the hall means more than beating someone in Sweden.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {PERSONALITIES.map(({ name, color, range }, i) => (
                <div
                  key={name}
                  className={`reveal reveal-right reveal-d${Math.min(i + 1, 5)}`}
                  style={{ display: "flex", alignItems: "center", gap: "14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`; (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: "var(--text1)" }}>{name}</p>
                  <span style={{ fontSize: "12px", color: "var(--text3)", fontFamily: "monospace" }}>Score {range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <div className="dash-section section-accent">
        <div className="wrap">
          <p className="section-eyebrow reveal" style={{ textAlign: "center" }}>How It Works</p>
          <h2 className="section-heading reveal" style={{ textAlign: "center", maxWidth: 500, margin: "0 auto 48px" }}>
            From CSV to carbon clarity in 4 steps
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {HOW.map(({ num, title, desc }, i) => (
              <div key={num} className={`card reveal reveal-d${i + 1}`} style={{ padding: "24px", borderTop: "2px solid var(--g600)", position: "relative" }}>
                <p style={{ fontSize: "32px", fontWeight: 900, color: "var(--g400)", opacity: 0.2, lineHeight: 1, marginBottom: "14px", fontFamily: "monospace" }}>{num}</p>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text1)", marginBottom: "8px" }}>{title}</p>
                <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── IMPACT NUMBERS ──────────────────────────────────────────────────── */}
      <div className="dash-section">
        <div className="wrap">
          <p className="section-eyebrow reveal" style={{ textAlign: "center" }}>Why It Matters</p>
          <h2 className="section-heading reveal" style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 48px" }}>The scale of the opportunity</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", marginBottom: "48px" }}>
            {[
              { num: "72%",   label: "of personal carbon comes from traceable consumer purchases" },
              { num: "3B+",   label: "people globally with smartphone and banking access" },
              { num: "10x",   label: "higher behavior change when actions are socially visible" },
              { num: "30s",   label: "from CSV upload to full carbon profile" },
            ].map(({ num, label }, i) => (
              <div key={num} className={`big-stat card reveal reveal-d${i+1}`}
                style={{ borderRadius: i === 0 ? "var(--radius-lg) 0 0 var(--radius-lg)" : i === 3 ? "0 var(--radius-lg) var(--radius-lg) 0" : "0" }}>
                <div className="big-stat-num">{num}</div>
                <p className="big-stat-label">{label}</p>
              </div>
            ))}
          </div>
          <div className="quote-block reveal" style={{ maxWidth: 600, margin: "0 auto" }}>
            <p className="quote-text">"The core problem is not a lack of awareness. It is a lack of agency."</p>
            <p className="quote-source">LOOP · HackOut &apos;26 Problem Statement Analysis</p>
          </div>
        </div>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "96px 0", background: "linear-gradient(135deg, rgba(22,163,74,0.08) 0%, var(--dark) 70%)", borderTop: "1px solid rgba(74,222,128,0.1)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "rgba(22,163,74,0.06)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div className="wrap" style={{ position: "relative", zIndex: 1 }}>
          <h2 className="section-heading reveal" style={{ maxWidth: 540, margin: "0 auto 14px" }}>
            Your carbon story is already written in your transactions
          </h2>
          <p className="section-body reveal" style={{ maxWidth: 420, margin: "0 auto 40px", textAlign: "center" }}>
            LOOP just reads it. Upload once, understand everything.
          </p>
          <div className="row gap-16 reveal" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            {loggedIn ? (
              <button className="btn-primary" onClick={() => { startLoading(); router.push("/dashboard"); }} style={{ fontSize: "16px", padding: "14px 30px" }}>
                Open Dashboard <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link href="/auth" className="btn-primary" style={{ fontSize: "16px", padding: "14px 30px", textDecoration: "none" }}>
                  Create free account <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="btn-ghost" style={{ fontSize: "15px", textDecoration: "none" }}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "28px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text3)" }}>
          <span style={{ fontWeight: 900, color: "var(--text2)", letterSpacing: "-0.5px" }}>L<span style={{ color: "var(--g400)" }}>OO</span>P</span>
          &nbsp;·&nbsp; HackOut &apos;26 &nbsp;·&nbsp; Circular Carbon Ecosystem &nbsp;·&nbsp; Jai Padhiar
        </p>
      </div>

    </div>
  );
}
