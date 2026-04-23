
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAqIbMOCA5dOqJUy5bksBMWdvzA4kxf7JY",
  authDomain: "studio-1987165891-b29cf.firebaseapp.com",
  projectId: "studio-1987165891-b29cf",
  storageBucket: "studio-1987165891-b29cf.firebasestorage.app",
  messagingSenderId: "787362438578",
  appId: "1:787362438578:web:898cd4f13a522d8d1b58ab"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background Message: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
