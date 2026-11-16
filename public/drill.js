/* Rok Satranç — Mat antrenmanı: hazır mat pozisyonları, pat koruması, kaçış kareleri */
const DRILLS = [
  {
    id: 'rr', name: 'İki kale ile mat', fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1',
    desc: 'En kolayı. Kaleler sırayla şah çekip rakip şahı merdiven gibi kenara iter.',
    tip: 'Bir kale bir sırayı tutsun, öbürü bir üst sıradan şah çeksin. Rakip şah bir kaleye yaklaşırsa o kaleyi tahtanın öbür ucuna kaçır.'
  },
  {
    id: 'q', name: 'Vezir + Şah ile mat', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    desc: 'Oyunlarda en sık çıkan son. 10 hamlenin altında bitirmeyi hedefle.',
    tip: 'Veziri rakip şaha at hamlesi uzaklığında tutarak onu kenara it. Kenara gelince veziri durdur, kendi şahını getir, sonra mat et.'
  },
  {
    id: 'r', name: 'Kale + Şah ile mat', fen: '8/8/8/4k3/8/8/8/4K2R w - - 0 1',
    desc: 'Daha uzun sürer ve kendi şahın şart. 16 hamlede bitirmek mümkün.',
    tip: 'Kale rakip şahın alanını bir çizgiyle kessin. Şahını rakip şahın tam karşısına getir, sonra kaleyle şah çekip alanı bir sıra daralt.'
  },
  {
    id: 'trap', name: 'Köşe tuzağı', fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1',
    desc: 'Tek hamlede mat var, ama ona çok benzeyen bir hamle pat yapıyor. Pat korumasını kapatıp da dene.',
    tip: 'Rakip şah köşede ve tek bir karesi kaldı. Şah çekmeden o kareyi de kapatırsan pat olur. Şah çekerek kapat.'
  }
];
const DRILL_BOT = 4; // yerleşik motorun en güçlü seviyesi: şah merkeze kaçmaya çalışır
Object.assign(ACTION_ICONS, { 'Baştan başla': 'repeat', 'İpucu': 'bulb' });

const Drill = {
  on() { return G.mode === 'bot' && !!G.drill; },
  get guard() { return store.get('drillGuard', true); },
  get showEsc() { return store.get('drillEsc', true); },
  best(id) { return store.get('drillBest', {})[id] || 0; },

  start(id) {
    const d = DRILLS.find(x => x.id === id);
    if (d) startGame({ mode: 'bot', my: 'w', bot: DRILL_BOT, tc: { base: 0, inc: 0 }, fen: d.fen, drill: d });
  },
  next() {
    const i = DRILLS.findIndex(x => x.id === G.drill.id);
    this.start(DRILLS[(i + 1) % DRILLS.length].id);
  },
  count() { return G.moves.filter(m => m.color === G.my).length; },

  // Rakip şahın gidebileceği kareler. Sıra bizdeyse, sıra ondaymış gibi hesaplanır.
  escapes() {
    const ch = G.chess;
    if (ch.turn !== G.my) return ch.moves();
    const f = ch.fen().split(' ');
    f[1] = opp(G.my); f[3] = '-';
    try { return new Chess(f.join(' ')).moves(); } catch (e) { return []; }
  },

  // Pat koruması: hamle pat yapacaksa uygulama, açıkla.
  blocks(from, to, promotion) {
    if (!this.on() || !this.guard) return false;
    const c = new Chess(G.chess.fen());
    if (!c.move({ from, to, promotion })) return false;
    const st = c.status();
    if (!st.over || st.reason !== 'stalemate') return false;
    G.sel = null; G.targets = [];
    Sound.play('illegal');
    toast('Dur! Bu hamle pat olur: rakip şah tehdit altında değil ve hiç hamlesi kalmıyor. Ya şah çekerek mat et ya da ona bir kare bırak.', 5000);
    render();
    return true;
  },

  onEnd(winner, reason) {
    G.drillRecord = false;
    if (reason !== 'checkmate' || winner !== G.my) return;
    Activity.mark('dr');
    const all = store.get('drillBest', {}), n = this.count(), id = G.drill.id;
    if (!all[id] || n < all[id]) { G.drillRecord = !!all[id]; all[id] = n; store.set('drillBest', all); }
  },

  playerInfo(color) {
    if (color === G.my) return { name: 'Sen', svg: pieceSVG(color === 'w' ? 'K' : 'k'), bg: '#2f2b25' };
    return { name: 'Kaçan şah', svg: pieceSVG(color === 'w' ? 'K' : 'k'), bg: '#2f2b25', thinking: G.botBusy && G.chess.turn === color };
  },
  label() { return 'Mat antrenmanı · ' + G.drill.name; },

  actions(add) {
    add('Geri al', undo).disabled = !G.moves.length;
    if (!G.over) add('İpucu', askHint).disabled = !myTurn();
    add('Baştan başla', () => this.start(G.drill.id), G.over ? 'primary' : '');
    add(this.guard ? 'Pat koruması: açık' : 'Pat koruması: kapalı', () => { store.set('drillGuard', !this.guard); render(); });
    add(this.showEsc ? 'Kaçış oklarını gizle' : 'Kaçış oklarını göster', () => { store.set('drillEsc', !this.showEsc); render(); });
  },

  notice() {
    const d = G.drill, best = this.best(d.id);
    let h = `<div><b>Taktik:</b> ${esc(d.tip)}</div>`;
    if (!G.over && G.view == null && G.chess.turn === G.my) {
      const n = this.escapes().length;
      let w = '';
      if (n === 1) w = ' <b style="color:var(--accent)">Dikkat:</b> tek karesi kaldı. Şah çekmeden onu da kapatırsan pat olur.';
      if (n === 0) w = ' <b style="color:var(--accent)">Dikkat:</b> şah kıpırdayamıyor. Şah çekmeyen ve ona kare açmayan her hamle pat olur.';
      h += `<div>Rakip şahın gidebileceği kare: <b>${n}</b>.${w}</div>`;
    }
    h += `<div class="muted">Hamlen: ${this.count()}${best ? ` · En iyin: ${best}` : ''} · Pat koruması ${this.guard ? 'açık' : 'kapalı'}</div>`;
    return h;
  },

  arrows() {
    if (!this.showEsc || G.over || G.view != null || G.chess.turn !== G.my) return [];
    return this.escapes().map(m => ({ from: m.from, to: m.to, kind: 'escape' }));
  },

  showResult() {
    const { winner, reason } = G.over, d = G.drill, n = this.count();
    const t = $('#resTitle');
    t.className = 'result-title';
    let title, why, extra = '';
    if (reason === 'checkmate' && winner === G.my) {
      title = 'Mat ettin!'; t.classList.add('win');
      why = `${n} hamlede`;
      extra = G.drillRecord ? 'Yeni rekor!' : `En iyin: ${this.best(d.id)} hamle`;
    } else if (reason === 'stalemate') {
      title = 'Pat oldu'; t.classList.add('loss');
      why = 'Rakip şah tehdit altında değildi ve hiç hamlesi kalmadı, oyun berabere bitti.';
      extra = 'Son hamleni geri al ve şah çekerek mat eden hamleyi ara.';
    } else if (reason === 'insufficient') {
      title = 'Berabere'; why = 'Taşını kaptırdın, mat edecek taş kalmadı.';
    } else if (reason === 'fifty') {
      title = 'Berabere'; why = '50 hamle boyunca mat edemedin.';
    } else {
      title = 'Berabere'; why = REASONS[reason] || '';
    }
    t.textContent = title;
    $('#resReason').textContent = why;
    $('#resExtra').textContent = extra;
    const acts = $('#resActions');
    acts.innerHTML = '';
    const add = (label, fn, cls = '') => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { hideModal('#resultModal'); fn(); }; acts.append(b); };
    if (reason === 'stalemate') add('Son hamleyi geri al', undo, 'primary');
    add('Tekrar dene', () => this.start(d.id), reason === 'stalemate' ? '' : 'primary');
    add('Sonraki antrenman', () => this.next());
    add('Tahtaya bak', () => {});
    add('Menü', goHome);
    $('#resultModal').hidden = false;
  },

  block() {
    return `
      <div class="block" style="margin-top:44px">
        <h2>Mat antrenmanı</h2>
        <p class="muted" style="margin:0">Hazır pozisyonlarda tek başına kalan şahı mat etmeyi öğren. Pat koruması seni pat yapacağın hamlede durdurur, oklar rakip şahın kaçabileceği kareleri gösterir.</p>
        <div class="tool-row">${DRILLS.map(d => {
          const b = this.best(d.id);
          return `<button class="tool" data-drill="${d.id}"><span class="tool-t">${esc(d.name)}</span><span class="tool-d">${esc(d.desc)}</span><span class="tool-d" style="color:${b ? 'var(--accent)' : 'var(--faint)'}">${b ? `En iyin: ${b} hamle` : 'Henüz bitirmedin'}</span></button>`;
        }).join('')}</div>
      </div>`;
  },
  bind() {
    $$('#pane-puzzles [data-drill]').forEach(b => { b.onclick = () => this.start(b.dataset.drill); });
  }
};
