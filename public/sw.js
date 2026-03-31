/**
 * @fileOverview Mandatory PWA Service Worker.
 * Handles the fetch event to satisfy browser PWA installation requirements.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required for PWA detection. Does nothing but pass through.
  event.respondWith(fetch(event.request).catch(() => {
      // Offline fallback can be added here
  }));
});
