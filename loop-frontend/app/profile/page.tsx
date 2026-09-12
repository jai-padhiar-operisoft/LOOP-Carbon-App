"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera, Check, X, Loader2, ArrowLeft, User, AtSign,
  MapPin, FileText, Mail, Shield, Save, AlertCircle,
  Upload, Eye, Target, Award, TrendingUp, Zap, Globe, Crown, Star, Trophy,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { authHeaders, getSession, saveSession, getToken } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";
import { getMilestones } from "@/lib/api";

const CITIES = [
  "Bengaluru", "Mumbai", "Delhi", "Chennai",
  "Hyderabad", "Pune", "Kolkata", "Ahmedabad",
];

// Milestone icon mapping
const MILESTONE_ICONS: Record<string, any> = {
  "upload": Upload,
  "eye": Eye,
  "target": Target,
  "award": Award,
  "trending-up": TrendingUp,
  "zap": Zap,
  "globe": Globe,
  "crown": Crown,
  "star": Star,
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// ── Debounce helper ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export default function ProfilePage() {
  const router   = useRouter();
  const { ready } = useAuth();

  // ── Profile fields ──────────────────────────────────────────────────────────
  const [name,       setName]       = useState("");
  const [username,   setUsername]   = useState("");
  const [city,       setCity]       = useState("");
  const [bio,        setBio]        = useState("");
  const [email,      setEmail]      = useState("");
  const [avatarUrl,  setAvatarUrl]  = useState("");
  const [joinedAt,   setJoinedAt]   = useState("");

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview,   setAvatarPreview]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Milestones state ────────────────────────────────────────────────────────
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  // ── Username availability check ─────────────────────────────────────────────
  const [originalUsername, setOriginalUsername] = useState("");
  const [unameStatus, setUnameStatus]           = useState<UsernameStatus>("idle");
  const debouncedUsername = useDebounce(username, 400);

  // Load profile on mount
  useEffect(() => {
    if (!ready) return;
    const token = getToken();
    if (!token) { startLoading(); router.push("/login"); return; }

    fetch("/api/auth/me", { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setName(d.name || "");
        setUsername(d.username || "");
        setOriginalUsername(d.username || "");
        setCity(d.city || "");
        setBio(d.bio || "");
        setEmail(d.email || "");
        setAvatarUrl(d.avatar_url || "");
        setAvatarPreview(d.avatar_url ? d.avatar_url : "");
        setJoinedAt(d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : "");
        
        // Fetch milestones
        const userId = localStorage.getItem("loop_user_id");
        if (userId) {
          getMilestones(Number(userId))
            .then(setMilestoneData)
            .catch(() => {})
            .finally(() => setMilestonesLoading(false));
        } else {
          setMilestonesLoading(false);
        }
      })
      .catch(() => { startLoading(); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [ready, router]);

  // Username live check
  useEffect(() => {
    const val = debouncedUsername.trim();
    if (!val || val === originalUsername) { setUnameStatus("idle"); return; }
    if (val.length < 3) { setUnameStatus("invalid"); return; }
    setUnameStatus("checking");
    fetch(`/api/auth/check-username/${encodeURIComponent(val)}`)
      .then(r => r.json())
      .then(d => setUnameStatus(d.available ? "available" : "taken"))
      .catch(() => setUnameStatus("idle"));
  }, [debouncedUsername, originalUsername]);

  // ── Avatar upload ───────────────────────────────────────────────────────────
  function handleAvatarClick() { fileRef.current?.click(); }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/auth/me/avatar", {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setAvatarUrl(data.avatar_url);
      // Persist to localStorage so Navbar picks it up without an API call
      localStorage.setItem("loop_avatar_url", `/avatars/${data.avatar_url.split("/avatars/")[1]}`);
      window.dispatchEvent(new CustomEvent("loop:avatar-updated", { detail: `/avatars/${data.avatar_url.split("/avatars/")[1]}` }));
      // Sync session
      const sess = getSession();
      if (sess) saveSession(getToken()!, sess.user_id, sess.name, sess.city, sess.email, sess.username);
    } catch (e: any) {
      setError(e.message);
      setAvatarPreview(avatarUrl || "");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Save profile ────────────────────────────────────────────────────────────
  async function handleSave() {
    setError(""); setFieldErrors({}); setSaved(false);

    const errs: Record<string, string> = {};
    if (!name.trim())             errs.name = "Name is required";
    if (username.trim() && unameStatus === "taken") errs.username = "Username already taken";
    if (username.trim() && unameStatus === "invalid") errs.username = "Username must be at least 3 characters";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name:     name.trim(),
          username: username.trim() || null,
          city,
          bio:      bio.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "string" ? data.detail : "Update failed";
        if (msg.toLowerCase().includes("username")) setFieldErrors({ username: msg });
        else setError(msg);
        return;
      }
      // Sync localStorage session so Navbar and other pages see the new values
      const token = getToken()!;
      saveSession(token, data.id, data.name, data.city, data.email, data.username || "");
      setOriginalUsername(data.username || "");
      setUnameStatus("idle");
      setSaved(true);
      // Tell Navbar to re-read session immediately
      window.dispatchEvent(new Event("loop:profile-saved"));
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!ready || loading) return (
    <div style={{ minHeight: "100vh", background: "var(--dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color="var(--g400)" style={{ animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const initials = name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const isUnameChanged = username.trim() !== originalUsername;

  return (
    <div className="page">
      <Navbar />

      <div className="wrap-sm" style={{ paddingTop: "32px", paddingBottom: "80px" }}>

        {/* Back */}
        <Link
          href="/dashboard"
          onClick={() => startLoading()}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--text3)", fontSize: "13px", fontWeight: 500, marginBottom: "28px", transition: "color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        {/* Page title */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "26px", fontWeight: 900, color: "var(--text1)", letterSpacing: "-0.5px", marginBottom: "4px" }}>
            Edit Profile
          </h1>
          <p style={{ color: "var(--text3)", fontSize: "14px" }}>
            Update your personal details and how others see you.
          </p>
        </div>

        {/* ── Avatar card ─────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "28px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              onClick={handleAvatarClick}
              style={{
                width: 88, height: 88, borderRadius: "50%",
                background: avatarPreview ? "transparent" : "rgba(74,222,128,0.12)",
                border: "2px solid rgba(74,222,128,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", overflow: "hidden", position: "relative",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(74,222,128,0.6)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(74,222,128,0.25)")}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "28px", fontWeight: 900, color: "var(--g400)" }}>{initials}</span>
              )}
              {/* Hover overlay */}
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
              >
                <Camera size={20} color="#fff" />
              </div>
            </div>

            {/* Upload spinner badge */}
            {avatarUploading && (
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--dark)", border: "1px solid var(--border2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Loader2 size={13} color="var(--g400)" style={{ animation: "spin 0.8s linear infinite" }} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: "var(--text1)", fontSize: "16px", marginBottom: "2px" }}>{name || "Your Name"}</p>
            {username && <p style={{ fontSize: "13px", color: "var(--text3)", marginBottom: "6px" }}>@{username}</p>}
            {joinedAt && <p style={{ fontSize: "12px", color: "var(--text3)" }}>Member since {joinedAt}</p>}
          </div>

          <button
            onClick={handleAvatarClick}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px",
              borderRadius: "10px", border: "1px solid var(--border2)", background: "transparent",
              color: "var(--text2)", fontSize: "13px", fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text2)"; }}
          >
            <Camera size={14} />
            {avatarPreview ? "Change photo" : "Upload photo"}
          </button>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </div>

        {/* ── Milestones & Achievements ─────────────────────────────────── */}
        <div className="card" style={{ padding: "28px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                Achievements
              </p>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text1)" }}>
                Carbon Milestones
              </h3>
            </div>
            {milestoneData && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Trophy size={16} color="var(--g400)" />
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--g400)" }}>
                  {milestoneData.unlocked_count}/{milestoneData.total_milestones}
                </span>
              </div>
            )}
          </div>

          {milestonesLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
              <Loader2 size={20} color="var(--g400)" style={{ animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : milestoneData ? (
            <>
              {/* Cumulative CO2 tracked */}
              <div style={{ 
                background: "linear-gradient(135deg, rgba(74,222,128,0.1), rgba(74,222,128,0.02))", 
                border: "1px solid rgba(74,222,128,0.15)",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <p style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "2px" }}>Lifetime CO₂ Tracked</p>
                  <p style={{ fontSize: "24px", fontWeight: 900, color: "var(--g400)" }}>
                    {milestoneData.cumulative_co2.toLocaleString()} kg
                  </p>
                </div>
                {milestoneData.next && (
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "2px" }}>Next milestone</p>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text2)" }}>
                      {milestoneData.next.name}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text3)" }}>
                      {milestoneData.next.remaining} kg to go
                    </p>
                  </div>
                )}
              </div>

              {/* Progress bar for next milestone */}
              {milestoneData.next && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ 
                    height: "6px", 
                    background: "var(--dark3)", 
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${milestoneData.next.progress}%`,
                      background: "linear-gradient(90deg, var(--g400), #4ade80)",
                      borderRadius: "3px",
                      transition: "width 0.5s ease"
                    }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text3)", marginTop: "6px", textAlign: "right" }}>
                    {milestoneData.next.progress}% complete
                  </p>
                </div>
              )}

              {/* Milestone badges grid */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(3, 1fr)", 
                gap: "12px" 
              }}>
                {/* Show all milestones from the definitions */}
                {[
                  { id: "first_upload",   name: "First Steps",      icon: "upload",      color: "#22c55e", threshold: 0 },
                  { id: "carbon_aware",   name: "Carbon Aware",     icon: "eye",         color: "#4ade80", threshold: 10 },
                  { id: "half_century",   name: "Half Century",     icon: "target",      color: "#a3e635", threshold: 50 },
                  { id: "century_club",   name: "Century Club",     icon: "award",       color: "#fbbf24", threshold: 100 },
                  { id: "quarter_ton",    name: "Quarter Ton",      icon: "trending-up", color: "#f97316", threshold: 250 },
                  { id: "half_ton",       name: "Half Ton Hero",    icon: "zap",         color: "#ef4444", threshold: 500 },
                  { id: "one_ton",        name: "Tonne Tracker",    icon: "globe",       color: "#8b5cf6", threshold: 1000 },
                  { id: "two_ton",        name: "Climate Champion", icon: "crown",       color: "#ec4899", threshold: 2000 },
                  { id: "five_ton",       name: "Carbon Master",    icon: "star",        color: "#06b6d4", threshold: 5000 },
                ].map(milestone => {
                  const isUnlocked = milestoneData.unlocked.some((u: any) => u.id === milestone.id);
                  const Icon = MILESTONE_ICONS[milestone.icon] || Award;
                  
                  return (
                    <div 
                      key={milestone.id}
                      style={{
                        background: isUnlocked ? `${milestone.color}10` : "var(--dark3)",
                        border: `1px solid ${isUnlocked ? `${milestone.color}30` : "var(--border)"}`,
                        borderRadius: "12px",
                        padding: "16px 12px",
                        textAlign: "center",
                        opacity: isUnlocked ? 1 : 0.5,
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: isUnlocked ? `${milestone.color}20` : "var(--dark2)",
                        border: `1px solid ${isUnlocked ? `${milestone.color}40` : "var(--border2)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 10px",
                      }}>
                        <Icon size={18} color={isUnlocked ? milestone.color : "var(--text3)"} />
                      </div>
                      <p style={{ 
                        fontSize: "12px", 
                        fontWeight: 700, 
                        color: isUnlocked ? "var(--text1)" : "var(--text3)",
                        marginBottom: "2px"
                      }}>
                        {milestone.name}
                      </p>
                      <p style={{ 
                        fontSize: "10px", 
                        color: isUnlocked ? milestone.color : "var(--text3)" 
                      }}>
                        {milestone.threshold > 0 ? `${milestone.threshold.toLocaleString()} kg` : "Start"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text3)", fontSize: "13px" }}>
              <Trophy size={32} color="var(--text3)" style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p>Upload your first CSV to start earning milestones!</p>
            </div>
          )}
        </div>

        {/* ── Fields card ──────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: "28px", marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "20px" }}>
            Personal information
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Full name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel icon={<User size={13} />} label="Full name" />
              <input
                className="input"
                value={name}
                onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: "" })); }}
                placeholder="Your full name"
                maxLength={80}
                style={fieldErrors.name ? { borderColor: "rgba(239,68,68,0.5)" } : {}}
              />
              {fieldErrors.name && <FieldError msg={fieldErrors.name} />}
            </div>

            {/* Username */}
            <div>
              <FieldLabel icon={<AtSign size={13} />} label="Username" />
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  value={username}
                  onChange={e => {
                    const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                    setUsername(v);
                    setFieldErrors(p => ({ ...p, username: "" }));
                  }}
                  placeholder="your_handle"
                  maxLength={30}
                  style={{
                    paddingRight: "36px",
                    ...(fieldErrors.username ? { borderColor: "rgba(239,68,68,0.5)" } : {}),
                    ...(isUnameChanged && unameStatus === "available" ? { borderColor: "rgba(74,222,128,0.4)" } : {}),
                  }}
                />
                {/* Status icon */}
                <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>
                  {isUnameChanged && unameStatus === "checking"  && <Loader2 size={14} color="var(--text3)" style={{ animation: "spin 0.8s linear infinite" }} />}
                  {isUnameChanged && unameStatus === "available" && <Check size={14} color="var(--g400)" />}
                  {isUnameChanged && unameStatus === "taken"     && <X size={14} color="#f87171" />}
                  {isUnameChanged && unameStatus === "invalid"   && <X size={14} color="#f87171" />}
                </div>
              </div>
              {isUnameChanged && unameStatus === "available" && <p style={{ fontSize: "12px", color: "var(--g400)", marginTop: "5px" }}>Username available</p>}
              {isUnameChanged && unameStatus === "taken"     && <FieldError msg="This username is already taken" />}
              {isUnameChanged && unameStatus === "invalid"   && <FieldError msg="Minimum 3 characters, letters and numbers only" />}
              {fieldErrors.username && <FieldError msg={fieldErrors.username} />}
            </div>

            {/* City */}
            <div>
              <FieldLabel icon={<MapPin size={13} />} label="City" />
              <select
                className="input"
                value={city}
                onChange={e => setCity(e.target.value)}
                style={{ appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Bio */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel icon={<FileText size={13} />} label={`Bio ${bio.length ? `· ${bio.length}/280` : ""}`} />
              <textarea
                className="input"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short description about yourself and your sustainability goals…"
                maxLength={280}
                rows={3}
                style={{ resize: "vertical", minHeight: "80px", lineHeight: 1.6 }}
              />
            </div>
          </div>
        </div>

        {/* ── Account info (read-only) ───────────────────────────────────── */}
        <div className="card" style={{ padding: "28px", marginBottom: "24px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "20px" }}>
            Account
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <ReadOnlyField icon={<Mail size={14} />} label="Email address" value={email} hint="Email cannot be changed" />
            <ReadOnlyField icon={<Shield size={14} />} label="Password" value="••••••••••••" hint="Use the forgot password flow to change it" />
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div className="alert-error" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {/* ── Save button ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || unameStatus === "checking" || unameStatus === "taken"}
            style={{ minWidth: "140px", justifyContent: "center" }}
          >
            {saving ? (
              <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Saving…</>
            ) : saved ? (
              <><Check size={15} /> Saved!</>
            ) : (
              <><Save size={15} /> Save changes</>
            )}
          </button>

          {saved && (
            <span style={{ fontSize: "13px", color: "var(--g400)", fontWeight: 500, display: "flex", alignItems: "center", gap: "5px" }}>
              <Check size={13} /> Profile updated
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .input {
          width: 100%;
          background: var(--dark3);
          border: 1px solid var(--border2);
          border-radius: 10px;
          padding: 10px 14px;
          color: var(--text1);
          font-size: 14px;
          transition: border-color 0.15s;
          outline: none;
        }
        .input:focus { border-color: rgba(74,222,128,0.45); }
        .input::placeholder { color: var(--text3); }
        .alert-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
        }
        .alert-success {
          background: rgba(74,222,128,0.08);
          border: 1px solid rgba(74,222,128,0.2);
          color: var(--g400);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────
function FieldLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "7px", color: "var(--text2)", fontSize: "13px", fontWeight: 500 }}>
      {icon}{label}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p style={{ fontSize: "12px", color: "#f87171", marginTop: "5px" }}>{msg}</p>;
}

function ReadOnlyField({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "var(--dark2)", borderRadius: "10px", border: "1px solid var(--border)" }}>
      <div style={{ color: "var(--text3)", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "11px", color: "var(--text3)", marginBottom: "1px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: "14px", color: "var(--text1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
      </div>
      <p style={{ fontSize: "11px", color: "var(--text3)", flexShrink: 0, maxWidth: "160px", textAlign: "right" }}>{hint}</p>
    </div>
  );
}
