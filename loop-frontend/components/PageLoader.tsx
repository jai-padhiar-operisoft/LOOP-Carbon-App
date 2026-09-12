"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

// Global loading state — exported so router.push wrappers can trigger it
let _setGlobalLoading: ((v: boolean) => void) | null = null;

export function startLoading() {
  _setGlobalLoading?.(true);
}
export function stopLoading() {
  _setGlobalLoading?.(false);
}

export default function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prevPath, setPrevPath] = useState(pathname);

  // Register global setter
  useEffect(() => {
    _setGlobalLoading = setLoading;
    return () => { _setGlobalLoading = null; };
  }, []);

  // When pathname actually changes — page has loaded, stop
  useEffect(() => {
    if (pathname !== prevPath) {
      setPrevPath(pathname);
      setProgress(100);
      const t = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [pathname, prevPath]);

  // Animate progress bar while loading
  useEffect(() => {
    if (!loading) return;
    setProgress(15);
    const t1 = setTimeout(() => setProgress(40),  120);
    const t2 = setTimeout(() => setProgress(65),  400);
    const t3 = setTimeout(() => setProgress(80),  900);
    const t4 = setTimeout(() => setProgress(90), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [loading]);

  // Intercept ALL <a> clicks on the page so we show the loader immediately
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      // Only internal links, skip anchors and external
      if (href.startsWith("/") && !href.startsWith("//")) {
        setLoading(true);
        setProgress(15);
      }
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top progress bar — always visible */}
      <div
        style={{
          position: "fixed",
          top: 0, left: 0,
          height: "3px",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #16a34a, #4ade80, #86efac)",
          zIndex: 9999,
          transition: progress === 100
            ? "width 0.15s ease, opacity 0.25s ease 0.1s"
            : "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          opacity: progress === 100 ? 0 : 1,
          boxShadow: "0 0 12px rgba(74,222,128,0.7)",
          borderRadius: "0 2px 2px 0",
        }}
      />

      {/* Full screen overlay — only for slow loads (after 300ms still loading) */}
      {loading && progress < 85 && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "var(--dark)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            animation: "fadeIn 0.1s ease",
          }}
        >
          <div style={{ fontSize: "38px", fontWeight: 900, letterSpacing: "-2px", color: "var(--text1)" }}>
            L<span style={{ color: "var(--g400)" }}>OO</span>P
          </div>

          {/* Bouncing dots */}
          <div style={{ display: "flex", gap: "8px" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--g400)",
                animation: `bounce 1s ease-in-out ${i * 0.18}s infinite`,
              }} />
            ))}
          </div>

          {/* Progress bar inside overlay */}
          <div style={{ width: "160px", height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--g600), var(--g400))",
              borderRadius: "3px",
              transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
