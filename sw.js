const CACHE_NAME = 'cuaderno-docente-v7';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './icon-192x192.png',
  './icon-512x512.png',
  './icon-maskable-512x512.png',
  'https://fonts.googleapis.com/css2?family=Brush+Script+MT&family=Roboto:wght@400;700&display=swap'
];

// INSTALACIÓN
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.log('Error cacheando archivos:', err))
  );
});

// ACTIVACIÓN
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

// FETCH (estrategia: cache first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match('./index.html'))
  );
});
