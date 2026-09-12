// ── Auth helpers used across the app ─────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("loop_token");
}

export function getSession(): { user_id: number; name: string; city: string; email: string; username?: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("loop_session");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveSession(token: string, user_id: number, name: string, city: string, email: string, username?: string) {
  localStorage.setItem("loop_token",    token);
  localStorage.setItem("loop_user_id",  String(user_id));
  localStorage.setItem("loop_user_name", name);
  localStorage.setItem("loop_user_city", city);
  localStorage.setItem("loop_session",  JSON.stringify({ user_id, name, city, email, username: username || "" }));
}

export function clearSession() {
  ["loop_token","loop_user_id","loop_user_name","loop_user_city","loop_session","loop_result"].forEach(
    k => localStorage.removeItem(k)
  );
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

// Password strength checker - returns 0-4
export function passwordStrength(pw: string): { score: number; label: string; color: string; checks: Record<string, boolean> } {
  const checks = {
    length:    pw.length >= 12,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /\d/.test(pw),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const levels = [
    { label: "Too weak",  color: "#ef4444" },
    { label: "Weak",      color: "#f97316" },
    { label: "Fair",      color: "#eab308" },
    { label: "Good",      color: "#84cc16" },
    { label: "Strong",    color: "#22c55e" },
  ];
  return { score, checks, ...levels[score] };
}
