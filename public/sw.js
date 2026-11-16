/* Rok Satranç — servis çalışanı: internetsiz de açılır, internet varken her zaman son sürümü getirir.
   Yeni sürüm yayınlarken VERSION'ı (ve pwa.js'teki APP_VERSION'ı) artır. */
const VERSION = 'rok-v5';
const FILES = [
  './', 'index.html', 'style.css', 'pages.css', 'manifest.webmanifest',
  'pieces.js', 'chess.js', 'sf.js', 'app.js', 'bots.js', 'extra.js', 'drill.js', 'miniboard.js', 'pzplus.js', 'learn.js',
  'openings.js', 'home.js', 'coach.js', 'look.js', 'chesscom.js', 'train.js', 'achievements.js', 'pwa.js', 'engine.js',
  'puzzles.json', 'stockfish/stockfish-19-lite-single.js', 'stockfish/stockfish-19-lite-single.wasm',
  'fonts/archivo-latin-ext.woff2', 'fonts/archivo-latin.woff2', 'fonts/jbmono-latin-ext.woff2', 'fonts/jbmono-latin.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-180.png'
];
// Sık değişen kod dosyaları: önce ağdan (tarayıcı önbelleğini atlayarak), internet yoksa kayıtlı kopya
const isCode = url => url.pathname.endsWith('/') || /\.(html|js|css|webmanifest)$/.test(url.pathname);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // Stockfish, bulmacalar, yazı tipleri, simgeler: büyük ve nadiren değişir, önce kayıtlı kopya
  if (!isCode(url) && req.mode !== 'navigate') {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req).catch(() => null);
      if (res && res.ok) cache.put(req, res.clone());
      return res || Response.error();
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }
  }));
});
