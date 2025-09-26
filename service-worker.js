/* service-worker.js — cache-first for app shell + runtime caching for CDNs */
const CACHE = 'romee-pulse-cache-v1';

// App shell to precache
const PRECACHE_URLS = [
  './',
  './index.html',
  './App.jsx',
  './styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/icon.svg',
  // External libs we rely on (runtime cached too)
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://esm.sh/react@18?dev',
  'https://esm.sh/react-dom@18/client?dev',
  'https://esm.sh/framer-motion@11?deps=react@18',
  'https://esm.sh/lucide-react@0.424.0?deps=react@18'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE_URLS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

function isCDN(url) {
  return url.startsWith('https://cdn.tailwindcss.com') ||
         url.startsWith('https://unpkg.com/@babel/standalone') ||
         url.startsWith('https://esm.sh/') ||
         url.startsWith('https://ga.jspm.io/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Cache-first for same-origin
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      } catch (err) {
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // For CDNs: stale-while-revalidate
  if (isCDN(request.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request).then((res) => {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => null);
      return cached || fetchPromise || new Response('Offline', { status: 503 });
    })());
  }
});
