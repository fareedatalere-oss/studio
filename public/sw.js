
/**
 * @fileOverview Mandatory Service Worker for PWA compliance.
 * Enables the "Add to Home Screen" prompt on Android and iOS.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required fetch listener to trigger the PWA install prompt.
  // We prioritize network but fall back to cached content if offline.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
