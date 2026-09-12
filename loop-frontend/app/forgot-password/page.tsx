"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mail, KeyRound, ShieldCheck, Eye, EyeOff, Check, X, RefreshCw } from "lucide-react";
import { saveSession, passwordStrength } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";

type Step = "email" | "otp" | "password";

const STEP_META = [
  { key: "email",    label: "Verify Email", icon: Mail },
  { key: "otp",      label: "Enter OTP",    icon: KeyRound },
  { key: "password", label: "New Password", icon: ShieldCheck },
];

const SS_STEP  = "loop_reset_step";
const SS_EMAIL = "loop_reset_email";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step,     setStepRaw]  = useState<Step>("email");
  const [email,    setEmailRaw] = useState("");
  const [otp,      setOtp]      = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [countdown, setCountdown] = useState(0);
  const [hydrated, setHydrated]  = useState(false);

  const strength = passwordStrength(password);

  // Persist step across remounts
  useEffect(() => {
    const savedStep  = sessionStorage.getItem(SS_STEP) as Step | null;
    const savedEmail = sessionStorage.getItem(SS_EMAIL) || "";
    if (savedStep && ["email","otp","password"].includes(savedStep)) setStepRaw(savedStep);
    if (savedEmail) setEmailRaw(savedEmail);
    setHydrated(true);
  }, []);

  function setStep(s: Step) {
    setStepRaw(s);
    sessionStorage.setItem(SS_STEP, s);
  }

  function setEmail(v: string) {
    setEmailRaw(v);
    sessionStorage.setItem(SS_EMAIL, v);
  }

  function clearResetSession() {
    sessionStorage.removeItem(SS_STEP);
    sessionStorage.removeItem(SS_EMAIL);
  }

  function startCountdown() {
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; });
    }, 1000);
  }

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
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

  // ── Step 2: Verify OTP (just advance — actual reset verifies it) ────────────
  async function handleVerifyOTP() {
    if (otp.trim().length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true); setError("");
    // Lightweight client-side check — we verify OTP properly on the reset call
    // so the user sees a single combined error if the OTP is wrong
    setLoading(false);
    setStep("password");
  }

  // ── Step 3: Reset password ──────────────────────────────────────────────────
  async function handleReset() {
    if (strength.score < 5) { setError("Password does not meet all requirements"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:        email.trim().toLowerCase(),
          otp:          otp.trim(),
          new_password: password,
        }),
      });
      let data: any = {};
      try { data = await res.json(); } catch { data = { detail: "Server error." }; }
      if (!res.ok) {
        // If OTP error, send user back to OTP step
        const msg = typeof data.detail === "object" ? data.detail.errors?.join(", ") : data.detail;
        if (msg?.toLowerCase().includes("otp")) {
          setStep("otp");
          setOtp("");
        }
        throw new Error(msg || "Password reset failed");
      }
      clearResetSession();
      saveSession(data.token, data.user_id, data.name, data.city, data.email);
      startLoading(); router.push("/dashboard");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const stepIndex = STEP_META.findIndex(s => s.key === step);
  if (!hydrated) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div className="glow-blob glow-1" />
      <div className="glow-blob glow-2" />

      <div className="fade-up" style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link href="/" style={{ display: "inline-block" }}>
            <div className="navbar-logo" style={{ fontSize: "32px" }}>L<span>OO</span>P</div>
          </Link>
          <p className="text-muted text-sm" style={{ marginTop: "6px" }}>Reset your password</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "32px" }}>
          {STEP_META.map((s, i) => {
            const done    = i < stepIndex;
            const current = i === stepIndex;
            const Icon    = s.icon;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "var(--g600)" : current ? "var(--g500)" : "var(--dark3)",
                    border: `2px solid ${done ? "var(--g600)" : current ? "var(--g400)" : "var(--border2)"}`,
                    transition: "all 0.3s",
                  }}>
                    {done
                      ? <Check size={16} color="#fff" />
                      : <Icon size={15} color={current ? "#000" : "var(--text3)"} />}
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

        <div className="card" style={{ padding: "32px" }}>

          {/* ── STEP 1: EMAIL ── */}
          {step === "email" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)", marginBottom: "6px" }}>Forgot your password?</h2>
              <p className="text-muted text-sm" style={{ marginBottom: "24px" }}>
                Enter the email linked to your account. We will send a verification code to reset your password.
              </p>
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
                Remembered it?{" "}
                <Link href="/login" style={{ color: "var(--g400)", fontWeight: 600 }}>Back to login</Link>
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
              <button className="btn-primary" onClick={handleVerifyOTP} disabled={loading || otp.length < 6}
                style={{ width: "100%", justifyContent: "center", marginBottom: "16px" }}>
                {loading ? <><span className="spinner" /> Verifying...</> : <>Continue <ArrowRight size={15} /></>}
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text3)" }}>
                  ← Change email
                </button>
                {countdown > 0
                  ? <span className="text-faint text-sm">Resend in {countdown}s</span>
                  : (
                    <button onClick={() => { handleSendOTP(); setOtp(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--g400)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                      <RefreshCw size={12} /> Resend OTP
                    </button>
                  )}
              </div>
            </div>
          )}

          {/* ── STEP 3: NEW PASSWORD ── */}
          {step === "password" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)", marginBottom: "6px" }}>Set a new password</h2>
              <p className="text-muted text-sm" style={{ marginBottom: "24px" }}>
                Create a strong new password for <strong style={{ color: "var(--text1)" }}>{email}</strong>
              </p>

              {/* Password */}
              <div style={{ marginBottom: "12px" }}>
                <label className="label">New password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 12 characters"
                    style={{ paddingRight: "44px" }}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
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
                  <p style={{ fontSize: "12px", color: strength.color, fontWeight: 600, marginBottom: "8px" }}>{strength.label}</p>
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
                          : <X size={11} color="var(--text3)" />}
                        <span style={{ fontSize: "11px", color: strength.checks[key as keyof typeof strength.checks] ? "var(--text2)" : "var(--text3)" }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirm */}
              <div style={{ marginBottom: "20px" }}>
                <label className="label">Confirm new password</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="input"
                    type={showCf ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleReset()}
                    placeholder="Re-enter password"
                    style={{
                      paddingRight: "44px",
                      borderColor: confirm.length > 0
                        ? password === confirm ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"
                        : undefined,
                    }}
                  />
                  <button type="button" onClick={() => setShowCf(v => !v)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}>
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
                onClick={handleReset}
                disabled={loading || strength.score < 5 || password !== confirm}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {loading ? <><span className="spinner" /> Resetting password...</> : <>Reset password <ArrowRight size={15} /></>}
              </button>

              <button onClick={() => { setStep("otp"); setError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--text3)", marginTop: "14px", display: "block", width: "100%", textAlign: "center" }}>
                ← Back to OTP
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
