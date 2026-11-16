/* Rok Satranç — arayüz */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('rok:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('rok:' + k, JSON.stringify(v)); } catch (e) { /* yoksay */ } }
};
const now = () => performance.now();

/* ================= Ayarlar ================= */
const THEMES = {
  ceviz: ['#ead7b7', '#b08158', 'Ceviz'], deniz: ['#dfe6ec', '#7b95ab', 'Deniz'], zeytin: ['#e8ead2', '#83935c', 'Zeytin'],
  mermer: ['#e2e0db', '#99958d', 'Mermer'], lavanta: ['#e0d9ea', '#8a7aa8', 'Lavanta'], kiremit: ['#efdccb', '#bc6f52', 'Kiremit']
};
const settings = Object.assign({ sound: true, showLegal: true, coords: true, autoQueen: false, premove: true, hotseatFlip: false, theme: 'ceviz', tabletop: matchMedia('(pointer: coarse)').matches }, store.get('settings', {}));
function applyTheme() {
  const t = THEMES[settings.theme] || THEMES.ceviz;
  document.documentElement.style.setProperty('--light', t[0]);
  document.documentElement.style.setProperty('--dark', t[1]);
}
applyTheme();

/* ================= Taşlar ve ikonlar ================= */
function pieceSVG(p) { return PIECE_SET[(p < 'a' ? 'w' : 'b') + p.toUpperCase()]; }
const icon = name => `<svg class="ic"><use href="#i-${name}"/></svg>`;
document.querySelectorAll('[data-piece]').forEach(el => { el.innerHTML = PIECE_SET[el.dataset.piece]; });

/* ================= Sesler (WebAudio ile üretilir: ahşap taş ve yumuşak marimba) ================= */
const Sound = {
  ctx: null, noise: null, out: null,
  init() {
    if (!this.ctx) {
      try {
        const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const len = Math.floor(c.sampleRate * 0.05), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        this.noise = buf;
        // Ortak çıkış: tizleri yumuşat, ani tepe noktalarını bastır
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.5;
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.12;
        const master = c.createGain(); master.gain.value = 1.1;
        lp.connect(comp).connect(master).connect(c.destination);
        this.out = lp;
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  },
  // Ahşap taşın tahtaya konması: kısa, alçak bir "tok" ve hafif bir dokunma sesi
  wood(freq, gain, delay = 0, decay = 0.085) {
    const c = this.ctx, t = c.currentTime + delay + 0.005;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.5, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.012);
    const g = c.createGain(); this.env(g, t, gain, 0.002, decay);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + decay + 0.05);
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.76;
    const g2 = c.createGain(); this.env(g2, t, gain * 0.22, 0.001, decay * 0.45);
    o2.connect(g2).connect(this.out); o2.start(t); o2.stop(t + decay);
    const n = c.createBufferSource(); n.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; f.Q.value = 0.7;
    const g3 = c.createGain(); g3.gain.value = gain * 0.35;
    n.connect(f).connect(g3).connect(this.out); n.start(t);
  },
  // Yumuşak marimba notası
  mallet(freq, gain, delay = 0, decay = 0.55) {
    const c = this.ctx, t = c.currentTime + delay + 0.005;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = c.createGain(); this.env(g, t, gain, 0.006, decay);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + decay + 0.05);
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 4;
    const g2 = c.createGain(); this.env(g2, t, gain * 0.18, 0.003, 0.07);
    o2.connect(g2).connect(this.out); o2.start(t); o2.stop(t + 0.12);
  },
  play(kind) {
    if (!settings.sound) return;
    this.init();
    if (!this.ctx) return;
    switch (kind) {
      case 'move': this.wood(430, 0.55); break;
      case 'capture': this.wood(330, 0.7, 0, 0.11); this.wood(520, 0.32, 0.022, 0.06); break;
      case 'castle': this.wood(430, 0.5); this.wood(400, 0.45, 0.11); break;
      case 'check': this.wood(430, 0.5); this.mallet(587, 0.2, 0.03, 0.45); break;
      case 'promote': this.wood(430, 0.5); [523, 659, 784].forEach((f, i) => this.mallet(f, 0.16, 0.05 + i * 0.08, 0.4)); break;
      case 'start': this.mallet(392, 0.18); this.mallet(523, 0.18, 0.12); break;
      case 'end': this.mallet(523, 0.18); this.mallet(440, 0.18, 0.14); this.mallet(349, 0.2, 0.28, 0.8); break;
      case 'low': this.mallet(880, 0.09, 0, 0.18); break;
      case 'illegal': this.wood(170, 0.45, 0, 0.12); break;
      case 'notify': this.mallet(659, 0.15); this.mallet(880, 0.13, 0.1); break;
    }
  }
};
window.addEventListener('pointerdown', () => Sound.init(), { once: true });

/* ================= Açılış isimleri ================= */
const OPENINGS = [
  ['e4', 'Şah Piyonu Açılışı'], ['e4 e5', 'Açık Oyun'], ['e4 e5 Nf3', 'Şah Atı Açılışı'], ['e4 e5 Nf3 Nc6', 'Şah Atı Açılışı'],
  ['e4 e5 Nf3 Nc6 Bb5', 'İspanyol Açılışı (Ruy Lopez)'], ['e4 e5 Nf3 Nc6 Bb5 a6', 'İspanyol: Morphy Savunması'],
  ['e4 e5 Nf3 Nc6 Bb5 Nf6', 'İspanyol: Berlin Savunması'], ['e4 e5 Nf3 Nc6 Bb5 a6 Bxc6', 'İspanyol: Değişim Varyantı'],
  ['e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', 'İspanyol: Kapalı Varyant'],
  ['e4 e5 Nf3 Nc6 Bc4', 'İtalyan Oyunu'], ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'İtalyan: Giuoco Piano'], ['e4 e5 Nf3 Nc6 Bc4 Bc5 c3', 'İtalyan: Ana Hat'],
  ['e4 e5 Nf3 Nc6 Bc4 Bc5 b4', 'Evans Gambiti'], ['e4 e5 Nf3 Nc6 Bc4 Nf6', 'İki At Savunması'],
  ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', 'İki At: Ng5 Saldırısı'], ['e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7', 'Kızarmış Ciğer Saldırısı'],
  ['e4 e5 Nf3 Nc6 Bc4 Nd4', 'Blackburne-Shilling Gambiti'], ['e4 e5 Nf3 Nc6 d4', 'İskoç Oyunu'], ['e4 e5 Nf3 Nc6 Nc3', 'Üç At Oyunu'],
  ['e4 e5 Nf3 Nc6 Nc3 Nf6', 'Dört At Oyunu'], ['e4 e5 Nf3 Nc6 c3', 'Ponziani Açılışı'], ['e4 e5 Nf3 Nf6', 'Petrov Savunması'],
  ['e4 e5 Nf3 d6', 'Philidor Savunması'], ['e4 e5 Nf3 f5', 'Leton Gambiti'], ['e4 e5 f4', 'Şah Gambiti'], ['e4 e5 f4 exf4', 'Şah Gambiti Kabul'],
  ['e4 e5 Nc3', 'Viyana Oyunu'], ['e4 e5 Bc4', 'Fil Açılışı'], ['e4 e5 d4 exd4', 'Merkez Oyunu'], ['e4 e5 Qh5', 'Erken Vezir Saldırısı'],
  ['e4 c5', 'Sicilya Savunması'], ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', 'Açık Sicilya'], ['e4 c5 Nf3 Nc6 d4 cxd4 Nxd4', 'Açık Sicilya'],
  ['e4 c5 Nf3 e6 d4 cxd4 Nxd4', 'Açık Sicilya'], ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Sicilya: Najdorf Varyantı'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', 'Sicilya: Ejderha Varyantı'], ['e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5', 'Sicilya: Sveşnikov Varyantı'],
  ['e4 c5 Nf3 d6 Bb5+', 'Sicilya: Moskova Varyantı'], ['e4 c5 Nc3', 'Kapalı Sicilya'], ['e4 c5 c3', 'Sicilya: Alapin Varyantı'],
  ['e4 c5 d4 cxd4 c3', 'Smith-Morra Gambiti'], ['e4 e6', 'Fransız Savunması'], ['e4 e6 d4 d5 Nc3 Bb4', 'Fransız: Winawer Varyantı'],
  ['e4 e6 d4 d5 Nd2', 'Fransız: Tarrasch Varyantı'], ['e4 e6 d4 d5 e5', 'Fransız: İlerleme Varyantı'], ['e4 e6 d4 d5 exd5', 'Fransız: Değişim Varyantı'],
  ['e4 c6', 'Caro-Kann Savunması'], ['e4 c6 d4 d5 e5', 'Caro-Kann: İlerleme Varyantı'], ['e4 c6 d4 d5 exd5', 'Caro-Kann: Değişim Varyantı'],
  ['e4 d5', 'İskandinav Savunması'], ['e4 Nf6', 'Alekhine Savunması'], ['e4 d6', 'Pirc Savunması'], ['e4 g6', 'Modern Savunma'],
  ['e4 Nc6', 'Nimzowitsch Savunması'], ['e4 b6', 'Owen Savunması'],
  ['d4', 'Vezir Piyonu Açılışı'], ['d4 d5', 'Kapalı Oyun'], ['d4 d5 c4', 'Vezir Gambiti'], ['d4 d5 c4 dxc4', 'Vezir Gambiti Kabul'],
  ['d4 d5 c4 e6', 'Vezir Gambiti Ret'], ['d4 d5 c4 c6', 'Slav Savunması'], ['d4 d5 c4 c6 Nf3 Nf6 Nc3 e6', 'Yarı Slav Savunması'],
  ['d4 d5 c4 Nc6', 'Chigorin Savunması'], ['d4 d5 c4 e5', 'Albin Karşı Gambiti'], ['d4 d5 Bf4', 'Londra Sistemi'],
  ['d4 Nf6 Bf4', 'Londra Sistemi'], ['d4 d5 Nf3 Nf6 Bf4', 'Londra Sistemi'], ['d4 d5 Nf3 Nf6 e3', 'Colle Sistemi'],
  ['d4 Nf6', 'Hint Savunmaları'], ['d4 Nf6 c4 e6 Nc3 Bb4', 'Nimzo-Hint Savunması'], ['d4 Nf6 c4 e6 Nf3 b6', 'Vezir-Hint Savunması'],
  ['d4 Nf6 c4 g6 Nc3 Bg7', 'Şah-Hint Savunması'], ['d4 Nf6 c4 g6 Nc3 d5', 'Grünfeld Savunması'], ['d4 Nf6 c4 c5', 'Benoni Savunması'],
  ['d4 Nf6 c4 c5 d5 b5', 'Benko Gambiti'], ['d4 Nf6 c4 e6 g3', 'Katalan Açılışı'], ['d4 Nf6 Bg5', 'Trompowsky Saldırısı'],
  ['d4 f5', 'Hollanda Savunması'], ['d4 e5', 'Englund Gambiti'],
  ['c4', 'İngiliz Açılışı'], ['c4 e5', 'İngiliz: Ters Sicilya'], ['Nf3', 'Réti Açılışı'], ['Nf3 d5 c4', 'Réti Açılışı'],
  ['g3', 'Macar Açılışı'], ['b3', 'Larsen Açılışı'], ['f4', 'Bird Açılışı']
];
const OPENING_MAP = new Map(OPENINGS);
function openingName(sans) {
  for (let n = Math.min(sans.length, 14); n > 0; n--) {
    const k = sans.slice(0, n).map(s => s.replace(/[+#]/g, '')).join(' ');
    if (OPENING_MAP.has(k)) return OPENING_MAP.get(k);
  }
  return '';
}

/* ================= Botlar ve süreler ================= */
const BOTS = [
  { name: 'Minik', elo: 400, piece: 'P', color: '#9fc7a8', desc: 'Satranca yeni başladı. Taşları çoğu zaman rastgele oynar.', time: 300 },
  { name: 'Tosun', elo: 800, piece: 'N', color: '#a9bfd6', desc: 'Kuralları biliyor, ama sık sık taş veriyor.', time: 500 },
  { name: 'Defne', elo: 1200, piece: 'B', color: '#d9c08a', desc: 'Kulüp oyuncusu. Basit taktikleri görür.', time: 900 },
  { name: 'Kartal', elo: 1600, piece: 'R', color: '#d49a7c', desc: 'Birkaç hamle ilerisini hesaplar. Hata yaparsan cezalandırır.', time: 1500 },
  { name: 'Hoca', elo: 2000, piece: 'Q', color: '#b9a0c9', desc: 'Süresinin sonuna kadar düşünür ve hata affetmez.', time: 3000 },
  { name: 'Usta', elo: 2300, piece: 'K', color: '#c9b48a', desc: 'Stockfish ile oynar, usta seviyesine ayarlı. Planlı ve sabırlı.', time: 1200, sf: 2300 },
  { name: 'Büyükusta', elo: 2700, piece: 'k', color: '#8d8270', desc: 'Stockfish, büyükusta seviyesinde. Küçük bir hata bile yetiyor.', time: 1600, sf: 2700 },
  { name: 'Stockfish', elo: 3200, piece: 'q', color: '#b8584a', desc: 'Tam güç. Hiçbir insanın yenemediği motor. Beraberlik bile başarı sayılır.', time: 2000, sf: true }
];
const TIME_PRESETS = [
  ['Bullet', [[1, 0], [1, 1], [2, 0], [2, 1]]], ['Blitz', [[3, 0], [3, 2], [5, 0], [5, 3]]],
  ['Rapid', [[10, 0], [10, 5], [15, 10], [20, 0]]], ['Klasik', [[30, 0], [30, 20], [45, 15], [60, 0]]]
];
const tcLabel = tc => (tc.base ? `${+(tc.base / 60).toFixed(2)}+${tc.inc}` : 'Süresiz');

function timePicker(el, key, def) {
  let val = store.get('tc:' + key, def);
  const draw = () => {
    let h = '';
    for (const [cat, list] of TIME_PRESETS) {
      h += `<div class="tp-group"><span class="tp-cat">${cat}</span>`;
      for (const [m, inc] of list) {
        const on = val.base === m * 60 && val.inc === inc;
        h += `<button type="button" class="tp-btn${on ? ' on' : ''}" data-b="${m * 60}" data-i="${inc}">${m}+${inc}</button>`;
      }
      h += '</div>';
    }
    const isPreset = !val.base || TIME_PRESETS.some(([, l]) => l.some(([m, i]) => m * 60 === val.base && i === val.inc));
    h += `<div class="tp-group"><span class="tp-cat">Diğer</span><div class="tp-other">
      <button type="button" class="tp-btn${!val.base ? ' on' : ''}" data-b="0" data-i="0">Süresiz</button>
      <span class="tp-custom"><input type="number" min="0.5" max="180" step="0.5" id="${key}-m" value="${val.base && !isPreset ? val.base / 60 : ''}" placeholder="dk" aria-label="Dakika">
      <span class="muted">+</span><input type="number" min="0" max="60" id="${key}-i" value="${val.base && !isPreset ? val.inc : ''}" placeholder="sn" aria-label="Ek saniye">
      <button type="button" class="tp-btn${val.base && !isPreset ? ' on' : ''}" data-custom="1">Özel</button></span></div></div>`;
    el.innerHTML = h;
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('.tp-btn');
    if (!b) return;
    if (b.dataset.custom) {
      const m = parseFloat($(`#${key}-m`).value), i = parseInt($(`#${key}-i`).value || '0', 10);
      if (!(m > 0)) { toast('Önce dakika yaz'); return; }
      val = { base: Math.round(Math.min(180, m) * 60), inc: Math.max(0, Math.min(60, i || 0)) };
    } else val = { base: +b.dataset.b, inc: +b.dataset.i };
    store.set('tc:' + key, val);
    draw();
  });
  draw();
  return () => val;
}

function segment(el, key, def) {
  let v = store.get('seg:' + key, def);
  const draw = () => $$('button', el).forEach(b => b.classList.toggle('on', b.dataset.v === v));
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; v = b.dataset.v; store.set('seg:' + key, v); draw(); });
  draw();
  return () => v;
}

function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), ms);
}

/* ================= Oyun durumu ================= */
const G = {
  mode: null, chess: new Chess(), fens: [], moves: [], my: null, orient: 'w', view: null,
  sel: null, targets: [], premove: null, arrows: [], marks: new Set(),
  tc: { base: 0, inc: 0 }, clock: null, over: null, bot: 0, botReq: 0, botBusy: false, lastBotScore: 0,
  opening: '', lowWarned: { w: false, b: false }, ratingDelta: null
};
const REASONS = {
  checkmate: 'Şah mat', stalemate: 'Pat', insufficient: 'Yetersiz materyal', fifty: '50 hamle kuralı',
  repetition: 'Üç kez tekrar', timeout: 'Süre bitti', 'timeout-draw': 'Süre bitti, ama rakibin mat edecek taşı yok',
  resign: 'Teslim oldu', agreement: 'Anlaşmalı beraberlik', abort: 'Oyun iptal edildi'
};
const colorName = c => (c === 'w' ? 'Beyaz' : 'Siyah');
const opp = c => (c === 'w' ? 'b' : 'w');

function myTurn() {
  if (G.mode === 'analysis') return true;
  if (G.mode === 'puzzle') return Puzzle.canMove();
  if (G.over) return false;
  if (G.mode === 'local') return true;
  return G.my && G.chess.turn === G.my;
}
function canControl(color) {
  if (G.mode === 'analysis') return color === viewChess().turn;
  if (G.mode === 'puzzle') return G.view == null && color === G.my && Puzzle.canMove();
  if (G.over || G.view != null) return false;
  if (G.mode === 'local') return color === G.chess.turn;
  if (G.mode === 'online') { const s = Online.state; if (!s || !s.players.w || !s.players.b) return false; }
  return color === G.my;
}

function clockMs(c) {
  const k = G.clock;
  if (!k) return null;
  if (k.running && !G.over && G.chess.turn === c) return Math.max(0, k[c] - (now() - k.lastTs));
  return Math.max(0, k[c]);
}
function clockAfterMove(color) {
  const k = G.clock;
  if (!k) return;
  const t = now();
  if (k.running) { k[color] -= t - k.lastTs; k[color] += G.tc.inc * 1000; }
  k.lastTs = t;
  k.running = G.moves.length >= 2;
}
function freezeClock() {
  const k = G.clock;
  if (!k) return;
  if (k.running) { k[G.chess.turn] = Math.max(0, k[G.chess.turn] - (now() - k.lastTs)); }
  k.running = false;
}

function resetBoard(fen) {
  G.chess = new Chess(fen || undefined); G.fens = [G.chess.fen()]; G.moves = []; G.view = null; G.sel = null; G.targets = [];
  G.premove = null; G.arrows = []; G.marks.clear(); G.over = null; G.opening = ''; G.lowWarned = { w: false, b: false }; G.ratingDelta = null;
  G.startFen = G.chess.fen(); G.saved = false; G.review = null; G.histId = null; G.coachWarns = 0;
  $('#promo').hidden = true;
}

function startGame(opts) {
  stopBot();
  Extra.leaveMode();
  G.mode = opts.mode; G.my = opts.my || null; G.bot = opts.bot || 0; G.tc = opts.tc;
  G.drill = opts.drill || null;
  resetBoard(opts.fen);
  G.clock = G.tc.base > 0 ? { w: G.tc.base * 1000, b: G.tc.base * 1000, lastTs: now(), running: false } : null;
  G.orient = G.my || 'w';
  hideModal('#resultModal');
  showScreen('game');
  buildBoard();
  render();
  Sound.play('start');
  if (G.mode === 'bot' && G.chess.turn !== G.my) botMove();
}

function applyMove(input, silent) {
  const res = G.chess.move(input);
  if (!res) return null;
  G.moves.push(res);
  G.fens.push(G.chess.fen());
  G.view = null; G.sel = null; G.targets = [];
  G.arrows = G.arrows.filter(a => a.kind !== 'hint');
  G.opening = openingName(G.chess.sanList) || G.opening;
  if (!silent) playMoveSound(res);
  return res;
}
function playMoveSound(m) {
  if (m.mate) return Sound.play('capture');
  if (m.check) return Sound.play('check');
  if (m.promotion) return Sound.play('promote');
  if (m.castle) return Sound.play('castle');
  Sound.play(m.captured ? 'capture' : 'move');
}

function userMove(from, to, promotion) {
  if (G.mode === 'puzzle') return Puzzle.onUserMove(from, to, promotion);
  if (G.mode === 'analysis') return Analysis.userMove(from, to, promotion);
  if (G.mode === 'online') {
    const res = applyMove({ from, to, promotion });
    if (!res) return;
    if (G.clock) { G.clock.lastTs = now(); } // sunucu güncel saati birazdan gönderir
    render();
    Online.send({ type: 'move', from, to, promotion: res.promotion || '' });
    return;
  }
  if (Drill.blocks(from, to, promotion)) return;
  if (Coach.intercept(from, to, promotion)) return;
  const res = applyMove({ from, to, promotion });
  if (!res) return;
  clockAfterMove(res.color);
  if (checkEnd()) return;
  if (G.mode === 'local' && settings.hotseatFlip && !settings.tabletop) G.orient = G.chess.turn;
  render();
  if (G.mode === 'bot') botMove();
}

function checkEnd() {
  const st = G.chess.status();
  if (st.over) { endGame(st.winner, st.reason); return true; }
  return false;
}

function endGame(winner, reason) {
  if (G.over) return;
  freezeClock();
  G.over = { winner, reason };
  G.premove = null; G.sel = null; G.targets = [];
  stopBot();
  if (Drill.on()) Drill.onEnd(winner, reason);
  else {
    if (G.mode === 'bot' && reason !== 'abort') updateRating(winner);
    History.save();
  }
  Sound.play('end');
  render();
  setTimeout(showResult, 350);
}

function tryPremove() {
  const pm = G.premove;
  if (!pm || G.over || G.chess.turn !== G.my) return;
  G.premove = null;
  const ok = G.chess.moves({ square: pm.from }).some(m => m.to === pm.to);
  if (ok) userMove(pm.from, pm.to, pm.promotion);
  else render();
}

/* ================= Puan (botlara karşı) ================= */
function rating() { return store.get('rating', 800); }
function updateRating(winner) {
  const bot = BOTS[G.bot], r = rating(), games = store.get('games', 0);
  const score = winner === null ? 0.5 : winner === G.my ? 1 : 0;
  const exp = 1 / (1 + Math.pow(10, (bot.elo - r) / 400));
  const k = games < 15 ? 40 : 20;
  const delta = Math.round(k * (score - exp));
  store.set('rating', Math.max(100, r + delta));
  const hist = store.get('ratingHist', []); hist.push([Date.now(), Math.max(100, r + delta)]); store.set('ratingHist', hist.slice(-300));
  store.set('games', games + 1);
  const rec = store.get('rec', {});
  const key = 'b' + G.bot; rec[key] = rec[key] || { w: 0, l: 0, d: 0 };
  rec[key][score === 1 ? 'w' : score === 0 ? 'l' : 'd']++;
  store.set('rec', rec);
  G.ratingDelta = delta;
  renderMe(); renderBots();
}

/* ================= Yapay zeka ================= */
let worker = null, seq = 0;
const pending = {};
function getWorker() {
  if (!worker) {
    worker = new Worker('engine.js');
    worker.onmessage = onEngine;
  }
  return worker;
}
function botMove() {
  if (G.over) return;
  const id = ++seq;
  G.botReq = id; G.botBusy = true;
  const bot = BOTS[G.bot];
  let t = Drill.on() ? 450 : bot.time;
  if (G.clock) {
    const rem = clockMs(G.chess.turn);
    t = Math.max(60, Math.min(t, rem / 30 + G.tc.inc * 700));
  }
  pending[id] = { type: 'bot', started: now(), fen: G.chess.fen() };
  const bk = !Drill.on() && Bots.bookMove(bot);
  if (bk) { setTimeout(() => onEngine({ data: { id, move: bk, score: 0 } }), 250 + Math.random() * 450); renderPlayers(); return; }
  if (bot.sf) sfRequest(id, { movetime: t, elo: bot.sf === true ? null : bot.sf }, t);
  else getWorker().postMessage({ id, fen: G.chess.fen(), level: bot.cfg ? 0 : G.bot, cfg: bot.cfg || null, style: bot.style || null, timeMs: t, keys: G.chess.keys });
  renderPlayers();
}
// Stockfish'e sor; olmazsa kendi motorumuzun en güçlü seviyesine dön.
function sfRequest(id, opts, fallbackMs) {
  const uci = G.moves.map(m => Chess.sqName(m.from) + Chess.sqName(m.to) + (m.promotion || ''));
  const fen = G.chess.fen(), keys = G.chess.keys.slice();
  const fallback = () => getWorker().postMessage({ id, fen, level: 4, timeMs: fallbackMs, keys });
  if (SF.ok === false) { fallback(); return; }
  SF.search(G.startFen, Object.assign({ moves: uci }, opts)).then(r => {
    const c = SF.toEngine(r);
    if (c) onEngine({ data: Object.assign({ id }, c) });
    else if (pending[id]) fallback();
  }).catch(() => { if (pending[id]) { toast('Stockfish yüklenemedi, yerleşik motor kullanılıyor'); fallback(); } });
}
function stopBot() {
  if (G.botBusy && worker) { worker.terminate(); worker = null; }
  if (G.botBusy && BOTS[G.bot] && BOTS[G.bot].sf) SF.cancelAll();
  G.botReq = 0; G.botBusy = false;
}
function askHint() {
  if (!myTurn() || G.botBusy) return;
  const id = ++seq;
  pending[id] = { type: 'hint', fen: G.chess.fen() };
  toast('İpucu hesaplanıyor…', 1200);
  sfRequest(id, { movetime: 1000 }, 1200);
}
function onEngine(e) {
  const d = e.data, p = pending[d.id];
  delete pending[d.id];
  if (!p || !d.move) return;
  if (p.type === 'hint') {
    if (p.fen !== G.chess.fen()) return;
    G.arrows = G.arrows.filter(a => a.kind !== 'hint');
    G.arrows.push({ from: d.move.from, to: d.move.to, kind: 'hint' });
    renderArrows();
    return;
  }
  if (d.id !== G.botReq || G.over || p.fen !== G.chess.fen()) return;
  const lowTime = G.clock && clockMs(G.chess.turn) < 15000;
  const wait = lowTime ? 0 : Math.max(0, 350 - (now() - p.started));
  setTimeout(() => {
    if (d.id !== G.botReq || G.over) return;
    G.botBusy = false;
    G.lastBotScore = d.score || 0;
    const res = applyMove(d.move);
    if (!res) return;
    clockAfterMove(res.color);
    if (checkEnd()) return;
    render();
    tryPremove();
  }, wait);
}

/* ================= Tahta ================= */
const boardEl = $('#board');
let sqEls = [];
function buildBoard() {
  if (sqEls.length) return;
  for (let d = 0; d < 64; d++) {
    const el = document.createElement('div');
    el.className = 'sq';
    el.innerHTML = '<div class="pcw"></div>';
    boardEl.append(el);
    sqEls.push(el);
  }
}
const disp = sq => (G.orient === 'w' ? sq : 63 - sq);
const sqAt = d => (G.orient === 'w' ? d : 63 - d);

function viewChess() {
  if (G.view == null) return G.chess;
  return new Chess(G.fens[G.view]);
}
function render() {
  renderBoard(); renderPlayers(); renderMoves(); renderSide(); Extra.render(); renderArrows();
  applyTabletop();
}
// Karşılıklı mod (aynı cihaz): tahta sabit, sıra üstteki oyuncudaysa taşlar ona dönük çizilir
function applyTabletop() {
  const tt = G.mode === 'local' && !!settings.tabletop;
  const rot = tt && viewChess().turn !== G.orient;
  boardEl.classList.toggle('rot', rot);
  document.body.classList.toggle('tt-rot', rot);
  $('#game .game').classList.toggle('tabletop', tt);
}
function renderBoard() {
  const ch = viewChess();
  const ply = G.view == null ? G.moves.length : G.view;
  const last = ply > 0 ? G.moves[ply - 1] : null;
  const checkSq = ch.inCheck() ? ch.kings[ch.turn] : -1;
  const tg = new Set(G.targets);
  boardEl.classList.toggle('nocoords', !settings.coords);
  for (let d = 0; d < 64; d++) {
    const sq = sqAt(d), el = sqEls[d], p = ch.b[sq];
    const dark = ((sq >> 3) + (sq & 7)) & 1;
    let cls = 'sq' + (dark ? ' d' : '');
    if (last && (sq === last.from || sq === last.to)) cls += ' last';
    if (G.premove && (sq === G.premove.from || sq === G.premove.to)) cls += ' pre';
    if (sq === G.sel) cls += ' sel';
    if (sq === checkSq) cls += ' check';
    if (G.marks.has(sq)) cls += ' mark';
    if (settings.showLegal && tg.has(sq)) cls += ' tgt' + (p ? ' cap' : '');
    if (drag && drag.moved && drag.from === sq) cls += ' dragfrom';
    if (el.className !== cls) el.className = cls;
    if (el.dataset.p !== p) { el.dataset.p = p; el.firstChild.innerHTML = p ? pieceSVG(p) : ''; }
    const coords = (d >= 56 ? `<span class="coord f">${'abcdefgh'[sq & 7]}</span>` : '') + (d % 8 === 0 ? `<span class="coord r">${8 - (sq >> 3)}</span>` : '');
    if (el.dataset.c !== coords) {
      el.dataset.c = coords;
      $$('.coord', el).forEach(x => x.remove());
      if (coords) el.insertAdjacentHTML('beforeend', coords);
    }
  }
}

function arrowSVG(from, to, color) {
  const a = disp(from), b = disp(to);
  const x1 = (a % 8) * 100 + 50, y1 = Math.floor(a / 8) * 100 + 50, x2 = (b % 8) * 100 + 50, y2 = Math.floor(b / 8) * 100 + 50;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const sx = x1 + ux * 22, sy = y1 + uy * 22, head = 40, hw = 26, sw = 9;
  const ex = x2 - ux * head, ey = y2 - uy * head;
  const pts = [[sx + px * sw, sy + py * sw], [ex + px * sw, ey + py * sw], [ex + px * hw, ey + py * hw], [x2, y2], [ex - px * hw, ey - py * hw], [ex - px * sw, ey - py * sw], [sx - px * sw, sy - py * sw]];
  return `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${color}"/>`;
}
function renderArrows() {
  const col = { hint: 'rgba(76,190,120,.85)', best: 'rgba(76,190,120,.8)', engine: 'rgba(70,140,230,.78)', user: 'rgba(240,160,30,.82)', escape: 'rgba(226,88,74,.7)', coach: 'rgba(226,88,74,.88)' };
  const extra = Drill.on() ? Drill.arrows() : Extra.arrows();
  $('#arrows').innerHTML = G.arrows.concat(extra).map(a => arrowSVG(a.from, a.to, col[a.kind] || col.user)).join('');
}

/* ----- fare / dokunma ----- */
let drag = null, rdown = null, ghost = null;
function sqFromPoint(x, y) {
  const r = boardEl.getBoundingClientRect();
  const c = Math.floor((x - r.left) / r.width * 8), w = Math.floor((y - r.top) / r.height * 8);
  if (c < 0 || c > 7 || w < 0 || w > 7) return -1;
  return sqAt(w * 8 + c);
}
function premoveTargets(sq) {
  const ch = G.chess, p = ch.b[sq], t = p.toLowerCase(), white = p < 'a', out = new Set();
  const T = Chess.T;
  if (t === 'n') T.KNIGHT[sq].forEach(x => out.add(x));
  else if (t === 'k') {
    T.KING[sq].forEach(x => out.add(x));
    if (white && sq === 60) { if (ch.castling & 1) out.add(62); if (ch.castling & 2) out.add(58); }
    if (!white && sq === 4) { if (ch.castling & 4) out.add(6); if (ch.castling & 8) out.add(2); }
  } else if (t === 'p') {
    const fwd = white ? -8 : 8, r = sq >> 3, c = sq & 7;
    out.add(sq + fwd);
    if ((white && r === 6) || (!white && r === 1)) out.add(sq + 2 * fwd);
    if (c > 0) out.add(sq + fwd - 1);
    if (c < 7) out.add(sq + fwd + 1);
  } else {
    const rays = t === 'b' ? T.DIAG[sq] : t === 'r' ? T.ORTH[sq] : T.QUEEN[sq];
    for (const ray of rays) for (const x of ray) { out.add(x); if (ch.b[x] && Chess.colorOf(ch.b[x]) !== Chess.colorOf(p)) break; }
  }
  return [...out].filter(x => x >= 0 && x < 64);
}
function select(sq) {
  G.sel = sq;
  if (myTurn()) G.targets = viewChess().moves({ square: sq }).map(m => m.to);
  else G.targets = settings.premove ? premoveTargets(sq) : [];
}
function clearSel() { G.sel = null; G.targets = []; }

function tryUserMove(from, to) {
  if (!myTurn()) {
    const p = G.chess.b[from];
    const promo = (p === 'P' && to < 8) || (p === 'p' && to >= 56);
    G.premove = { from, to, promotion: promo ? 'q' : '' };
    clearSel(); render();
    return;
  }
  const vc = viewChess();
  const cands = vc.moves({ square: from }).filter(m => m.to === to);
  if (!cands.length) { clearSel(); render(); return; }
  if (cands[0].promotion && !settings.autoQueen) {
    clearSel(); render();
    showPromo(to, vc.turn, choice => userMove(from, to, choice));
    return;
  }
  clearSel();
  userMove(from, to, cands[0].promotion ? 'q' : '');
}

boardEl.addEventListener('contextmenu', e => e.preventDefault());
// Bazı telefon tarayıcıları (iOS Safari) touch-action'ı her zaman uygulamıyor: tahtadaki tek parmak sayfayı kaydırmasın
{ const stop = e => { if (e.touches.length === 1) e.preventDefault(); };
  boardEl.addEventListener('touchstart', stop, { passive: false });
  boardEl.addEventListener('touchmove', stop, { passive: false }); }
boardEl.addEventListener('pointerdown', e => {
  const sq = sqFromPoint(e.clientX, e.clientY);
  if (sq < 0) return;
  if (e.button === 2) {
    rdown = sq;
    if (G.premove || G.sel != null) { G.premove = null; clearSel(); render(); }
    return;
  }
  if (e.button !== 0) return;
  if (!$('#promo').hidden) return;
  if (G.arrows.some(a => a.kind !== 'hint') || G.marks.size) { G.arrows = G.arrows.filter(a => a.kind === 'hint'); G.marks.clear(); renderArrows(); }
  if (G.view != null && G.mode !== 'analysis') { G.view = null; render(); return; }
  if (G.sel != null && G.targets.includes(sq)) { tryUserMove(G.sel, sq); return; }
  const p = viewChess().b[sq];
  if (p && canControl(Chess.colorOf(p))) {
    if (!myTurn() && !settings.premove) return;
    const wasSel = G.sel === sq;
    if (G.premove && !myTurn()) G.premove = null;
    select(sq);
    drag = { from: sq, x: e.clientX, y: e.clientY, moved: false, wasSel, piece: p };
    boardEl.setPointerCapture(e.pointerId);
    render();
  } else {
    if (G.premove) G.premove = null;
    clearSel(); render();
  }
});
boardEl.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) {
    drag.moved = true;
    const size = boardEl.getBoundingClientRect().width / 8;
    ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = ghost.style.height = size + 'px';
    ghost.innerHTML = pieceSVG(drag.piece);
    document.body.append(ghost);
    renderBoard();
  }
  if (drag.moved && ghost) {
    const size = parseFloat(ghost.style.width);
    ghost.style.left = (e.clientX - size / 2) + 'px';
    ghost.style.top = (e.clientY - size / 2) + 'px';
    const sq = sqFromPoint(e.clientX, e.clientY);
    sqEls.forEach((el, d) => el.classList.toggle('hover', sqAt(d) === sq && G.targets.includes(sq)));
  }
});
function endDrag() {
  if (ghost) { ghost.remove(); ghost = null; }
  sqEls.forEach(el => el.classList.remove('hover'));
}
boardEl.addEventListener('pointerup', e => {
  if (e.button === 2 && rdown != null) {
    const sq = sqFromPoint(e.clientX, e.clientY);
    if (sq === rdown) { if (G.marks.has(sq)) G.marks.delete(sq); else G.marks.add(sq); renderBoard(); }
    else if (sq >= 0) {
      const i = G.arrows.findIndex(a => a.from === rdown && a.to === sq && a.kind !== 'hint');
      if (i >= 0) G.arrows.splice(i, 1); else G.arrows.push({ from: rdown, to: sq, kind: 'user' });
      renderArrows();
    }
    rdown = null;
    return;
  }
  if (!drag) return;
  const d = drag; drag = null;
  endDrag();
  const sq = sqFromPoint(e.clientX, e.clientY);
  if (d.moved) {
    if (sq >= 0 && sq !== d.from && G.targets.includes(sq)) tryUserMove(d.from, sq);
    else { if (sq !== d.from) clearSel(); render(); }
  } else if (d.wasSel) { clearSel(); render(); }
});
boardEl.addEventListener('pointercancel', () => { drag = null; endDrag(); render(); });

function showPromo(to, color, cb) {
  const box = $('#promo');
  const d = disp(to), col = d % 8, top = Math.floor(d / 8) === 0;
  const size = boardEl.getBoundingClientRect().width / 8;
  const pieces = ['q', 'n', 'r', 'b'].map(t => (color === 'w' ? t.toUpperCase() : t));
  box.style.left = col * size + 'px';
  box.style.width = size + 'px';
  box.style.top = top ? '0' : 'auto';
  box.style.bottom = top ? 'auto' : '0';
  const btns = pieces.map(p => `<button data-p="${p.toLowerCase()}" aria-label="Terfi">${pieceSVG(p)}</button>`);
  const x = `<button class="x" data-x="1" aria-label="Vazgeç">${icon('x')}</button>`;
  box.innerHTML = top ? btns.join('') + x : x + btns.reverse().join('');
  box.hidden = false;
  box.onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    box.hidden = true;
    if (b.dataset.p) cb(b.dataset.p);
  };
}

/* ================= Oyuncu çubukları ================= */
const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };
function material(ch) {
  const cnt = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const p of ch.b) { if (!p) continue; const t = p.toLowerCase(); if (t !== 'k') cnt[Chess.colorOf(p)][t]++; }
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const score = c => Object.keys(VALUES).reduce((s, t) => s + cnt[c][t] * VALUES[t], 0);
  const caps = c => { // c rengin aldığı taşlar
    const o = opp(c), out = [];
    for (const t of ['p', 'n', 'b', 'r', 'q']) { const n = Math.max(0, start[t] - cnt[o][t]); for (let i = 0; i < n; i++) out.push(o === 'w' ? t.toUpperCase() : t); }
    return out;
  };
  return { diff: score('w') - score('b'), caps };
}
function playerInfo(color) {
  const ex = Extra.playerInfo(color);
  if (ex) return ex;
  if (Drill.on()) return Drill.playerInfo(color);
  const king = { svg: pieceSVG(color === 'w' ? 'K' : 'k'), bg: '#2f2b25' };
  if (G.mode === 'bot') {
    if (color === G.my) return Object.assign({ name: 'Sen', elo: rating() }, king);
    const b = BOTS[G.bot];
    return { name: b.name, elo: b.elo, svg: pieceSVG(b.piece), bg: b.color, thinking: G.botBusy && G.chess.turn === color };
  }
  if (G.mode === 'online') {
    const s = Online.state, p = s && s.players[color];
    if (!p) return { name: 'Rakip bekleniyor…', avatar: '?', bg: '#2f2b25', fg: '#a0978a', online: false };
    return Object.assign({ name: p.name + (color === G.my ? ' (sen)' : ''), online: p.online }, king);
  }
  return Object.assign({ name: colorName(color) }, king);
}
const fmtClock = ms => {
  if (ms == null) return '';
  if (ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1).padStart(4, '0');
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
};
function renderPlayers() {
  const ch = viewChess(), mat = material(ch);
  for (const [id, color] of [['#barTop', opp(G.orient)], ['#barBottom', G.orient]]) {
    const info = playerInfo(color), caps = Drill.on() ? [] : mat.caps(color);
    const adv = Drill.on() ? 0 : color === 'w' ? mat.diff : -mat.diff;
    let capsHtml = '', lastT = '';
    for (const p of caps) { if (lastT && lastT !== p.toLowerCase()) capsHtml += '<span class="gap"></span>'; capsHtml += pieceSVG(p); lastT = p.toLowerCase(); }
    const el = $(id);
    el.innerHTML = `
      <div class="pb-avatar" style="background:${info.bg};color:${info.fg || '#15171c'}">${info.svg || esc(info.avatar || '?')}</div>
      <div class="pb-info">
        <div class="pb-name">${info.online != null ? `<span class="pb-dot${info.online ? ' on' : ''}" title="${info.online ? 'Bağlı' : 'Bağlı değil'}"></span>` : ''}${esc(info.name)}${info.elo ? `<span class="pb-elo">(${info.elo})</span>` : ''}${info.thinking ? '<span class="thinking">düşünüyor…</span>' : ''}</div>
        <div class="pb-caps">${capsHtml}${adv > 0 ? `<span class="pb-adv">+${adv}</span>` : ''}</div>
      </div>
      ${G.clock ? `<div class="clock" data-c="${color}"></div>` : ''}`;
  }
  renderClocks();
}
function renderClocks() {
  if (!G.clock) return;
  for (const el of $$('.clock')) {
    const c = el.dataset.c, ms = clockMs(c);
    const active = G.clock.running && !G.over && G.chess.turn === c;
    const lowLimit = G.tc.base >= 180 ? 20000 : 10000;
    const txt = fmtClock(ms);
    if (el.textContent !== txt) el.textContent = txt;
    el.classList.toggle('active', active);
    el.classList.toggle('low', ms < lowLimit && G.moves.length > 0);
    if (active && ms < lowLimit && !G.lowWarned[c] && (G.mode === 'local' || c === G.my)) { G.lowWarned[c] = true; Sound.play('low'); }
  }
}
function tick() {
  if (G.clock && G.clock.running && !G.over && G.mode !== 'online') {
    const t = G.chess.turn;
    if (clockMs(t) <= 0) {
      freezeClock();
      G.clock[t] = 0;
      const o = opp(t);
      endGame(G.chess.canMate(o) ? o : null, G.chess.canMate(o) ? 'timeout' : 'timeout-draw');
    }
  }
  renderClocks();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* ================= Hamle listesi ve yan panel ================= */
function renderMoves() {
  const el = $('#moves');
  const cur = G.view == null ? G.moves.length : G.view;
  let h = '';
  for (let i = 0; i < G.moves.length; i += 2) {
    h += `<div class="mv-row"><span class="mv-no">${i / 2 + 1}.</span>`;
    for (const j of [i, i + 1]) {
      const m = G.moves[j];
      h += m ? `<span class="mv${cur === j + 1 ? ' cur' : ''}" data-ply="${j + 1}">${esc(figurine(m.san, m.color))}${Extra.moveTag(j + 1)}</span>` : '<span></span>';
    }
    h += '</div>';
  }
  if (G.over) {
    const r = G.over.winner === 'w' ? '1-0' : G.over.winner === 'b' ? '0-1' : '½-½';
    h += `<div class="mv-result">${G.over.reason === 'abort' ? 'İptal' : r}</div>`;
  }
  if (!G.moves.length && !G.over) h = G.mode === 'puzzle' ? '' : '<p class="empty">Hamleler burada not edilir.</p>';
  el.innerHTML = h;
  // Sadece hamle listesinin kendi içini kaydır. scrollIntoView sayfayı da kaydırıyordu:
  // telefonda liste tahtanın altında olduğu için bot her oynadığında tahta yukarı kaçıyordu.
  const curEl = $('.mv.cur', el);
  if (curEl) {
    const er = el.getBoundingClientRect(), cr = curEl.getBoundingClientRect();
    if (cr.top < er.top) el.scrollTop -= er.top - cr.top;
    else if (cr.bottom > er.bottom) el.scrollTop += cr.bottom - er.bottom;
  } else el.scrollTop = el.scrollHeight;
}
const FIG = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const figurine = (san, color) => san.replace(/^[KQRBN]/, c => FIG[c]).replace(/=([QRBN])/, (_, c) => '=' + FIG[c]);
$('#moves').addEventListener('click', e => {
  const m = e.target.closest('.mv');
  if (!m) return;
  setView(+m.dataset.ply);
});
function setView(ply) {
  ply = Math.max(0, Math.min(G.moves.length, ply));
  G.view = ply === G.moves.length ? null : ply;
  clearSel();
  render();
}
$$('[data-nav]').forEach(b => b.addEventListener('click', () => {
  const cur = G.view == null ? G.moves.length : G.view;
  const k = b.dataset.nav;
  setView(k === 'first' ? 0 : k === 'prev' ? cur - 1 : k === 'next' ? cur + 1 : G.moves.length);
}));
document.addEventListener('keydown', e => {
  if ($('#game').hidden || e.target.closest('input, textarea') || !$('#pgnModal').hidden) return;
  const cur = G.view == null ? G.moves.length : G.view;
  if (e.key === 'ArrowLeft') { setView(cur - 1); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { setView(cur + 1); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { setView(0); e.preventDefault(); }
  else if (e.key === 'ArrowDown') { setView(G.moves.length); e.preventDefault(); }
  else if (e.key === 'f' || e.key === 'F') flip();
});
function flip() { G.orient = opp(G.orient); $('#promo').hidden = true; render(); }

const ACTION_ICONS = {
  'Geri al': 'undo', 'Geri alma iste': 'undo', 'İpucu': 'bulb', 'Beraberlik teklif et': 'half', 'Teklif gönderildi': 'half',
  'Teslim ol': 'flag', 'İptal et': 'x', 'Bitir': 'flag', 'Rövanş': 'repeat', 'Rövanş istendi…': 'repeat', 'Yeni oyun': 'repeat',
  'Tekrar oyna': 'repeat', 'Tekrar dene': 'repeat', 'Oyunu incele': 'search', 'PGN': 'file', 'Tahtayı çevir': 'flip',
  'Ana oyuna dön': 'back', 'Menü': 'back', 'En iyi hamle: açık': 'eye', 'En iyi hamle: kapalı': 'eye',
  'Bota karşı oyna': 'bot', 'Düzenleyicide aç': 'edit', 'Sonraki bulmaca': 'next', 'Analiz et': 'pulse', 'Çözümü göster': 'eye'
};
function armButton(btn, label, fn) {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('armed')) { fn(); return; }
    const orig = btn.innerHTML;
    btn.classList.add('armed'); btn.innerHTML = icon('flag') + `<span>${esc(label)}</span>`;
    setTimeout(() => { btn.classList.remove('armed'); btn.innerHTML = orig; }, 3000);
  });
}

function renderSide() {
  $('#opening').textContent = G.opening || (G.moves.length ? '' : 'Başlangıç pozisyonu');
  const ml = $('#modeLabel');
  const tc = G.clock ? tcLabel(G.tc) : 'Süresiz';
  if (Drill.on()) ml.textContent = Drill.label();
  else if (G.mode === 'bot') ml.textContent = `${BOTS[G.bot].name} · ${tc}`;
  else if (G.mode === 'local') ml.textContent = `Aynı bilgisayarda · ${tc}`;
  else if (G.mode === 'online') {
    const s = Online.state;
    ml.innerHTML = `Oda <b style="color:var(--accent);font-family:var(--mono)">${esc(Online.code || '')}</b> · ${tc}${s && s.spectators ? ` · ${s.spectators} izleyici` : ''}`;
  } else ml.textContent = Extra.modeLabel();

  const a = $('#actions');
  a.innerHTML = '';
  const add = (label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'btn small ' + cls;
    const ic = ACTION_ICONS[label];
    b.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(label)}</span>`;
    if (fn) b.addEventListener('click', fn);
    a.append(b);
    return b;
  };
  const playing = !G.over;
  if (Drill.on()) Drill.actions(add);
  else if (G.mode === 'bot') {
    add('Geri al', undo).disabled = !G.moves.length || (G.over && G.over.reason.startsWith('timeout'));
    add('İpucu', askHint).disabled = !myTurn();
    if (playing) add(Coach.on() ? 'Koç: açık' : 'Koç: kapalı', () => { store.set('coach', !Coach.on()); Coach.clear(false); render(); toast(Coach.on() ? 'Koç modu açık: taş hediye edeceğin hamlede seni uyaracak' : 'Koç modu kapalı'); }, 'ghost');
    if (playing) {
      add('Beraberlik teklif et', offerDrawBot);
      armButton(add('Teslim ol', null, 'danger'), 'Emin misin?', () => endGame(opp(G.my), 'resign'));
    } else add('Rövanş', rematchBot, 'primary');
  } else if (G.mode === 'local') {
    add('Geri al', undo).disabled = !G.moves.length || (G.over && G.over.reason.startsWith('timeout'));
    add(settings.tabletop ? 'Karşılıklı: açık' : 'Karşılıklı: kapalı', () => { settings.tabletop = !settings.tabletop; store.set('settings', settings); const b = $('#localTabletop'); if (b) b.checked = settings.tabletop; render(); }, 'ghost');
    if (playing) armButton(add('Teslim ol', null, 'danger'), 'Emin misin?', () => endGame(opp(G.chess.turn), 'resign'));
    else add('Yeni oyun', () => startGame({ mode: 'local', tc: G.tc }), 'primary');
  } else if (G.mode === 'online' && G.my) {
    const s = Online.state || {};
    const ready = s.players && s.players.w && s.players.b;
    if (playing) {
      add('Geri alma iste', () => Online.send({ type: 'takeback-req' })).disabled = !ready || !G.moves.length || s.takeback === G.my;
      add(s.drawOffer === G.my ? 'Teklif gönderildi' : 'Beraberlik teklif et', () => Online.send({ type: 'draw-offer' })).disabled = !ready || s.drawOffer === G.my;
      if (G.moves.length < 2) armButton(add('İptal et', null, 'danger'), 'Emin misin?', () => Online.send({ type: 'abort' }));
      else armButton(add('Teslim ol', null, 'danger'), 'Emin misin?', () => Online.send({ type: 'resign' }));
    } else {
      add(s.rematch && s.rematch[G.my] ? 'Rövanş istendi…' : 'Rövanş', () => Online.send({ type: 'rematch' }), 'primary').disabled = !!(s.rematch && s.rematch[G.my]);
    }
  } else Extra.actions(add);
  if (G.over && G.moves.length && G.mode !== 'analysis' && G.mode !== 'puzzle') add('Oyunu incele', () => Review.fromCurrent());
  if (G.mode !== 'puzzle') add('PGN', () => PGN.showExport(), 'ghost');
  add('Tahtayı çevir', flip, 'ghost');

  // Bildirimler (online)
  const n = $('#notice');
  let nh = '';
  if (G.mode === 'online' && Online.state && G.my && !G.over) {
    const s = Online.state, o = opp(G.my);
    if (s.drawOffer === o) nh += `<div>Rakibin beraberlik teklif ediyor.</div><div class="row"><button class="btn small primary" data-a="draw-accept">Kabul et</button><button class="btn small" data-a="draw-decline">Reddet</button></div>`;
    if (s.takeback === o) nh += `<div>Rakibin hamlesini geri almak istiyor.</div><div class="row"><button class="btn small primary" data-a="takeback-accept">İzin ver</button><button class="btn small" data-a="takeback-decline">Reddet</button></div>`;
  }
  if (G.mode === 'online' && Online.state && G.over && G.my) {
    const s = Online.state;
    if (s.rematch && s.rematch[opp(G.my)] && !s.rematch[G.my]) nh += `<div>Rakibin rövanş istiyor.</div><div class="row"><button class="btn small primary" data-a="rematch">Kabul et</button></div>`;
  }
  if (G.view != null && G.mode !== 'analysis') nh += `<div>Eski bir pozisyona bakıyorsun.</div><div class="row"><button class="btn small" data-live="1">Son pozisyona dön</button></div>`;
  if (Drill.on()) nh = Drill.notice() + nh;
  if (Coach.active()) nh = Coach.notice() + nh;
  n.innerHTML = nh;
  n.hidden = !nh;

  // Bekleme ekranı
  const wb = $('#waitBanner');
  if (G.mode === 'online' && Online.state && (!Online.state.players.w || !Online.state.players.b)) {
    const addr = Online.addr ? `<div class="muted">Arkadaşın şu adresi açsın:</div><div class="addr">${esc(Online.addr)}</div>` : '';
    wb.innerHTML = `<div class="muted">Rakip bekleniyor. Oda kodu:</div><div class="big-code">${esc(Online.code)}</div>${addr}<div class="muted" style="font-size:12px">Odayı “Açık odalar” listesinde de görecek.</div>`;
    wb.hidden = false;
  } else wb.hidden = true;

  $('#chat').hidden = G.mode !== 'online';
}
$('#notice').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.live) setView(G.moves.length);
  else if (b.dataset.a) Online.send({ type: b.dataset.a });
});

function undo() {
  if (!G.moves.length) return;
  stopBot();
  if (G.over) { G.over = null; G.ratingDelta = null; hideModal('#resultModal'); }
  let n = G.mode === 'bot' ? (G.chess.turn === G.my ? 2 : 1) : 1;
  n = Math.min(n, G.moves.length);
  for (let i = 0; i < n; i++) { G.chess.undo(); G.moves.pop(); G.fens.pop(); }
  G.premove = null; G.view = null; clearSel(); G.arrows = [];
  G.opening = openingName(G.chess.sanList);
  if (G.clock) { G.clock.lastTs = now(); G.clock.running = G.moves.length >= 2; }
  render();
  if (G.mode === 'bot' && G.chess.turn !== G.my) botMove();
}
function offerDrawBot() {
  if (G.over || G.moves.length < 10) { toast(`${BOTS[G.bot].name} bu kadar erken beraberliği kabul etmiyor`); return; }
  const threshold = [60, 20, -40, -100, -150, -200, -250, -300][G.bot] ?? (BOTS[G.bot].elo < 800 ? 40 : -60);
  if (!G.botBusy && G.lastBotScore <= threshold) { toast(`${BOTS[G.bot].name} beraberliği kabul etti`); endGame(null, 'agreement'); }
  else toast(`${BOTS[G.bot].name} beraberliği reddetti`);
}
function rematchBot() { startGame({ mode: 'bot', my: opp(G.my), bot: G.bot, tc: G.tc }); }

/* ================= Sonuç penceresi ================= */
function showResult() {
  if (!G.over) return;
  if (Drill.on()) return Drill.showResult();
  const { winner, reason } = G.over;
  const t = $('#resTitle');
  t.className = 'result-title';
  let title;
  if (reason === 'abort') title = 'Oyun iptal edildi';
  else if (!winner) title = 'Berabere';
  else if (G.mode === 'local' || !G.my) title = `${colorName(winner)} kazandı`;
  else if (winner === G.my) { title = 'Kazandın!'; t.classList.add('win'); }
  else { title = 'Kaybettin'; t.classList.add('loss'); }
  t.textContent = title;
  let why = REASONS[reason] || '';
  if (reason === 'resign' && winner) why = `${colorName(opp(winner))} teslim oldu`;
  if (reason === 'timeout' && winner) why = `${colorName(opp(winner))} tarafının süresi bitti`;
  $('#resReason').textContent = why;
  const ex = $('#resExtra');
  ex.innerHTML = G.mode === 'bot' && G.ratingDelta != null
    ? `Puanın: ${rating()} <span class="${G.ratingDelta >= 0 ? 'up' : 'down'}">(${G.ratingDelta >= 0 ? '+' : ''}${G.ratingDelta})</span>` : '';
  const acts = $('#resActions');
  acts.innerHTML = '';
  const add = (label, fn, cls = '') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = fn; acts.append(b); };
  if (G.mode === 'bot') add('Rövanş', () => { hideModal('#resultModal'); rematchBot(); }, 'primary');
  if (G.mode === 'local') add('Yeni oyun', () => { hideModal('#resultModal'); startGame({ mode: 'local', tc: G.tc }); }, 'primary');
  if (G.mode === 'online' && G.my) add('Rövanş iste', () => { hideModal('#resultModal'); Online.send({ type: 'rematch' }); }, 'primary');
  if (G.moves.length >= 2) add('Oyunu incele', () => { hideModal('#resultModal'); Review.fromCurrent(); });
  add('Tahtaya bak', () => hideModal('#resultModal'));
  add('Menü', () => { hideModal('#resultModal'); goHome(); });
  $('#resultModal').hidden = false;
}
const hideModal = id => { $(id).hidden = true; };

/* ================= Online (Radmin VPN / yerel ağ) ================= */
const Online = {
  code: null, token: null, es: null, state: null, addr: '', gameNo: 0,
  async api(path, body) {
    let r, j;
    try {
      r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
      j = await r.json();
    } catch (e) { throw new Error('Sunucuya ulaşılamadı. Rok penceresi açık mı?'); }
    if (!r.ok || j.error) throw new Error(j.error || 'Bir şeyler ters gitti');
    return j;
  },
  async loadInfo() {
    try {
      const info = await this.api('/api/info');
      const rad = info.ips.filter(i => i.radmin), other = info.ips.filter(i => !i.radmin);
      const onHost = ['localhost', '127.0.0.1'].includes(location.hostname);
      this.addr = rad.length ? `http://${rad[0].address}:${info.port}` : (other[0] ? `http://${other[0].address}:${info.port}` : '');
      let h = '';
      if (!onHost) h += `<div class="addr-row"><span class="tag">Bağlısın</span><span class="addr secondary">${esc(location.host)}</span></div><div class="muted">Arkadaşının bilgisayarındaki Rok'a bağlısın. Açık odalardan birine katıl ya da kendin oda kur.</div>`;
      else if (rad.length) {
        h += `<div class="muted">Arkadaşın Radmin VPN'de aynı ağa girip tarayıcısında bu adresi açsın:</div>`;
        for (const i of rad) h += `<div class="addr-row"><span class="addr">http://${esc(i.address)}:${info.port}</span><button class="btn small" data-copy="http://${esc(i.address)}:${info.port}">Kopyala</button></div>`;
      } else {
        h += `<div class="addr-row"><span class="tag">Radmin bulunamadı</span></div><div class="muted">Radmin VPN açık değil ya da bir ağa bağlı değil. Açıp ağa katıldıktan sonra bu sayfayı yenile. Aynı evdeysen yerel ağ adresi de çalışır:</div>`;
        for (const i of other) h += `<div class="addr-row"><span class="addr secondary">http://${esc(i.address)}:${info.port}</span><span class="tag">${esc(i.name)}</span></div>`;
      }
      $('#addrCard').innerHTML = h;
    } catch (e) {
      $('#addrCard').innerHTML = `<div class="muted">${esc(e.message)} Online oyun için Rok'u <b>baslat.bat</b> ile aç.</div>`;
    }
  },
  async listRooms() {
    try {
      const { rooms } = await this.api('/api/rooms');
      const el = $('#roomList');
      if (!rooms.length) { el.innerHTML = '<p class="muted">Henüz oda yok. Arkadaşın oda kurunca burada görünür.</p>'; return; }
      el.innerHTML = rooms.map(r => `<div class="room">
        <div class="room-info"><div class="room-name">${esc(r.host)}</div>
        <div class="room-meta">${esc(r.code)} · ${esc(r.tc)} · ${r.open ? 'rakip bekliyor' : r.playing ? `oynanıyor, ${r.moves} hamle` : 'bitti'}</div></div>
        ${r.open ? `<button class="btn small primary" data-join="${esc(r.code)}">Katıl</button>` : `<button class="btn small" data-watch="${esc(r.code)}">İzle</button>`}
      </div>`).join('');
    } catch (e) { /* sunucu yoksa sessiz geç */ }
  },
  name() {
    const n = $('#nameInput').value.trim();
    if (n) store.set('name', n);
    return n || 'Oyuncu';
  },
  async create() {
    try {
      const tc = roomTime(), color = roomColor();
      const r = await this.api('/api/create', { name: this.name(), color, base: tc.base, inc: tc.inc });
      this.enter(r.code, r.token);
    } catch (e) { toast(e.message); }
  },
  async join(code, watch) {
    code = String(code || '').trim().toUpperCase();
    if (!code) { toast('Oda kodunu yaz'); return; }
    try {
      const r = await this.api('/api/join', { code, name: this.name(), token: store.get('tok:' + code, null), watch: !!watch });
      this.enter(r.code, r.token);
    } catch (e) { toast(e.message); }
  },
  enter(code, token) {
    store.set('tok:' + code, token);
    this.code = code; this.token = token; this.state = null; this.gameNo = 0;
    try { history.replaceState(null, '', '?oda=' + code); } catch (e) { /* yoksay */ }
    this.connect();
  },
  connect() {
    if (this.es) this.es.close();
    this.es = new EventSource(`/api/events?code=${encodeURIComponent(this.code)}&token=${encodeURIComponent(this.token)}`);
    this.es.onmessage = e => { try { this.onState(JSON.parse(e.data)); } catch (err) { console.error(err); } };
    this.es.onerror = () => { if (G.mode === 'online') toast('Bağlantı koptu, yeniden bağlanılıyor…', 1500); };
  },
  leave() {
    if (this.es) this.es.close();
    this.es = null; this.code = null; this.state = null;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* yoksay */ }
  },
  send(a) {
    this.api('/api/action', Object.assign({ code: this.code, token: this.token, name: store.get('name', '') }, a))
      .catch(err => { toast(err.message); Sound.play('illegal'); this.resync(); });
  },
  async resync() {
    try { this.onState(await this.api(`/api/state?code=${encodeURIComponent(this.code)}&token=${encodeURIComponent(this.token)}`)); } catch (e) { /* yoksay */ }
  },
  onState(s) {
    const prev = this.state;
    const fresh = G.mode !== 'online' || !prev || prev.gameNo !== s.gameNo;
    this.state = s;
    if (fresh) {
      stopBot();
      G.mode = 'online';
      G.tc = { base: s.tc.base / 1000, inc: s.tc.inc / 1000 };
      resetBoard();
      G.my = s.you === 'w' || s.you === 'b' ? s.you : null;
      G.orient = G.my || 'w';
      hideModal('#resultModal');
      showScreen('game');
      buildBoard();
      if (prev) Sound.play('start');
    }
    G.my = s.you === 'w' || s.you === 'b' ? s.you : null;
    // Hamleleri eşitle
    const sm = s.moves;
    const same = G.moves.length <= sm.length && G.moves.every((m, i) => m.from === sm[i].from && m.to === sm[i].to && (m.promotion || '') === (sm[i].promotion || ''));
    if (!same) { const keepOrient = G.orient, over = G.over; resetBoard(); G.orient = keepOrient; G.over = over; }
    const before = G.moves.length;
    for (let i = before; i < sm.length; i++) {
      const res = applyMove(sm[i], fresh || !same || i < sm.length - 1);
      if (!res) { console.error('Senkron hatası', sm[i]); break; }
    }
    const newOppMove = !fresh && same && sm.length > before && G.moves.length && G.moves[G.moves.length - 1].color !== G.my;
    G.clock = s.tc.base > 0 ? { w: s.clock.w, b: s.clock.b, lastTs: now(), running: s.clock.running } : null;
    if (s.result && !G.over) {
      G.over = s.result; G.premove = null; clearSel();
      if (!fresh) { Sound.play('end'); History.save(); setTimeout(showResult, 350); }
    } else if (!s.result) G.over = null;
    // Bildirim sesleri
    if (prev && !fresh && G.my) {
      const o = opp(G.my);
      if ((s.drawOffer === o && prev.drawOffer !== o) || (s.takeback === o && prev.takeback !== o) || (s.rematch[o] && !prev.rematch[o])) Sound.play('notify');
      if (!prev.players[o] && s.players[o]) { Sound.play('start'); toast(`${s.players[o].name} katıldı. İyi oyunlar!`); }
      if (prev.drawOffer === G.my && !s.drawOffer && !s.result) toast('Beraberlik teklifin reddedildi');
      if (prev.takeback === G.my && !s.takeback && sm.length === prev.moves.length) toast('Geri alma isteğin reddedildi');
    }
    renderChat();
    render();
    if (newOppMove) tryPremove();
  }
};
let lastChatCount = -1;
function renderChat() {
  const s = Online.state;
  if (!s) return;
  const log = $('#chatLog');
  log.innerHTML = s.chat.map(m => m.color === 'sys' ? `<div class="sys">${esc(m.text)}</div>` : `<div><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`).join('') || '<div class="sys">Sohbet burada görünür.</div>';
  log.scrollTop = log.scrollHeight;
  if (lastChatCount >= 0 && s.chat.length > lastChatCount) { const m = s.chat[s.chat.length - 1]; if (m.color !== G.my && m.color !== 'sys') Sound.play('notify'); }
  lastChatCount = s.chat.length;
}
$('#chatForm').addEventListener('submit', e => {
  e.preventDefault();
  const i = $('#chatInput'), text = i.value.trim();
  if (!text) return;
  i.value = '';
  Online.send({ type: 'chat', text });
});

/* ================= Ekranlar ve menü ================= */
function showScreen(id) {
  $$('.screen').forEach(s => { s.hidden = s.id !== id; });
  if (id === 'home') { renderMe(); renderBots(); }
}
function goHome() {
  stopBot();
  if (G.mode === 'online') Online.leave();
  Extra.leaveMode();
  G.mode = null; G.over = null; G.review = null;
  showScreen('home');
  setTab(store.get('tab', 'home')); // sayfayı güncel verilerle yeniden çiz
  renderMe();
}
$('#backHome').addEventListener('click', goHome);

function renderMe() {
  const pz = typeof Puzzle !== 'undefined' ? Puzzle.rating() : store.get('pzRating', 1000);
  $('#meChip').innerHTML = `<div><span>Bot</span><b>${rating()}</b></div><div><span>Bulmaca</span><b>${pz}</b></div>`;
}
let botSel = store.get('bot', 1);
function renderBots() {
  const rec = store.get('rec', {});
  $('#botGrid').innerHTML = Bots.order().map(([b, i]) => {
    const r = rec['b' + i];
    return `<button class="bot-row${i === botSel ? ' on' : ''}" data-bot="${i}" aria-pressed="${i === botSel}">
      <span class="bot-face" style="background:${b.color}">${pieceSVG(b.piece)}</span>
      <span class="bot-main"><span class="bot-name">${b.name}<span class="bot-elo">${b.elo}</span>${b.tag ? `<span class="bot-tag">${b.tag}</span>` : ''}</span><span class="bot-desc">${b.desc}</span></span>
      <span class="bot-side"><span class="bot-check">${icon('check')}</span>${r ? `<span class="bot-rec">${r.w}G ${r.d}B ${r.l}M</span>` : ''}</span>
    </button>`;
  }).join('');
}
$('#botGrid').addEventListener('click', e => {
  const c = e.target.closest('[data-bot]');
  if (!c) return;
  botSel = +c.dataset.bot; store.set('bot', botSel); renderBots();
});
const botTime = timePicker($('#botTime'), 'bot', { base: 600, inc: 0 });
const roomTime = timePicker($('#roomTime'), 'room', { base: 300, inc: 3 });
const localTime = timePicker($('#localTime'), 'local', { base: 600, inc: 0 });
const botColor = segment($('#botColor'), 'botColor', 'r');
const roomColor = segment($('#roomColor'), 'roomColor', 'r');

$('#startBot').addEventListener('click', () => {
  let c = botColor();
  if (c === 'r') c = Math.random() < 0.5 ? 'w' : 'b';
  startGame({ mode: 'bot', my: c, bot: botSel, tc: botTime() });
});
{ const b = $('#localTabletop'); b.checked = !!settings.tabletop; b.addEventListener('change', e => { settings.tabletop = e.target.checked; store.set('settings', settings); }); }
$('#startLocal').addEventListener('click', () => startGame({ mode: 'local', tc: localTime() }));
$('#createRoom').addEventListener('click', () => Online.create());
$('#joinCode').addEventListener('click', () => Online.join($('#codeInput').value));
$('#codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') Online.join($('#codeInput').value); });
$('#roomList').addEventListener('click', e => {
  const j = e.target.closest('[data-join]'), w = e.target.closest('[data-watch]');
  if (j) Online.join(j.dataset.join);
  if (w) Online.join(w.dataset.watch, true);
});
$('#addrCard').addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const text = b.dataset.copy;
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast('Adres kopyalandı'), () => {
    const r = document.createRange(); r.selectNodeContents(b.previousElementSibling);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Adresi seçtim, Ctrl+C ile kopyala');
  });
});
$('#nameInput').value = store.get('name', '');

let roomPoll = null;
function setTab(tab) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $$('.tab-pane').forEach(p => { p.hidden = p.id !== 'pane-' + tab; });
  store.set('tab', tab);
  clearInterval(roomPoll);
  Extra.onTab(tab);
  if (tab === 'online' && !window.NO_SERVER) {
    Online.loadInfo(); Online.listRooms();
    roomPoll = setInterval(() => { if (!$('#home').hidden) Online.listRooms(); }, 2000);
  }
}
$$('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

/* ----- ayarlar ----- */
const SET_MAP = { setSound: 'sound', setLegal: 'showLegal', setCoords: 'coords', setAutoQueen: 'autoQueen', setPremove: 'premove', setFlip: 'hotseatFlip', setTabletop: 'tabletop' };
function renderSettings() {
  for (const [id, k] of Object.entries(SET_MAP)) $('#' + id).checked = !!settings[k];
  $('#themes').innerHTML = Object.entries(THEMES).map(([k, [l, d, n]]) =>
    `<button class="theme${settings.theme === k ? ' on' : ''}" data-theme="${k}" title="${n}" aria-label="${n}"><span style="background:${l}"></span><span style="background:${d}"></span><span style="background:${d}"></span><span style="background:${l}"></span></button>`).join('');
}
for (const [id, k] of Object.entries(SET_MAP)) $('#' + id).addEventListener('change', e => {
  settings[k] = e.target.checked; store.set('settings', settings);
  if (!$('#game').hidden) render();
});
$('#themes').addEventListener('click', e => {
  const b = e.target.closest('[data-theme]');
  if (!b) return;
  settings.theme = b.dataset.theme; store.set('settings', settings); applyTheme(); renderSettings();
});
function openSettings() { renderSettings(); $('#settingsModal').hidden = false; }
$('#openSettings').addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', () => hideModal('#settingsModal'));
$$('.modal-back').forEach(m => m.addEventListener('click', e => { if (e.target === m && m.id === 'settingsModal') m.hidden = true; }));
window.addEventListener('resize', () => { $('#promo').hidden = true; });

/* ----- açılış ----- */
// extra.js de yüklendikten sonra başla
window.addEventListener('DOMContentLoaded', function boot() {
  renderMe(); renderBots();
  setTab('home');
  const code = new URLSearchParams(location.search).get('oda');
  if (code && !window.NO_SERVER) Online.join(code);
});
