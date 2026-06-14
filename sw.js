/* Sue's Angels FC — service worker (conservative, anti-stale).
   Strategy:
     - Navigations (HTML): network-first. Online visitors ALWAYS get fresh HTML
       (which references the current ?v= assets); the cached copy is used only
       when offline. This avoids the stale-page class of bug this project has hit.
     - Same-origin static assets (css/js/fonts/images): stale-while-revalidate.
       App CSS/JS are versioned (?v=N), so a new deploy = new URL = fresh fetch.
     - Cross-origin (React/Supabase CDNs) and non-GET: bypassed entirely (network).
   The SW is registered with {updateViaCache:'none'} and served no-cache, so it
   updates reliably even though .js files are otherwise cached immutably. */
const STATIC = 'sa-static-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== STATIC).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // CDN / Supabase -> straight to network

  // HTML navigations: network-first, cache fallback for offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match(req)) || (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate.
  if (/\.(css|js|woff2?|png|jpe?g|webp|svg|ico|gif)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })());
  }
});
