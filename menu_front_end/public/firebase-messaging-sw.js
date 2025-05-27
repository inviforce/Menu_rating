// Import firebase scripts needed for messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// Initialize Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyAmacVQMKdZZRxgC9rKHX-LHN96L7BiSbA",
  authDomain: "some-23fc5.firebaseapp.com",
  projectId: "some-23fc5",
  storageBucket: "some-23fc5.firebasestorage.app",
  messagingSenderId: "683772900348",
  appId: "1:683772900348:web:8ac72d98c27e0bf3f6f879",
  measurementId: "G-7HQ641M1DQ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});