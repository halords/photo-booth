const CACHE = 'pocket-studio-v5';
const SHELL = ['/', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/photos/portrait-1.jpg', '/photos/portrait-2.jpg', '/photos/portrait-3.jpg', '/photos/friends.jpg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(SHELL.map(url => cache.add(url)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE && (key.startsWith('booth-') || key.startsWith('pocket-studio-'))).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.headers.has('rsc') || url.searchParams.has('_rsc')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { const response = await fetch(request); if (response.ok) { const cache = await caches.open(CACHE); await cache.put('/', response.clone()); } return response; }
      catch { return (await caches.match('/')) || new Response('Open Pocket once online to use your studio offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
    })());
    return;
  }
  if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/photos/') && !['/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.json'].includes(url.pathname)) return;
  event.respondWith((async () => {
    const hit = await caches.match(request); if (hit) return hit;
    const response = await fetch(request); if (response.ok) { const cache = await caches.open(CACHE); await cache.put(request, response.clone()); } return response;
  })());
});
