// ProximityAlert Service Worker
// © Manik Roy 2026. All Rights Reserved.

const CACHE_NAME = 'proximity-alert-v1';
const STATIC_ASSETS = [
  './proximity-tracker.html',
  './manifest.json'
];

// Install — cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first strategy for static assets, network-first for others
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache-first for same-origin static assets
  if (event.request.method === 'GET' && url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('./proximity-tracker.html'));
      })
    );
  } else {
    // Network-first for external requests (GPS APIs, etc.)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

// Background sync support (for future use)
self.addEventListener('sync', event => {
  if (event.tag === 'proximity-sync') {
    console.log('[SW] Background sync triggered');
  }
});

// Push notification support (for future use)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'ProximityAlert';
  const options = {
    body: data.body || 'A device has entered your alert zone.',
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
