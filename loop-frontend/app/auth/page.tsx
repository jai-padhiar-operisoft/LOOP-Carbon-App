"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, KeyRound, ShieldCheck, Eye, EyeOff, Check, X, RefreshCw } from "lucide-react";
import { saveSession, passwordStrength } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";

const CITIES = ["Bengaluru","Mumbai","Delhi","Chennai","Hyderabad","Pune","Kolkata","Ahmedabad"];

type Step = "email" | "otp" | "setup";

const STEP_META = [
  { key: "email", label: "Verify Email", icon: Mail },
  { key: "otp",   label: "Enter OTP",   icon: KeyRound },
  { key: "setup", label: "Set Password", icon: ShieldCheck },
];

// sessionStorage keys - survive remounts, cleared on tab close
const SS_STEP  = "loop_auth_step";
const SS_EMAIL = "loop_auth_email";

export default function AuthPage() {
  const router = useRouter();

  // Restore from sessionStorage on mount so remounts don't reset the step
  const [step,     setStepRaw] = useState<Step>("email");
  const [email,    setEmailRaw] = useState("");
  const [otp,      setOtp]      = useState("");
  const [name,     setName]     = useState("");
  const [username, setUsernameRaw] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle"|"checking"|"available"|"taken"|"invalid">("idle");
  const [usernameMsg, setUsernameMsg] = useState("");
  const [city,     setCity]     = useState("Bengaluru");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [countdown, setCountdown] = useState(0);
  const [hydrated,  setHydrated]  = useState(false);

  // Restore persisted step + email on first render
  useEffect(() => {
    const savedStep  = sessionStorage.getItem(SS_STEP) as Step | null;
    const savedEmail = sessionStorage.getItem(SS_EMAIL) || "";
    if (savedStep && ["email","otp","setup"].includes(savedStep)) setStepRaw(savedStep);
    if (savedEmail) setEmailRaw(savedEmail);
    setHydrated(true);
  }, []);

  function setStep(s: Step) {
    setStepRaw(s);
    sessionStorage.setItem(SS_STEP, s);
  }

  function setEmail(e: string) {
    setEmailRaw(e);
    sessionStorage.setItem(SS_EMAIL, e);
  }

  function clearAuthSession() {
    sessionStorage.removeItem(SS_STEP);
    sessionStorage.removeItem(SS_EMAIL);
  }

  const strength = passwordStrength(password);

  // ── Step 1: Send OTP ───────────────────────────────────────────────────────
  async function handleSendOTP() {
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = { detail: "Server error. Make sure the backend is running." }; }
      if (!res.ok) throw new Error(data.detail || "Failed to send OTP");
      setStep("otp");
      startCountdown();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOTP() {
    if (otp.trim().length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = { detail: "Server error. Make sure the backend is running." }; }
      if (!res.ok) throw new Error(data.detail || "OTP verification failed");

      if (!data.needs_setup) {
        // Returning user - already has password, log them straight in
        clearAuthSession();
        saveSession(data.token, data.user_id, data.name, data.city, email);
        startLoading(); router.push("/dashboard");
      } else {
        setStep("setup");
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  // ── Step 3: Set password ───────────────────────────────────────────────────
  async function handleSetup() {
    if (!name.trim()) { setError("Enter your name"); return; }
    if (!username || usernameStatus !== "available") { setError("Choose a valid, available username"); return; }
    if (strength.score < 5) { setError("Password does not meet all requirements"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name.trim(), username, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "object"
          ? data.detail.errors?.join(", ")
          : data.detail;
        // 409 = account already exists — redirect straight to login
        if (res.status === 409) {
          clearAuthSession();
          startLoading(); router.push("/login");
          return;
        }
        throw new Error(msg || "Setup failed");
      }
      clearAuthSession();
      saveSession(data.token, data.user_id, data.name, data.city, email, data.username);
      startLoading(); router.push("/upload");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  // ── Username real-time check ──────────────────────────────────────────────
  function setUsername(val: string) {
    const clean = val.replace(/[^a-zA-Z0-9]/g, ""); // strip invalid chars as they type
    setUsernameRaw(clean);
    if (!clean) { setUsernameStatus("idle"); setUsernameMsg(""); return; }
    if (clean.length < 3) { setUsernameStatus("invalid"); setUsernameMsg("At least 3 characters"); return; }
    if (clean.length > 20) { setUsernameStatus("invalid"); setUsernameMsg("At most 20 characters"); return; }
    setUsernameStatus("checking");
    setUsernameMsg("");
    // Debounce - wait 500ms after last keystroke before hitting API
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/auth/check-username/${clean}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMsg("Username is available");
        } else {
          setUsernameStatus("taken");
          setUsernameMsg(data.reason || "Username already taken");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }

  function startCountdown() {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
  }

  const stepIndex = STEP_META.findIndex(s => s.key === step);

  // Don't render until sessionStorage has been read - prevents flash to email step
  if (!hydrated) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Glows */}
      <div className="glow-blob glow-1" />
      <div className="glow-blob glow-2" />

      <div className="fade-up" style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link href="/" style={{ display: "inline-block" }}>
            <div className="navbar-logo" style={{ fontSize: "32px" }}>L<span>OO</span>P</div>
          </Link>
          <p className="text-muted text-sm" style={{ marginTop: "6px" }}>Create your account</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", marginBottom: "32px" }}>
          {STEP_META.map((s, i) => {
            const done    = i < stepIndex;
            const current = i === stepIndex;
            const Icon    = s.icon;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "var(--g600)" : current ? "var(--g500)" : "var(--dark3)",
                    border: `2px solid ${done ? "var(--g600)" : current ? "var(--g400)" : "var(--border2)"}`,
                    transition: "all 0.3s",
                  }}>
                    {done
                      ? <Check size={16} color="#fff" />
                      : <Icon size={15} color={current ? "#000" : "var(--text3)"} />
                    }
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: current ? 700 : 400, color: current ? "var(--g400)" : done ? "var(--text2)" : "var(--text3)" }}>
                    {s.label}
                  </span>
                </div>
                {i < STEP_META.length - 1 && (
                  <div style={{ width: 48, height: 2, background: i < stepIndex ? "var(--g600)" : "var(--border)", margin: "0 4px", marginBottom: "22px", transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "32px" }}>

          {/* ── STEP 1: EMAIL ── */}
          {step === "email" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)", marginBottom: "6px" }}>Enter your email</h2>
              <p className="text-muted text-sm" style={{ marginBottom: "24px" }}>We'll send a one-time code to verify it's you.</p>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                placeholder="you@example.com"
                style={{ marginBottom: "20px" }}
                autoFocus
              />
              {error && <div className="alert-error" style={{ marginBottom: "16px" }}>{error}</div>}
              <button className="btn-primary" onClick={handleSendOTP} disabled={loading}
                style={{ width: "100%", justifyContent: "center" }}>
                {loading ? <><span className="spinner" /> Sending OTP...</> : <>Send verification code <ArrowRight size={15} /></>}
              </button>
              <p className="text-faint text-sm" style={{ textAlign: "center", marginTop: "20px" }}>
                Already have an account?{" "}
                <Link href="/login" style={{ color: "var(--g400)", fontWeight: 600 }}>Sign in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)", marginBottom: "6px" }}>Check your inbox</h2>
              <p className="text-muted text-sm" style={{ marginBottom: "24px" }}>
                We sent a 6-digit code to <strong style={{ color: "var(--text1)" }}>{email}</strong>
              </p>

              {/* OTP input boxes */}
              <label className="label">Verification code</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleVerifyOTP()}
                placeholder="000000"
                style={{ marginBottom: "20px", fontSize: "24px", fontFamily: "monospace", letterSpacing: "12px", textAlign: "center" }}
                autoFocus
              />

              {error && <div className="alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

              <button className="btn-primary" onClick={handleVerifyOTP} disabled={loading}
                style={{ width: "100%", justifyContent: "center", marginBottom: "16px" }}>
                {loading ? <><span className="spinner" /> Verifying...</> : <>Verify code <ArrowRight size={15} /></>}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={() => { setStep("email"); setOtp(""); setError(""); clearAuthSession(); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text3)" }}
                >
                  ← Change email
                </button>
                {countdown > 0
                  ? <span className="text-faint text-sm">Resend in {countdown}s</span>
                  : (
                    <button
                      onClick={() => { handleSendOTP(); setOtp(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--g400)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <RefreshCw size={12} /> Resend OTP
                    </button>
                  )
                }
              </div>
            </div>
          )}

          {/* ── STEP 3: SETUP ── */}
          {step === "setup" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)", marginBottom: "6px" }}>Set up your account</h2>
              <p className="text-muted text-sm" style={{ marginBottom: "24px" }}>Almost there. Fill in your details and create a strong password.</p>

              {/* Name + City row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Jai Padhiar" />
                </div>
                <div>
                  <label className="label">City</label>
                  <select className="input" value={city} onChange={e => setCity(e.target.value)} style={{ appearance: "none" }}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Username */}
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Username</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: "15px", pointerEvents: "none", fontWeight: 600 }}>@</span>
                  <input
                    className="input"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="jaipadhiar"
                    maxLength={20}
                    style={{
                      paddingLeft: "30px",
                      borderColor: usernameStatus === "available" ? "rgba(74,222,128,0.4)"
                        : usernameStatus === "taken" || usernameStatus === "invalid" ? "rgba(239,68,68,0.4)"
                        : undefined,
                    }}
                  />
                  {/* Status icon */}
                  <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
                    {usernameStatus === "checking" && <span className="spinner spinner-light" style={{ width: 14, height: 14 }} />}
                    {usernameStatus === "available" && <Check size={15} color="var(--g400)" />}
                    {(usernameStatus === "taken" || usernameStatus === "invalid") && <X size={15} color="#f87171" />}
                  </div>
                </div>
                {usernameMsg && (
                  <p style={{ fontSize: "12px", marginTop: "5px", color: usernameStatus === "available" ? "var(--g400)" : "#f87171" }}>
                    {usernameMsg}
                  </p>
                )}
                <p className="text-faint text-xs" style={{ marginTop: "4px" }}>Letters and digits only. 3–20 characters. Must be unique.</p>
              </div>

              {/* Password */}
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 12 characters"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: "4px", borderRadius: "4px",
                        background: i <= strength.score ? strength.color : "var(--dark4)",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: "12px", color: strength.color, fontWeight: 600, marginBottom: "8px" }}>
                    {strength.label}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    {[
                      { key: "length",    label: "12+ characters" },
                      { key: "uppercase", label: "Uppercase letter" },
                      { key: "lowercase", label: "Lowercase letter" },
                      { key: "number",    label: "Number" },
                      { key: "special",   label: "Special character" },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        {strength.checks[key as keyof typeof strength.checks]
                          ? <Check size={11} color="var(--g400)" />
                          : <X size={11} color="var(--text3)" />
                        }
                        <span style={{ fontSize: "11px", color: strength.checks[key as keyof typeof strength.checks] ? "var(--text2)" : "var(--text3)" }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm password */}
              <div style={{ marginBottom: "20px" }}>
                <label className="label">Confirm password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showCf ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSetup()}
                    placeholder="Re-enter password"
                    style={{
                      paddingRight: "44px",
                      borderColor: confirm.length > 0
                        ? password === confirm ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"
                        : undefined
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCf(v => !v)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}
                  >
                    {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p style={{ fontSize: "12px", color: "#f87171", marginTop: "5px" }}>Passwords do not match</p>
                )}
              </div>

              {error && <div className="alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

              <button
                className="btn-primary"
                onClick={handleSetup}
                disabled={loading || strength.score < 5 || password !== confirm || !name.trim() || usernameStatus !== "available"}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? <><span className="spinner" /> Creating account...</> : <>Create account <ArrowRight size={15} /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
