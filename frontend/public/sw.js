/* DayFlow PWA service worker — caches check-in/out for offline queue */
const CACHE = 'dayflow-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // For attendance check-in/out POSTs: network-first, if offline return queued response
  // Actual queue is in localStorage (main thread); SW just prevents hard failure
  // and caches GETs for offline shell.
  if (request.method === 'POST' && (url.pathname.endsWith('/attendance/checkin') || url.pathname.endsWith('/attendance/checkout'))) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ queued: true, message: 'Queued offline' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    return;
  }

  // For GET navigations: network-first fallback to cache
  if (request.method === 'GET' && request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html'))),
    );
    return;
  }
});
