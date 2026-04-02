/**
 * I-Pay Definitive Service Worker
 * Required for Chrome/Android "Install App" button activation.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A fetch listener is mandatory for PWA installation criteria.
  // We forward all requests to the network.
  event.respondWith(fetch(event.request));
});