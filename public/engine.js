/* Rok Satranç — yapay zeka (Web Worker). Alfa-beta arama + sessizlik araması. */
'use strict';
if (typeof importScripts === 'function') importScripts('chess.js');

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PHASE = { p: 0, n: 1, b: 1, r: 2, q: 4, k: 0 };
// Tablolar beyaz açısından, indeks 0 = a8.
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20]
};
const KMG = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
const KEG = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];

const centerDist = s => { const r = s >> 3, c = s & 7; return Math.max(3 - r, r - 4) + Math.max(3 - c, c - 4); };
const kingDist = (a, b) => Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));

function evaluate(ch) {
  const b = ch.b;
  let s = 0, phase = 0, wb = 0, bb = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p) continue;
    const w = p < 'a', t = w ? p.toLowerCase() : p;
    if (t === 'k') continue;
    const v = VAL[t] + PST[t][w ? i : i ^ 56];
    if (w) s += v; else s -= v;
    phase += PHASE[t];
    if (t === 'b') { if (w) wb++; else bb++; }
  }
  if (wb >= 2) s += 30;
  if (bb >= 2) s -= 30;
  const wk = ch.kings.w, bk = ch.kings.b;
  const mg = Math.min(phase, 24) / 24;
  s += (KMG[wk] - KMG[bk ^ 56]) * mg + (KEG[wk] - KEG[bk ^ 56]) * (1 - mg);
  // Oyun sonunda kazanan taraf rakip şahı kenara sıkıştırsın.
  if (mg < 0.5) {
    if (s > 200) s += centerDist(bk) * 10 + (14 - kingDist(wk, bk)) * 4;
    else if (s < -200) s -= centerDist(wk) * 10 + (14 - kingDist(wk, bk)) * 4;
  }
  return ch.turn === 'w' ? s : -s;
}

const MATE = 100000;
let nodes = 0, deadline = 0, stopped = false, killers = [];

function scoreMove(m, ply) {
  if (m.captured) return 10000 + VAL[m.captured.toLowerCase()] * 10 - VAL[m.piece.toLowerCase()] / 10;
  if (m.promotion) return 9000;
  const k = killers[ply];
  if (k && k.from === m.from && k.to === m.to) return 5000;
  return 0;
}
function order(ms, ply) {
  for (const m of ms) m.o = scoreMove(m, ply);
  ms.sort((a, b) => b.o - a.o);
  return ms;
}
function timeUp() {
  if ((++nodes & 1023) === 0 && Date.now() > deadline) stopped = true;
  return stopped;
}

function quiesce(ch, alpha, beta, ply) {
  if (timeUp()) return 0;
  const stand = evaluate(ch);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;
  if (ply > 30) return stand;
  const us = ch.turn, them = us === 'w' ? 'b' : 'w';
  for (const m of order(ch._pseudo(true), ply)) {
    ch._make(m);
    if (ch.attacked(ch.kings[us], them)) { ch._undo(); continue; }
    const sc = -quiesce(ch, -beta, -alpha, ply + 1);
    ch._undo();
    if (stopped) return 0;
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function search(ch, depth, alpha, beta, ply) {
  if (timeUp()) return 0;
  if (ch.half >= 100) return 0;
  const inCheck = ch.inCheck();
  if (inCheck) depth++;
  if (depth <= 0) return quiesce(ch, alpha, beta, ply);
  const us = ch.turn, them = us === 'w' ? 'b' : 'w';
  let legal = 0;
  for (const m of order(ch._pseudo(false), ply)) {
    ch._make(m);
    if (ch.attacked(ch.kings[us], them)) { ch._undo(); continue; }
    legal++;
    const sc = -search(ch, depth - 1, -beta, -alpha, ply + 1);
    ch._undo();
    if (stopped) return 0;
    if (sc >= beta) {
      if (!m.captured) killers[ply] = m;
      return beta;
    }
    if (sc > alpha) alpha = sc;
  }
  if (!legal) return inCheck ? -MATE + ply : 0;
  return alpha;
}

// Seviyeler: random = tamamen rastgele hamle olasılığı, noise = puanlara eklenen gürültü.
const LEVELS = [
  { random: 0.55, depth: 1, noise: 220, time: 300 },
  { random: 0.12, depth: 2, noise: 110, time: 500 },
  { random: 0.03, depth: 3, noise: 35, time: 900 },
  { random: 0, depth: 5, noise: 8, time: 1500 },
  { random: 0, depth: 30, noise: 0, time: 3000 }
];

// Tarz bonusu (santipiyon): bot karakterleri için. Seçimi değiştirir ama gürültü ve rastgelelik devam eder.
function styleBonus(ch, m, style) {
  if (!style) return 0;
  const us = ch.turn, them = us === 'w' ? 'b' : 'w', ek = ch.kings[them], mk = ch.kings[us];
  const cap = m.captured ? VAL[m.captured.toLowerCase()] : 0, mover = VAL[m.piece.toLowerCase()] || 0;
  ch._make(m);
  const check = ch.attacked(ch.kings[them], us);
  ch._undo();
  let b = 0;
  if (style === 'attack') {
    if (check) b += 45;
    if (cap) b += 25;
    b += (kingDist(m.from, ek) - kingDist(m.to, ek)) * 8;
    if (m.piece.toLowerCase() === 'q' && kingDist(m.to, ek) <= 3) b += 15;
  } else if (style === 'solid') {
    if (m.castle) b += 60;
    if (cap && cap >= mover) b += 30; // eşit ya da iyi takası sever
    if (m.piece.toLowerCase() === 'p' && kingDist(m.from, mk) <= 1) b -= 35; // şahının önündeki piyonları oynamaz
    if (check) b -= 10;
    b += (kingDist(m.to, mk) <= 2 ? 6 : 0);
  }
  return b;
}

function think(fen, level, timeMs, histKeys, analyse, cfgOver, style) {
  const ch = new Chess(fen);
  const legal = ch._legal();
  if (!legal.length) return null;
  const cfg = cfgOver || LEVELS[Math.max(0, Math.min(4, level))];
  const pack = (m, score, depth) => ({ move: { from: m.from, to: m.to, promotion: m.promotion || '' }, score, depth });
  if (legal.length === 1 && !analyse) return pack(legal[0], 0, 0);
  if (Math.random() < cfg.random) return pack(legal[Math.floor(Math.random() * legal.length)], 0, 0);

  deadline = Date.now() + (timeMs || cfg.time);
  stopped = false; nodes = 0; killers = [];
  const seen = new Set(histKeys || []);
  const exact = cfg.noise > 0 || !!style;
  const bonus = new Map(style ? legal.map(m => [m, styleBonus(ch, m, style)]) : []);
  const root = legal.map(m => ({ m, s: 0, o: scoreMove(m, 0) }));
  root.sort((a, b) => b.o - a.o);
  let done = 0;
  for (let d = 1; d <= cfg.depth; d++) {
    let alpha = -MATE - 1;
    const res = [];
    for (const rm of root) {
      ch._make(rm.m);
      let sc;
      if (seen.has(ch.key())) sc = 0; // tekrar = beraberlik
      else sc = -search(ch, d - 1, -MATE - 1, exact ? MATE + 1 : -alpha, 1);
      ch._undo();
      if (stopped) break;
      res.push(sc);
      if (sc > alpha) alpha = sc;
    }
    if (stopped && d > 1) break;
    root.forEach((rm, i) => { if (i < res.length) rm.s = res[i]; });
    done = d;
    root.sort((a, b) => b.s - a.s);
    if (Math.abs(root[0].s) > MATE - 200) break;
    if (stopped) break;
  }
  let best = root[0];
  if (exact) {
    let bv = -Infinity;
    for (const rm of root) {
      const v = rm.s + (bonus.get(rm.m) || 0) + (Math.random() * 2 - 1) * cfg.noise;
      if (v > bv) { bv = v; best = rm; }
    }
  }
  return pack(best.m, best.s, done);
}

if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  self.onmessage = e => {
    const d = e.data;
    const r = think(d.fen, d.level, d.timeMs, d.keys, d.analyse, d.cfg, d.style);
    self.postMessage(Object.assign({ id: d.id }, r || { move: null }));
  };
} else if (typeof module !== 'undefined') {
  module.exports = { think, evaluate };
}
