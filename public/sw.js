/**
 * @fileOverview Master PWA Service Worker for I-Pay Online.
 * Mandatory fetch event listener to enable "Install App" prompt on Chrome/Android.
 */

const CACHE_NAME = 'ipay-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Required by Chrome to trigger the install prompt
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
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