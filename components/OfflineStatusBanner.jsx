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

      // The offline cache runs only in production; in development it would serve stale code,
      // so any worker left over from an earlier session is removed.
      if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
        if (process.env.NODE_ENV === "production") {
          navigator.serviceWorker.register("/sw.js").catch((error) => {
            console.warn("[ServiceWorker] Registration failed:", error);
          });
        } else {
          navigator.serviceWorker
            .getRegistrations()
            .then((registrations) => registrations.forEach((registration) => registration.unregister()))
            .catch(() => {});
        }
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
          The emergency kit, settlement agreement, and car tools you have opened still work. The claim
          calculator, phone calls, and reporting to your insurer need a connection.
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
