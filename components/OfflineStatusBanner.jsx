"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial online status
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Register Service Worker for offline capability
      if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (process.env.NODE_ENV !== "production") {
              console.log("[ServiceWorker] Registered with scope:", registration.scope);
            }
          })
          .catch((error) => {
            console.warn("[ServiceWorker] Registration failed:", error);
          });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: "#7c2d12",
        color: "#fef3c7",
        padding: "10px 16px",
        fontSize: "0.8125rem",
        fontWeight: "500",
        borderBottom: "1px solid #9a3412",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        position: "sticky",
        top: 0,
        zIndex: 9999,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span
          style={{
            background: "#b45309",
            color: "#ffffff",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: "700",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          ⚡ Offline Mode
        </span>
        <span>
          Actuarial engine, private settlement generator, and emergency guide are operating locally in browser memory.
          Cellular calls and formal insurer reporting require mobile reception.
        </span>
      </div>
      <Link
        href="/emergency"
        style={{
          background: "#ffffff",
          color: "#7c2d12",
          padding: "4px 12px",
          borderRadius: "6px",
          fontWeight: "600",
          textDecoration: "none",
          whiteSpace: "nowrap",
          fontSize: "0.75rem",
        }}
      >
        Emergency Kit →
      </Link>
    </div>
  );
}
