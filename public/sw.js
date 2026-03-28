
/**
 * I-Pay Master Service Worker
 * Mandatory for PWA Installation on Android/iOS.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Mandatory fetch listener to satisfy PWA criteria
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
