"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { saveSession } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [notice,   setNotice]   = useState("");

  useEffect(() => {
    if (searchParams.get("reason") === "exists") {
      setNotice("An account with that email already exists. Please sign in below.");
    }
  }, [searchParams]);

  async function handleLogin() {
    if (!email.trim() || !password) { setError("Enter your email and password"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      saveSession(data.token, data.user_id, data.name, data.city, data.email);
      startLoading(); router.push("/dashboard");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div className="glow-blob glow-1" />
      <div className="glow-blob glow-2" />

      <div className="fade-up" style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link href="/" style={{ display: "inline-block" }}>
            <div className="navbar-logo" style={{ fontSize: "32px" }}>L<span>OO</span>P</div>
          </Link>
          <p className="text-muted text-sm" style={{ marginTop: "6px" }}>Welcome back</p>
        </div>

        <div className="card" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 900, color: "var(--text1)", marginBottom: "6px" }}>Sign in to LOOP</h2>
          <p className="text-muted text-sm" style={{ marginBottom: "28px" }}>
            New here?{" "}
            <Link href="/auth" style={{ color: "var(--g400)", fontWeight: 600 }}>Create an account</Link>
          </p>

          {/* Email */}
          <div style={{ marginBottom: "16px" }}>
            <label className="label">Email address</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="you@example.com"
                style={{ paddingLeft: "42px" }}
                autoFocus
              />
              <Mail size={15} color="var(--text3)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label className="label" style={{ margin: 0 }}>Password</label>
              <Link
                href="/forgot-password"
                style={{ fontSize: "12px", color: "var(--g400)", fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="Your password"
                style={{ paddingLeft: "42px", paddingRight: "44px" }}
              />
              <Lock size={15} color="var(--text3)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text3)" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {notice && (
            <div className="alert-success" style={{ marginBottom: "16px" }}>
              {notice}
            </div>
          )}

          {error && <div className="alert-error" style={{ marginBottom: "16px" }}>{error}</div>}

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? <><span className="spinner" /> Signing in...</> : <>Sign in <ArrowRight size={15} /></>}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span className="text-faint text-xs">or</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* OTP login option */}
          <Link href="/auth" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "10px", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "14px", fontWeight: 500, transition: "all 0.15s", textDecoration: "none" }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text2)"; }}
          >
            <Mail size={15} />
            Sign in with OTP instead
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
