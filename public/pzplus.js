/* Rok Satranç — Bulmaca ekleri: günün bulmacası, seviye yolu, hatalarından öğren */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNo = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
const PATH_SIZE = 10;

/* ----- Akıllı tekrar: yanlış yaptığın şey 1, 3, 7 ve 14 gün sonra tekrar gelir ----- */
const SRS_DAYS = [1, 3, 7, 14];
const Srs = {
  all() { return store.get('srs', {}); },
  // ok: doğru yaptın, bir sonraki aralığa geç; değilse en baştan (yarın)
  review(key, ok, now0) {
    const a = this.all(), x = a[key] || { step: -1 };
    if (ok) { x.step++; if (x.step >= SRS_DAYS.length) { delete a[key]; store.set('srs', a); return true; } x.due = Date.now() + SRS_DAYS[x.step] * 864e5; }
    else { x.step = -1; x.due = now0 ? Date.now() : Date.now() + 864e5; }
    a[key] = x; store.set('srs', a); return false;
  },
  due(prefix) { const t = Date.now(); return Object.entries(this.all()).filter(([k, v]) => v.due <= t && (!prefix || k.startsWith(prefix))).sort((a, b) => a[1].due - b[1].due).map(([k]) => k); },
  has(key) { return !!this.all()[key]; }
};

const PzPlus = {
  /* ----- Günün bulmacası ----- */
  dailyPuzzle() {
    if (!Puzzle.data) return null;
    const pool = Puzzle.data.filter(p => p.rating >= 600 && p.rating <= 1500).sort((a, b) => (a.id < b.id ? -1 : 1));
    return pool[(dayNo() * 7919) % pool.length];
  },
  dailyState() { return store.get('pzDaily', {})[dayKey()] || null; }, // 'ok' | 'fail' | null
  async startDaily() {
    await Puzzle.load();
    Puzzle.rush = null;
    Puzzle.set = { kind: 'daily', key: dayKey() };
    Puzzle.start(this.dailyPuzzle());
  },

  /* ----- Seviye yolu ----- */
  path() { return store.get('pzPath', { level: 1, idx: 0, ok: 0, ids: [] }); },
  levelTarget(level) { return 450 + (level - 1) * 60; },
  async startPath() {
    await Puzzle.load();
    const P = this.path();
    if (P.ids.length !== PATH_SIZE) {
      const seen = new Set(store.get('pzSeen', [])), used = new Set(), ids = [];
      for (let i = 0; i < PATH_SIZE; i++) {
        const tgt = this.levelTarget(P.level) + i * 8;
        const p = Puzzle.pick(tgt, { exclude: [...seen, ...used], window: 60 });
        used.add(p.id); ids.push(p.id);
      }
      P.ids = ids; P.idx = 0; P.ok = 0;
      store.set('pzPath', P);
    }
    Puzzle.rush = null;
    Puzzle.set = { kind: 'path' };
    Puzzle.start(Puzzle.data.find(p => p.id === P.ids[P.idx]));
  },

  /* ----- Hatalarından öğren ----- */
  mistakes() { return store.get('myMistakes', []); },
  startMistakes() {
    const l = this.mistakes();
    if (!l.length) { toast('Henüz kayıtlı hatan yok. Bir oyununu incelediğinde hataların buraya eklenir.', 4000); return; }
    Puzzle.rush = null;
    Puzzle.set = { kind: 'mist', unrated: true, queue: l.map(x => x.id), i: 0 };
    Puzzle.start(this.asPuzzle(l[0]));
  },
  asPuzzle(m) { return { id: m.id, fen: m.fen, moves: m.moves, rating: null, themes: [], note: m.note }; },
  // İncelenen oyundaki hata ve büyük hataları bulmacaya çevir
  captureMistakes() {
    const R = G.review, my = G.meta && G.meta.my;
    if (!R || !R.done || !my) return 0;
    const l = this.mistakes(), have = new Set(l.map(x => x.id));
    let n = 0;
    for (let i = 2; i <= G.moves.length; i++) {
      const c = R.cls[i], m = G.moves[i - 1], prev = G.moves[i - 2];
      if (!c || !c.best || m.color !== my || !['mistake', 'blunder'].includes(c.k)) continue;
      const id = 'm' + G.fens[i - 1].split(' ').slice(0, 4).join('').replace(/\//g, '');
      if (have.has(id)) continue;
      const best = Chess.sqName(c.best.from) + Chess.sqName(c.best.to) + (c.best.promotion || '');
      const who = G.meta.white && G.meta.black ? `${G.meta.white} – ${G.meta.black}` : 'oyunun';
      l.unshift({ id, fen: G.fens[i - 2], moves: [uciOf(prev), best], note: `${esc(who)} oyununda burada ${esc(m.san)} oynadın (${c.k === 'blunder' ? 'büyük hata' : 'hata'}). Daha iyisi: ${esc(c.bestSan || best)}.`, ts: Date.now() });
      have.add(id); n++;
      Srs.review('m:' + id, false, true);
    }
    store.set('myMistakes', l.slice(0, 200));
    R.mistAdded = (R.mistAdded || 0) + n;
    return n;
  },
  // İsabet ve hata sayılarını geçmişteki oyuna yaz
  saveReview() {
    const R = G.review, id = G.meta && G.meta.histId, my = G.meta && G.meta.my;
    if (!R || !R.done || !id || !my) return;
    const l = History.list(), e = l.find(x => x.id == id);
    if (!e) return;
    e.acc = R.acc[my] != null ? Math.round(R.acc[my] * 10) / 10 : null;
    e.cnt = R.counts[my] || {};
    store.set('history', l);
  },
  onReviewDone() {
    this.saveReview();
    this.captureMistakes();
    Achievements.check();
  },

  /* ----- Ortak akış ----- */
  onDone(solvedClean) {
    const S = Puzzle.set, p = Puzzle.cur;
    if (!S || !p || p._counted) return;
    p._counted = true;
    if (S.kind === 'daily') {
      const d = store.get('pzDaily', {}); if (!d[S.key]) { d[S.key] = solvedClean ? 'ok' : 'fail'; store.set('pzDaily', d); }
    }
    if (S.kind === 'path') {
      const P = this.path();
      P.idx++; if (solvedClean) P.ok++;
      S.last = { idx: P.idx, ok: P.ok, level: P.level };
      if (P.idx >= PATH_SIZE) {
        S.levelDone = { level: P.level, ok: P.ok };
        const best = store.get('pzPathBest', {}); best[P.level] = Math.max(best[P.level] || 0, P.ok); store.set('pzPathBest', best);
        if (P.ok >= 6) P.level++;
        P.idx = 0; P.ok = 0; P.ids = [];
      }
      store.set('pzPath', P);
    }
    setTimeout(() => Achievements.check(), 50);
    if (S.kind === 'mist' || S.kind === 'srs') {
      const key = p._key || 'm:' + p.id;
      const finished = Srs.review(key, solvedClean);
      if (key.startsWith('m:') && solvedClean && (finished || !Srs.has(key))) { store.set('myMistakes', this.mistakes().filter(x => x.id !== p.id)); store.set('mistSolved', store.get('mistSolved', 0) + 1); }
    }
  },
  /* ----- Tekrar oturumu ----- */
  srsPuzzle(key) {
    if (key.startsWith('p:')) { const p = Puzzle.data && Puzzle.data.find(x => x.id === key.slice(2)); return p && Object.assign({}, p, { _key: key }); }
    if (key.startsWith('m:')) { const m = this.mistakes().find(x => x.id === key.slice(2)); return m && Object.assign(this.asPuzzle(m), { _key: key }); }
    return null;
  },
  srsDue() { return Srs.due().filter(k => k.startsWith('p:') || k.startsWith('m:')); },
  async startSrs() {
    await Puzzle.load();
    const q = this.srsDue();
    if (!q.length) { toast('Bugün tekrar edilecek bir şey yok. Yanlış yaptığın bulmacalar burada belli aralıklarla tekrar karşına çıkar.', 4500); return; }
    Puzzle.rush = null;
    Puzzle.set = { kind: 'srs', unrated: true, queue: q, i: 0 };
    const p = this.srsPuzzle(q[0]);
    if (!p) { Srs.review(q[0], true); return this.startSrs(); }
    Puzzle.start(p);
  },
  next() {
    const S = Puzzle.set;
    if (S.kind === 'srs') {
      for (S.i++; S.i < S.queue.length; S.i++) { const p = this.srsPuzzle(S.queue[S.i]); if (p) return Puzzle.start(p); }
      Puzzle.set = null; toast('Bugünkü tekrarların bitti!', 3000); goHome(); return;
    }
    if (S.kind === 'daily') { Puzzle.set = null; return Puzzle.next(); }
    if (S.kind === 'path') return this.startPath();
    if (S.kind === 'mist') {
      const l = this.mistakes();
      const rest = l.filter(x => !S.done || !S.done.includes(x.id));
      S.done = (S.done || []).concat([Puzzle.cur.id]);
      const nx = rest.find(x => !S.done.includes(x.id));
      if (!nx) { Puzzle.set = null; toast('Kayıtlı hatalarının hepsinden geçtin!'); goHome(); return; }
      Puzzle.start(this.asPuzzle(nx));
    }
  },
  label() {
    const S = Puzzle.set;
    if (S.kind === 'daily') return 'Günün bulmacası';
    if (S.kind === 'srs') return `Tekrar · ${Math.min(S.i + 1, S.queue.length)}/${S.queue.length}`;
    if (S.kind === 'path') { const P = this.path(); return `Bulmaca yolu · Seviye ${P.level} · ${Math.min(P.idx + 1, PATH_SIZE)}/${PATH_SIZE}`; }
    return 'Hatalarından öğren';
  },
  panelExtra() {
    const S = Puzzle.set, p = Puzzle.cur;
    if (!S || !p) return '';
    let h = '';
    if ((S.kind === 'mist' || (S.kind === 'srs' && p.note)) && (Puzzle.state === 'done' || Puzzle.failed)) h += `<div class="comment">${p.note || ''}</div>`;
    if (S.kind === 'mist' && Puzzle.state === 'solve') h += '<div class="muted">Bu pozisyon kendi oyunundan. Orada yaptığın hatayı bu sefer yapma.</div>';
    if (S.kind === 'path' && S.levelDone && Puzzle.state === 'done') {
      const L = S.levelDone;
      h += `<div class="pz-status ${L.ok >= 6 ? 'ok' : ''}">Seviye ${L.level} bitti: ${L.ok}/${PATH_SIZE} hatasız.</div><div class="muted">${L.ok >= 6 ? `Seviye ${L.level + 1} açıldı!` : 'Seviye atlamak için en az 6 hatasız çözüm gerekiyor. Aynı seviyeyi yeni bulmacalarla tekrar dene.'}</div>`;
    }
    return h;
  },

  /* ----- Bulmacalar sekmesindeki üst kartlar ----- */
  block() {
    const P = this.path(), ds = this.dailyState(), mc = this.mistakes().length, due = this.srsDue().length;
    return `<div class="pz-cards">
      <button class="pz-card${due ? ' hot' : ''}" id="pzSrs"><span class="label">Tekrar zamanı</span><span class="pc-big">${due ? due + ' bulmaca' : 'Hepsi tamam'}</span><span class="muted">Yanlış yaptıkların 1, 3, 7 ve 14 gün sonra tekrar gelir</span></button>
      <button class="pz-card" id="pzDaily"><span class="label">Günün bulmacası</span><span class="pc-big">${ds === 'ok' ? 'Çözüldü' : ds === 'fail' ? 'Denendi' : 'Bugün'}</span><span class="muted">${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · herkes için aynı bulmaca</span></button>
      <button class="pz-card" id="pzPath"><span class="label">Bulmaca yolu</span><span class="pc-big">Seviye ${P.level}</span>
        <span class="path-dots">${Array.from({ length: PATH_SIZE }, (_, i) => `<i class="${i < P.idx ? 'done' : i === P.idx ? 'cur' : ''}"></i>`).join('')}</span><span class="muted">Her seviyede 10 bulmaca, gittikçe zorlaşır</span></button>
      <button class="pz-card" id="pzMist"><span class="label">Hatalarından öğren</span><span class="pc-big">${mc} pozisyon</span><span class="muted">${mc ? 'Kendi oyunlarındaki hatalar bulmaca oldu' : 'Bir oyununu incele, hataların buraya gelsin'}</span></button>
    </div>`;
  },
  bind() {
    $('#pzDaily').onclick = () => this.startDaily();
    $('#pzSrs').onclick = () => this.startSrs();
    $('#pzPath').onclick = () => this.startPath();
    $('#pzMist').onclick = () => this.startMistakes();
  }
};

/* İnceleme panelinde rengi bilinmeyen oyunlar için "ben hangi renktim" düğmeleri */
$('#xpanel').addEventListener('click', e => {
  const b = e.target.closest('[data-mymist]');
  if (!b || !G.review || !G.review.done) return;
  G.meta = G.meta || {}; G.meta.my = b.dataset.mymist;
  const n = PzPlus.captureMistakes();
  toast(n ? `${n} hata "Hatalarından öğren" bölümüne eklendi` : 'Bu oyunda bulmacaya çevrilecek hata bulunamadı', 3500);
  render();
});
