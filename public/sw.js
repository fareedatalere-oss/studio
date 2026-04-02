/**
 * @fileOverview I-Pay Master Service Worker.
 * MANDATORY for PWA "Install" button to appear on Android/Chrome.
 */

const CACHE_NAME = 'ipay-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Mandatory fetch listener to satisfy PWA requirements
self.addEventListener('fetch', (event) => {
  // Pass-through handler
  return;
});
