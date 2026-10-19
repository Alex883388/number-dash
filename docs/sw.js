// Number Arcade offline cache (the home page and every game). Everything is served from the cache first, and refreshed in the
// background, so the game opens instantly (even with no internet) and picks up a new version
// on the next launch. The build replaces 41b1e36adf with a hash of the page.
const CACHE = 'number-dash-41b1e36adf';
const CORE = ['./', './index.html', './dash/', './dash/index.html', './ladder/', './ladder/index.html', './pair/', './pair/index.html', './pop/', './pop/index.html', './spell/', './spell/index.html', './quest/', './quest/index.html', './memory/', './memory/index.html', './robot/', './robot/index.html', './tycoon/', './tycoon/index.html', './mech/', './mech/index.html', './castle/', './castle/index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const fresh = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
