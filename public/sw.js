/**
 * @fileOverview I-Pay Master Service Worker.
 * Required for PWA "Installable" status on Android and Chrome.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required fetch handler for PWA installability
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
