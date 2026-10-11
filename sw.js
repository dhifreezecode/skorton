/* Skorton service worker: offline-first untuk app shell (satu file HTML + aset PWA). */
var CACHE = 'skorton-v202610111503';
var CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== 'skorton-fonts'; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // Font Google: stale-while-revalidate agar tetap tampil saat offline.
  if (url.hostname.indexOf('fonts.g') !== -1) {
    e.respondWith(
      caches.open('skorton-fonts').then(function (c) {
        return c.match(e.request).then(function (hit) {
          var fresh = fetch(e.request).then(function (res) {
            if (res && res.status === 200) c.put(e.request, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || fresh;
        });
      })
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match('/index.html'); });
    })
  );
});
