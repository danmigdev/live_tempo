// LiveTempo Service Worker - v4
// Always fetch app shell from network, cache static assets only
const CACHE_NAME = 'livetempo-v4';

// Never cache these - always fetch from network
const NETWORK_ONLY = [
  '/',
  '/index.html'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore') ||
      event.request.url.includes('identitytoolkit') ||
      event.request.url.includes('googleapis')) return;

  var url = new URL(event.request.url);

  // Never cache HTML or root - always get latest
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Stale-while-revalidate for all other assets
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
          return response;
        })
        .catch(function () {});
      return cached || fetchPromise;
    })
  );
});
