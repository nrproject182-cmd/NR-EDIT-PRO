/* NR Editor - Service Worker */
const VERSION = '1.6.0';
const CACHE = 'nre-' + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './version.json',
  './icon-192.png',
  './icon-512.png'
];

/* Install: precache app shell (file yang ga ada dilewat aman) */
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(CORE.map(function(u){
        return c.add(u).catch(function(){ return null; });
      }));
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

/* Activate: buang cache versi lama, klaim client, kabari app */
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){
      return self.clients.claim();
    }).then(function(){
      return self.clients.matchAll().then(function(clients){
        clients.forEach(function(cl){
          cl.postMessage({ type: 'sw-updated', version: VERSION });
        });
      });
    })
  );
});

/* Pesan dari app (misal paksa skip waiting) */
self.addEventListener('message', function(e){
  if (e.data && e.data.type === 'skip-waiting') { self.skipWaiting(); }
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Same-origin (file app): NETWORK-FIRST biar update GitHub Pages langsung kepake, fallback cache kalau offline */
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* Cross-origin (CDN CodeMirror dll): CACHE-FIRST biar hemat kuota & bisa offline */
  e.respondWith(
    caches.match(req).then(function(hit){
      if (hit) return hit;
      return fetch(req).then(function(res){
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});