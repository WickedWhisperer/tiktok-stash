const CACHE_NAME = "tiktok-stash-ui-v1";
const SHELL_URLS = [
  "./search.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(async keys => {
      await Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          if (req.url.includes("/ui/") || req.url.endsWith("search.html")) {
            cache.put(req, clone);
          }
        });
        return response;
      }).catch(() => cached);
    })
  );
});
