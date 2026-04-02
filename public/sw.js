/**
 * I-Pay Master Service Worker
 * Mandatory for PWA Installation on Android, iOS, and Chrome.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required listener to satisfy PWA installability criteria
  // For now, we perform a simple pass-through to ensure direct app communication
  event.respondWith(fetch(event.request));
});
