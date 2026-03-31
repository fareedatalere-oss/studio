
/**
 * @fileOverview I-Pay Master Service Worker.
 * CRITICAL: This file MUST exist for Android/Chrome to show the "Install App" button.
 */

const CACHE_NAME = 'ipay-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// The FETCH listener is the absolute requirement for PWA installation.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  }
});
