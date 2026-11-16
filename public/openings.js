/* Rok Satranç — Açılışlar: repertuvar, açılış ağacı ve ezber antrenmanı */
const REPS = [
  { id: 'italyan', side: 'w', rec: true, name: 'İtalyan Oyunu', line: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6',
    idea: 'Fil c4\'ten zayıf f7 karesine bakar. c3 ve d3 ile merkez sağlam kalır, sonra rok atıp yavaşça d4\'ü hazırlarsın. Başlangıç için en doğal açılış.' },
  { id: 'londra', side: 'w', rec: true, name: 'Londra Sistemi', line: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3',
    idea: 'Rakip ne oynarsa oynasın aynı dizilişi kurarsın: d4, Bf4, e3, Nf3, c3, Nbd2, Bd3. Ezberi az, planı net bir sistem.' },
  { id: 'ispanyol', side: 'w', name: 'İspanyol Açılışı', line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
    idea: 'Fil, e5 piyonunu koruyan atı baskı altına alır. Uzun vadeli baskı kuran klasik bir açılış. h3 ile rakip filin g4\'e gelmesi engellenir.' },
  { id: 'vg', side: 'w', name: 'Vezir Gambiti', line: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6',
    idea: 'c4 ile siyahın merkez piyonuna saldırırsın. Siyah merkezi tutarsa taşlarını rahatça geliştirir, merkezi bırakırsa sen merkezi alırsın.' },
  { id: 'iskoc', side: 'w', name: 'İskoç Oyunu', line: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4',
    idea: 'Merkezi erken açarsın. Taşlar hızla oyuna girer, oyun açık ve taktik olur.' },
  { id: 'caro', side: 'b', rec: true, name: 'Caro-Kann Savunması', line: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7',
    idea: 'c6 ile d5\'i destekleyip merkeze karşı çıkarsın. Beyaz kareli filin piyon zincirinin dışına çıkar. Sağlam ve az riskli.' },
  { id: 'vgr', side: 'b', rec: true, name: 'Vezir Gambiti Ret', line: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7',
    idea: 'd4\'e karşı en sağlam cevaplardan biri. e6 ile d5\'i tutar, taşlarını sakin sakin geliştirip rok atarsın.' },
  { id: 'najdorf', side: 'b', name: 'Sicilya: Najdorf', line: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6',
    idea: 'Kazanmak için oynanan keskin bir savunma. a6 hem b5\'i hem de beyaz taşların b5\'e gelmesini kontrol eder.' },
  { id: 'fransiz', side: 'b', name: 'Fransız Savunması', line: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4',
    idea: 'Beyazın piyon zincirine tabandan (d4) saldırırsın. Kapalı, planlı oyunu sevenler için.' },
  { id: 'iskandinav', side: 'b', name: 'İskandinav Savunması', line: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6',
    idea: 'İlk hamlede merkezde çatışma çıkarırsın. Ezberi az, taşlar kolay gelişir. Vezir a5\'te güvende durur.' },
  { id: 'slav', side: 'b', name: 'Slav Savunması', line: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4',
    idea: 'c6 ile d5 korunur ve beyaz kareli fil dışarı çıkabilir. Çok sağlam bir yapı.' },
  { id: 'shint', side: 'b', name: 'Şah-Hint Savunması', line: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6',
    idea: 'Beyazın merkezi almasına izin verip sonra e5 ile karşı saldırı yaparsın. Fil g7\'den uzun çaprazı kontrol eder.' }
];

const Openings = {
  cur: null, ply: 0, line: [], moves: [], mode: 'view', mb: null, tr: null,
  learned() { return store.get('openLearned', {}); },

  render(keep) {
    const pane = $('#pane-openings');
    if (!this.cur) this.cur = REPS[0];
    const L = this.learned();
    const item = r => `<button class="op-item${this.cur.id === r.id ? ' on' : ''}" data-op="${r.id}">
      <span class="op-name">${esc(r.name)}</span>
      <span class="op-tags">${r.rec ? '<em>önerilen</em>' : ''}${L[r.id] ? `<b>${icon('check')}${L[r.id]}×</b>` : ''}</span></button>`;
    pane.innerHTML = `
      <header class="pane-head"><h1>Açılışlar</h1><p>Bir repertuvar seç, hamleleri ve fikirleri öğren, sonra ezberden oynayarak antrenman yap.</p></header>
      <div class="op-wrap">
        <div class="op-list">
          <span class="label">Beyazla</span>${REPS.filter(r => r.side === 'w').map(item).join('')}
          <span class="label" style="margin-top:18px">Siyahla</span>${REPS.filter(r => r.side === 'b').map(item).join('')}
        </div>
        <div class="op-board"><div id="opBoard"></div><div class="op-nav" id="opNav"></div></div>
        <div class="op-side" id="opSide"></div>
      </div>`;
    this.mb = new MiniBoard($('#opBoard'));
    pane.querySelector('.op-list').onclick = e => { const b = e.target.closest('[data-op]'); if (b) this.select(b.dataset.op); };
    $('#opNav').innerHTML = ['first', 'prev', 'next', 'last'].map(k => `<button class="nav-btn" data-n="${k}">${icon(k)}</button>`).join('');
    $('#opNav').onclick = e => {
      const b = e.target.closest('[data-n]'); if (!b || this.mode === 'train') return;
      const k = b.dataset.n, n = this.moves.length;
      this.ply = k === 'first' ? 0 : k === 'prev' ? Math.max(0, this.ply - 1) : k === 'next' ? Math.min(n, this.ply + 1) : n;
      this.show();
    };
    if (keep) this.show(); else this.select(this.cur.id);
  },
  select(id) {
    this.cur = REPS.find(r => r.id === id) || REPS[0];
    this.mode = 'view';
    this.line = this.cur.line.split(' ');
    this.moves = sanLine(this.line);
    this.ply = 0;
    $$('#pane-openings .op-item').forEach(b => b.classList.toggle('on', b.dataset.op === this.cur.id));
    this.show();
  },
  chessAt(ply) { const c = new Chess(); for (const m of this.moves.slice(0, ply)) c.move({ from: m.from, to: m.to, promotion: m.promotion }); return c; },
  sans(ply) { return this.moves.slice(0, ply).map(m => m.san); },

  // Kitap devamları: bu pozisyondan sonra açılış listesinde geçen hamleler
  book(ply) {
    const pre = this.sans(ply).map(s => s.replace(/[+#]/g, '')), out = new Map();
    for (const [k, nm] of OPENINGS) {
      const parts = k.split(' ');
      if (parts.length <= pre.length || parts.slice(0, pre.length).join(' ') !== pre.join(' ')) continue;
      const nx = parts[pre.length];
      if (!out.has(nx) || parts.length === pre.length + 1) out.set(nx, parts.length === pre.length + 1 ? nm : (out.get(nx) || nm));
    }
    return [...out.entries()];
  },

  show() {
    const ch = this.chessAt(this.ply), mb = this.mb, r = this.cur;
    mb.orient = r.side;
    const lm = this.moves[this.ply - 1];
    mb.last = lm ? [lm.from, lm.to] : [];
    mb.marks = {};
    mb.legal = this.mode === 'view' ? sq => chessTargets(ch, sq) : sq => (this.tr && !this.tr.busy && ch.turn === r.side ? chessTargets(ch, sq) : []);
    mb.onMove = (f, t) => (this.mode === 'view' ? this.explore(ch, f, t) : this.trainMove(ch, f, t));
    mb.setChess(ch);
    this.side();
  },
  explore(ch, f, t) {
    const m = chessMove(ch, f, t);
    if (!m) return;
    const nextSan = this.moves[this.ply] && this.moves[this.ply].san;
    if (m.san !== nextSan) { this.moves = this.moves.slice(0, this.ply).concat([m]); this.custom = true; }
    this.ply++;
    Sound.play(m.captured ? 'capture' : 'move');
    this.show();
  },

  side() {
    const r = this.cur, s = $('#opSide');
    let name = openingName(this.sans(this.ply)) || (this.ply ? '' : 'Başlangıç pozisyonu');
    if (name === r.name) name = '';
    let h = `<div><span class="label">${r.side === 'w' ? 'Beyazla' : 'Siyahla'}</span><h2 class="op-title">${esc(r.name)}</h2>${name ? `<div class="muted">${esc(name)}</div>` : ''}</div>`;
    if (this.mode === 'view') {
      h += `<p class="op-idea">${esc(r.idea)}</p>`;
      h += `<div class="op-moves">${this.moves.map((m, i) => `${i % 2 === 0 ? `<span class="mn">${i / 2 + 1}.</span>` : ''}<button class="mv${i === this.ply - 1 ? ' on' : ''}${this.custom && i >= this.line.length ? ' x' : ''}" data-p="${i + 1}">${esc(m.san)}</button>`).join('')}</div>`;
      const bk = this.book(this.ply);
      h += `<div class="block"><span class="label">Bu pozisyondan devamlar</span>${bk.length ? `<div class="op-book">${bk.map(([mv, nm]) => `<button data-bk="${esc(mv)}"><b>${esc(mv)}</b><span>${esc(nm)}</span></button>`).join('')}</div>` : '<p class="muted" style="margin:0">Açılış kitabında devam yok. Tahtada istediğin hamleyi oynayarak keşfetmeye devam edebilirsin.</p>'}</div>`;
      h += `<div class="row-gap"><button class="btn primary" id="opTrain">${icon('play')}Ezberden oyna</button>${this.custom ? `<button class="btn ghost" id="opReset">${icon('repeat')}Ana hatta dön</button>` : ''}<button class="btn ghost" id="opAna">${icon('pulse')}Analiz et</button></div>`;
    } else {
      const T = this.tr, total = this.line.length;
      h += `<div class="progress"><div style="width:${this.ply / total * 100}%"></div></div>`;
      h += `<p class="op-idea">${T.done ? `Tebrikler! Hattı ${T.errors ? T.errors + ' hatayla' : 'hatasız'} bitirdin.` : `${r.side === 'w' ? 'Beyaz' : 'Siyah'} taşlarla hattın hamlelerini ezberden oyna. Rakibin hamlelerini Rok yapar.`}</p>`;
      if (T.msg) h += `<div class="lesson-fb ${T.msgk}">${esc(T.msg)}</div>`;
      h += `<div class="muted">Hamle ${Math.min(this.ply, total)}/${total} · Hata: ${T.errors}</div>`;
      h += `<div class="row-gap">${T.done ? `<button class="btn primary" id="opTrain">${icon('repeat')}Tekrar</button>` : `<button class="btn" id="opHint">${icon('bulb')}İpucu</button>`}<button class="btn ghost" id="opStop">Bitir</button></div>`;
    }
    s.innerHTML = h;
    s.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.p) { this.ply = Number(b.dataset.p); this.show(); }
      if (b.dataset.bk) { const ch = this.chessAt(this.ply); const m = sanLine([b.dataset.bk], ch.fen())[0]; this.moves = this.moves.slice(0, this.ply).concat([m]); this.custom = true; this.ply++; this.show(); }
      if (b.id === 'opTrain') this.train();
      if (b.id === 'opReset') { this.custom = false; this.select(r.id); }
      if (b.id === 'opStop') { this.mode = 'view'; this.select(r.id); }
      if (b.id === 'opHint') this.hint();
      if (b.id === 'opAna') Analysis.open({ fen: START_FEN, moves: this.moves.slice(0, this.ply).map(m => ({ from: m.from, to: m.to, promotion: m.promotion || '' })), orient: r.side, atStart: false });
    };
  },

  train() {
    this.custom = false;
    this.moves = sanLine(this.line);
    this.mode = 'train'; this.ply = 0;
    this.tr = { errors: 0, wrongHere: 0, busy: false, done: false, msg: '', msgk: '' };
    this.show();
    this.autoPlay();
  },
  autoPlay() {
    const T = this.tr, r = this.cur;
    if (this.ply >= this.moves.length) return this.trainDone();
    const ch = this.chessAt(this.ply);
    if (ch.turn === r.side) return;
    T.busy = true; this.show();
    setTimeout(() => { if (this.tr !== T || this.mode !== 'train') return; this.ply++; T.busy = false; Sound.play('move'); this.show(); this.autoPlay(); }, 450);
  },
  trainMove(ch, f, t) {
    const T = this.tr, exp = this.moves[this.ply];
    const probe = new Chess(ch.fen()), m = chessMove(probe, f, t);
    if (!m) return;
    if (m.san === exp.san) {
      this.ply++; T.wrongHere = 0; T.msg = ''; Sound.play(m.captured ? 'capture' : 'move');
      this.show(); this.autoPlay();
    } else {
      T.errors++; T.wrongHere++;
      T.msg = `${m.san} bu hattın hamlesi değil.${T.wrongHere >= 2 ? ' İpucu: taşı vurguladım.' : ''}`; T.msgk = 'bad';
      Sound.play('illegal');
      this.show();
      if (T.wrongHere >= 2) this.hint();
    }
  },
  hint() {
    const exp = this.moves[this.ply];
    if (!exp) return;
    this.mb.marks = { [exp.from]: 'hint' }; this.mb.render();
  },
  trainDone() {
    const T = this.tr;
    T.done = true; T.msg = ''; Sound.play('notify');
    if (T.errors <= 1) { const L = this.learned(); L[this.cur.id] = (L[this.cur.id] || 0) + 1; store.set('openLearned', L); }
    Activity.mark('op');
    this.render(true);
  }
};
