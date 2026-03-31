
// I-Pay Master Service Worker
// Mandatory fetch listener to enable "Install" button in Chrome/Android
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required by Chrome to satisfy PWA installability criteria
  event.respondWith(fetch(event.request).catch(() => {
    return caches.match(event.request);
  }));
});
