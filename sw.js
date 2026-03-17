const CACHE_NAME = 'cuaderno-docente-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/sw.js',
  '/css/styles.css',
  // Google Fonts - CSS
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap'
];

// Instalación: cachear recursos esenciales
self.addEventListener('install', event => {
  console.log('[SW Cuaderno] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW Cuaderno] Cacheando archivos esenciales');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW Cuaderno] Todos los archivos cacheados');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW Cuaderno] Error al cachear:', err);
      })
  );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', event => {
  console.log('[SW Cuaderno] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW Cuaderno] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW Cuaderno] Cache limpio, tomando control');
      return self.clients.claim();
    })
  );
});

// Fetch: estrategia cache-first con network fallback y caché dinámico
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Estrategia especial para Google Fonts
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request).then(networkResponse => {
          // Cachear las fuentes dinámicamente
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Si falla, la app usará fuentes del sistema
          console.log('[SW Cuaderno] Fuentes no disponibles, usando fallback del sistema');
          return new Response('', { status: 200 });
        });
      })
    );
    return;
  }
  
  // Estrategia cache-first para todos los demás recursos
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Cache hit - retornar respuesta cacheada
        if (response) {
          console.log('[SW Cuaderno] Sirviendo desde cache:', request.url);
          return response;
        }
        
        // No está en cache - ir a la red
        console.log('[SW Cuaderno] Fetching desde red:', request.url);
        return fetch(request).then(networkResponse => {
          
          // Verificar si es una respuesta válida
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          // Clonar la respuesta para guardar en cache
          const responseToCache = networkResponse.clone();
          
          // Guardar en cache dinámicamente
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('[SW Cuaderno] Cacheando recurso nuevo:', request.url);
              cache.put(request, responseToCache);
            });
          
          return networkResponse;
        }).catch(error => {
          console.error('[SW Cuaderno] Fetch falló:', error);
          
          // Offline fallback para navegación
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          // Para otros recursos, retornar respuesta vacía
          return new Response('Offline - Recurso no disponible en cache', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Mensaje desde el cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW Cuaderno] Mensaje recibido: SKIP_WAITING');
    self.skipWaiting();
  }
});

console.log('[SW Cuaderno] Service Worker cargado');
