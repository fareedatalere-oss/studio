/**
 * I-Pay Master Service Worker v1.0
 * Mandatory for PWA Installation on Android/iOS.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// The FETCH listener is the MAGIC key that allows Chrome to show the "INSTALL" button
self.addEventListener('fetch', (event) => {
  // We let the network handle everything, but the presence of this listener
  // satisfies the browser's PWA security requirement.
  event.respondWith(fetch(event.request));
});
