/* TeenWork service worker (v54). Makes the app installable and gives a simple offline page.
   Network first, always: online, people get the newest files every time, so a new version on
   teenwork.ayaqd.com shows up right away. Only when the network fails does it answer from the copy
   it kept. It never touches other sites (Supabase, Stripe, fonts…) or anything but GET requests. */
const CACHE = 'teenwork-v54';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/') : undefined)).then((hit) => hit || Response.error()))
  );
});
