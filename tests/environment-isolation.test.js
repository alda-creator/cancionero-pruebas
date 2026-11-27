const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

// El laboratorio no debe leer ni escribir las claves locales de producción.
for (const key of [
  'cancionero_lab_songs',
  'cancionero_lab_song_set',
  'cancionero_lab_notation',
  'cancionero_lab_firestore_pending_sync_v1',
  'cancionero_lab_song_set_transpose_v1',
  'cancionero_lab_song_set_sequences_v1'
]) {
  assert(index.includes(key), `Falta la clave aislada de laboratorio: ${key}`);
}
for (const sharedKey of ['church_songs', 'church_song_set', 'church_notation']) {
  assert(!index.includes(sharedKey), `El laboratorio todavía usa la clave compartida: ${sharedKey}`);
}

// El Service Worker solo limpia sus propias cachés y la caché anterior conocida del laboratorio.
assert(serviceWorker.includes("const CACHE_NAME = 'cancionero-lab-cache-v66'"));
assert(serviceWorker.includes("const LEGACY_CACHE_NAMES = ['cancionero-cache-v65']"));
assert(serviceWorker.includes("cacheName.startsWith('cancionero-lab-cache-')"));
assert(serviceWorker.includes('LEGACY_CACHE_NAMES.includes(cacheName)'));
assert(!serviceWorker.includes('.filter((cacheName) => cacheName !== CACHE_NAME)\n        .map((cacheName) => caches.delete(cacheName))'));

console.log('Laboratory storage and cache isolation checks passed.');
