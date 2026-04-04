/**
 * @fileOverview Master Service Worker for I-Pay PWA.
 * Mandatory file for Chrome/Android "Install App" compliance.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch listener required for PWA installability
});
