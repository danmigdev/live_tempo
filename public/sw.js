const CACHE_NAME = 'livetempo-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/style.css',
  '/src/js/firebase-config.js',
  '/src/js/auth.js',
  '/src/js/db.js',
  '/src/js/components/login.js',
  '/src/js/components/playlist-list.js',
  '/src/js/components/playlist-detail.js',
  '/src/js/components/song-form.js',
  '/src/js/components/tap-tempo.js',
  '/src/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit')) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
