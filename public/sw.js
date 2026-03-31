
/**
 * @fileOverview I-Pay Progressive Web App Service Worker.
 * Required for the browser to enable the "Install App" button.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler required for PWA installability handshake
});
