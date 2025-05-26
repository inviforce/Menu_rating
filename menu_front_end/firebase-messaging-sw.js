// Import firebase scripts needed for messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker
firebase.initializeApp({
  apiKey: 'AIzaSyBPendkWM0LrYFYnruyqdOwe5-60MdRE7Q',
  authDomain: 'menu-4a32c.firebaseapp.com',
  projectId: 'menu-4a32c',
  messagingSenderId: '491840054429',
  appId: '1:491840054429:web:42bfa07787881520a42074',
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png', // optional icon path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
