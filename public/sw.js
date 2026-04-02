/**
 * @fileOverview Master Service Worker for I-Pay Online.
 * MANDATORY: This file must exist for Android/Chrome to allow "Install App".
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Mandatory fetch listener to satisfy PWA criteria
  event.respondWith(fetch(event.request));
});
