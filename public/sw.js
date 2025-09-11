const CACHE = 'villaverde-cache-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Navigazione (pagine)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (err) {
        const cache = await caches.open(CACHE);
        return await cache.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // Altri file: cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (req.method === 'GET' && res.status === 200) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return cached || new Response('Offline', { status: 503 });
    }
  })());
});
