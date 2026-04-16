
// I-PAY MASTER SERVICE WORKER
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAqIbMOCA5dOqJUy5bksBMWdvzA4kxf7JY",
  authDomain: "studio-1987165891-b29cf.firebaseapp.com",
  projectId: "studio-1987165891-b29cf",
  storageBucket: "studio-1987165891-b29cf.firebasestorage.app",
  messagingSenderId: "787362438578",
  appId: "1:787362438578:web:898cd4f13a522d8d1b58ab"
});

const messaging = firebase.messaging();

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
  console.log('[I-Pay Background Force] Message received: ', payload);
  const notificationTitle = payload.notification.title || 'I-Pay Hub';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new update.',
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
