"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function WebAnalytics() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Hindari double tracking untuk path yang sama berturut-turut
    if (!pathname || lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    // Ambil atau buat anon session ID untuk menghitung unique visitor
    let sessionId = "";
    try {
      sessionId = sessionStorage.getItem("zt_sid") || "";
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("zt_sid", sessionId);
      }
    } catch {
      sessionId = "anon-" + Date.now();
    }

    const payload = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      sessionId,
    });

    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/collect", blob);
      } else {
        fetch("/api/analytics/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Non-blocking
    }
  }, [pathname]);

  return null;
}
