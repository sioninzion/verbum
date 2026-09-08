// Standalone Firebase Cloud Messaging service worker.
//
// IMPORTANT — this file is NOT the one Verbum actually registers at runtime.
// Verbum already ships its own custom service worker (service-worker.js) for
// PWA offline caching, registered at the root scope ("/"). A second, separate
// worker auto-registered by the FCM SDK at that same root scope would fight
// the existing one for control of the page (only one worker can control a
// given scope), which risks breaking offline caching.
//
// Firebase's own guidance for apps that already have a custom service worker
// is to fold the messaging background-handler into that existing worker
// instead of registering a second one — see the block added to the top of
// service-worker.js, which contains the exact same importScripts/init/
// onBackgroundMessage logic as below. app.js explicitly passes that existing
// registration to messaging.getToken({ serviceWorkerRegistration }), so this
// file is never actually registered by our own code.
//
// It's kept here, fully functional, for two reasons: (1) it's what the
// project brief asked for, and (2) some tooling/humans expect a working
// firebase-messaging-sw.js to exist at this conventional path — if Verbum's
// service workers are ever split back into two, this file already does the
// right thing on its own.

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Public web config — safe to ship client-side (this is not a secret; it
// only identifies the Firebase project, same object used in app.js).
firebase.initializeApp({
  apiKey: "AIzaSyAVVsLkuKvU7La0exZ8mJ6eqXzLZYzSUXQ",
  authDomain: "jybible-2d580.firebaseapp.com",
  projectId: "jybible-2d580",
  storageBucket: "jybible-2d580.firebasestorage.app",
  messagingSenderId: "393921773529",
  appId: "1:393921773529:web:f1a84acca2ef22c717a3c8",
});

const messaging = firebase.messaging();

// Fires when a push arrives while no page is in the foreground (backgrounded
// tab, or the PWA closed entirely) — this is what lets notifications show up
// even when Verbum isn't open. Verbum's Cloud Functions always send
// data-only messages (no top-level `notification` field), so this is the
// only thing that ever renders them — kept in sync with service-worker.js.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || "Verbum", {
    body: data.body || "",
    icon: "./icon-192.png",
    badge: "./icon-32.png",
    data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = "./";
  if (data.type === "moment_verse" && data.book && data.chapter) {
    const params = new URLSearchParams({
      moment_book: data.book,
      moment_chapter: data.chapter,
      moment_verse: data.verse || "",
    });
    url = `./?${params.toString()}`;
  }
  event.waitUntil(clients.openWindow(url));
});
