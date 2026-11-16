/* Rok Satranç — yerel ağ / Radmin VPN sunucusu. Ek paket gerektirmez: node server.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const Chess = require('./public/chess.js');

const PORT = Number(process.env.PORT) || 3000;
const PUB = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

const rooms = new Map();

function addresses() {
  const out = [];
  for (const [ifname, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal) continue;
      out.push({ name: ifname, address: a.address, radmin: a.address.startsWith('26.') || /radmin/i.test(ifname) });
    }
  }
  out.sort((a, b) => b.radmin - a.radmin);
  return out;
}

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s;
  do { s = ''; for (let i = 0; i < 5; i++) s += A[crypto.randomInt(A.length)]; } while (rooms.has(s));
  return s;
}
const newToken = () => crypto.randomBytes(16).toString('hex');
const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Oyuncu';

function newGame(room) {
  room.chess = new Chess();
  room.moves = [];
  room.result = null;
  room.drawOffer = null;
  room.takeback = null;
  room.rematch = { w: false, b: false };
  room.clock = { w: room.tc.base, b: room.tc.base, lastTs: Date.now(), running: false };
}

function colorOf(room, token) {
  if (room.players.w && room.players.w.token === token) return 'w';
  if (room.players.b && room.players.b.token === token) return 'b';
  if (room.spectators.has(token)) return 's';
  return null;
}

function settle(room) {
  const c = room.clock, now = Date.now();
  if (c.running && !room.result) c[room.chess.turn] -= now - c.lastTs;
  c.lastTs = now;
}

function end(room, winner, reason) {
  settle(room);
  room.result = { winner, reason };
  room.clock.running = false;
  room.drawOffer = null;
  room.takeback = null;
}

function stateFor(room, you) {
  const c = room.clock, now = Date.now();
  let w = c.w, b = c.b;
  if (c.running && !room.result) { if (room.chess.turn === 'w') w -= now - c.lastTs; else b -= now - c.lastTs; }
  const pl = p => p && { name: p.name, online: p.conns > 0 };
  return {
    code: room.code, gameNo: room.gameNo, you,
    tc: room.tc,
    players: { w: pl(room.players.w), b: pl(room.players.b) },
    spectators: [...room.clients].filter(x => x.color === 's').length,
    moves: room.moves, turn: room.chess.turn,
    clock: { w: Math.max(0, w), b: Math.max(0, b), running: c.running && !room.result },
    result: room.result, drawOffer: room.drawOffer, takeback: room.takeback, rematch: room.rematch,
    chat: room.chat.slice(-80)
  };
}

function broadcast(room) {
  for (const cl of room.clients) {
    try { cl.res.write(`data: ${JSON.stringify(stateFor(room, colorOf(room, cl.token) || 's'))}\n\n`); } catch (e) { /* bağlantı kapanmış */ }
  }
}

function sysChat(room, text) { room.chat.push({ name: '', color: 'sys', text, ts: Date.now() }); }

function act(room, color, a) {
  const opp = color === 'w' ? 'b' : 'w';
  const isPlayer = color === 'w' || color === 'b';
  room.lastActive = Date.now();
  if (a.type === 'chat') {
    const text = String(a.text || '').trim().slice(0, 300);
    if (!text) return 'Boş mesaj';
    const p = isPlayer ? room.players[color] : null;
    room.chat.push({ name: p ? p.name : cleanName(a.name) + ' (izleyici)', color, text, ts: Date.now() });
    return null;
  }
  if (!isPlayer) return 'İzleyiciler bu işlemi yapamaz';
  switch (a.type) {
    case 'move': {
      if (room.result) return 'Oyun bitti';
      if (!room.players.w || !room.players.b) return 'Rakip bekleniyor';
      if (room.chess.turn !== color) return 'Sıra sende değil';
      if (checkFlag(room)) return 'Süren bitti';
      const was = room.clock.running;
      settle(room);
      const mv = room.chess.move({ from: Number(a.from), to: Number(a.to), promotion: a.promotion || 'q' });
      if (!mv) return 'Geçersiz hamle';
      if (was && room.tc.base > 0) room.clock[color] += room.tc.inc;
      room.moves.push({ from: mv.from, to: mv.to, promotion: mv.promotion || '', san: mv.san });
      room.clock.lastTs = Date.now();
      room.clock.running = room.tc.base > 0 && room.moves.length >= 2;
      if (room.drawOffer === opp) room.drawOffer = null;
      room.takeback = null;
      const st = room.chess.status();
      if (st.over) end(room, st.winner, st.reason);
      return null;
    }
    case 'resign':
      if (room.result) return 'Oyun zaten bitti';
      if (room.moves.length < 2) { end(room, null, 'abort'); return null; }
      end(room, opp, 'resign'); return null;
    case 'abort':
      if (room.result) return 'Oyun zaten bitti';
      if (room.moves.length >= 2) return 'İki hamleden sonra oyun iptal edilemez';
      end(room, null, 'abort'); return null;
    case 'draw-offer':
      if (room.result) return 'Oyun bitti';
      if (room.drawOffer === opp) { end(room, null, 'agreement'); return null; }
      room.drawOffer = color; return null;
    case 'draw-accept':
      if (room.drawOffer !== opp) return 'Beraberlik teklifi yok';
      end(room, null, 'agreement'); return null;
    case 'draw-decline':
      if (room.drawOffer === opp) room.drawOffer = null; return null;
    case 'takeback-req':
      if (room.result) return 'Oyun bitti';
      if (!room.moves.length) return 'Geri alınacak hamle yok';
      room.takeback = color; return null;
    case 'takeback-accept': {
      if (room.takeback !== opp || room.result) return 'Geri alma isteği yok';
      settle(room);
      let n = room.chess.turn === opp ? 2 : 1; // isteyen sıradaysa onun son hamlesi iki yarım hamle önce
      n = Math.min(n, room.moves.length);
      for (let i = 0; i < n; i++) { room.chess.undo(); room.moves.pop(); }
      room.takeback = null; room.drawOffer = null;
      room.clock.running = room.tc.base > 0 && room.moves.length >= 2;
      room.clock.lastTs = Date.now();
      return null;
    }
    case 'takeback-decline':
      if (room.takeback === opp) room.takeback = null; return null;
    case 'rematch':
      if (!room.result) return 'Oyun bitmeden rövanş istenemez';
      room.rematch[color] = true;
      if (room.rematch.w && room.rematch.b) {
        const t = room.players.w; room.players.w = room.players.b; room.players.b = t;
        room.gameNo++;
        newGame(room);
        sysChat(room, 'Rövanş başladı. Renkler değişti.');
      }
      return null;
    default:
      return 'Bilinmeyen işlem';
  }
}

function checkFlag(room) {
  const c = room.clock;
  if (!c.running || room.result) return false;
  const t = room.chess.turn;
  if (c[t] - (Date.now() - c.lastTs) > 0) return false;
  settle(room);
  c[t] = 0;
  const opp = t === 'w' ? 'b' : 'w';
  if (room.chess.canMate(opp)) end(room, opp, 'timeout'); else end(room, null, 'timeout-draw');
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (checkFlag(room)) broadcast(room);
    if (!room.clients.size && now - room.lastActive > 6 * 3600e3) rooms.delete(room.code);
  }
}, 100);
setInterval(() => {
  for (const room of rooms.values()) for (const cl of room.clients) { try { cl.res.write(': ping\n\n'); } catch (e) { /* yoksay */ } }
}, 15000);

function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', ch => { d += ch; if (d.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function tcLabel(tc) { return tc.base ? `${Math.round(tc.base / 60000 * 100) / 100}+${tc.inc / 1000}` : 'Süresiz'; }

async function api(req, res, url) {
  const p = url.pathname;
  if (p === '/api/info') return send(res, 200, { port: PORT, ips: addresses() });
  if (p === '/api/rooms') {
    const list = [...rooms.values()].filter(r => r.clients.size || Date.now() - r.lastActive < 600e3).map(r => ({
      code: r.code, host: r.hostName, tc: tcLabel(r.tc),
      white: r.players.w ? r.players.w.name : null, black: r.players.b ? r.players.b.name : null,
      open: !r.players.w || !r.players.b, playing: !!(r.players.w && r.players.b) && !r.result, moves: r.moves.length
    })).sort((a, b) => b.open - a.open);
    return send(res, 200, { rooms: list });
  }
  if (p === '/api/create' && req.method === 'POST') {
    const b = await readBody(req);
    const base = Math.max(0, Math.min(180 * 60, Number(b.base) || 0)) * 1000;
    const inc = Math.max(0, Math.min(180, Number(b.inc) || 0)) * 1000;
    const code = newCode();
    const color = b.color === 'w' || b.color === 'b' ? b.color : (Math.random() < 0.5 ? 'w' : 'b');
    const token = newToken();
    const room = {
      code, hostName: cleanName(b.name), tc: { base, inc }, players: { w: null, b: null }, spectators: new Set(),
      clients: new Set(), chat: [], gameNo: 1, lastActive: Date.now()
    };
    room.players[color] = { token, name: cleanName(b.name), conns: 0 };
    newGame(room);
    rooms.set(code, room);
    return send(res, 200, { code, token, color });
  }
  if (p === '/api/join' && req.method === 'POST') {
    const b = await readBody(req);
    const room = rooms.get(String(b.code || '').toUpperCase().trim());
    if (!room) return send(res, 404, { error: 'Bu kodla bir oda bulunamadı' });
    const known = b.token && colorOf(room, b.token);
    if (known) return send(res, 200, { code: room.code, token: b.token, color: known });
    const token = newToken();
    let color = 's';
    if (!b.watch) {
      if (!room.players.w) color = 'w'; else if (!room.players.b) color = 'b';
    }
    if (color === 's') room.spectators.add(token);
    else { room.players[color] = { token, name: cleanName(b.name), conns: 0 }; sysChat(room, `${cleanName(b.name)} odaya katıldı.`); }
    room.lastActive = Date.now();
    broadcast(room);
    return send(res, 200, { code: room.code, token, color });
  }
  if (p === '/api/state') {
    const room = rooms.get(url.searchParams.get('code'));
    if (!room) return send(res, 404, { error: 'Oda bulunamadı' });
    return send(res, 200, stateFor(room, colorOf(room, url.searchParams.get('token')) || 's'));
  }
  if (p === '/api/events') {
    const room = rooms.get(url.searchParams.get('code'));
    const token = url.searchParams.get('token');
    if (!room || !colorOf(room, token)) return send(res, 404, { error: 'Oda bulunamadı' });
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 1500\n\n');
    const cl = { res, token, color: colorOf(room, token) };
    room.clients.add(cl);
    const pl = cl.color === 'w' || cl.color === 'b' ? room.players[cl.color] : null;
    if (pl) pl.conns++;
    broadcast(room);
    req.on('close', () => {
      room.clients.delete(cl);
      // Rövanşta renkler değişebilir; oyuncuyu token ile bul.
      for (const c of ['w', 'b']) if (room.players[c] && room.players[c].token === token) room.players[c].conns = Math.max(0, room.players[c].conns - 1);
      room.lastActive = Date.now();
      broadcast(room);
    });
    return;
  }
  if (p === '/api/action' && req.method === 'POST') {
    const b = await readBody(req);
    const room = rooms.get(b.code);
    if (!room) return send(res, 404, { error: 'Oda bulunamadı' });
    const color = colorOf(room, b.token);
    if (!color) return send(res, 403, { error: 'Bu odada değilsin' });
    const err = act(room, color, b);
    broadcast(room);
    if (err) return send(res, 400, { error: err });
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'Bulunamadı' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    api(req, res, url).catch(e => { console.error(e); try { send(res, 500, { error: 'Sunucu hatası' }); } catch (_) { /* yoksay */ } });
    return;
  }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUB, rel));
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Bulunamadı'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log(`\n  ${PORT} portu kullanımda. Rok zaten açık olabilir: http://localhost:${PORT}\n`);
    if (process.argv.includes('--ac')) openBrowser(`http://localhost:${PORT}`);
  } else console.error(e);
});

function openBrowser(u) {
  const cmd = process.platform === 'win32' ? `start "" "${u}"` : process.platform === 'darwin' ? `open "${u}"` : `xdg-open "${u}"`;
  exec(cmd, () => {});
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = addresses();
  const radmin = ips.filter(i => i.radmin);
  console.log('\n  ♞  Rok Satranç çalışıyor\n');
  console.log(`  Bu bilgisayarda:      http://localhost:${PORT}`);
  if (radmin.length) for (const i of radmin) console.log(`  Arkadaşına ver:       http://${i.address}:${PORT}   (Radmin VPN)`);
  else console.log('  Radmin VPN adresi bulunamadı. Radmin VPN açık ve bir ağa bağlı mı?');
  for (const i of ips.filter(x => !x.radmin)) console.log(`  Yerel ağ (${i.name}):  http://${i.address}:${PORT}`);
  console.log('\n  Kapatmak için bu pencereyi kapat.\n');
  if (process.argv.includes('--ac')) openBrowser(`http://localhost:${PORT}`);
});
