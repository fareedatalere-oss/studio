
/*
 * I-Pay Master Service Worker
 * This file is REQUIRED for the browser to enable the "Install" button.
 */

self.addEventListener('install', (event) => {
  console.log('I-Pay Service Worker Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('I-Pay Service Worker Activated.');
  event.waitUntil(clients.claim());
});

// Mandatory fetch listener for PWA installability
self.addEventListener('fetch', (event) => {
  // Logic-less fetch listener to satisfy PWA security checks
});
