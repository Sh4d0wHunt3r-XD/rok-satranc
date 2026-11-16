/* Rok Satranç — Antrenman: koordinat oyunu ve ustaların oyunlarında hamle tahmini */
const MASTERS = [
  { id: 'opera', title: 'Opera Oyunu', who: 'Paul Morphy – Brunswick Dükü ve Kont Isouard', where: 'Paris, 1858', side: 'w',
    intro: 'Morphy bu oyunu opera izlerken oynadı. Hızlı gelişim, açık hatlar ve fedalarla nasıl kazanılır, en temiz örneklerden biri.',
    moves: 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
    notes: { w7: 'Vezir hem f7\'ye hem b7\'ye bakıyor: iki tehdit birden.', w10: 'Morphy atını feda ediyor. Amaç: siyah şahı ortada yakalamak için hatları açmak.', w12: 'Uzun rok: kale hemen açık d sütununa geliyor.', w13: 'Kale fedası! Bütün taşlar saldırıda, siyahınkiler hâlâ evde.', w16: 'Vezir fedası. Siyah almak zorunda, sonra kale mat ediyor.' } },
  { id: 'legal', title: 'Légal Tuzağı', who: 'Légal – Saint Brie', where: 'Paris, 1750', side: 'w',
    intro: 'Sadece 7 hamle. Rakip vezirini almak için açgözlülük yapınca küçük taşlarla mat oluyor.',
    moves: 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#',
    notes: { w5: 'Vezir feda! At e5\'e giderken veziri açıkta bırakıyor.', w6: 'Siyah veziri aldı ama şimdi küçük taşlar şaha saldırıyor.', w7: 'Üç küçük taşla mat. Buna Légal matı denir.' } },
  { id: 'reti', title: 'Ani Mat', who: 'Richard Réti – Savielly Tartakower', where: 'Viyana, 1910', side: 'w',
    intro: 'Caro-Kann savunmasında siyah erken hata yapıyor ve beyaz vezir fedasıyla 11 hamlede mat ediyor.',
    moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Qd3 e5 dxe5 Qa5+ Bd2 Qxe5 O-O-O Nxe4 Qd8+ Kxd8 Bg5+ Kc7 Bd8#',
    notes: { w8: 'Uzun rok bir tuzak kuruyor: siyah atı alırsa d sütunu açılıyor.', w9: 'Vezir fedası! Şah almak zorunda.', w10: 'Çifte şah: hem fil hem kale şah çekiyor. Şah kaçmak zorunda.', w11: 'Fil d8\'e gelip mat ediyor.' } },
  { id: 'olumsuz', title: 'Ölümsüz Oyun', who: 'Adolf Anderssen – Lionel Kieseritzky', where: 'Londra, 1851', side: 'w',
    intro: 'Anderssen iki kalesini, filini ve vezirini feda edip kalan küçük taşlarla mat ediyor. Satranç tarihinin en ünlü oyunlarından.',
    moves: 'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#',
    notes: { w2: 'Şah gambiti: bir piyon feda edip hızlı gelişim.', w11: "Fil b5'te alınmaya bırakıldı. Anderssen taş saymıyor, gelişime bakıyor.", w18: "Bd6! g1'deki kale alınabilir durumda bırakılıyor.", w20: 'İki kale de gitti ama siyahın taşları hâlâ evde, beyazınkiler şahın dibinde.', w22: 'Vezir fedası, sonra fil mat ediyor.' } },
  { id: 'evergreen', title: 'Her Daim Yeşil', who: 'Adolf Anderssen – Jean Dufresne', where: 'Berlin, 1852', side: 'w',
    intro: 'Evans gambitinden çıkan bir saldırı. Beyaz merkezi açıyor, siyah şah ortada kalıyor ve güzel bir kombinasyonla mat oluyor.',
    moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
    notes: { w4: 'Evans gambiti: b piyonu feda edilip merkeze hızla oynanıyor.', w17: 'At fedası: e sütunu açılıyor.', w20: 'Kale fedası!', w21: 'Vezir de feda ediliyor, şah almak zorunda.', w22: 'Çifte şah! Fil ve kale aynı anda şah çekiyor.', w24: "Fil e7'de mat ediyor." } },
  { id: 'lasker', title: 'Şah Yürüyüşü', who: 'Edward Lasker – George Thomas', where: 'Londra, 1912', side: 'w',
    intro: 'Vezir fedasından sonra siyah şah kendi evinden çıkarılıp tahtanın öbür ucunda, beyazın birinci sırasında mat ediliyor.',
    moves: 'd4 e6 Nf3 f5 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 e4 fxe4 Nxe4 b6 Ne5 O-O Bd3 Bb7 Qh5 Qe7 Qxh7+ Kxh7 Nxf6+ Kh6 Neg4+ Kg5 h4+ Kf4 g3+ Kf3 Be2+ Kg2 Rh2+ Kg1 Kd2#',
    notes: { w11: 'Vezir fedası! h7 alınıyor, şah almak zorunda.', w12: 'Bundan sonra her hamle şah: şah kaçamıyor, sadece ilerleyebiliyor.', w18: 'Şah bile mat ediyor: beyaz şah d2\'ye gidince kale açılıyor.' } }
];

const Train = {
  view: 'home', mb: null, co: null, ms: null,
  coordBest() { return store.get('coordBest', {}); },
  masterBest() { return store.get('masterBest', {}); },
  render() {
    this.view = 'home'; this.stopCoord();
    const pane = $('#pane-train'), cb = this.coordBest(), mbst = this.masterBest();
    pane.innerHTML = `
      <header class="pane-head"><h1>Antrenman</h1><p>Kısa, oyun gibi alıştırmalar. Tahtayı daha hızlı görmeni ve ustaların nasıl düşündüğünü anlamanı sağlar.</p></header>
      <div class="block"><h2>Koordinat oyunu</h2>
        <p class="muted" style="margin:0">30 saniyede kaç kareyi doğru bulabilirsin? Notasyonu okumak ve oyunları incelemek çok kolaylaşır.</p>
        <div class="pz-cards">
          <button class="pz-card" data-co="find:w"><span class="label">Kareyi bul · Beyaz</span><span class="pc-big">${cb['find:w'] || 0}</span><span class="muted">En iyi skorun</span></button>
          <button class="pz-card" data-co="find:b"><span class="label">Kareyi bul · Siyah</span><span class="pc-big">${cb['find:b'] || 0}</span><span class="muted">Tahta siyahın gözünden</span></button>
          <button class="pz-card" data-co="name:w"><span class="label">Kareyi adlandır</span><span class="pc-big">${cb['name:w'] || 0}</span><span class="muted">Işıklı karenin adını seç</span></button>
        </div></div>
      <div class="block"><h2>Ustaların oyunları</h2>
        <p class="muted" style="margin:0">Ünlü oyunları kazanan tarafın gözünden oyna. Her hamlede ustanın ne oynadığını tahmin et.</p>
        <div class="path">${MASTERS.map(g => `<button class="node${mbst[g.id] ? ' done' : ''}" data-ms="${g.id}"><span class="node-dot">${mbst[g.id] ? icon('check') : ''}</span>
          <span class="node-t">${esc(g.title)}</span><span class="node-s">${esc(g.where)}${mbst[g.id] ? ` · en iyi %${mbst[g.id]}` : ''}</span></button>`).join('')}</div></div>`;
    pane.onclick = e => {
      const c = e.target.closest('[data-co]'); if (c) { const [mode, side] = c.dataset.co.split(':'); return this.startCoord(mode, side); }
      const m = e.target.closest('[data-ms]'); if (m) this.openMaster(m.dataset.ms);
    };
  },
  shell(title, sub) {
    $('#pane-train').innerHTML = `<div class="lesson">
      <div class="lesson-head"><button class="icon-btn" id="trBack" aria-label="Geri">${icon('back')}</button><div><div class="muted">${esc(sub)}</div><h1>${esc(title)}</h1></div></div>
      <div class="lesson-body"><div class="lesson-board"><div id="trBoard"></div></div><div class="lesson-side" id="trSide"></div></div></div>`;
    $('#trBack').onclick = () => this.render();
    this.mb = new MiniBoard($('#trBoard'));
  },

  /* ----- Koordinat oyunu ----- */
  startCoord(mode, side) {
    this.shell(mode === 'find' ? 'Kareyi bul' : 'Kareyi adlandır', 'Koordinat oyunu');
    const mb = this.mb;
    mb.orient = side; mb.coords = false;
    mb.setBoard(fenToBoard(START_FEN));
    this.co = { mode, side, score: 0, miss: 0, end: 0, target: null, running: false };
    this.coSide('<p>Hazır olunca başla. Süre 30 saniye.</p>', `<button class="btn primary big" id="coGo">${icon('play')}Başla</button>`);
  },
  coSide(body, act) {
    const C = this.co;
    $('#trSide').innerHTML = `<div class="co-top"><div><span class="label">Skor</span><div class="pz-big">${C.score}</div></div>
      <div style="text-align:right"><span class="label">Süre</span><div class="pz-big" id="coTime">${C.running ? Math.ceil((C.end - Date.now()) / 1000) : C.done ? 0 : 30}</div></div></div>
      <div id="coBody">${body}</div><div class="row-gap" id="coAct">${act || ''}</div>`;
    $('#trSide').onclick = e => {
      if (e.target.closest('#coGo')) this.coGo();
      const o = e.target.closest('[data-nm]'); if (o) this.coAnswer(Number(o.dataset.nm));
    };
  },
  coGo() {
    const C = this.co;
    C.score = 0; C.miss = 0; C.running = true; C.done = false; C.end = Date.now() + 30000;
    this.mb.onMove = null;
    this.mb.legal = () => [];
    this.mb.click = sq => { if (C.running && C.mode === 'find') this.coAnswer(sq); };
    clearInterval(this.coTimer);
    this.coTimer = setInterval(() => {
      const left = C.end - Date.now(), el = $('#coTime');
      if (el) el.textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) this.coEnd();
    }, 200);
    this.coNext();
  },
  coNext() {
    const C = this.co;
    let t; do { t = Math.floor(Math.random() * 64); } while (t === C.target);
    C.target = t;
    this.mb.marks = C.mode === 'name' ? { [t]: 'hint' } : {};
    this.mb.render();
    if (C.mode === 'find') this.coSide(`<div class="co-target">${Chess.sqName(t)}</div><p class="muted">Bu kareye tıkla.</p>`);
    else {
      const opts = new Set([t]);
      while (opts.size < 4) opts.add(Math.floor(Math.random() * 64));
      this.coSide('<p>Işıklı karenin adı ne?</p>', [...opts].sort(() => Math.random() - .5).map(s => `<button class="btn big" data-nm="${s}">${Chess.sqName(s)}</button>`).join(''));
    }
  },
  coAnswer(sq) {
    const C = this.co;
    if (!C.running) return;
    if (sq === C.target) { C.score++; Sound.play('move'); }
    else { C.miss++; Sound.play('illegal'); this.mb.marks = { [C.target]: 'hint', [sq]: 'bad' }; this.mb.render(); }
    setTimeout(() => { if (C.running) this.coNext(); }, sq === C.target ? 80 : 450);
  },
  coEnd() {
    const C = this.co;
    if (!C.running) return;
    C.running = false; C.done = true; clearInterval(this.coTimer);
    const key = C.mode + ':' + C.side, best = this.coordBest(), rec = C.score > (best[key] || 0);
    if (rec) { best[key] = C.score; store.set('coordBest', best); }
    Activity.mark('co');
    this.mb.marks = {}; this.mb.render();
    Sound.play('end');
    this.coSide(`<div class="pz-status ${rec ? 'ok' : ''}">${rec ? 'Yeni rekor!' : 'Süre bitti'}</div><p>${C.score} doğru, ${C.miss} yanlış. En iyin: ${Math.max(best[key] || 0, C.score)}.</p>`,
      `<button class="btn primary" id="coGo">${icon('repeat')}Tekrar</button>`);
  },
  stopCoord() { clearInterval(this.coTimer); if (this.co) this.co.running = false; },

  /* ----- Ustaların oyunları: hamle tahmini ----- */
  openMaster(id) {
    const g = MASTERS.find(x => x.id === id);
    if (!g) return;
    this.shell(g.title, g.where);
    const moves = sanLine(g.moves.split(' '));
    this.ms = { g, moves, ply: 0, pts: 0, tot: 0, tries: 0, busy: false, note: g.intro, fb: '', fbk: '' };
    this.mb.orient = g.side;
    this.msShow();
    this.msAuto();
  },
  msChess() { const c = new Chess(); for (const m of this.ms.moves.slice(0, this.ms.ply)) c.move({ from: m.from, to: m.to, promotion: m.promotion }); return c; },
  msShow() {
    const M = this.ms, ch = this.msChess(), mb = this.mb, lm = M.moves[M.ply - 1];
    mb.last = lm ? [lm.from, lm.to] : [];
    mb.legal = sq => (M.busy || M.ply >= M.moves.length || ch.turn !== M.g.side ? [] : chessTargets(ch, sq));
    mb.onMove = (f, t) => this.msGuess(ch, f, t);
    mb.setChess(ch);
    const done = M.ply >= M.moves.length, pct = M.tot ? Math.round(M.pts / M.tot * 100) : 0;
    $('#trSide').innerHTML = `<div class="muted">${esc(M.g.who)}</div>
      <div class="progress"><div style="width:${M.ply / M.moves.length * 100}%"></div></div>
      ${M.note ? `<p class="lesson-text" style="margin:0">${esc(M.note)}</p>` : ''}
      ${M.fb ? `<div class="lesson-fb ${M.fbk}">${esc(M.fb)}</div>` : ''}
      <div class="muted">Doğru tahmin: <b style="color:var(--fg)">${M.pts}/${M.tot}</b>${M.tot ? ` · %${pct}` : ''}</div>
      ${done ? `<div class="pz-status ok">Oyun bitti! Ustanın hamlelerinin %${pct}'ini buldun.</div>` : `<p class="muted" style="margin:0">${ch.turn === M.g.side ? 'Senin sıran: ustanın hamlesini tahmin et.' : 'Rakip oynuyor…'}</p>`}
      <div class="row-gap">${done ? `<button class="btn primary" id="msAgain">${icon('repeat')}Tekrar</button>` : `<button class="btn" id="msShowMv">${icon('eye')}Hamleyi göster</button>`}<button class="btn ghost" id="msList">Oyunlar</button></div>`;
    $('#trSide').onclick = e => {
      if (e.target.closest('#msAgain')) this.openMaster(M.g.id);
      if (e.target.closest('#msList')) this.render();
      if (e.target.closest('#msShowMv')) this.msReveal(false);
    };
  },
  msNote() { const M = this.ms, m = M.moves[M.ply - 1]; if (!m) return; const key = (m.color === 'w' ? 'w' : 'b') + Math.ceil(M.ply / 2); if (M.g.notes[key]) M.note = M.g.notes[key]; },
  msAuto() {
    const M = this.ms;
    if (M.ply >= M.moves.length) return this.msFinish();
    const turn = this.msChess().turn;
    if (turn === M.g.side) return;
    M.busy = true; this.msShow();
    setTimeout(() => { if (this.ms !== M) return; M.ply++; M.busy = false; this.msNote(); Sound.play('move'); this.msShow(); this.msAuto(); }, 650);
  },
  msGuess(ch, f, t) {
    const M = this.ms, exp = M.moves[M.ply];
    const probe = new Chess(ch.fen()), m = chessMove(probe, f, t);
    if (!m) return;
    if (m.san === exp.san) {
      if (M.tries === 0) M.pts++;
      M.tot++; M.tries = 0; M.ply++; M.fb = 'Doğru! Usta da ' + exp.san + ' oynadı.'; M.fbk = 'ok';
      Sound.play(m.captured ? 'capture' : 'move');
      this.msNote(); this.msShow(); this.msAuto();
    } else {
      M.tries++;
      Sound.play('illegal');
      if (M.tries >= 2) return this.msReveal(true, m.san);
      M.fb = `${m.san} değil. Bir kez daha dene.`; M.fbk = 'bad'; this.msShow();
    }
  },
  msReveal(counted, tried) {
    const M = this.ms, exp = M.moves[M.ply];
    if (!exp || M.busy) return;
    M.tot++; M.tries = 0; M.ply++;
    M.fb = `${tried ? tried + ' değil. ' : ''}Usta ${exp.san} oynadı.`; M.fbk = '';
    this.msNote(); this.msShow();
    this.mb.arrows = [{ from: exp.from, to: exp.to }]; this.mb.render();
    setTimeout(() => { this.mb.arrows = []; this.msAuto(); }, 900);
  },
  msFinish() {
    const M = this.ms, pct = M.tot ? Math.round(M.pts / M.tot * 100) : 0, best = this.masterBest();
    if (pct > (best[M.g.id] || 0)) { best[M.g.id] = pct; store.set('masterBest', best); }
    Activity.mark('ms');
    Sound.play('end');
    this.msShow();
  }
};
