/* ==========================================================================
   SERVICE WORKER  (written to /sw.js by the generator)

   Restored. The retired site had one and the platform rebuild dropped it, so
   the site has had no offline behaviour since.

   Deliberately conservative, because the failure mode of a service worker is
   serving somebody yesterday's website and this project has been bitten by
   stale assets before:

     navigations (HTML)  network-first. An online visitor ALWAYS gets fresh
                         HTML, which is what references the current ?v= asset
                         URLs. The cache is only ever reached for offline.
     static assets       stale-while-revalidate. CSS and JS carry a content
                         hash, so a new deploy is a new URL and cannot be
                         served from an old entry.
     everything else     straight to the network, untouched.

   sa-02abb1ef is stamped by the build from the same content hash the pages
   carry. A deploy therefore changes the cache name, and `activate` deletes
   every cache that is not the current one, so a release cannot leave a
   visitor on the previous build. The old worker hard-coded 'sa-static-v2'
   and relied on somebody remembering to bump it.

   Two things are never cached: /control.html and /api/. The panel is behind
   auth and its answers are per-user, and an API response has no business in
   a static cache.
   ========================================================================== */
const CACHE = 'sa-02abb1ef';
const OFFLINE = '/404.html';

self.addEventListener('install', (event) => {
  /* Warm the offline page so there is something to show when the network is
     gone on a URL never visited before. */
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE)).catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/control.html'
    || url.pathname === '/control.js') return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match(OFFLINE)) || Response.error();
      }
    })());
    return;
  }

  if (/\.(css|js|woff2?|png|jpe?g|webp|svg|ico|gif|avif)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});
