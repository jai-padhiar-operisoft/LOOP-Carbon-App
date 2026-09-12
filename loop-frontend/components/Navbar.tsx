"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Zap, Map, BookOpen, Users, LogOut } from "lucide-react";
import { clearSession, getSession } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/actions",   label: "Actions",   icon: Zap },
  { href: "/map",       label: "Map",        icon: Map },
  { href: "/story",     label: "Story",      icon: BookOpen },
  { href: "/circles",   label: "Circles",    icon: Users },
];

export default function Navbar() {
  const path   = usePathname();
  const router = useRouter();

  // Read session only after mount — prevents SSR/client hydration mismatch
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  // Avatar URL stored separately so profile page can update it without full reload
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    setSession(getSession());
    // Read cached avatar from localStorage (written by profile page on upload)
    setAvatarUrl(localStorage.getItem("loop_avatar_url") || "");
  }, []);

  // Listen for avatar updates dispatched by the profile page
  useEffect(() => {
    function onAvatarUpdate(e: Event) {
      const url = (e as CustomEvent<string>).detail;
      setAvatarUrl(url || "");
    }
    window.addEventListener("loop:avatar-updated", onAvatarUpdate);
    return () => window.removeEventListener("loop:avatar-updated", onAvatarUpdate);
  }, []);

  // Refresh session name/username after profile save
  useEffect(() => {
    function onProfileSaved() {
      setSession(getSession());
      setAvatarUrl(localStorage.getItem("loop_avatar_url") || "");
    }
    window.addEventListener("loop:profile-saved", onProfileSaved);
    return () => window.removeEventListener("loop:profile-saved", onProfileSaved);
  }, []);

  function handleLogout() {
    startLoading();
    clearSession();
    router.push("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          L<span>OO</span>P
        </Link>

        <div className="navbar-links">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${path.startsWith(href) ? "active" : ""}`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ThemeToggle />
          {session && (
            <Link
              href="/profile"
              onClick={() => startLoading()}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "4px 8px 4px 4px", borderRadius: "22px",
                border: "1px solid transparent", textDecoration: "none",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border2)";
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              {/* Avatar circle */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--g400)" }}>
                    {session.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{ fontSize: "13px", color: "var(--text1)", fontWeight: 600 }}>
                  {session.name?.split(" ")[0]}
                </span>
                {session.username && (
                  <span style={{ fontSize: "11px", color: "var(--text3)", fontWeight: 400 }}>
                    @{session.username}
                  </span>
                )}
              </div>
            </Link>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", borderRadius: "8px",
              background: "transparent", border: "1px solid var(--border2)",
              color: "var(--text3)", fontSize: "13px", fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.3)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text3)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)";
            }}
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
