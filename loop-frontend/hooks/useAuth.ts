"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getSession, clearSession } from "@/lib/auth";
import { startLoading } from "@/components/PageLoader";

export function useAuth() {
  const router  = useRouter();
  const [ready, setReady]   = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [name,   setName]   = useState("");
  const [city,   setCity]   = useState("");

  useEffect(() => {
    const token   = getToken();
    const session = getSession();

    // No session at all - send to login
    if (!token || !session) {
      startLoading();
      router.replace("/login");
      return;
    }

    // We have a session locally - trust it immediately so the page renders
    // without waiting for the network call. This prevents the redirect loop.
    setUserId(session.user_id);
    setName(session.name);
    setCity(session.city);
    setReady(true);

    // Validate in background - only clear session on explicit 401, not on
    // network errors or timeouts. This prevents auto-logout on slow networks.
    fetch("/api/auth/me", {
      headers: { "Authorization": `Bearer ${token}` },
      signal: AbortSignal.timeout(8000), // 8s timeout
    })
      .then(res => {
        if (res.status === 401) {
          // Token genuinely invalid/expired - clear and redirect
          clearSession();
          router.replace("/login");
        }
        // Any other error (network, 500, timeout) → keep session alive
      })
      .catch(() => {
        // Network error or timeout - do NOT clear session, keep the user in
      });
  }, []); // Run once on mount only

  return { ready, userId, name, city };
}
