/* abhishekindia.com — service worker (public site) */
const VERSION = 'ai-v1';
const CORE = [
  '/','/journal.html',
  '/nearpop.html','/uploadsure.html','/taxsavinglab.html','/couponboyz.html',
  '/stock-sniper-pro.html','/mcx-payoff-tools.html',
  '/crude.html','/gold.html','/silver.html','/usdinr.html',
  '/css/site.css','/manifest.json',
  '/img/maskable-512.png','/img/favicon.svg','/img/placeholder.svg'
];

// Precache core shell; tolerate any single missing file.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(CORE.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

// Drop old caches on activate.
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never touch the live journal (Google Apps Script) — always network.
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // Navigations: network-first, fall back to cache, then offline shell.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        return (await caches.match(req)) || (await caches.match('/'));
      }
    })());
    return;
  }

  // Google Fonts: stale-while-revalidate.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const fetching = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || fetching;
    })());
    return;
  }

  // Same-origin static assets: cache-first, then fill runtime cache.
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (err) {
        return cached || Response.error();
      }
    })());
  }
});
