const CACHE = "little-discoveries-v6-device-pictures-v1";
const IMAGES = [
  ...["cat", "dog", "cow", "elephant", "bird", "sheep", "lion", "tiger", "hen"].map(
    (name) => `./assets/animals/${name}.png`,
  ),
  ...["cat", "dog", "cow", "elephant", "bird", "sheep"].map(
    (name) => `./assets/animals/${name}.gif`,
  ),
  ...[
    "ball",
    "cat",
    "milk",
    "apple",
    "water",
    "house",
    "sun",
    "flower",
    "book",
    "car",
    "hand",
    "shoe",
  ].map((name) => `./assets/first-words/${name}.png`),
  ...["tap-discover", "first-words", "bubble-pop", "hero-bear"].map(
    (name) => `./assets/home/${name}.png`,
  ),
];
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./app.js?v=6.3.2",
  "./pictures.js",
  "./pictures.js?v=6.4.0",
  "./pictures.css",
  "./voice-studio.js",
  "./voice-studio.js?v=6.3.2",
  "./family.js",
  "./style.css",
  "./design.css",
  "./voice-studio.css",
  "./family.css",
  "./storybook.css",
  "./manifest.webmanifest",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png",
  ...IMAGES,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("little-discoveries-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== location.origin
  )
    return;
  const pathname = new URL(event.request.url).pathname;
  const refreshable = event.request.mode === "navigate" || /\.(?:html|js|css)$/.test(pathname);
  if (refreshable) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached ||
          (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error()))),
    );
  } else {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
