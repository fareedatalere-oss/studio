/**
 * @fileOverview I-Pay Master Service Worker.
 * Mandatory for PWA status on Android/Chrome.
 * Enables offline caching and "Add to Home Screen" functionality.
 */

const CACHE_NAME = 'ipay-cache-v3';
const ASSETS = [
  '/',
  '/logo.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Required fetch listener to trigger the "Install" prompt
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});