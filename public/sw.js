
/**
 * @fileOverview I-Pay Mandatory Service Worker.
 * Browsers like Chrome and Android strictly require this file to enable the "Install App" button.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Satisfies the PWA requirement for a functional fetch listener
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
