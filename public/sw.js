// Master Service Worker for I-Pay Online
// Forces PWA installability on Android and Chrome

self.addEventListener('install', (event) => {
  console.log('I-Pay Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('I-Pay Service Worker activated.');
});

self.addEventListener('fetch', (event) => {
  // Browsers require a fetch listener to show the "Install App" prompt.
  // We pass through all requests normally.
  event.respondWith(fetch(event.request));
});

// Native Notification Listener
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'I-Pay Notification';
  const options = {
    body: data.description || 'You have a new update.',
    icon: '/logo.png',
    badge: '/logo.png',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});