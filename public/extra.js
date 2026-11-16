/* Rok Satranç — Aşama 2: oyun incelemesi, analiz tahtası, bulmacalar, geçmiş, PGN, tahta düzenleyici */
'use strict';

const MATE_SCORE = 100000;
const START_FEN = Chess.START;
const fromUci = u => ({ from: Chess.index(u.slice(0, 2)), to: Chess.index(u.slice(2, 4)), promotion: u[4] || '' });
const toUci = m => Chess.sqName(m.from) + Chess.sqName(m.to) + (m.promotion || '');
const winP = cp => 1 / (1 + Math.pow(10, -cp / 400));
const resultStr = o => (!o ? '*' : o.winner === 'w' ? '1-0' : o.winner === 'b' ? '0-1' : '1/2-1/2');
const fmtEval = e => {
  if (!e) return '';
  if (e.mate != null) return e.mate === 0 ? '#' : (e.mate > 0 ? '+M' : '-M') + Math.abs(e.mate);
  const v = e.cp / 100;
  return (v > 0 ? '+' : '') + v.toFixed(1);
};
function sanOf(fen, mv) {
  if (!mv) return '';
  try { const c = new Chess(fen); const r = c.move(mv); return r ? r.san : ''; } catch (e) { return ''; }
}

/* ================= Analiz motoru (ayrı Worker) ================= */
const Eng = {
  w: null, cb: {}, id: 0,
  get() {
    if (!this.w) {
      this.w = new Worker('engine.js');
      this.w.onmessage = e => { const f = this.cb[e.data.id]; delete this.cb[e.data.id]; if (f) f(e.data); };
    }
    return this.w;
  },
  gen: 0,
  async eval(fen, ms) {
    if (SF.ok !== false) {
      const gen = this.gen;
      try {
        const r = await SF.search(fen, { movetime: ms });
        if (gen !== this.gen) return { move: null, cancelled: true };
        const c = SF.toEngine(r);
        if (c) return c;
      } catch (e) {
        if (gen !== this.gen) return { move: null, cancelled: true };
      }
    }
    return new Promise(res => {
      const id = ++this.id;
      this.cb[id] = res;
      this.get().postMessage({ id, fen, level: 4, timeMs: ms, keys: [], analyse: true });
    });
  },
  reset() {
    this.gen++;
    SF.cancelAll();
    if (this.w) { this.w.terminate(); this.w = null; }
    const cbs = this.cb; this.cb = {};
    for (const k in cbs) cbs[k]({ move: null, cancelled: true });
  }
};

/* ================= Hamle sınıfları ================= */
const CLS = {
  best: { n: 'En iyi', s: '★', c: '#7cc47f' },
  excellent: { n: 'Mükemmel', s: '!', c: '#a6d27c' },
  good: { n: 'İyi', s: '✓', c: '#b3c2ae' },
  book: { n: 'Kitap', s: 'K', c: '#c9a77c' },
  forced: { n: 'Tek hamle', s: '□', c: '#9aa0ad' },
  inaccuracy: { n: 'Belirsiz', s: '?!', c: '#e8c547' },
  mistake: { n: 'Hata', s: '?', c: '#ef9a3c' },
  blunder: { n: 'Büyük hata', s: '??', c: '#e2584a' }
};
const CLS_ORDER = ['best', 'excellent', 'good', 'book', 'forced', 'inaccuracy', 'mistake', 'blunder'];
const CLS_SHOW = new Set(['best', 'book', 'inaccuracy', 'mistake', 'blunder']);

/* ================= Analiz tahtası ================= */
const Analysis = {
  cache: new Map(), showBest: true, pendingFen: null, timer: null, saved: null,
  open(o = {}) {
    stopBot();
    Extra.leaveMode();
    G.mode = 'analysis'; G.my = null; G.tc = { base: 0, inc: 0 }; G.clock = null;
    try { resetBoard(o.fen || START_FEN); } catch (e) { toast('Pozisyon okunamadı: ' + e.message); resetBoard(); }
    for (const m of o.moves || []) if (!applyMove(m, true)) break;
    G.orient = o.orient || 'w';
    G.meta = o.meta || null;
    G.over = o.over || null;
    G.view = o.atStart ? 0 : null;
    if (G.view === G.moves.length) G.view = null;
    hideModal('#resultModal');
    showScreen('game');
    buildBoard();
    render();
  },
  current() { return G.fens[G.view == null ? G.moves.length : G.view]; },
  userMove(from, to, promotion) {
    if (G.view != null) {
      if (!this.saved) this.saved = { moves: G.moves.map(m => ({ from: m.from, to: m.to, promotion: m.promotion || '' })), over: G.over, review: G.review };
      const keep = G.view;
      while (G.moves.length > keep) { G.chess.undo(); G.moves.pop(); G.fens.pop(); }
      G.view = null; G.over = null;
      if (G.review && G.review.done) G.review = Object.assign({}, G.review, { cls: G.review.cls.slice(0, keep + 1), partial: true });
      G.opening = openingName(G.chess.sanList);
    }
    const res = applyMove({ from, to, promotion });
    if (!res) return;
    const st = G.chess.status();
    if (st.over) G.over = { winner: st.winner, reason: st.reason };
    render();
  },
  restore() {
    const s = this.saved;
    if (!s) return;
    this.saved = null;
    const start = G.startFen, orient = G.orient, meta = G.meta;
    resetBoard(start);
    for (const m of s.moves) applyMove(m, true);
    G.orient = orient; G.meta = meta; G.over = s.over; G.review = s.review;
    render();
  },
  async evalPos(fen, ms) {
    const have = this.cache.get(fen);
    if (have && have.ms >= ms) return have;
    const ch = new Chess(fen);
    const st = ch.status();
    let entry;
    if (st.over) {
      if (st.reason === 'checkmate') entry = { cp: ch.turn === 'w' ? -10000 : 10000, mate: 0, best: null, depth: 99, ms: 1e9 };
      else entry = { cp: 0, mate: null, best: null, depth: 99, ms: 1e9, draw: true };
    } else {
      const r = await Eng.eval(fen, ms);
      if (!r || r.cancelled || !r.move) return have || null;
      const s = ch.turn === 'w' ? r.score : -r.score;
      if (Math.abs(r.score) > MATE_SCORE - 1000) {
        const plies = MATE_SCORE - Math.abs(r.score);
        const sign = s > 0 ? 1 : -1;
        entry = { cp: sign * 10000, mate: sign * Math.ceil(plies / 2), best: r.move, depth: r.depth, ms };
      } else entry = { cp: s, mate: null, best: r.move, depth: r.depth, ms };
    }
    this.cache.set(fen, entry);
    if (this.cache.size > 4000) this.cache.delete(this.cache.keys().next().value);
    return entry;
  },
  schedule() {
    if (G.mode !== 'analysis' || Review.running) return;
    const fen = this.current();
    const c = this.cache.get(fen);
    if (c && c.ms >= 1500) return;
    if (this.pendingFen === fen) return;
    this.pendingFen = fen;
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      if (Review.running || G.mode !== 'analysis') { this.pendingFen = null; return; }
      Eng.reset();
      const r = await this.evalPos(fen, 1500);
      if (this.pendingFen === fen) this.pendingFen = null;
      if (r && G.mode === 'analysis') { Extra.renderEval(); Extra.renderPanel(); renderArrows(); }
    }, 120);
  }
};

/* ================= Oyun incelemesi ================= */
const Review = {
  running: false, token: 0,
  fromCurrent() {
    const moves = G.moves.map(m => ({ from: m.from, to: m.to, promotion: m.promotion || '' }));
    const meta = { white: playerInfo('w').name.replace(' (sen)', ''), black: playerInfo('b').name.replace(' (sen)', ''), my: G.my, histId: G.histId };
    Analysis.open({ fen: G.startFen, moves, meta, orient: G.orient, over: G.over });
    this.run();
  },
  async run() {
    if (G.mode !== 'analysis' || !G.moves.length) return;
    const tok = ++this.token;
    this.running = true;
    clearTimeout(Analysis.timer);
    Eng.reset();
    Analysis.pendingFen = null;
    G.review = { progress: 0, done: false, cls: [], acc: null };
    G.view = 0;
    render();
    const fens = G.fens.slice();
    const per = Math.round(Math.max(180, Math.min(700, 32000 / fens.length)));
    for (let i = 0; i < fens.length; i++) {
      let r = await Analysis.evalPos(fens[i], per);
      if (tok !== this.token) return;
      if (!r) r = await Analysis.evalPos(fens[i], per); // iptal edildiyse bir kez daha dene
      if (tok !== this.token) return;
      G.review.progress = (i + 1) / fens.length;
      Extra.renderPanel();
    }
    this.running = false;
    this.classify();
    G.review.done = true;
    PzPlus.onReviewDone();
    Sound.play('notify');
    render();
  },
  stop() { this.token++; this.running = false; },
  classify() {
    const R = G.review, cls = [];
    let bookPlies = 0;
    if (G.startFen === new Chess().fen()) {
      const sans = G.moves.map(m => m.san.replace(/[+#]/g, ''));
      for (let n = 1; n <= Math.min(sans.length, 14); n++) if (OPENING_MAP.has(sans.slice(0, n).join(' '))) bookPlies = n;
    }
    const accs = { w: [], b: [] }, counts = { w: {}, b: {} };
    for (let i = 1; i <= G.moves.length; i++) {
      const m = G.moves[i - 1], before = Analysis.cache.get(G.fens[i - 1]), after = Analysis.cache.get(G.fens[i]);
      if (!before || !after) continue;
      const sgn = m.color === 'w' ? 1 : -1;
      const wpB = winP(before.cp * sgn), wpA = winP(after.cp * sgn);
      const drop = Math.max(0, wpB - wpA);
      const legalN = new Chess(G.fens[i - 1]).moves().length;
      const isBest = before.best && before.best.from === m.from && before.best.to === m.to && (before.best.promotion || '') === (m.promotion || '');
      let k;
      if (i <= bookPlies) k = 'book';
      else if (legalN === 1) k = 'forced';
      else if (isBest) k = 'best';
      else if (drop < 0.02) k = 'excellent';
      else if (drop < 0.05) k = 'good';
      else if (drop < 0.10) k = 'inaccuracy';
      else if (drop < 0.20) k = 'mistake';
      else k = 'blunder';
      const acc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop * 100) - 3.1669));
      accs[m.color].push(acc);
      counts[m.color][k] = (counts[m.color][k] || 0) + 1;
      cls[i] = { k, drop, best: before.best, bestSan: isBest ? '' : sanOf(G.fens[i - 1], before.best) };
    }
    const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    R.cls = cls; R.acc = { w: mean(accs.w), b: mean(accs.b) }; R.counts = counts;
  }
};

/* ================= PGN ================= */
const PGN = {
  build() {
    const meta = G.meta || {};
    const names = { w: meta.white || playerInfo('w').name.replace(' (sen)', ''), b: meta.black || playerInfo('b').name.replace(' (sen)', '') };
    const d = new Date();
    const res = resultStr(G.over);
    const h = [['Event', 'Rok Satranç'], ['Site', 'Rok'], ['Date', `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`],
      ['White', names.w], ['Black', names.b], ['Result', res]];
    if (G.startFen !== START_FEN) h.push(['SetUp', '1'], ['FEN', G.startFen]);
    if (G.opening) h.push(['Opening', G.opening]);
    const c = new Chess(G.startFen);
    let num = c.full, body = '', first = true;
    for (const m of G.moves) {
      if (m.color === 'w') body += `${num}. `;
      else if (first) body += `${num}... `;
      body += m.san + ' ';
      if (m.color === 'b') num++;
      first = false;
    }
    body += res;
    return h.map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`).join('\n') + '\n\n' + body.replace(/(.{1,78})(\s|$)/g, '$1\n').trim();
  },
  parseMove(ch, tok) {
    const r = ch.move(tok);
    if (r) return r;
    // Esnek okuma: gereksiz ayrıştırma, eksik "=" gibi durumlar
    const t = tok.replace(/[+#?!]/g, '');
    const m = t.match(/^([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])=?([QRBNqrbn])?$/);
    if (!m) return null;
    const piece = m[1] || 'P', to = Chess.index(m[4]);
    const cands = ch.moves().filter(x => x.piece.toUpperCase() === piece && x.to === to &&
      (!m[2] || 'abcdefgh'[x.from & 7] === m[2]) && (!m[3] || String(8 - (x.from >> 3)) === m[3]) &&
      (!x.promotion || x.promotion === (m[5] || 'q').toLowerCase()));
    return cands.length === 1 ? ch.move(cands[0]) : null;
  },
  parse(text) {
    text = String(text || '').trim();
    if (!text) throw new Error('Önce bir PGN ya da FEN yapıştır');
    if (/^[pnbrqkPNBRQK1-8]+(\/[pnbrqkPNBRQK1-8]+){7}(\s|$)/.test(text)) {
      const fen = text.split(/\s+/).length < 2 ? text + ' w - - 0 1' : text;
      new Chess(fen);
      return { fen, moves: [], meta: null };
    }
    const tags = {};
    text.replace(/\[(\w+)\s+"([^"]*)"\]/g, (_, k, v) => { tags[k] = v; return ''; });
    let body = text.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
    let prev;
    do { prev = body; body = body.replace(/\([^()]*\)/g, ' '); } while (body !== prev);
    body = body.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|½-½|\*)\s*$/, ' ');
    const fen = tags.FEN || START_FEN;
    const ch = new Chess(fen);
    const moves = [];
    const toks = body.split(/\s+/).filter(Boolean);
    for (let i = 0; i < toks.length; i++) {
      const r = this.parseMove(ch, toks[i]);
      if (!r) throw new Error(`${moves.length + 1}. yarım hamle okunamadı: "${toks[i]}"`);
      moves.push({ from: r.from, to: r.to, promotion: r.promotion || '' });
    }
    const over = /^(1-0|0-1|1\/2-1\/2)$/.test(tags.Result || '') ? { winner: tags.Result === '1-0' ? 'w' : tags.Result === '0-1' ? 'b' : null, reason: 'pgn' } : null;
    return { fen, moves, meta: { white: tags.White || 'Beyaz', black: tags.Black || 'Siyah' }, over };
  },
  showExport() {
    $('#pgnOut').value = this.build();
    $('#fenOut').value = viewChess().fen();
    $('#pgnModal').hidden = false;
  }
};
REASONS.pgn = 'Kayıtlı sonuç';
function copyText(text, el) {
  const fallback = () => { el.focus(); el.select(); toast('Seçtim, Ctrl+C ile kopyala'); };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Kopyalandı'), fallback); else fallback();
}
$('#copyPgn').addEventListener('click', () => copyText($('#pgnOut').value, $('#pgnOut')));
$('#copyFen').addEventListener('click', () => copyText($('#fenOut').value, $('#fenOut')));
$('#closePgn').addEventListener('click', () => hideModal('#pgnModal'));

/* ================= Bulmacalar ================= */
const THEMES_TR = {
  mate: 'Mat', mateIn1: '1 hamlede mat', mateIn2: '2 hamlede mat', mateIn3: '3 hamlede mat', mateIn4: '4 hamlede mat',
  fork: 'Çatal', pin: 'Açmaz', skewer: 'Şiş', discoveredAttack: 'Açarak saldırı', discoveredCheck: 'Açarak şah', doubleCheck: 'Çifte şah',
  sacrifice: 'Feda', deflection: 'Saptırma', attraction: 'Çekme', clearance: 'Yol açma', interference: 'Araya girme', intermezzo: 'Ara hamle',
  hangingPiece: 'Korumasız taş', trappedPiece: 'Kapana kısılmış taş', backRankMate: 'Arka sıra matı', smotheredMate: 'Boğuk mat',
  promotion: 'Terfi', underPromotion: 'Küçük terfi', advancedPawn: 'İleri piyon', zugzwang: 'Zugzwang', quietMove: 'Sessiz hamle',
  defensiveMove: 'Savunma hamlesi', kingsideAttack: 'Şah kanadı saldırısı', queensideAttack: 'Vezir kanadı saldırısı', exposedKing: 'Açık şah',
  endgame: 'Oyun sonu', middlegame: 'Oyun ortası', opening: 'Açılış', rookEndgame: 'Kale oyun sonu', pawnEndgame: 'Piyon oyun sonu',
  bishopEndgame: 'Fil oyun sonu', knightEndgame: 'At oyun sonu', queenEndgame: 'Vezir oyun sonu', queenRookEndgame: 'Vezir ve kale oyun sonu',
  capturingDefender: 'Savunanı alma', xRayAttack: 'Röntgen saldırısı', enPassant: 'Geçerken alma', castling: 'Rok', attackingF2F7: 'f2/f7 saldırısı'
};
const THEME_FILTERS = ['', 'mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'sacrifice', 'deflection', 'hangingPiece', 'backRankMate', 'promotion', 'endgame', 'rookEndgame', 'pawnEndgame', 'opening'];
const themeName = t => THEMES_TR[t] || (/Mate$/.test(t) ? 'Mat deseni' : '');

const Puzzle = {
  data: null, cur: null, step: 0, state: 'idle', failed: false, rated: false, hintUsed: false, delta: null, rush: null,
  theme: store.get('pzTheme', ''),
  rating() { return store.get('pzRating', 1000); },
  async load() {
    if (this.data) return this.data;
    const r = await fetch('puzzles.json');
    if (!r.ok) throw new Error('Bulmaca dosyası yüklenemedi');
    this.data = (await r.json()).map(a => ({ id: a[0], fen: a[1], moves: a[2].split(' '), rating: a[3], themes: a[4] ? a[4].split(' ') : [] }));
    return this.data;
  },
  async renderHome() {
    const pane = $('#pane-puzzles');
    const best = { time: store.get('rushBest:time', 0), survival: store.get('rushBest:survival', 0) };
    const st = store.get('pzStats', { ok: 0, fail: 0 });
    pane.innerHTML = `
      <header class="pane-head"><h1>Bulmacalar</h1><p>Gerçek oyunlardan alınmış pozisyonlar. Rakip ilk hamleyi yapar, sen en iyi devamı bulursun. Sınır yok.</p></header>
      ${PzPlus.block()}
      <div class="pz-modes">
        <div class="block">
          <h2>Bulmaca çöz</h2>
          <div class="big-stat"><div><span class="label">Puanın</span><div class="stat-big">${this.rating()}</div></div>
          <div><span class="label">Çözülen</span><div class="stat-big small">${st.ok}<span style="color:var(--faint)">/${st.ok + st.fail}</span></div></div></div>
          <div class="field"><span class="label">Tema</span><div class="theme-list" id="pzThemes">${THEME_FILTERS.map(t => `<button class="chip${this.theme === t ? ' on' : ''}" data-t="${t}">${t ? THEMES_TR[t] : 'Karışık'}</button>`).join('')}</div></div>
          <div><button class="btn primary big" id="pzStart">${icon('play')}Bulmaca çöz</button></div>
        </div>
        <div class="block">
          <h2>Bulmaca Yarışı</h2>
          <p class="muted" style="margin:0">Kolaydan başlar, her doğruyla zorlaşır. Üç yanlışta biter.</p>
          <div class="big-stat"><div><span class="label">3 dakika rekoru</span><div class="stat-big">${best.time}</div></div>
          <div><span class="label">Hayatta kal rekoru</span><div class="stat-big">${best.survival}</div></div></div>
          <div class="row-gap"><button class="btn primary" id="rushTime">${icon('clock')}3 dakika</button><button class="btn" id="rushSurv">${icon('target')}Hayatta kal</button></div>
        </div>
      </div>
      ${Drill.block()}
      <p class="footnote">Bulmacalar Lichess'in herkese açık (CC0) veritabanından alındı.</p>`;
    Drill.bind();
    $('#pzThemes').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; this.theme = b.dataset.t; store.set('pzTheme', this.theme); this.renderHome(); };
    $('#pzStart').onclick = () => { this.set = null; this.next(); };
    PzPlus.bind();
    $('#rushTime').onclick = () => this.startRush('time');
    $('#rushSurv').onclick = () => this.startRush('survival');
  },
  pick(target, opts = {}) {
    const seen = new Set(opts.exclude || store.get('pzSeen', []));
    const pool = this.data.filter(p => (!opts.theme || p.themes.includes(opts.theme)) && !seen.has(p.id));
    const list = pool.length ? pool : this.data.filter(p => !opts.theme || p.themes.includes(opts.theme));
    for (let w = opts.window || 100; w < 4000; w *= 2) {
      const c = list.filter(p => Math.abs(p.rating - target) <= w);
      if (c.length) return c[Math.floor(Math.random() * c.length)];
    }
    return list[Math.floor(Math.random() * list.length)];
  },
  async next() {
    if (this.set) return PzPlus.next();
    try { await this.load(); } catch (e) { toast('Bulmacalar yüklenemedi. Rok\'u baslat.bat ile açtığından emin ol.'); return; }
    this.rush = null;
    this.start(this.pick(this.rating(), { theme: this.theme }));
  },
  start(p) {
    stopBot();
    Review.stop(); Eng.reset();
    G.mode = 'puzzle'; G.clock = null; G.tc = { base: 0, inc: 0 }; G.meta = null;
    resetBoard(p.fen);
    this.cur = p; this.step = 0; this.failed = false; this.rated = false; this.hintUsed = false; this.delta = null; this.state = 'opp';
    G.my = G.chess.turn === 'w' ? 'b' : 'w';
    G.orient = G.my;
    hideModal('#resultModal');
    showScreen('game');
    buildBoard();
    render();
    setTimeout(() => { if (this.cur === p && G.mode === 'puzzle') this.playOpp(); }, 600);
  },
  playOpp() {
    const u = this.cur.moves[this.step];
    if (!u) return;
    applyMove(fromUci(u));
    this.step++;
    this.state = 'solve';
    render();
  },
  canMove() { return G.mode === 'puzzle' && this.state === 'solve'; },
  onUserMove(from, to, promotion) {
    if (this.state !== 'solve') return;
    const exp = this.cur.moves[this.step];
    const played = Chess.sqName(from) + Chess.sqName(to) + (promotion || '');
    let ok = played === exp || (exp.length === 4 && played.slice(0, 4) === exp);
    if (!ok) { const t = new Chess(G.chess.fen()); const r = t.move({ from, to, promotion }); if (r && r.mate) ok = true; }
    const res = applyMove({ from, to, promotion: promotion || (exp.length === 5 ? exp[4] : '') });
    if (!res) return;
    if (ok) {
      this.step++;
      if (this.step >= this.cur.moves.length || G.chess.status().over) return this.solved();
      this.state = 'opp';
      flash('ok', 'Doğru!');
      render();
      setTimeout(() => { if (G.mode === 'puzzle' && this.state === 'opp') this.playOpp(); }, 450);
    } else {
      this.state = 'wrong';
      Sound.play('illegal');
      flash('bad', 'Yanlış');
      this.markFail();
      render();
      setTimeout(() => {
        if (G.mode !== 'puzzle') return;
        G.chess.undo(); G.moves.pop(); G.fens.pop();
        if (this.rush) { this.rushNext(false); return; }
        this.state = 'solve';
        render();
      }, 650);
    }
  },
  markFail() {
    if (this.failed) return;
    this.failed = true;
    if (!this.rush) this.rate(0);
  },
  solved() {
    this.state = 'done';
    flash('ok', this.failed ? 'Tamamlandı' : 'Çözüldü!');
    Sound.play('notify');
    if (!this.failed && !this.rush) this.rate(1);
    Activity.mark('pz');
    if (this.set) PzPlus.onDone(!this.failed);
    if (this.rush) { this.rush.score++; render(); setTimeout(() => this.rushNext(true), 450); return; }
    render();
  },
  rate(score) {
    if (this.rated || this.rush) return;
    if (this.set && this.set.unrated) { this.rated = true; return; }
    this.rated = true;
    const seen = store.get('pzSeen', []); seen.push(this.cur.id); store.set('pzSeen', seen.slice(-2500));
    const st = store.get('pzStats', { ok: 0, fail: 0 }); st[score ? 'ok' : 'fail']++; store.set('pzStats', st);
    if (!score) { const f = store.get('pzFails', []); f.push({ ts: Date.now(), themes: this.cur.themes }); store.set('pzFails', f.slice(-300)); }
    if (this.hintUsed) { this.delta = 0; return; }
    const r = this.rating(), n = st.ok + st.fail;
    const exp = 1 / (1 + Math.pow(10, (this.cur.rating - r) / 400));
    const d = Math.round((n < 20 ? 40 : 20) * (score - exp));
    const nr = Math.max(100, r + d);
    store.set('pzRating', nr);
    const h = store.get('pzHist', []); h.push([Date.now(), nr]); store.set('pzHist', h.slice(-400));
    this.delta = d;
  },
  hint() {
    if (this.state !== 'solve') return;
    this.hintUsed = true;
    const m = fromUci(this.cur.moves[this.step]);
    G.marks.clear(); G.marks.add(m.from);
    render();
  },
  async showSolution() {
    if (this.state === 'done') return;
    this.markFail();
    this.state = 'showing';
    render();
    while (this.step < this.cur.moves.length && G.mode === 'puzzle' && this.state === 'showing') {
      await new Promise(r => setTimeout(r, 650));
      if (G.mode !== 'puzzle' || this.state !== 'showing') return;
      applyMove(fromUci(this.cur.moves[this.step]));
      this.step++;
      render();
    }
    if (G.mode === 'puzzle') { this.state = 'done'; if (this.set) PzPlus.onDone(false); render(); }
  },
  retry() { const p = this.cur; const failed = this.failed, rated = this.rated, delta = this.delta; this.start(p); this.failed = failed; this.rated = rated; this.delta = delta; },
  /* ----- Bulmaca Yarışı ----- */
  async startRush(kind) {
    try { await this.load(); } catch (e) { toast('Bulmacalar yüklenemedi. Rok\'u baslat.bat ile açtığından emin ol.'); return; }
    this.set = null;
    this.rush = { kind, score: 0, strikes: 0, target: 450, used: [], endAt: kind === 'time' ? now() + 180000 : null, over: false };
    Sound.play('start');
    this.rushNext(null);
  },
  rushNext(prevOk) {
    const R = this.rush;
    if (!R || R.over) return;
    if (prevOk === false) R.strikes++;
    if (R.strikes >= 3) return this.rushEnd();
    if (prevOk != null) R.target += prevOk ? 45 : 15;
    const p = this.pick(R.target, { exclude: R.used, window: 60 });
    R.used.push(p.id);
    const keep = R;
    this.start(p);
    this.rush = keep;
  },
  rushEnd() {
    const R = this.rush;
    if (!R || R.over) return;
    R.over = true;
    this.state = 'done';
    const key = 'rushBest:' + R.kind, best = store.get(key, 0);
    R.record = R.score > best;
    if (R.record) store.set(key, R.score);
    R.best = Math.max(best, R.score);
    Sound.play('end');
    render();
  },
  panel() {
    const p = this.cur, R = this.rush;
    if (!p) return '';
    let h = '';
    if (R) {
      const left = R.endAt ? Math.max(0, R.endAt - now()) : null;
      h += `<div class="row-gap"><div><span class="label">Skor</span><div class="pz-big">${R.score}</div></div>
        ${left != null ? `<div style="margin-left:auto;text-align:right"><span class="label">Kalan süre</span><div class="pz-big" id="rushTimer">${fmtClock(left)}</div></div>` : ''}</div>
        <div class="strikes">${[0, 1, 2].map(i => `<span class="${i < R.strikes ? 'hit' : ''}">✕</span>`).join('')}</div>`;
      if (R.over) h += `<div class="pz-status ${R.record ? 'ok' : ''}">${R.record ? 'Yeni rekor!' : 'Yarış bitti'} · ${R.score} bulmaca</div><div class="muted">Rekorun: ${R.best}</div>`;
      else h += `<div class="muted">${colorName(G.my)} oynuyor · bulmaca puanı ${p.rating}</div>`;
      return h;
    }
    const done = this.state === 'done' || this.state === 'showing';
    const status = {
      opp: ['', 'Rakip oynuyor…'], solve: ['', `${colorName(G.my)} oynuyor. En iyi hamleyi bul.`],
      wrong: ['bad', 'Yanlış hamle. Tekrar dene.'], showing: ['', 'Çözüm gösteriliyor…'],
      done: [this.failed ? '' : 'ok', this.failed ? 'Çözüm bu.' : 'Çözüldü!']
    }[this.state] || ['', ''];
    h += `<div class="pz-status ${status[0]}">${status[1]}</div>`;
    if (this.state === 'solve' && this.failed) h += '<div class="muted">Bu bulmacadan artık puan alamazsın, ama çözmeyi deneyebilirsin.</div>';
    if (done || this.failed) {
      const th = p.themes.map(themeName).filter(Boolean);
      if (p.rating) h += `<div class="comment">Bulmaca puanı: <b>${p.rating}</b>${th.length ? `<br>Temalar: ${esc([...new Set(th)].join(', '))}` : ''}</div>`;
      if (this.delta != null) h += `<div class="muted">Puanın: <b style="color:var(--fg)">${this.rating()}</b> <span style="color:${this.delta >= 0 ? 'var(--good)' : 'var(--bad)'}">(${this.delta >= 0 ? '+' : ''}${this.delta})</span>${this.hintUsed ? ' · ipucu kullandın, puan değişmedi' : ''}</div>`;
    }
    h += PzPlus.panelExtra();
    return h;
  },
  actions(add) {
    const R = this.rush;
    if (R) {
      if (R.over) { add('Tekrar oyna', () => this.startRush(R.kind), 'primary'); add('Menü', goHome); }
      else armButton(add('Bitir', null, 'danger'), 'Emin misin?', () => this.rushEnd());
      return;
    }
    const done = this.state === 'done';
    if (!done) {
      add('İpucu', () => this.hint()).disabled = this.state !== 'solve';
      add('Çözümü göster', () => this.showSolution()).disabled = this.state === 'showing';
    } else {
      add('Sonraki bulmaca', () => this.next(), 'primary');
      if (this.failed) add('Tekrar dene', () => this.retry());
      add('Analiz et', () => Analysis.open({ fen: this.cur.fen, moves: this.cur.moves.map(fromUci), orient: G.orient }));
    }
  },
  tick() {
    const R = this.rush;
    if (!R || R.over || !R.endAt || G.mode !== 'puzzle') return;
    const left = R.endAt - now();
    const el = $('#rushTimer');
    if (el) el.textContent = fmtClock(Math.max(0, left));
    if (left <= 0) this.rushEnd();
  }
};
setInterval(() => Puzzle.tick(), 200);

let flashTimer = null;
function flash(kind, text) {
  const el = $('#pzFlash');
  el.className = 'pz-flash ' + kind;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.hidden = true; }, 1100);
}

/* ================= Geçmiş ve istatistik ================= */
const MODE_TR = { bot: 'Bot', local: 'Aynı bilgisayar', online: 'Online', analysis: 'Analiz' };
const History = {
  list() { return store.get('history', []); },
  save() {
    if (G.saved || !G.over || G.over.reason === 'abort' || !G.moves.length) return;
    if (!['bot', 'local', 'online'].includes(G.mode)) return;
    if (G.mode === 'online' && !G.my) return;
    G.saved = true;
    const name = c => playerInfo(c).name.replace(' (sen)', '');
    const e = {
      id: Date.now() + '-' + Math.floor(Math.random() * 1e4), ts: Date.now(), mode: G.mode, white: name('w'), black: name('b'), my: G.my,
      winner: G.over.winner, reason: G.over.reason, tc: G.tc, startFen: G.startFen, moves: G.moves.map(m => m.san), opening: G.opening,
      bot: G.mode === 'bot' ? G.bot : null
    };
    const l = this.list(); l.unshift(e); store.set('history', l.slice(0, 300));
    G.histId = e.id;
    Activity.mark('gm');
  },
  outcome(e) { return !e.my ? null : e.winner == null ? 'draw' : e.winner === e.my ? 'win' : 'loss'; },
  chart(points, color) {
    if (points.length < 2) return '<p class="empty-state">Grafik için en az iki sonuç gerekiyor.</p>';
    const W = 600, H = 150, pad = 26;
    const vals = points.map(p => p[1]), lo = Math.min(...vals) - 20, hi = Math.max(...vals) + 20;
    const x = i => pad + (i / (points.length - 1)) * (W - pad - 8), y = v => 8 + (1 - (v - lo) / (hi - lo)) * (H - 26);
    const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
    const ticks = [lo + 20, Math.round((lo + hi) / 2), hi - 20].map(v => Math.round(v));
    return `<svg class="rating-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Puan grafiği">
      ${ticks.map(v => `<line x1="${pad}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="#2f2b25" stroke-width="1"/><text x="0" y="${y(v) + 4}" fill="#6f675c" font-size="11" font-family="Consolas,monospace">${v}</text>`).join('')}
      <polygon points="${x(0)},${H - 18} ${line} ${x(points.length - 1)},${H - 18}" fill="${color}" opacity=".12"/>
      <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="${x(points.length - 1)}" cy="${y(vals[vals.length - 1])}" r="4" fill="${color}"/></svg>`;
  },
  renderHome() {
    const l = this.list(), pane = $('#pane-history');
    const tally = f => { const t = { win: 0, draw: 0, loss: 0 }; for (const e of l.filter(f)) { const o = this.outcome(e); if (o) t[o]++; } return t; };
    const statCard = (title, t) => {
      const n = t.win + t.draw + t.loss;
      return `<div class="stat"><span class="label">${title}</span><div class="v">${n}</div>
        <div class="sub">${t.win} galibiyet · ${t.draw} beraberlik · ${t.loss} mağlubiyet</div>
        <div class="wdl">${n ? `<div class="w" style="width:${t.win / n * 100}%"></div><div class="d" style="width:${t.draw / n * 100}%"></div><div class="l" style="width:${t.loss / n * 100}%"></div>` : ''}</div></div>`;
    };
    const rows = l.slice(0, 60).map(e => {
      const o = this.outcome(e), d = new Date(e.ts);
      const res = e.winner === 'w' ? '1-0' : e.winner === 'b' ? '0-1' : '½-½';
      return `<tr><td class="muted">${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${MODE_TR[e.mode] || e.mode}</td><td>${esc(e.white)} – ${esc(e.black)}</td>
        <td class="res ${o || 'draw'}">${res}</td><td class="muted">${Math.ceil(e.moves.length / 2)}</td><td class="muted">${e.acc != null ? e.acc.toFixed(1) + '%' : '–'}</td>
        <td><div class="row-gap" style="flex-wrap:nowrap"><button class="btn small" data-rev="${e.id}">${icon('search')}İncele</button><button class="btn small ghost" data-ana="${e.id}">Analiz</button></div></td></tr>`;
    }).join('');
    pane.innerHTML = `
      <header class="pane-head"><h1>Geçmiş ve istatistik</h1><p>Bitirdiğin her oyun burada. İstediğini açıp hamle hamle inceleyebilirsin. İncelediğin oyunların isabet oranı da istatistiklere eklenir.</p></header>
      <div class="stats-row">
        <div class="stat"><span class="label">Bot puanı</span><div class="v">${rating()}</div><div class="sub">${store.get('games', 0)} bot oyunu</div></div>
        <div class="stat"><span class="label">Bulmaca puanı</span><div class="v">${Puzzle.rating()}</div><div class="sub">${(s => `${s.ok} / ${s.ok + s.fail} çözüldü`)(store.get('pzStats', { ok: 0, fail: 0 }))}</div></div>
        ${statCard('Botlara karşı', tally(e => e.mode === 'bot'))}
        ${statCard('Arkadaşlara karşı', tally(e => e.mode === 'online'))}
      </div>
      <div class="charts">
        <div class="block"><h2>Bot puanı</h2>${this.chart(store.get('ratingHist', []), '#c9a253')}</div>
        <div class="block"><h2>Bulmaca puanı</h2>${this.chart(store.get('pzHist', []), '#8fc98a')}</div>
      </div>
      ${this.insights(l, tally, statCard)}
      <div class="block"><h2>Son oyunlar</h2>
        ${l.length ? `<div class="table-wrap"><table class="hist-table"><thead><tr><th>Tarih</th><th>Mod</th><th>Oyuncular</th><th>Sonuç</th><th>Hamle</th><th>İsabet</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
        : '<p class="empty-state">Henüz bitmiş bir oyunun yok. Oynadığın oyunlar burada listelenir.</p>'}
      </div>`;
    pane.onclick = e => {
      const r = e.target.closest('[data-rev]'), a = e.target.closest('[data-ana]');
      if (r) this.open(r.dataset.rev, true);
      if (a) this.open(a.dataset.ana, false);
    };
  },
  // Ayrıntılı istatistikler: renk, açılış, isabet, botlar
  insights(l, tally, statCard) {
    const mine = l.filter(e => e.my && (e.mode === 'bot' || e.mode === 'online'));
    if (!mine.length) return '';
    const wdl = t => { const n = t.win + t.draw + t.loss; return n ? `<div class="wdl"><div class="w" style="width:${t.win / n * 100}%"></div><div class="d" style="width:${t.draw / n * 100}%"></div><div class="l" style="width:${t.loss / n * 100}%"></div></div>` : ''; };
    const groups = new Map();
    for (const e of mine) { const k = e.opening || 'Açılış adı yok'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    const ops = [...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8).map(([k, es]) => {
      const t = { win: 0, draw: 0, loss: 0 }; es.forEach(e => t[this.outcome(e)]++);
      return `<tr><td>${esc(k)}</td><td class="muted">${es.length}</td><td style="min-width:140px">${wdl(t)}</td><td>${Math.round(t.win / es.length * 100)}%</td></tr>`;
    }).join('');
    const rev = mine.filter(e => e.acc != null);
    const avg = f => (rev.length ? rev.reduce((s, e) => s + f(e), 0) / rev.length : 0);
    const rec = store.get('rec', {});
    const bots = BOTS.map((b, i) => [b, rec['b' + i]]).filter(x => x[1]).map(([b, r]) => {
      const t = { win: r.w, draw: r.d, loss: r.l }, n = r.w + r.d + r.l;
      return `<tr><td>${esc(b.name)} <span class="muted">(${b.elo})</span></td><td class="muted">${n}</td><td style="min-width:140px">${wdl(t)}</td><td>${r.w}-${r.d}-${r.l}</td></tr>`;
    }).join('');
    return `
      <div class="block"><h2>İstatistikler</h2>
        <div class="stats-row">
          ${statCard('Beyazla', tally(e => e.my === 'w' && (e.mode === 'bot' || e.mode === 'online')))}
          ${statCard('Siyahla', tally(e => e.my === 'b' && (e.mode === 'bot' || e.mode === 'online')))}
          <div class="stat"><span class="label">Ortalama isabet</span><div class="v">${rev.length ? avg(e => e.acc).toFixed(1) + '%' : '–'}</div><div class="sub">${rev.length} incelenmiş oyun</div></div>
          <div class="stat"><span class="label">Oyun başına</span><div class="v">${rev.length ? avg(e => (e.cnt && e.cnt.blunder) || 0).toFixed(1) : '–'}</div><div class="sub">büyük hata · ${rev.length ? avg(e => (e.cnt && e.cnt.mistake) || 0).toFixed(1) : '–'} hata · ${rev.length ? avg(e => (e.cnt && e.cnt.inaccuracy) || 0).toFixed(1) : '–'} belirsiz</div></div>
        </div>
      </div>
      <div class="charts">
        <div class="block"><h2>Açılışlarına göre</h2><div class="table-wrap"><table class="hist-table"><thead><tr><th>Açılış</th><th>Oyun</th><th>G / B / M</th><th>Kazanma</th></tr></thead><tbody>${ops}</tbody></table></div></div>
        <div class="block"><h2>Botlara göre</h2>${bots ? `<div class="table-wrap"><table class="hist-table"><thead><tr><th>Bot</th><th>Oyun</th><th>G / B / M</th><th>Skor</th></tr></thead><tbody>${bots}</tbody></table></div>` : '<p class="empty-state">Henüz bot oyunu yok.</p>'}</div>
      </div>`;
  },
  open(id, review) {
    const e = this.list().find(x => x.id == id);
    if (!e) return;
    Analysis.open({ fen: e.startFen, moves: e.moves, meta: { white: e.white, black: e.black, my: e.my, histId: e.id }, orient: e.my || 'w', over: { winner: e.winner, reason: e.reason }, atStart: false });
    if (review) Review.run();
  }
};

/* ================= Tahta düzenleyici ================= */
const Editor = {
  b: new Array(64).fill(''), turn: 'w', orient: 'w', sel: 'P', els: [],
  open(fen) {
    stopBot(); Extra.leaveMode();
    this.load(fen || START_FEN);
    showScreen('editor');
    this.build();
    this.render();
  },
  load(fen) {
    const c = new Chess(fen);
    this.b = c.b.slice(); this.turn = c.turn;
    const cr = fen.split(/\s+/)[2] || '-';
    for (const k of 'KQkq') $('#ed' + k).checked = cr.includes(k);
    $$('#edTurn button').forEach(x => x.classList.toggle('on', x.dataset.v === this.turn));
  },
  build() {
    if (this.els.length) return;
    const board = $('#edBoard');
    for (let d = 0; d < 64; d++) { const el = document.createElement('div'); el.className = 'sq'; el.innerHTML = '<div class="pcw"></div>'; board.append(el); this.els.push(el); }
    board.addEventListener('contextmenu', e => e.preventDefault());
    board.addEventListener('pointerdown', e => {
      const r = board.getBoundingClientRect();
      const c = Math.floor((e.clientX - r.left) / r.width * 8), w = Math.floor((e.clientY - r.top) / r.height * 8);
      if (c < 0 || c > 7 || w < 0 || w > 7) return;
      const sq = this.orient === 'w' ? w * 8 + c : 63 - (w * 8 + c);
      if (e.button === 2 || this.sel === 'x' || this.b[sq] === this.sel) this.b[sq] = '';
      else {
        if (this.sel === 'K' || this.sel === 'k') { const i = this.b.indexOf(this.sel); if (i >= 0) this.b[i] = ''; }
        this.b[sq] = this.sel;
      }
      Sound.play('move');
      this.render();
    });
    const pal = (el, list) => {
      el.innerHTML = list.map(p => `<button data-p="${p}" title="${p === 'x' ? 'Silgi' : ''}">${p === 'x' ? icon('x') : pieceSVG(p)}</button>`).join('');
      el.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; this.sel = b.dataset.p; this.render(); });
    };
    pal($('#palTop'), ['k', 'q', 'r', 'b', 'n', 'p', 'x']);
    pal($('#palBottom'), ['K', 'Q', 'R', 'B', 'N', 'P', 'x']);
    $('#edTurn').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; this.turn = b.dataset.v; $$('#edTurn button').forEach(x => x.classList.toggle('on', x === b)); this.render(); });
    for (const k of 'KQkq') $('#ed' + k).addEventListener('change', () => this.render());
    $('#edFen').addEventListener('change', e => { try { this.load(e.target.value.trim()); this.render(); } catch (err) { $('#edError').textContent = 'Bu FEN okunamadı.'; } });
    $('#edStart').addEventListener('click', () => { this.load(START_FEN); this.render(); });
    $('#edClear').addEventListener('click', () => { this.b.fill(''); this.b[60] = 'K'; this.b[4] = 'k'; this.render(); });
    $('#edFlip').addEventListener('click', () => { this.orient = this.orient === 'w' ? 'b' : 'w'; this.render(); });
    $('#edBack').addEventListener('click', goHome);
    $('#edAnalyse').addEventListener('click', () => { const f = this.valid(); if (f) Analysis.open({ fen: f, orient: this.orient }); });
    $('#edPlay').addEventListener('click', () => { const f = this.valid(); if (f) startGame({ mode: 'bot', my: this.turn, bot: botSel, tc: { base: 0, inc: 0 }, fen: f }); });
  },
  fen() {
    let s = '';
    for (let r = 0; r < 8; r++) {
      let e = 0;
      for (let c = 0; c < 8; c++) { const p = this.b[r * 8 + c]; if (!p) e++; else { if (e) { s += e; e = 0; } s += p; } }
      if (e) s += e;
      if (r < 7) s += '/';
    }
    const ok = { K: this.b[60] === 'K' && this.b[63] === 'R', Q: this.b[60] === 'K' && this.b[56] === 'R', k: this.b[4] === 'k' && this.b[7] === 'r', q: this.b[4] === 'k' && this.b[0] === 'r' };
    let cr = '';
    for (const k of 'KQkq') { $('#ed' + k).disabled = !ok[k]; if (ok[k] && $('#ed' + k).checked) cr += k; }
    return `${s} ${this.turn} ${cr || '-'} - 0 1`;
  },
  error() {
    const cnt = p => this.b.filter(x => x === p).length;
    if (cnt('K') !== 1 || cnt('k') !== 1) return 'İki tarafın da tam olarak bir şahı olmalı.';
    for (let c = 0; c < 8; c++) if (/[pP]/.test(this.b[c] + this.b[56 + c])) return 'Piyonlar 1. ve 8. sırada olamaz.';
    try {
      const ch = new Chess(this.fen());
      if (ch.inCheck(this.turn === 'w' ? 'b' : 'w')) return `Sıra ${colorName(this.turn).toLowerCase()} tarafta, ama ${colorName(this.turn === 'w' ? 'b' : 'w').toLowerCase()} şah zaten tehdit altında.`;
    } catch (e) { return e.message; }
    return '';
  },
  valid() {
    const err = this.error();
    $('#edError').textContent = err;
    if (err) { Sound.play('illegal'); return null; }
    return this.fen();
  },
  render() {
    for (let d = 0; d < 64; d++) {
      const sq = this.orient === 'w' ? d : 63 - d, el = this.els[d], p = this.b[sq];
      el.className = 'sq' + ((((sq >> 3) + (sq & 7)) & 1) ? ' d' : '');
      el.firstChild.innerHTML = p ? pieceSVG(p) : '';
      $$('.coord', el).forEach(x => x.remove());
      if (d >= 56) el.insertAdjacentHTML('beforeend', `<span class="coord f">${'abcdefgh'[sq & 7]}</span>`);
      if (d % 8 === 0) el.insertAdjacentHTML('beforeend', `<span class="coord r">${8 - (sq >> 3)}</span>`);
    }
    $$('.palette button').forEach(b => b.classList.toggle('on', b.dataset.p === this.sel));
    const top = this.orient === 'w' ? '#palTop' : '#palBottom';
    $('#editor .board-col').prepend($(this.orient === 'w' ? '#palTop' : '#palBottom'));
    $('#editor .board-col').append($(this.orient === 'w' ? '#palBottom' : '#palTop'));
    void top;
    $('#edFen').value = this.fen();
    $('#edError').textContent = this.error();
  }
};

/* ================= Ortak kancalar (app.js bunları çağırır) ================= */
const Extra = {
  leaveMode() {
    Review.stop();
    Eng.reset();
    Analysis.pendingFen = null; Analysis.saved = null;
    Puzzle.rush = null; Puzzle.cur = null; Puzzle.state = 'idle'; Puzzle.set = null;
    G.meta = null;
    const f = $('#pzFlash'); if (f) f.hidden = true;
  },
  onTab(tab) {
    if (tab === 'puzzles') Puzzle.renderHome();
    if (tab === 'history') History.renderHome();
    if (tab === 'home') Home.render();
    if (tab === 'learn') Learn.renderHome();
    if (tab === 'openings') Openings.render();
  },
  playerInfo(color) {
    if (G.mode === 'analysis') {
      const m = G.meta;
      const name = m ? (color === 'w' ? m.white : m.black) : colorName(color);
      return { name, svg: pieceSVG(color === 'w' ? 'K' : 'k'), bg: '#2f2b25' };
    }
    if (G.mode === 'puzzle') {
      if (color === G.my) return { name: 'Sen', elo: Puzzle.rush ? null : Puzzle.rating(), svg: pieceSVG(color === 'w' ? 'K' : 'k'), bg: '#2f2b25' };
      const p = Puzzle.cur, showR = p && (Puzzle.state === 'done' || Puzzle.failed || Puzzle.rush);
      return { name: Puzzle.rush ? `Bulmaca ${Puzzle.rush.score + 1}` : 'Bulmaca', elo: showR ? p.rating : null, svg: `<svg class="ic" style="width:22px;height:22px;color:#a0978a"><use href="#i-target"/></svg>`, bg: '#2f2b25' };
    }
    return null;
  },
  modeLabel() {
    if (G.mode === 'analysis') return G.review ? 'Oyun incelemesi' : 'Analiz tahtası';
    if (G.mode === 'puzzle' && Puzzle.set && !Puzzle.rush) return PzPlus.label();
    if (G.mode === 'puzzle') return Puzzle.rush ? (Puzzle.rush.kind === 'time' ? 'Bulmaca Yarışı · 3 dakika' : 'Bulmaca Yarışı · Hayatta kal') : (Puzzle.theme ? 'Bulmaca · ' + THEMES_TR[Puzzle.theme] : 'Bulmaca');
    return '';
  },
  actions(add) {
    if (G.mode === 'puzzle') return Puzzle.actions(add);
    if (G.mode !== 'analysis') return;
    if (Analysis.saved) add('Ana oyuna dön', () => Analysis.restore(), 'primary');
    if (G.moves.length >= 2 && !G.review) add('Oyunu incele', () => Review.run(), 'primary');
    add(Analysis.showBest ? 'En iyi hamle: açık' : 'En iyi hamle: kapalı', () => { Analysis.showBest = !Analysis.showBest; render(); });
    add('Bota karşı oyna', () => startGame({ mode: 'bot', my: viewChess().turn, bot: botSel, tc: { base: 0, inc: 0 }, fen: Analysis.current() }));
    add('Düzenleyicide aç', () => Editor.open(Analysis.current()), 'ghost');
  },
  moveTag(ply) {
    const c = G.review && G.review.cls && G.review.cls[ply];
    if (!c || !CLS_SHOW.has(c.k)) return '';
    const d = CLS[c.k];
    return `<span class="ctag" style="background:${d.c}" title="${d.n}">${d.s}</span>`;
  },
  arrows() {
    if (G.mode !== 'analysis') return [];
    const out = [];
    const ply = G.view == null ? G.moves.length : G.view;
    const c = G.review && G.review.cls && G.review.cls[ply];
    if (c && c.best && ['inaccuracy', 'mistake', 'blunder', 'good'].includes(c.k)) out.push({ from: c.best.from, to: c.best.to, kind: 'best' });
    if (Analysis.showBest) {
      const e = Analysis.cache.get(Analysis.current());
      if (e && e.best) out.push({ from: e.best.from, to: e.best.to, kind: 'engine' });
    }
    return out;
  },
  render() {
    $('#game .game').classList.toggle('with-eval', G.mode === 'analysis');
    this.renderEval();
    this.renderPanel();
    Analysis.schedule();
  },
  renderEval() {
    const bar = $('#evalBar');
    if (G.mode !== 'analysis') { bar.hidden = true; return; }
    bar.hidden = false;
    const e = Analysis.cache.get(Analysis.current());
    if (!e) { $('.eval-num', bar).textContent = ''; return; }
    const share = e.mate != null ? (e.cp > 0 ? 1 : 0) : winP(e.cp);
    bar.classList.toggle('flipped', G.orient === 'b');
    $('.eval-fill', bar).style.height = (share * 100).toFixed(1) + '%';
    const num = $('.eval-num', bar);
    const whiteAhead = e.cp >= 0;
    num.textContent = fmtEval(e).replace(/[+-]/, '');
    num.className = 'eval-num ' + ((whiteAhead === (G.orient === 'w')) ? 'bottom' : 'top');
  },
  graph() {
    const n = G.fens.length;
    if (n < 2) return '';
    const W = 300, H = 64;
    const pts = G.fens.map((f, i) => { const e = Analysis.cache.get(f); const s = e ? (e.mate != null ? (e.cp > 0 ? 1 : 0) : winP(e.cp)) : 0.5; return [i / (n - 1) * W, (1 - s) * H]; });
    const line = pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ');
    const cur = (G.view == null ? G.moves.length : G.view) / (n - 1) * W;
    const dots = (G.review.cls || []).map((c, i) => c && ['mistake', 'blunder'].includes(c.k) ? `<circle cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="3.2" fill="${CLS[c.k].c}"/>` : '').join('');
    return `<svg class="graph" id="evalGraph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Değerlendirme grafiği">
      <polygon points="0,${H} ${line} ${W},${H}" fill="#f1ede4"/><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="#8a8f9b" stroke-width=".6" stroke-dasharray="3 3"/>
      <line x1="${cur}" x2="${cur}" y1="0" y2="${H}" stroke="#e3a948" stroke-width="1.6"/>${dots}</svg>`;
  },
  renderPanel() {
    const x = $('#xpanel');
    let h = '';
    if (G.mode === 'puzzle') h = Puzzle.panel();
    else if (G.mode === 'analysis') {
      const R = G.review;
      if (R && !R.done) h += `<div class="muted">Oyun inceleniyor… %${Math.round(R.progress * 100)}</div><div class="progress"><div style="width:${R.progress * 100}%"></div></div>`;
      if (R && R.done) {
        const pct = v => (v == null ? '–' : v.toFixed(1));
        const names = { w: playerInfo('w').name, b: playerInfo('b').name };
        h += `<div class="acc-row"><div class="acc"><span class="who">${esc(names.w)}</span><span class="pct">${pct(R.acc.w)}</span><span class="who">isabet</span></div>
          <div class="acc"><span class="who">${esc(names.b)}</span><span class="pct">${pct(R.acc.b)}</span><span class="who">isabet</span></div></div>`;
        if (G.meta && G.meta.my) { if (R.mistAdded) h += `<div class="muted">${R.mistAdded} hatan "Hatalarından öğren" bulmacalarına eklendi.</div>`; }
        else h += `<div class="row-gap"><span class="muted">Hatalarını bulmacaya çevir:</span><button class="btn small" data-mymist="w">Beyaz bendim</button><button class="btn small" data-mymist="b">Siyah bendim</button></div>`;
        h += Moments.html();
        h += '<div class="cls-grid">' + CLS_ORDER.filter(k => (R.counts.w[k] || 0) + (R.counts.b[k] || 0)).map(k =>
          `<span class="cls-name"><span class="ctag" style="background:${CLS[k].c}">${CLS[k].s}</span>${CLS[k].n}</span><span class="n">${R.counts.w[k] || 0}</span><span class="n">${R.counts.b[k] || 0}</span>`).join('') + '</div>';
        h += this.graph();
        if (R.partial) h += '<div class="muted" style="font-size:12px">Oyundan farklı bir hamle oynadın; inceleme ilk farklı hamleye kadar geçerli.</div>';
      }
      const ply = G.view == null ? G.moves.length : G.view;
      const c = R && R.cls && R.cls[ply];
      if (c && ply > 0) {
        const m = G.moves[ply - 1], d = CLS[c.k];
        let t = `<b>${esc(figurine(m.san))}</b> `;
        if (c.k === 'best') t += 'en iyi hamle.';
        else if (c.k === 'book') t += 'bilinen bir açılış hamlesi.';
        else if (c.k === 'forced') t += 'tek yasal hamleydi.';
        else if (c.k === 'excellent') t += 'mükemmel bir hamle.';
        else t += `${c.k === 'good' ? 'iyi bir hamle' : c.k === 'inaccuracy' ? 'belirsiz bir hamle' : c.k === 'mistake' ? 'bir hata' : 'büyük bir hata'}.`;
        if (c.bestSan && !['best', 'book', 'forced'].includes(c.k)) t += ` En iyisi <b>${esc(figurine(c.bestSan))}</b> idi.`;
        h += `<div class="comment" style="border-left:3px solid ${d.c}">${t}</div>`;
      }
      const e = Analysis.cache.get(Analysis.current());
      const bestSan = e && e.best ? sanOf(Analysis.current(), e.best) : '';
      h += `<div class="engine-line"><span>Değerlendirme <b>${e ? fmtEval(e) : '…'}</b></span><span>${e && e.depth && e.depth < 99 ? 'derinlik ' + e.depth : ''}</span><span>${bestSan ? 'En iyi <b>' + esc(figurine(bestSan)) + '</b>' : ''}</span></div>`;
    }
    x.innerHTML = h;
    x.hidden = !h;
  }
};
$('#xpanel').addEventListener('click', e => {
  const g = e.target.closest('#evalGraph');
  if (!g) return;
  const r = g.getBoundingClientRect();
  setView(Math.round((e.clientX - r.left) / r.width * (G.fens.length - 1)));
});

/* ----- Araçlar sekmesi ----- */
$('#openAnalysis').addEventListener('click', () => Analysis.open({}));
$('#openEditor').addEventListener('click', () => Editor.open());
function importText(review) {
  try {
    const g = PGN.parse($('#importText').value);
    Analysis.open({ fen: g.fen, moves: g.moves, meta: g.meta, over: g.over, atStart: false });
    if (review && g.moves.length >= 2) Review.run();
    else if (review) toast('İnceleme için en az iki hamlelik bir oyun gerekiyor');
  } catch (e) { toast(e.message, 3500); }
}
$('#importAnalyse').addEventListener('click', () => importText(false));
$('#importReview').addEventListener('click', () => importText(true));
