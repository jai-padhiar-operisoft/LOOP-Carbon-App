"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  upload:    "Upload",
  dashboard: "Dashboard",
  actions:   "Actions",
  map:       "Map",
  story:     "My Story",
  circles:   "Circles",
};

export default function Breadcrumb() {
  const path = usePathname();
  if (path === "/") return null;

  const segments = path.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px", flexWrap: "wrap" }}>
      <Link
        href="/"
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          fontSize: "13px", color: "var(--text3)",
          transition: "color 0.15s",
          textDecoration: "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
      >
        <Home size={13} />
        <span>Home</span>
      </Link>

      {segments.map((seg, i) => {
        const href  = "/" + segments.slice(0, i + 1).join("/");
        const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
        const isLast = i === segments.length - 1;

        return (
          <span key={seg} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ChevronRight size={12} color="var(--text3)" />
            {isLast ? (
              <span style={{ fontSize: "13px", color: "var(--text1)", fontWeight: 600 }}>
                {label}
              </span>
            ) : (
              <Link
                href={href}
                style={{ fontSize: "13px", color: "var(--text3)", transition: "color 0.15s", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
