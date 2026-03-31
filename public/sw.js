/**
 * I-Pay Master Service Worker
 * This file is REQUIRED for the "Install App" prompt to show on Android and Chrome.
 */

const CACHE_NAME = 'ipay-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // The 'fetch' listener is the secret key that tells the browser this is a real app.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
