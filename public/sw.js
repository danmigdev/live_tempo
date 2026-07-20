const CACHE_NAME = 'livetempo-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/style.css',
  '/src/js/firebase-config.js',
  '/src/js/auth.js',
  '/src/js/db.js',
  '/src/js/i18n.js',
  '/src/js/components/login.js',
  '/src/js/components/playlist-list.js',
  '/src/js/components/playlist-detail.js',
  '/src/js/components/song-form.js',
  '/src/js/components/tap-tempo.js',
  '/src/js/components/import-youtube.js',
  '/src/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS).catch(function () {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  // Don't cache Firebase API calls
  if (event.request.url.includes('firestore') || event.request.url.includes('identitytoolkit') ||
      event.request.url.includes('googleapis')) return;

  // Network-first for HTML — always get latest
  if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          return response;
        })
        .catch(function () {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stale-while-revalidate for other assets
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          return response;
        })
        .catch(function () { /* offline, use cache */ });
      return cached || fetchPromise;
    })
  );
});
