// Cache version just for v2
const CACHE = 'sdc-v10';
// Static assets (relative to /v2/)
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'non_attendance.json',
  'late_start_wednesdays.json',
  'late_arrival_1010.json'
];

// Install: pre-cache
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

// Activate: clean old caches (v1 cache won't be touched)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

// Fetch: network-first for JSON, cache-first for everything else
self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isJSON = url.endsWith('.json');
  if (isJSON) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
