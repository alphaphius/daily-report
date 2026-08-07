const CACHE_NAME = "dailyreport-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./create.html",
  "./preview.html",
  "./settings.html",
  "./search.html",
  "./manifest.json",
  "./config.js",
  "./js/app.js",
  "./js/home.js",
  "./js/create.js",
  "./js/preview.js",
  "./js/settings.js",
  "./js/search.js",
  "./css/tailwind.css",
  "./css/app.css",
  "./vendor/html2canvas.min.js",
  "./vendor/jspdf.umd.min.js",
  "./vendor/anuphan-fonts.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;

  // API calls always hit the network
  if (url.origin === "https://script.google.com") return;

  // Navigations (HTML): network-first so deploys are visible immediately,
  // fall back to cache when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets + cross-origin (fonts, logo): stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && (response.ok || response.type === "opaque")) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
