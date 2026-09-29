// ============================================
// SERVICE WORKER - Dompet Rantau
// ============================================
const CACHE_VERSION = 'dr-cache-v3.20.0';
const APP_SHELL = [
  './',
  './index.html',
];

// INSTALL: Cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(APP_SHELL).catch(err => {
        console.log('SW: gagal cache beberapa asset', err);
      });
    })
  );
  self.skipWaiting(); // langsung aktifin, ga usah nunggu
});

// ACTIVATE: Bersihkan cache versi lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// FETCH: Strategi hybrid
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === location.origin;
  
  // 1. version.json - network only (buat check update)
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ version: null }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // 2. Google Fonts - Cache first dengan update di background
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(cache => {
        return cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached); // kalau offline, pake cached
          return cached || fetchPromise;
        });
      })
    );
    return;
  }
  
  // 3. App shell & static assets - Cache first
  if (isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          // Cache asset baru yang belum ada di cache
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {
          // Kalau gagal network & ga ada cache, fallback ke index.html (buat navigation)
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }
  
  // 4. Request eksternal lain - network first, fallback ke cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Message handler buat update manual
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});