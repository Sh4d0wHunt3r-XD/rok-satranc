/* Rok Satranç — servis çalışanı: dosyaları önbelleğe alır, internet olmadan da açılır.
   Yeni sürüm yayınlarken VERSION'ı artır. */
const VERSION = 'rok-v1';
const FILES = [
  './', 'index.html', 'style.css', 'pages.css', 'manifest.webmanifest',
  'pieces.js', 'chess.js', 'sf.js', 'app.js', 'bots.js', 'extra.js', 'drill.js', 'miniboard.js', 'pzplus.js', 'learn.js',
  'openings.js', 'home.js', 'coach.js', 'look.js', 'chesscom.js', 'train.js', 'achievements.js', 'pwa.js', 'engine.js',
  'puzzles.json', 'stockfish/stockfish-19-lite-single.js', 'stockfish/stockfish-19-lite-single.wasm',
  'fonts/archivo-latin-ext.woff2', 'fonts/archivo-latin.woff2', 'fonts/jbmono-latin-ext.woff2', 'fonts/jbmono-latin.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Önce önbellek (hızlı açılış), arkada ağdan güncelle. Başka sitelere (Chess.com) giden istekler doğrudan ağa gider.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  }));
});
