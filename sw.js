const CACHE_NAME = 'cancionero-cache-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/peerjs.min.js',
  './director-fix.js'
];

const DIRECTOR_FIX_TAG = '<script src="./director-fix.js"></script>';

async function injectDirectorFix(response) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  if (html.includes('director-fix.js')) return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  const patchedHtml = html.replace(/<\/body>/i, `${DIRECTOR_FIX_TAG}\n</body>`);
  return new Response(patchedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Instalación: precargamos los recursos necesarios para que la PWA siga
// funcionando sin conexión. El index queda cacheado ya con el hotfix.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([
      './manifest.json',
      './js/peerjs.min.js',
      './director-fix.js'
    ]);

    const indexResponse = await fetch('./index.html', { cache: 'no-store' });
    const patchedIndex = await injectDirectorFix(indexResponse);
    await cache.put('./index.html', patchedIndex.clone());
    await cache.put('./', patchedIndex.clone());

    self.skipWaiting();
  })());
});

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
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const patchedResponse = await injectDirectorFix(networkResponse);
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(request, patchedResponse.clone())
              )
            );
            return patchedResponse;
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
