importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyBm7Hzq3QbTIUvDlv2fYOJKetOWN6V1tsY",
    authDomain: "open-audit-f83b4.firebaseapp.com",
    projectId: "open-audit-f83b4",
    storageBucket: "open-audit-f83b4.firebasestorage.app",
    messagingSenderId: "504470208598",
    appId: "1:504470208598:web:1a6b96ece326ab0e7cfbf7",
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
