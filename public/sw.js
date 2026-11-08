const CACHE_PREFIX = "claimwise-offline-";
const CACHE_NAME = `${CACHE_PREFIX}v6`;

// The dev server serves unhashed code at fixed URLs, so caching it would pin stale code.
const IS_LOCAL_DEV = ["localhost", "127.0.0.1"].includes(self.location.hostname);

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
  if (IS_LOCAL_DEV) {
    // Take over at once so the activate step can clear old caches and unregister.
    event.waitUntil(self.skipWaiting());
    return;
  }
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
  if (IS_LOCAL_DEV) {
    event.waitUntil(
      caches
        .keys()
        .then((names) => Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => caches.delete(name))))
        .then(() => self.registration.unregister())
    );
    return;
  }
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

  // Only handle HTTP/HTTPS GET requests, and never intercept the local dev server
  if (IS_LOCAL_DEV || request.method !== "GET" || !request.url.startsWith("http")) {
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
            error: "You are offline. The claim calculator needs a connection; the emergency kit and settlement agreement still work.",
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

  // Everything else, including Next.js page data for in-app navigation: network first,
  // so a deploy is visible immediately, with the cached copy used only when offline.
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
      .catch(() => caches.match(request).then((cachedResponse) => cachedResponse || Response.error()))
  );
});
