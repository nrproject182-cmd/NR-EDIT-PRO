/* NR Edit Pro — Service Worker v1.1.2 */
var VERSION = '1.1.2';
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
self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.url.indexOf(self.location.origin) !== 0) return;
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