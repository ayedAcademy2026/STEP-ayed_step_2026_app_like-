/* PWA Service Worker — أكاديمية عايد
   Cache-first for static assets and pages
*/
const CACHE_VERSION = '20260128b';
const CACHE_NAME = `ayed-step-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './course-content.html',
  './step-guide.html',
  './level-test.html',
  './results.html',
  './register.html',
  './faq.html',
  './testimonials.html',
  './support.html',
  './terms.html',
  './privacy.html',
  './refund.html',
  './404.html',
  './manifest.json',
  './assets/styles.css?v=20260128b',
  './assets/site-data.js?v=20260128b',
  './assets/app.js?v=20260128b',
  './assets/test.js?v=20260128b',
  './assets/results.js?v=20260128b',
  './assets/register.js?v=20260128b',
  './assets/support.js?v=20260128b',
  './assets/questions.json',
  './assets/icon.svg',
  './assets/icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
