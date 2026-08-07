const CACHE_NAME = "dailyreport-v6";
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

  if (url.origin === "https://script.google.com") {
    return;
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

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
});
