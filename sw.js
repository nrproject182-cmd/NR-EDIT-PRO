/* NR Edit Pro — Service Worker v1.0.5 */
var VERSION = '1.0.5';
var CACHE = 'nr-edit-pro-' + VERSION;
var CORE = ['./', './index.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* biar bisa dipaksa update dari halaman (tombol "Update tersedia" di burger) */
self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.url.indexOf(self.location.origin) !== 0) return;

  /* halaman: network-first, fallback cache (offline tetap kebuka) */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  /* aset lain: cache-first */
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, cp); });
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});