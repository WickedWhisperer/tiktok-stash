const CACHE_NAME = 'tiktok-stash-ui-v2';
const STATIC_ASSETS = [
  './search.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key === CACHE_NAME ? null : caches.delete(key)))
    )
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('offline');
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isVideo = req.destination === 'video' || url.pathname.match(/\.(mp4|webm|m4v)$/i);
  const isData = url.pathname.endsWith('/search_index.json');
  const isShell = url.pathname.endsWith('/search.html') || url.pathname.endsWith('/sw.js');

  if (isVideo) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isData) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isShell) {
    event.respondWith(cacheFirst(req));
    return;
  }
});
