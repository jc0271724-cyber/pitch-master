const CACHE_NAME = 'pitchmaster-v19';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './teacher.js',
  './synth.js',
  './staff.js',
  './pitch.js',
  './assets/index-ppPY9nQA.js',
  './assets/index-CYxK4FWA.css',
  './manifest.json',
  './pitchmaster-standalone-offline.html'
];


// Install Event (Graceful caching)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[Service Worker] Caching App Shell Assets');
      for (const asset of ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('[Service Worker] Could not cache asset:', asset, e);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First, Fallback to Cache)
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(networkResponse => {
      // If response is valid and from a standard schema, cache it
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      // Offline fallback: try to serve from cache
      return caches.match(event.request);
    })
  );
});
