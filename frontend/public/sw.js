const CACHE_NAME = "sfl-v3";
const STATIC_ASSETS = [
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/images/system-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navegações (HTML): network-first com fallback ao cache em offline.
  // Garante que dados renderizados no SSR fiquem frescos a cada abertura.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && isSameOrigin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // API: network-first, sem cache de HTML.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // JS/CSS do Next e HMR: nunca cachear — quebra hydration em dev e updates.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".map")
  ) {
    return;
  }

  // Imagens e ícones: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetching = fetch(request)
        .then((response) => {
          if (response.ok && isSameOrigin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
