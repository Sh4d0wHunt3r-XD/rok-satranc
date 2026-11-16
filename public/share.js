/* Rok Satranç — Oyun ve pozisyon paylaşma linki.
   Oyun linkin içine yazılır (#g=...), sunucu gerekmez. Link Rok'un internet adresini açar. */
const SITE_URL = 'https://sh4d0whunt3r-xd.github.io/rok-satranc/';

const Share = {
  // UTF-8 güvenli base64url
  enc(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return JSON.parse(decodeURIComponent(escape(atob(s)))); },
  base() { return location.protocol === 'https:' ? location.origin + location.pathname : SITE_URL; },

  // Şu an ekrandaki oyunun linki
  gameLink() {
    const meta = G.meta || {};
    const name = c => (meta[c === 'w' ? 'white' : 'black'] || playerInfo(c).name || '').replace(' (sen)', '');
    const d = { m: G.moves.map(m => m.san).join(' '), w: name('w'), b: name('b') };
    if (G.startFen !== START_FEN) d.f = G.startFen;
    if (G.over) d.r = G.over.winner || 'd';
    if (G.view != null) d.p = G.view;
    if (G.orient === 'b') d.o = 'b';
    return this.base() + '#g=' + this.enc(d);
  },
  async send(url, title) {
    if (navigator.share) {
      try { await navigator.share({ title, text: title, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link kopyalandı. Arkadaşına yapıştırıp gönder.', 3500); }
    catch (e) { prompt('Bu linki kopyala:', url); }
  },
  shareGame() {
    if (!G.moves.length) { toast('Paylaşmak için önce birkaç hamle oyna'); return; }
    const meta = G.meta || {};
    const t = `${(meta.white || playerInfo('w').name).replace(' (sen)', '')} – ${(meta.black || playerInfo('b').name).replace(' (sen)', '')} · Rok Satranç`;
    this.send(this.gameLink(), t);
  },

  // Açılışta linkte oyun varsa aç
  openFromHash() {
    const h = location.hash;
    if (!h.startsWith('#g=')) return false;
    try {
      const d = this.dec(h.slice(3));
      const fen = d.f || START_FEN;
      const moves = d.m ? d.m.split(' ').filter(Boolean) : [];
      const over = d.r ? { winner: d.r === 'd' ? null : d.r, reason: 'pgn' } : null;
      history.replaceState(null, '', location.pathname + location.search);
      Analysis.open({ fen, moves, meta: { white: d.w || 'Beyaz', black: d.b || 'Siyah' }, orient: d.o || 'w', over, atStart: false });
      if (d.p != null) setView(d.p);
      toast('Paylaşılan oyun açıldı. "Oyunu incele" ile Stockfish\'e inceletebilirsin.', 4000);
      return true;
    } catch (e) { toast('Link okunamadı, eksik kopyalanmış olabilir.'); return false; }
  }
};
ACTION_ICONS['Paylaş'] = 'send';
window.addEventListener('DOMContentLoaded', () => Share.openFromHash());
window.addEventListener('hashchange', () => Share.openFromHash());
