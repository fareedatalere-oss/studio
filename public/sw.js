/**
 * I-Pay Master Service Worker
 * REQUIRED for PWA "Install" prompt on Android and Chrome.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

/**
 * The 'fetch' event listener is the MANDATORY requirement for PWA installability.
 * Even a simple passthrough satisfies the browser's security handshake.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
