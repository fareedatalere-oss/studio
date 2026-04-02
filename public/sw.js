
/**
 * I-Pay Master Service Worker
 * Mandatory for PWA Installation on Android, iOS, and Chrome.
 */
const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Mandatory fetch listener to trigger the "Install" prompt
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
