const CACHE_NAME = 'pitchmaster-v11';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './teacher.js',
  './synth.js',
  './staff.js',
  './pitch.js',
  './manifest.json',
  './icons/logo.svg'
];


// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching App Shell Assets');
      return cache.addAll(ASSETS);
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
