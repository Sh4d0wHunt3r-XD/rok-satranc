/* Rok Satranç — Koç modu, oyun incelemesinde kritik anlar, haftalık rapor */
const PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PN = { p: 'piyon', n: 'at', b: 'fil', r: 'kale', q: 'vezir', k: 'şah' };
const low = p => (p || '').toLowerCase();

/* ================= Koç modu (bota karşı) =================
   Hamleyi yapmadan önce: rakip bu hamleden sonra mat edebiliyor mu, ya da bedava taş alabiliyor mu? */
const Coach = {
  pending: null, bypass: false,
  on() { return store.get('coach', true); },
  active() { return G.mode === 'bot' && !G.drill && this.on(); },
  check(from, to, promotion) {
    const c = new Chess(G.chess.fen());
    const r = chessMove(c, from, to, promotion);
    if (!r || r.mate) return null;
    const gained = r.captured ? PV[low(r.captured)] : 0;
    let worst = null;
    for (const m of c.moves()) {
      const t = new Chess(c.fen()), rr = t.move(m);
      if (!rr) continue;
      if (rr.mate) return { msg: `Bu hamleden sonra rakibin ${rr.san} ile mat edebilir!`, from: m.from, to: m.to };
      if (!rr.captured) continue;
      const victim = PV[low(rr.captured)], att = PV[low(rr.piece)];
      const defended = t.moves().some(x => x.to === m.to);
      const gain = defended ? victim - att : victim;
      if (gain > 0 && (!worst || gain > worst.gain)) worst = { gain, m, rr };
    }
    if (!worst || worst.gain - gained < 2) return null;
    return { msg: `Bu hamleden sonra rakibin ${worst.rr.san} ile ${PN[low(worst.rr.captured)]} kazanabilir.`, from: worst.m.from, to: worst.m.to };
  },
  // userMove bunu çağırır; uyarı varsa hamleyi bekletir
  intercept(from, to, promotion) {
    if (this.bypass || !this.active() || G.view != null) return false;
    const w = this.check(from, to, promotion);
    if (!w) { this.clear(false); return false; }
    G.coachWarns = (G.coachWarns || 0) + 1;
    this.pending = { mv: { from: Number(from), to: Number(to), promotion }, fen: G.chess.fen(), msg: w.msg };
    G.sel = null; G.targets = []; G.premove = null;
    G.arrows = G.arrows.filter(a => a.kind !== 'coach').concat([{ from: w.from, to: w.to, kind: 'coach' }]);
    Sound.play('check');
    render();
    return true;
  },
  clear(redraw = true) {
    if (!this.pending) return;
    this.pending = null;
    G.arrows = G.arrows.filter(a => a.kind !== 'coach');
    if (redraw) render();
  },
  playAnyway() {
    const p = this.pending;
    if (!p || p.fen !== G.chess.fen()) return this.clear();
    this.clear(false);
    this.bypass = true;
    try { userMove(p.mv.from, p.mv.to, p.mv.promotion); } finally { this.bypass = false; }
  },
  notice() {
    const p = this.pending;
    if (!p || p.fen !== G.chess.fen() || G.over) return '';
    return `<div class="coach-note"><b>Koç:</b> ${esc(p.msg)} Kırmızı ok rakibin cevabını gösteriyor.</div>
      <div class="row"><button class="btn small" data-coach="back">Başka hamle seç</button><button class="btn small ghost" data-coach="go">Yine de oyna</button></div>`;
  }
};
$('#notice').addEventListener('click', e => {
  const b = e.target.closest('[data-coach]');
  if (!b) return;
  if (b.dataset.coach === 'go') Coach.playAnyway(); else Coach.clear();
});

/* ================= Kritik anlar (oyun incelemesi) ================= */
const Moments = {
  list() {
    const R = G.review;
    if (!R || !R.done) return [];
    const my = G.meta && G.meta.my, out = [];
    for (let i = 1; i <= G.moves.length; i++) {
      const c = R.cls[i], m = G.moves[i - 1];
      if (!c || !['mistake', 'blunder'].includes(c.k)) continue;
      if (my && m.color !== my) continue;
      out.push({ i, c, m });
    }
    return out.sort((a, b) => b.c.drop - a.c.drop).slice(0, 4).sort((a, b) => a.i - b.i);
  },
  why(i, c, m) {
    const after = Analysis.cache.get(G.fens[i]), before = Analysis.cache.get(G.fens[i - 1]), them = opp(m.color);
    if (after && after.best) {
      const rr = new Chess(G.fens[i]).move(after.best);
      if (rr) {
        if (after.mate != null && after.mate !== 0 && (after.mate > 0 ? 'w' : 'b') === them) return `Rakibe mat yolu açtın: ${rr.san} ile başlıyor.`;
        if (rr.captured) return `Rakip ${rr.san} ile ${PN[low(rr.captured)]} kazanıyordu.`;
      }
    }
    if (before && before.best) {
      const rb = new Chess(G.fens[i - 1]).move(before.best);
      if (rb) {
        if (rb.mate) return `${rb.san} ile mat vardı!`;
        if (before.mate != null && (before.mate > 0 ? 'w' : 'b') === m.color) return `Mat yolu vardı, ${rb.san} ile başlıyordu.`;
        if (rb.captured) return `${rb.san} ile ${PN[low(rb.captured)]} kazanabilirdin.`;
      }
    }
    return 'Bu hamleden sonra pozisyonun belirgin şekilde kötüleşti.';
  },
  html() {
    const l = this.list();
    if (!l.length) return G.review && G.review.done ? '<div class="moments"><span class="label">Kritik anlar</span><div class="muted">Büyük bir hata yok, güzel oyun!</div></div>' : '';
    return `<div class="moments"><span class="label">Kritik anlar</span>${l.map(({ i, c, m }) => `
      <button class="moment ${c.k}" data-moment="${i}">
        <span class="mo-mv">${Math.ceil(i / 2)}${m.color === 'w' ? '.' : '...'} ${esc(m.san)} <i>${c.k === 'blunder' ? '??' : '?'}</i></span>
        <span class="mo-why">${esc(this.why(i, c, m))}${c.bestSan ? ` Daha iyisi: <b>${esc(c.bestSan)}</b>.` : ''}</span>
        <span class="mo-drop">Kazanma şansı %${Math.round(c.drop * 100)} düştü</span>
      </button>`).join('')}</div>`;
  }
};
$('#xpanel').addEventListener('click', e => {
  const b = e.target.closest('[data-moment]');
  if (b) setView(Number(b.dataset.moment));
});

/* ================= Haftalık rapor ================= */
const Weekly = {
  data() {
    const since = Date.now() - 7 * 864e5, a = Activity.all(), sum = { pz: 0, ls: 0, gm: 0, op: 0, dr: 0 };
    for (const [k, v] of Object.entries(a)) if (Date.parse(k + 'T12:00:00') >= since - 864e5) for (const x in v) sum[x] = (sum[x] || 0) + v[x];
    const delta = (hist, cur) => { const before = hist.filter(h => h[0] < since); const base = before.length ? before[before.length - 1][1] : (hist.find(h => h[0] >= since) || [0, cur])[1]; return cur - base; };
    const games = History.list().filter(e => e.ts >= since && e.my && ['bot', 'online', 'chesscom'].includes(e.mode));
    const t = { win: 0, draw: 0, loss: 0 }; games.forEach(e => t[History.outcome(e)]++);
    const rev = games.filter(e => e.acc != null);
    const fails = {};
    for (const f of store.get('pzFails', [])) if (f.ts >= since) for (const th of f.themes) if (THEME_FILTERS.includes(th)) fails[th] = (fails[th] || 0) + 1;
    const weak = Object.entries(fails).sort((x, y) => y[1] - x[1])[0];
    const blunders = rev.length ? rev.reduce((s, e) => s + ((e.cnt && e.cnt.blunder) || 0), 0) / rev.length : null;
    return { sum, bot: delta(store.get('ratingHist', []), rating()), pz: delta(store.get('pzHist', []), Puzzle.rating()), t, n: games.length, acc: rev.length ? rev.reduce((s, e) => s + e.acc, 0) / rev.length : null, weak, blunders };
  },
  html() {
    const d = this.data(), sg = v => `<span class="${v > 0 ? 'up' : v < 0 ? 'down' : ''}">${v > 0 ? '+' : ''}${v}</span>`;
    let tip;
    if (d.blunders != null && d.blunders >= 1) tip = 'İncelediğin oyunlarda oyun başına en az bir büyük hata var. Her hamleden önce "rakip neyimi alabilir?" diye sor ve Koç modunu açık tut.';
    else if (d.weak) tip = `Bu hafta en çok "${THEMES_TR[d.weak[0]]}" bulmacalarında zorlandın. Bu temaya biraz daha çalış.`;
    else if (!d.sum.ls) tip = 'Bu hafta hiç ders yapmadın. Öğren bölümünde günde bir ders yeter.';
    else tip = 'İyi gidiyorsun. Her gün biraz bulmaca, haftada birkaç incelenmiş oyun en hızlı ilerleme yolu.';
    return `<div class="block weekly"><h2>Bu hafta</h2>
      <div class="wk-grid">
        <div><span class="label">Bulmaca</span><b>${d.sum.pz || 0}</b></div>
        <div><span class="label">Ders</span><b>${d.sum.ls || 0}</b></div>
        <div><span class="label">Oyun</span><b>${d.n}</b><small>${d.n ? `${d.t.win}G ${d.t.draw}B ${d.t.loss}M` : ''}</small></div>
        <div><span class="label">Bot puanı</span><b>${sg(d.bot)}</b></div>
        <div><span class="label">Bulmaca puanı</span><b>${sg(d.pz)}</b></div>
        <div><span class="label">İsabet</span><b>${d.acc != null ? d.acc.toFixed(0) + '%' : '–'}</b></div>
      </div>
      <p class="wk-tip">${esc(tip)}</p>
      ${d.weak ? `<button class="btn small" id="wkWeak">${icon('target')}${esc(THEMES_TR[d.weak[0]])} bulmacası çöz</button>` : ''}
    </div>`;
  },
  bind() {
    const b = $('#wkWeak');
    if (b) b.onclick = () => { const d = this.data(); Puzzle.theme = d.weak[0]; store.set('pzTheme', Puzzle.theme); Puzzle.set = null; Puzzle.next(); };
  }
};
