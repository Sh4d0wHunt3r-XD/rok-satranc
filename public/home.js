/* Rok Satranç — Ana sayfa ve günlük seri */
const Activity = {
  all() { return store.get('activity', {}); },
  mark(kind) {
    const a = this.all(), k = dayKey();
    a[k] = a[k] || {};
    a[k][kind] = (a[k][kind] || 0) + 1;
    const keys = Object.keys(a).sort();
    if (keys.length > 400) delete a[keys[0]];
    store.set('activity', a);
  },
  streak() {
    const a = this.all(), d = new Date();
    let n = 0;
    if (!a[dayKey(d)]) d.setDate(d.getDate() - 1); // bugün henüz bir şey yapmadıysan seri dünden sayılır
    while (a[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  today() { return this.all()[dayKey()] || {}; },
  week() {
    const a = this.all(), out = [], d = new Date();
    d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) { out.push({ d: new Date(d), on: !!a[dayKey(d)] }); d.setDate(d.getDate() + 1); }
    return out;
  }
};

const Home = {
  async render() {
    const pane = $('#pane-home');
    const st = Activity.streak(), td = Activity.today(), nx = Learn.nextLesson(), pr = Learn.progress();
    const P = PzPlus.path(), ds = PzPlus.dailyState(), L = Openings.learned();
    const nextRep = REPS.find(r => r.rec && !L[r.id]) || REPS.find(r => !L[r.id]) || REPS[0];
    const hist = History.list().slice(0, 7);
    const hr = new Date().getHours();
    const hello = hr < 6 ? 'İyi geceler' : hr < 12 ? 'Günaydın' : hr < 18 ? 'İyi günler' : 'İyi akşamlar';
    const days = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
    const todo = [
      { on: !!td.pz, t: 'Bir bulmaca çöz' },
      { on: !!td.ls, t: 'Bir ders bitir' },
      { on: !!td.gm, t: 'Bir oyun oyna' }
    ];
    pane.innerHTML = `
      <header class="home-head">
        <div><h1>${hello}</h1><p class="muted">Bugün de biraz satranç. Her gün bir şey yaparsan serin büyür.</p></div>
        <div class="streak${st ? ' on' : ''}">${icon('flame')}<div><b>${st}</b><span>günlük seri</span></div></div>
      </header>

      <div class="home-grid">
        <div class="hcard play-card">
          <span class="label">Oyna</span>
          <h2>Bota karşı hızlı oyun</h2>
          <p class="muted">${esc(BOTS[botSel].name)} (${BOTS[botSel].elo}) · ${esc(tcLabel(botTime()))}</p>
          <div class="row-gap"><button class="btn primary big" id="hPlay">${icon('play')}Oyna</button><button class="btn" data-go="bot">Rakip seç</button><button class="btn ghost" data-go="online">Arkadaşla</button></div>
        </div>
        <div class="hcard today">
          <span class="label">Bugünün hedefleri</span>
          <ul class="todo">${todo.map(x => `<li class="${x.on ? 'on' : ''}">${icon(x.on ? 'check' : 'plus')}<span>${x.t}</span></li>`).join('')}</ul>
          <div class="week">${Activity.week().map(w => `<div class="${w.on ? 'on' : ''}"><i></i><span>${days[w.d.getDay()]}</span></div>`).join('')}</div>
        </div>

        <button class="hcard link" id="hDaily">
          <span class="label">Günün bulmacası</span>
          <div class="hc-board" id="hDailyBoard"></div>
          <div class="hc-foot"><b>${ds === 'ok' ? 'Çözüldü ✓' : ds === 'fail' ? 'Denendi' : 'Bugünün bulmacasını çöz'}</b><span class="muted" id="hDailyInfo"></span></div>
        </button>
        <button class="hcard link" id="hLesson">
          <span class="label">Öğren</span>
          <h2>${nx ? esc(nx.title) : 'Bütün dersler bitti'}</h2>
          <p class="muted">${nx ? esc(UNITS[nx.unit].title) + ' · ' + esc(nx.sub) : 'Dersleri tekrar edebilirsin'}</p>
          <div class="bar"><div style="width:${pr.n / pr.total * 100}%"></div></div>
          <div class="hc-foot"><b>${nx ? 'Derse devam et' : 'Derslere git'}</b><span class="muted">${pr.n}/${pr.total} ders</span></div>
        </button>
        <button class="hcard link" id="hPath">
          <span class="label">Bulmaca yolu</span>
          <h2>Seviye ${P.level}</h2>
          <span class="path-dots">${Array.from({ length: PATH_SIZE }, (_, i) => `<i class="${i < P.idx ? 'done' : i === P.idx ? 'cur' : ''}"></i>`).join('')}</span>
          <div class="hc-foot"><b>Bulmaca çöz</b><span class="muted">Bulmaca puanı ${Puzzle.rating()}</span></div>
        </button>
        <button class="hcard link" id="hOpen">
          <span class="label">Açılış antrenmanı</span>
          <h2>${esc(nextRep.name)}</h2>
          <p class="muted">${nextRep.side === 'w' ? 'Beyazla' : 'Siyahla'} · ${Object.keys(L).length}/${REPS.length} açılış ezberlendi</p>
          <div class="hc-foot"><b>Antrenmana başla</b></div>
        </button>
      </div>

      <div class="home-cols">
        <div class="block">
          <div class="row-between"><h2>Son oyunlar</h2><button class="btn small ghost" data-go="history">Tümünü göster</button></div>
          ${hist.length ? `<div class="glist">${hist.map(e => this.row(e)).join('')}</div>` : '<p class="empty-state">Henüz bitmiş oyunun yok. İlk oyununu oyna, burada görünsün.</p>'}
        </div>
        <div class="block">
          <h2>Puanların</h2>
          <div class="mini-stats">
            <div><span class="label">Bot</span><b>${rating()}</b></div>
            <div><span class="label">Bulmaca</span><b>${Puzzle.rating()}</b></div>
            <div><span class="label">Ders</span><b>${pr.n}<small>/${pr.total}</small></b></div>
            <div><span class="label">Hatalar</span><b>${PzPlus.mistakes().length}</b></div>
          </div>
          ${Weekly.html()}
        </div>
      </div>`;

    Weekly.bind();
    pane.onclick = e => {
      const g = e.target.closest('[data-go]'); if (g) return setTab(g.dataset.go);
      const r = e.target.closest('[data-rev]'); if (r) return History.open(r.dataset.rev, true);
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'hPlay') $('#startBot').click();
      if (b.id === 'hDaily') PzPlus.startDaily();
      if (b.id === 'hLesson') { if (nx) Learn.open(nx.id); else setTab('learn'); }
      if (b.id === 'hPath') PzPlus.startPath();
      if (b.id === 'hOpen') { setTab('openings'); Openings.select(nextRep.id); Openings.train(); }
    };

    try {
      await Puzzle.load();
      const p = PzPlus.dailyPuzzle();
      if (!p || !$('#hDailyBoard')) return;
      const c = new Chess(p.fen); const m = c.moves().find(x => uciOf(x) === p.moves[0]); if (m) c.move(m);
      const mb = new MiniBoard($('#hDailyBoard'));
      mb.orient = c.turn; mb.last = m ? [m.from, m.to] : [];
      mb.setChess(c);
      $('#hDailyInfo').textContent = `${colorName(c.turn)} oynar · ${p.rating}`;
    } catch (e) { /* bulmacalar yüklenemezse kart boş kalır */ }
  },
  row(e) {
    const o = History.outcome(e), opp = e.my === 'w' ? e.black : e.my === 'b' ? e.white : `${e.white} – ${e.black}`;
    const elo = e.mode === 'bot' && e.bot != null && BOTS[e.bot] ? ` <span class="muted">(${BOTS[e.bot].elo})</span>` : '';
    const sign = o === 'win' ? '+' : o === 'loss' ? '−' : '=';
    const d = new Date(e.ts);
    return `<div class="grow">
      <span class="g-mode" title="${MODE_TR[e.mode] || ''}">${icon(e.mode === 'bot' ? 'bot' : e.mode === 'online' ? 'users' : 'board')}</span>
      <span class="g-opp">${esc(opp)}${elo}<small>${d.toLocaleDateString('tr-TR')} · ${Math.ceil(e.moves.length / 2)} hamle${e.opening ? ' · ' + esc(e.opening) : ''}</small></span>
      <span class="g-acc">${e.acc != null ? e.acc.toFixed(1) + '%' : ''}</span>
      <span class="g-res ${o || 'draw'}">${sign}</span>
      <button class="btn small" data-rev="${e.id}">${icon('search')}İncele</button>
    </div>`;
  }
};
