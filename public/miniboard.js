/* Rok Satranç — Dersler ve açılışlar için küçük tahta: dokunarak ya da sürükleyerek oynanır */
const sqIdx = n => (8 - Number(n[1])) * 8 + 'abcdefgh'.indexOf(n[0]);
const uciOf = m => Chess.sqName(m.from) + Chess.sqName(m.to) + (m.promotion || '');
const STAR_SVG = '<svg viewBox="0 0 24 24" class="mb-star"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7l-5.6 3.1 1.3-6.2L3 9.3l6.3-.7z"/></svg>';

class MiniBoard {
  constructor(el) {
    this.el = el;
    this.b = new Array(64).fill('');
    this.orient = 'w';
    this.sel = null; this.targets = [];
    this.last = []; this.stars = new Set(); this.marks = {}; this.arrows = [];
    this.legal = () => [];        // kare -> hedef kareler
    this.onMove = null;           // (from, to) => void
    this.drag = null; this.ghost = null;
    el.classList.add('mini-board');
    // Dokunmatik ekranda tahtaya değen parmak sayfayı kaydırmasın
    const stop = e => { if (e.touches.length === 1) e.preventDefault(); };
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', () => { this.drag = null; this.endGhost(); this.render(); });
  }
  sqAtPoint(x, y) {
    const r = this.el.getBoundingClientRect();
    const c = Math.floor((x - r.left) / r.width * 8), w = Math.floor((y - r.top) / r.height * 8);
    if (c < 0 || c > 7 || w < 0 || w > 7) return -1;
    const d = w * 8 + c;
    return this.orient === 'w' ? d : 63 - d;
  }
  down(e) {
    if (e.button !== 0) return;
    const sq = this.sqAtPoint(e.clientX, e.clientY);
    if (sq < 0) return;
    try { this.el.setPointerCapture(e.pointerId); } catch (err) { /* işaretçi yakalanamazsa da çalışır */ }
    // Seçili taşın gidebileceği kareye basıldıysa ya da sürüklenecek taş yoksa: dokunma gibi davran
    const canDrag = this.b[sq] && !(this.sel != null && this.targets.includes(sq)) && this.legal(sq).length;
    if (!canDrag) { this.drag = { from: sq, x: e.clientX, y: e.clientY, tap: true }; return; }
    const wasSel = this.sel === sq;
    if (!wasSel) { this.sel = sq; this.targets = this.legal(sq); this.render(); }
    this.drag = { from: sq, x: e.clientX, y: e.clientY, wasSel, moved: false };
  }
  move(e) {
    const d = this.drag;
    if (!d || d.tap) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) {
      d.moved = true;
      const size = this.el.getBoundingClientRect().width / 8;
      this.ghost = document.createElement('div');
      this.ghost.className = 'drag-ghost';
      this.ghost.style.width = this.ghost.style.height = size + 'px';
      this.ghost.innerHTML = pieceSVG(this.b[d.from]);
      document.body.append(this.ghost);
      const src = this.el.querySelector(`[data-sq="${d.from}"] .mb-pc`);
      if (src) src.style.opacity = '.25';
    }
    if (d.moved && this.ghost) {
      const size = parseFloat(this.ghost.style.width);
      this.ghost.style.left = (e.clientX - size / 2) + 'px';
      this.ghost.style.top = (e.clientY - size / 2) + 'px';
    }
  }
  up(e) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const sq = this.sqAtPoint(e.clientX, e.clientY);
    if (d.tap) { if (sq === d.from) this.click(sq); return; }
    this.endGhost();
    if (d.moved) {
      if (sq >= 0 && sq !== d.from && this.targets.includes(sq)) {
        const from = this.sel;
        this.sel = null; this.targets = [];
        if (this.onMove) this.onMove(from, sq);
        return;
      }
      this.render();
      return;
    }
    if (d.wasSel) { this.sel = null; this.targets = []; this.render(); } // seçili taşa tekrar dokunmak seçimi kaldırır
  }
  endGhost() { if (this.ghost) { this.ghost.remove(); this.ghost = null; } }
  setBoard(b) { this.b = b.slice(); this.sel = null; this.targets = []; this.render(); }
  setChess(ch) { this.setBoard(ch.b.map(p => p || '')); }
  click(sq) {
    if (this.sel != null && this.targets.includes(sq)) {
      const from = this.sel;
      this.sel = null; this.targets = [];
      if (this.onMove) this.onMove(from, sq);
      return;
    }
    const t = this.b[sq] ? this.legal(sq) : [];
    if (t.length && this.sel !== sq) { this.sel = sq; this.targets = t; }
    else { this.sel = null; this.targets = []; }
    this.render();
  }
  render() {
    let h = '';
    for (let d = 0; d < 64; d++) {
      const sq = this.orient === 'w' ? d : 63 - d, p = this.b[sq];
      let c = 'mb-sq ' + ((((sq >> 3) + (sq & 7)) & 1) ? 'd' : 'l');
      if (this.last.includes(sq)) c += ' last';
      if (this.sel === sq) c += ' sel';
      if (this.marks[sq]) c += ' ' + this.marks[sq];
      let inner = p ? `<div class="mb-pc">${pieceSVG(p)}</div>` : '';
      if (this.stars.has(sq)) inner += STAR_SVG;
      if (this.targets.includes(sq)) inner += `<span class="${p ? 'mb-ring' : 'mb-dot'}"></span>`;
      if (this.coords !== false && d >= 56) inner += `<span class="mb-co f">${'abcdefgh'[sq & 7]}</span>`;
      if (this.coords !== false && d % 8 === 0) inner += `<span class="mb-co r">${8 - (sq >> 3)}</span>`;
      h += `<div class="${c}" data-sq="${sq}">${inner}</div>`;
    }
    if (this.arrows.length) h += `<svg class="mb-arrows" viewBox="0 0 800 800">${this.arrows.map(a => this.arrow(a)).join('')}</svg>`;
    this.el.innerHTML = h;
  }
  arrow(a) {
    const pos = sq => { const d = this.orient === 'w' ? sq : 63 - sq; return [(d & 7) * 100 + 50, (d >> 3) * 100 + 50]; };
    const [x1, y1] = pos(a.from), [x2, y2] = pos(a.to);
    const ang = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1) - 30;
    const ex = x1 + Math.cos(ang) * len, ey = y1 + Math.sin(ang) * len;
    const col = a.color || 'rgba(76,190,120,.85)';
    const hx = (s, k) => (ex + Math.cos(ang + s) * k).toFixed(1) + ',' + (ey + Math.sin(ang + s) * k).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${col}" stroke-width="16" stroke-linecap="round"/>
      <polygon points="${(x1 + Math.cos(ang) * (len + 28)).toFixed(1)},${(y1 + Math.sin(ang) * (len + 28)).toFixed(1)} ${hx(2.5, 30)} ${hx(-2.5, 30)}" fill="${col}"/>`;
  }
}

/* Gerçek kurallarla oynanan tahta için yardımcı: Chess nesnesinden yasal hedefler */
function chessTargets(ch, sq, color) {
  const p = ch.b[sq], c = color || ch.turn;
  if (!p || (p < 'a' ? 'w' : 'b') !== c || ch.turn !== c) return [];
  return [...new Set(ch.moves({ square: sq }).map(m => m.to))];
}
/* Hamle uygula; terfi varsa vezire çık */
function chessMove(ch, from, to, promo) {
  const ms = ch.moves({ square: from }).filter(m => m.to === to);
  if (!ms.length) return null;
  const m = ms.find(x => (x.promotion || '') === (promo || 'q')) || ms.find(x => !x.promotion) || ms[0];
  return ch.move(m);
}
/* Sadece gösterim için: FEN'in taş dizilişini 64 karelik diziye çevir (şah olmasa da olur) */
function fenToBoard(fen) {
  const b = [];
  for (const ch of fen.split(' ')[0]) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) b.push('');
    else b.push(ch);
  }
  return b;
}
/* SAN dizisini hamlelere çevir */
function sanLine(sans, fen) {
  const ch = new Chess(fen || undefined), out = [];
  for (const s of sans) {
    const clean = s.replace(/[+#!?]/g, '');
    let found = null;
    for (const m of ch.moves()) {
      const t = new Chess(ch.fen()); const r = t.move(m);
      if (r && r.san.replace(/[+#]/g, '') === clean) { found = m; break; }
    }
    if (!found) throw new Error('Geçersiz hamle: ' + s);
    out.push(ch.move(found));
  }
  return out;
}
