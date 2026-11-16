/* Rok Satranç — Chess.com oyunlarını içe aktar (herkese açık arşiv, hesap gerekmez) */
const CC_REASON = { checkmated: 'checkmate', resigned: 'resign', timeout: 'timeout', abandoned: 'resign', stalemate: 'stalemate', agreed: 'agreement', repetition: 'repetition', insufficient: 'insufficient', '50move': 'fifty', timevsinsufficient: 'timeout-draw' };
MODE_TR.chesscom = 'Chess.com';
const CC_TC = { rapid: 'Rapid', blitz: 'Blitz', bullet: 'Bullet', daily: 'Günlük' };

const ChessCom = {
  busy: false, batch: null,
  user() { return store.get('ccUser', ''); },
  async fetchGames(user, months = 2) {
    const base = `https://api.chess.com/pub/player/${encodeURIComponent(user.trim().toLowerCase())}`;
    let a;
    try { a = await fetch(base + '/games/archives'); } catch (e) { throw new Error('Chess.com\'a ulaşılamadı. İnternet bağlantını kontrol et.'); }
    if (a.status === 404) throw new Error('Bu kullanıcı adı Chess.com\'da bulunamadı.');
    if (!a.ok) throw new Error('Chess.com şu an cevap vermiyor, biraz sonra tekrar dene.');
    const urls = ((await a.json()).archives || []).slice(-months).reverse();
    const out = [];
    for (const u of urls) {
      const r = await fetch(u);
      if (!r.ok) continue;
      out.push(...((await r.json()).games || []).reverse());
    }
    return out.filter(g => g.rules === 'chess' && g.pgn);
  },
  toEntry(g, user) {
    const p = PGN.parse(g.pgn), ch = new Chess(p.fen);
    const sans = p.moves.map(m => ch.move(m).san);
    const my = g.white.username.toLowerCase() === user.toLowerCase() ? 'w' : 'b';
    const winner = g.white.result === 'win' ? 'w' : g.black.result === 'win' ? 'b' : null;
    const why = winner === 'w' ? g.black.result : winner === 'b' ? g.white.result : g.white.result;
    const [base, inc] = String(g.time_control || '0').includes('/') ? [0, 0] : String(g.time_control).split('+').map(Number);
    return {
      id: 'cc-' + (g.uuid || g.url), ts: (g.end_time || 0) * 1000, mode: 'chesscom', white: g.white.username, black: g.black.username, my,
      winner, reason: CC_REASON[why] || 'pgn', tc: { base: base || 0, inc: inc || 0 }, startFen: p.fen, moves: sans,
      opening: p.fen === START_FEN ? openingName(sans) : '', bot: null, elo: { w: g.white.rating, b: g.black.rating }, url: g.url, tclass: g.time_class
    };
  },
  async sync(user, quiet) {
    if (this.busy) return 0;
    user = (user || this.user()).trim();
    if (!user) return 0;
    this.busy = true;
    try {
      const games = await this.fetchGames(user);
      const l = History.list(), have = new Set(l.map(e => e.id));
      let n = 0;
      for (const g of games.slice(0, 80)) {
        let e; try { e = this.toEntry(g, user); } catch (err) { continue; }
        if (have.has(e.id)) continue;
        l.push(e); have.add(e.id); n++;
      }
      l.sort((a, b) => b.ts - a.ts);
      store.set('history', l.slice(0, 600));
      store.set('ccUser', user); store.set('ccSync', Date.now());
      if (!quiet || n) toast(n ? `Chess.com'dan ${n} yeni oyun eklendi` : 'Yeni oyun yok, hepsi zaten burada', 3000);
      return n;
    } catch (e) { if (!quiet) toast(e.message, 4000); return 0; }
    finally { this.busy = false; this.render(); }
  },
  list() { return History.list().filter(e => e.mode === 'chesscom'); },

  // İncelenmemiş oyunları sırayla incele (her biri yarım dakika kadar sürer)
  async reviewAll(max = 5) {
    const todo = this.list().filter(e => e.acc == null && e.moves.length >= 6).slice(0, max);
    if (!todo.length) { toast('İncelenmemiş Chess.com oyunun yok'); return; }
    const B = this.batch = { i: 0, n: todo.length, stop: false };
    for (const e of todo) {
      if (B.stop) break;
      B.i++;
      History.open(e.id, true);
      toast(`Oyun ${B.i}/${B.n} inceleniyor…`, 2500);
      await new Promise(r => setTimeout(r, 300));
      while (!B.stop && G.mode === 'analysis' && G.review && !G.review.done) await new Promise(r => setTimeout(r, 400));
      if (G.mode !== 'analysis') { B.stop = true; break; }
    }
    const done = !B.stop;
    this.batch = null;
    if (done) { toast(`${todo.length} oyun incelendi. Hataların "Hatalarından öğren" bölümüne eklendi.`, 4500); Achievements.check(); }
  },

  render() {
    const box = $('#ccBox');
    if (!box) return;
    const u = this.user(), l = this.list(), un = l.filter(e => e.acc == null).length, last = store.get('ccSync', 0);
    const rows = l.slice(0, 12).map(e => {
      const o = History.outcome(e), oppC = e.my === 'w' ? 'b' : 'w', d = new Date(e.ts);
      return `<div class="grow">
        <span class="g-mode">${icon('users')}</span>
        <span class="g-opp">${esc(e[oppC === 'w' ? 'white' : 'black'])} <span class="muted">(${e.elo ? e.elo[oppC] : ''})</span><small>${d.toLocaleDateString('tr-TR')} · ${esc(CC_TC[e.tclass] || e.tclass || '')} · ${Math.ceil(e.moves.length / 2)} hamle${e.opening ? ' · ' + esc(e.opening) : ''}</small></span>
        <span class="g-acc">${e.acc != null ? e.acc.toFixed(1) + '%' : ''}</span>
        <span class="g-res ${o || 'draw'}">${o === 'win' ? '+' : o === 'loss' ? '−' : '='}</span>
        <button class="btn small" data-ccrev="${esc(e.id)}">${icon('search')}İncele</button></div>`;
    }).join('');
    box.innerHTML = `
      <div class="block cc">
        <div class="row-between"><h2>Chess.com oyunların</h2>${last ? `<span class="muted" style="font-size:12.5px">Son güncelleme: ${new Date(last).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>` : ''}</div>
        <p class="muted" style="margin:0">Kullanıcı adını yaz, oyunların otomatik gelsin. Şifre gerekmez, Chess.com'un herkese açık arşivi kullanılır. İncelediğin oyunlardaki hatalar bulmacaya dönüşür.</p>
        <form class="cc-form" id="ccForm"><input id="ccUser" placeholder="Chess.com kullanıcı adın" value="${esc(u)}" autocomplete="off" spellcheck="false">
          <button class="btn primary" ${this.busy ? 'disabled' : ''}>${this.busy ? 'Getiriliyor…' : 'Oyunları getir'}</button></form>
        ${l.length ? `<div class="row-gap"><button class="btn" id="ccAll"${un ? '' : ' disabled'}>${icon('search')}İncelenmemiş son 5 oyunu incele (${un})</button></div>
          <div class="glist">${rows}</div>` : ''}
      </div>`;
    $('#ccForm').onsubmit = e => { e.preventDefault(); const v = $('#ccUser').value.trim(); if (v) this.sync(v); else toast('Önce kullanıcı adını yaz'); };
    box.onclick = e => {
      const r = e.target.closest('[data-ccrev]'); if (r) History.open(r.dataset.ccrev, true);
      if (e.target.closest('#ccAll')) this.reviewAll();
    };
  }
};

// Açılışta kullanıcı adı kayıtlıysa yeni oyunları sessizce getir (en fazla saatte bir)
window.addEventListener('DOMContentLoaded', () => {
  if (!ChessCom.user() || Date.now() - store.get('ccSync', 0) < 3600e3) return;
  ChessCom.sync(null, true).then(n => { if (n && !$('#home').hidden && store.get('tab', 'home') === 'home') Home.render(); });
});
