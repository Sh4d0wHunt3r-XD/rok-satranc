/* Rok Satranç — İnternet üzerinden arkadaşla oyun (bilgisayar açık olmadan).
   İki cihaz ücretsiz PeerJS eşleştirme servisiyle birbirini bulur, oyun verisi doğrudan iki cihaz arasında gider. */
const NET_LIB = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const NET_PREFIX = 'rok-satranc-oda-';
const NET_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
MODE_TR.net = 'İnternetten';

const Net = {
  peer: null, conn: null, role: null, code: null, no: 0, hostColor: 'w', tc: { base: 600, inc: 0 },
  oppName: '', chat: [], drawOffer: null, rematch: { me: false, opp: false }, connected: false, retry: 0, libP: null,

  name() { return store.get('netName', '') || 'Oyuncu'; },
  lib() {
    if (window.Peer) return Promise.resolve();
    if (!this.libP) this.libP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = NET_LIB; s.onload = res; s.onerror = () => { this.libP = null; rej(new Error('Bağlantı kütüphanesi yüklenemedi. İnternetini kontrol et.')); };
      document.head.append(s);
    });
    return this.libP;
  },
  genCode() { let c = ''; for (let i = 0; i < 5; i++) c += NET_CHARS[Math.floor(Math.random() * NET_CHARS.length)]; return c; },
  link() { return Share.base() + '#katil=' + this.code; },
  reset() {
    if (this.conn) { try { this.conn.close(); } catch (e) { /* */ } }
    if (this.peer) { try { this.peer.destroy(); } catch (e) { /* */ } }
    Object.assign(this, { peer: null, conn: null, role: null, code: null, no: 0, oppName: '', chat: [], drawOffer: null, rematch: { me: false, opp: false }, connected: false, retry: 0 });
  },
  errText(e) {
    return { 'peer-unavailable': 'Bu kodla açık bir oda yok. Kodu kontrol et ya da arkadaşından yeni oda kurmasını iste.', network: 'İnternet bağlantısı yok ya da zayıf.', 'server-error': 'Eşleştirme servisine ulaşılamadı, biraz sonra tekrar dene.', 'browser-incompatible': 'Bu tarayıcı internetten oyunu desteklemiyor.' }[e && e.type] || 'Bağlantı kurulamadı.';
  },

  /* ----- Oda kur (ev sahibi) ----- */
  async host(color, tc) {
    try { await this.lib(); } catch (e) { toast(e.message, 4000); return; }
    this.reset();
    this.role = 'host'; this.tc = tc;
    this.hostColor = color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : color;
    const open = () => {
      this.code = this.genCode();
      this.peer = new Peer(NET_PREFIX + this.code, { debug: 0 });
      this.peer.on('open', () => this.renderPane());
      this.peer.on('connection', c => {
        if (this.conn && this.conn.open && this.conn.peer !== c.peer) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); }); return; }
        this.attach(c);
      });
      this.peer.on('disconnected', () => { if (this.peer && !this.peer.destroyed) this.peer.reconnect(); });
      this.peer.on('error', e => { if (e.type === 'unavailable-id') { this.peer.destroy(); open(); } else if (e.type !== 'peer-unavailable') toast(this.errText(e), 4000); });
    };
    open();
    this.renderPane();
  },
  /* ----- Koda katıl (misafir) ----- */
  async join(code, again) {
    code = String(code || '').trim().toUpperCase();
    if (code.length !== 5) { toast('Oda kodu 5 harf olmalı'); return; }
    try { await this.lib(); } catch (e) { toast(e.message, 4000); return; }
    if (!again) this.reset();
    if (this.peer) { try { this.peer.destroy(); } catch (e) { /* */ } }
    this.role = 'guest'; this.code = code;
    this.peer = new Peer({ debug: 0 });
    this.peer.on('open', () => {
      const c = this.peer.connect(NET_PREFIX + code, { reliable: true });
      this.attach(c);
    });
    this.peer.on('error', e => {
      if (again && this.retry < 8 && G.mode === 'net' && !G.over) { setTimeout(() => this.join(code, true), 3000); return; }
      toast(this.errText(e), 4500); this.renderPane();
    });
    if (!again) { this.joining = true; this.renderPane(); }
  },
  attach(c) {
    this.conn = c;
    c.on('open', () => {
      this.connected = true; this.retry = 0; this.joining = false;
      if (this.role === 'guest') this.send({ t: 'hello', name: this.name(), no: this.no });
      if (G.mode === 'net') { this.sys('Bağlantı kuruldu.'); render(); }
    });
    c.on('data', d => this.onData(d));
    c.on('close', () => this.lost());
    c.on('error', () => this.lost());
  },
  lost() {
    if (!this.connected) return;
    this.connected = false;
    if (G.mode !== 'net') { this.renderPane(); return; }
    this.sys('Rakibin bağlantısı koptu. Yeniden bağlanılıyor…');
    render();
    if (this.role === 'guest' && !G.over) { this.retry++; setTimeout(() => this.join(this.code, true), 2000); }
  },
  send(m) { if (this.conn && this.conn.open) this.conn.send(m); },

  /* ----- Oyun ----- */
  startNew() { // sadece ev sahibi çağırır
    this.no++; this.drawOffer = null; this.rematch = { me: false, opp: false };
    startGame({ mode: 'net', my: this.hostColor, tc: this.tc });
    this.sys(`Oyun başladı. Sen ${colorName(this.hostColor).toLowerCase()} taşlarlasın.`);
    this.sendSync(); render(); this.renderChat();
  },
  sendSync() {
    this.send({ t: 'sync', no: this.no, my: opp(this.hostColor), tc: this.tc, fen: G.startFen, name: this.name(),
      moves: G.moves.map(m => Chess.sqName(m.from) + Chess.sqName(m.to) + (m.promotion || '')),
      clock: G.clock ? { w: clockMs('w'), b: clockMs('b') } : null, over: G.over });
  },
  applySync(d) {
    this.oppName = d.name || 'Rakip';
    const fresh = this.no !== d.no || G.mode !== 'net';
    this.no = d.no;
    if (fresh) { this.drawOffer = null; this.rematch = { me: false, opp: false }; }
    startGame({ mode: 'net', my: d.my, tc: d.tc, fen: d.fen });
    for (const u of d.moves) applyMove(fromUci(u), true);
    if (G.clock && d.clock) { G.clock.w = d.clock.w; G.clock.b = d.clock.b; G.clock.lastTs = now(); G.clock.running = G.moves.length >= 2 && !d.over; }
    if (d.over) { G.over = d.over; freezeClock(); }
    if (fresh) this.sys(`Oyun başladı. Sen ${colorName(d.my).toLowerCase()} taşlarlasın.`);
    render(); this.renderChat();
  },
  sendMove(res) {
    this.drawOffer = null;
    this.send({ t: 'move', no: this.no, n: G.moves.length, u: Chess.sqName(res.from) + Chess.sqName(res.to) + (res.promotion || ''),
      clock: G.clock ? { w: clockMs('w'), b: clockMs('b') } : null });
  },
  onData(d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'full') { toast('Bu odada zaten iki kişi var.', 3500); this.reset(); this.renderPane(); return; }
    if (d.t === 'hello' && this.role === 'host') {
      this.oppName = String(d.name || 'Rakip').slice(0, 24);
      // Oyun sürüyorsa geri dönen rakip kaldığı yerden devam eder (sayfayı yenilese bile)
      if (G.mode === 'net' && this.no > 0 && !G.over) { this.sendSync(); this.sys('Rakibin geri döndü.'); render(); }
      else this.startNew();
      return;
    }
    if (d.t === 'sync' && this.role === 'guest') return this.applySync(d);
    if (G.mode !== 'net' || d.no !== undefined && d.no !== this.no) return;
    if (d.t === 'move') {
      if (d.n !== G.moves.length + 1) { this.send({ t: 'syncReq' }); return; }
      const res = applyMove(fromUci(d.u));
      if (!res) { this.send({ t: 'syncReq' }); return; }
      clockAfterMove(res.color);
      if (G.clock && d.clock) { G.clock.w = d.clock.w; G.clock.b = d.clock.b; G.clock.lastTs = now(); }
      this.drawOffer = null;
      if (checkEnd()) return;
      render(); tryPremove();
    }
    if (d.t === 'syncReq' && this.role === 'host') this.sendSync();
    if (d.t === 'resign' && !G.over) { this.sys('Rakibin teslim oldu.'); endGame(G.my, 'resign'); }
    if (d.t === 'draw') { this.drawOffer = 'opp'; this.sys('Rakibin beraberlik teklif ediyor.'); Sound.play('notify'); render(); }
    if (d.t === 'drawNo') { this.drawOffer = null; toast('Rakibin beraberliği reddetti'); render(); }
    if (d.t === 'drawYes' && !G.over) { this.drawOffer = null; endGame(null, 'agreement'); }
    if (d.t === 'timeout' && !G.over) endGame(d.winner, 'timeout');
    if (d.t === 'chat') { this.chat.push({ me: false, text: String(d.text).slice(0, 300) }); Sound.play('notify'); this.renderChat(); }
    if (d.t === 'rematch') { this.rematch.opp = true; this.sys('Rakibin rövanş istiyor.'); render(); if (this.rematch.me && this.role === 'host') this.newRematch(); }
  },
  newRematch() { this.hostColor = opp(this.hostColor); this.startNew(); },
  resign() { if (G.over) return; this.send({ t: 'resign' }); endGame(opp(G.my), 'resign'); },
  offerDraw() { if (G.over) return; if (this.drawOffer === 'opp') { this.send({ t: 'drawYes' }); this.drawOffer = null; endGame(null, 'agreement'); return; } this.drawOffer = 'me'; this.send({ t: 'draw' }); toast('Beraberlik teklif edildi'); render(); },
  askRematch() {
    this.rematch.me = true; this.send({ t: 'rematch' });
    if (this.rematch.opp && this.role === 'host') this.newRematch();
    else { toast('Rövanş isteği gönderildi'); render(); }
  },
  leave() { this.reset(); },
  chatSend(text) { this.chat.push({ me: true, text }); this.send({ t: 'chat', text }); this.renderChat(); },
  sys(text) { this.chat.push({ sys: true, text }); this.renderChat(); },
  renderChat() {
    const log = $('#chatLog');
    if (!log || G.mode !== 'net') return;
    log.innerHTML = this.chat.map(m => m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div><b>${esc(m.me ? this.name() : (this.oppName || 'Rakip'))}:</b> ${esc(m.text)}</div>`).join('') || '<div class="sys">Sohbet burada görünür.</div>';
    log.scrollTop = log.scrollHeight;
  },

  /* ----- Oyun ekranı kancaları ----- */
  label() { return `İnternetten · ${this.code || ''}${this.connected ? '' : ' · bağlantı yok'}`; },
  playerInfo(color) {
    const king = { svg: pieceSVG(color === 'w' ? 'K' : 'k'), bg: '#2f2b25' };
    if (color === G.my) return Object.assign({ name: this.name() + ' (sen)' }, king);
    return Object.assign({ name: this.oppName || 'Rakip', online: this.connected }, king);
  },
  actions(add) {
    if (!G.over) {
      add(this.drawOffer === 'me' ? 'Teklif gönderildi' : 'Beraberlik teklif et', () => this.offerDraw()).disabled = this.drawOffer === 'me' || !this.connected;
      armButton(add('Teslim ol', null, 'danger'), 'Emin misin?', () => this.resign());
    } else add(this.rematch.me ? 'Rövanş istendi…' : 'Rövanş', () => this.askRematch(), 'primary').disabled = this.rematch.me || !this.connected;
  },
  notice() {
    let h = '';
    if (!this.connected) h += `<div>${this.role === 'host' ? 'Rakibin bağlantısı koptu. Geri dönmesi bekleniyor…' : 'Bağlantı koptu. Yeniden bağlanılıyor…'}</div>`;
    if (this.drawOffer === 'opp' && !G.over) h += `<div>Rakibin beraberlik teklif ediyor.</div><div class="row"><button class="btn small primary" data-net="drawYes">Kabul et</button><button class="btn small" data-net="drawNo">Reddet</button></div>`;
    if (G.over && this.rematch.opp && !this.rematch.me) h += `<div>Rakibin rövanş istiyor.</div><div class="row"><button class="btn small primary" data-net="rematch">Kabul et</button></div>`;
    return h;
  },

  /* ----- Arkadaşla sekmesindeki kutu ----- */
  renderPane() {
    const pane = $('#pane-online');
    if (!pane) return;
    let box = $('#netBox');
    if (!box) {
      const head = pane.querySelector('.pane-head'), html = '<div id="netBox" class="net-box"></div>';
      if (head) head.insertAdjacentHTML('afterend', html); else pane.insertAdjacentHTML('afterbegin', html);
      box = $('#netBox');
      if (!box) return;
    }
    const waiting = this.role === 'host' && this.code && !this.connected && G.mode !== 'net';
    if (waiting) {
      box.innerHTML = `<div class="block net-wait"><h2>Oda kuruldu</h2>
        <p class="muted" style="margin:0">Arkadaşına kodu ya da linki gönder. O katılınca oyun kendiliğinden başlar. Bu sayfadan ayrılma.</p>
        <div class="big-code">${this.code}</div>
        <div class="row-gap"><button class="btn primary" id="netShare">${icon('send')}Linki gönder</button><button class="btn" id="netCopy">${icon('copy')}Kodu kopyala</button><button class="btn ghost" id="netCancel">Vazgeç</button></div></div>`;
    } else if (this.joining) {
      box.innerHTML = `<div class="block"><h2>Bağlanılıyor…</h2><p class="muted" style="margin:0">${esc(this.code || '')} koduyla odaya katılınıyor.</p><div><button class="btn ghost" id="netCancel">Vazgeç</button></div></div>`;
    } else {
      box.innerHTML = `<div class="block"><h2>İnternetten oyna</h2>
        <p class="muted" style="margin:0">Arkadaşın nerede olursa olsun: oda kur, kodu ya da linki gönder. Bilgisayarın açık olmasına gerek yok.</p>
        <div class="field"><label class="label" for="netName">Adın</label><input id="netName" maxlength="24" placeholder="Örn. Kaan" value="${esc(store.get('netName', ''))}" autocomplete="off"></div>
        <div class="split net-split">
          <div class="setup">
            <h2 style="font-size:15px">Oda kur</h2>
            <div class="field"><span class="label">Rengin</span><div class="color-pick" id="netColor">
              <button data-v="w"><span class="cp-ico" data-piece="wK"></span>Beyaz</button>
              <button data-v="r"><span class="cp-ico cp-mix"><span data-piece="wK"></span><span data-piece="bK"></span></span>Rastgele</button>
              <button data-v="b"><span class="cp-ico" data-piece="bK"></span>Siyah</button></div></div>
            <div class="field"><span class="label">Süre</span><div class="time-picker" id="netTime"></div></div>
            <button class="btn primary big" id="netHost">${icon('plus')}Oda kur</button>
          </div>
          <div class="block">
            <h2 style="font-size:15px">Odaya katıl</h2>
            <div class="join-code"><input id="netCode" maxlength="5" placeholder="ODA KODU" autocomplete="off" aria-label="Oda kodu"><button class="btn" id="netJoin">Katıl</button></div>
          </div>
        </div></div>`;
      $$('#netBox [data-piece]').forEach(el => { el.innerHTML = PIECE_SET[el.dataset.piece]; });
      this.colorGet = segment($('#netColor'), 'netColor', 'r');
      this.tcGet = timePicker($('#netTime'), 'net', { base: 600, inc: 0 });
    }
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const nm = $('#netName'); if (nm) store.set('netName', nm.value.trim());
      if (b.id === 'netHost') this.host(this.colorGet(), this.tcGet());
      if (b.id === 'netJoin') this.join($('#netCode').value);
      if (b.id === 'netShare') Share.send(this.link(), 'Rok Satranç: benimle oyna! Oda kodu ' + this.code);
      if (b.id === 'netCopy') navigator.clipboard.writeText(this.code).then(() => toast('Kod kopyalandı')).catch(() => prompt('Oda kodu:', this.code));
      if (b.id === 'netCancel') { this.reset(); this.joining = false; this.renderPane(); }
    };
    const ci = $('#netCode'); if (ci) ci.onkeydown = e => { if (e.key === 'Enter') this.join(ci.value); };
  }
};

$('#notice').addEventListener('click', e => {
  const b = e.target.closest('[data-net]'); if (!b) return;
  const a = b.dataset.net;
  if (a === 'drawYes') Net.offerDraw();
  if (a === 'drawNo') { Net.drawOffer = null; Net.send({ t: 'drawNo' }); render(); }
  if (a === 'rematch') Net.askRematch();
});
// Linkle gelen davet: #katil=KOD
function netFromHash() {
  const m = location.hash.match(/^#katil=([A-Za-z0-9]{5})$/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  showScreen('home'); setTab('online');
  Net.join(m[1]);
}
window.addEventListener('DOMContentLoaded', netFromHash);
window.addEventListener('hashchange', netFromHash);
