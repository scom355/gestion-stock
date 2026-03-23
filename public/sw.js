const CACHE_NAME = 'gestion-stock-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/api/health'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Never cache API calls or POST requests
  if (event.request.url.includes('/api') || event.request.method !== 'GET') {
    return event.respondWith(fetch(event.request));
  }

  // Network-First strategy
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
