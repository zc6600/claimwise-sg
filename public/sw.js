const CACHE_PREFIX = "claimwise-offline-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;

const PRECACHE_URLS = [
  "/",
  "/calculator",
  "/tools",
  "/tools/ncd-protector",
  "/tools/quote-compare",
  "/tools/coe-renewal",
  "/tools/loan-prepayment",
  "/my-car",
  "/settlement",
  "/emergency",
  "/how-it-works",
  "/rules",
  "/privacy",
  "/icon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Cache assets individually so a single network/endpoint glitch does not abort the entire precache
        await Promise.all(
          PRECACHE_URLS.map(async (url) => {
            try {
              const response = await fetch(url, { cache: "reload" });
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (err) {
              console.warn(`[SW] Precache item failed for ${url}:`, err);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            // Only clean up ClaimWise-scoped caches, preserving any other caches on the origin
            if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
              return caches.delete(name);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // API routes: Network-only with JSON offline fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            ok: false,
            offline: true,
            error: "Device is currently offline. Actuarial calculation and settlement drafting operate locally in your browser.",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 503,
          }
        );
      })
    );
    return;
  }

  // Next.js static chunks, assets, and icons: Cache-first with network fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
            );
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Page navigations: Network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
            );
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If specific route is not cached, fallback to emergency kit or calculator
          const emergencyFallback = await caches.match("/emergency");
          if (emergencyFallback) {
            return emergencyFallback;
          }
          const calculatorFallback = await caches.match("/calculator");
          if (calculatorFallback) {
            return calculatorFallback;
          }
          return new Response("Offline mode active. Please launch /calculator or /emergency from cache.", {
            headers: { "Content-Type": "text/plain" },
            status: 503,
          });
        })
    );
    return;
  }

  // Default: cache first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
            );
          }
          return networkResponse;
        })
      );
    })
  );
});
