const CACHE_NAME = 'cancionero-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/peerjs.min.js'
];

// Instalación: precargamos los recursos necesarios para que la PWA siga
// funcionando sin conexión.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activación: eliminamos versiones anteriores de la caché y tomamos el
// control de los clientes inmediatamente.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

// Navegación / index.html: red primero para que una nueva versión publicada
// no quede atrapada en una copia antigua del Service Worker. Si no hay red,
// usamos la copia almacenada para conservar el funcionamiento offline.
//
// Recursos estáticos: caché primero + actualización en segundo plano.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const isNavigation = request.mode === 'navigate';
  const isAppShell = new URL(request.url).pathname.endsWith('/index.html');

  if (isNavigation || isAppShell) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(request, networkResponse.clone())
              )
            );
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(request, networkResponse.clone())
              )
            );
          }
          return networkResponse;
        })
        .catch(() => undefined);

      return cachedResponse || fetchPromise;
    })
  );
});
