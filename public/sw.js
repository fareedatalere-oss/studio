/**
 * @fileOverview I-Pay Mandatory Service Worker.
 * Required for the browser to recognize the app as a PWA and enable the "Install" button.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch listener required by Chrome for PWA installation
  event.respondWith(fetch(event.request));
});