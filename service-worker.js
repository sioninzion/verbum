const CACHE_VERSION = "v154";
const CACHE_NAME = `verbum-${CACHE_VERSION}`;

// --- Firebase Cloud Messaging -----------------------------------------
// Folded into this already-registered worker (rather than registering a
// separate firebase-messaging-sw.js at the same root scope) so there is
// only ever one service worker controlling the page — see
// firebase-messaging-sw.js for the full rationale. `push` is a distinct
// event type from `fetch`/`install`/`activate` below, so this can't
// interfere with the offline-caching logic in this same file. Wrapped in
// try/catch so that if messaging ever fails to init (unsupported context,
// gstatic unreachable, etc.) the cache/fetch handling below still works.
try {
  importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

  firebase.initializeApp({
    apiKey: "AIzaSyAVVsLkuKvU7La0exZ8mJ6eqXzLZYzSUXQ",
    authDomain: "jybible-2d580.firebaseapp.com",
    projectId: "jybible-2d580",
    storageBucket: "jybible-2d580.firebasestorage.app",
    messagingSenderId: "393921773529",
    appId: "1:393921773529:web:f1a84acca2ef22c717a3c8",
  });

  // Every push Verbum's own Cloud Functions send is data-only (no top-level
  // `notification` field) — on purpose, so it ALWAYS lands here instead of
  // being auto-rendered by the browser, which is what lets a notification
  // click carry the book/chapter/verse through to notificationclick below.
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || "Verbum";
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "./icon-192.png",
      badge: "./icon-32.png",
      data,
    });
  });
} catch (err) {
  // Messaging is best-effort — offline caching must not depend on it.
  console.error("[service-worker] FCM init failed", err);
}

// Routes a "순간의 말씀" notification tap straight to that verse: hands the
// target off as plain URL query params (rather than postMessage) so it
// works identically whether this opens a brand new window or has to reload
// an existing one — app.js reads them once on the next successful login.
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

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = allClients.find((client) => "focus" in client);
      if (existing) {
        await existing.focus();
        // `navigate` works for a same-origin URL and re-runs app.js's own
        // startup flow, which is what actually applies the deep link.
        if ("navigate" in existing) await existing.navigate(url);
        return;
      }
      await clients.openWindow(url);
    })()
  );
});

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./data/bible-data.js",
  "./data/achievements.js",
  "./data/verses.js",
  "./icon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cache-first with background revalidation: serve instantly from cache when
// available (and works offline), while quietly refreshing the cache from the
// network for next time. Only same-origin GET requests are handled here —
// Firebase/auth/font requests pass straight through to the network.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      const networkResponse = await networkFetch;
      return networkResponse || Response.error();
    })
  );
});
