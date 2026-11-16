/* Rok Satranç — kurallar motoru (tarayıcı, Web Worker ve Node ortak kullanır)
   Kare indeksi: 0 = a8, 7 = h8, 56 = a1, 63 = h1. Büyük harf = beyaz. */
(function (root) {
  'use strict';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const FILES = 'abcdefgh';
  const name = i => FILES[i & 7] + (8 - (i >> 3));
  const index = s => (8 - (s.charCodeAt(1) - 48)) * 8 + (s.charCodeAt(0) - 97);
  const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const colorOf = p => (p ? (p < 'a' ? 'w' : 'b') : null);

  const KNIGHT = [], KING = [], DIAG = [], ORTH = [], QUEEN = [];
  for (let i = 0; i < 64; i++) {
    const r = i >> 3, c = i & 7;
    const jumps = list => list.filter(([a, b]) => inB(r + a, c + b)).map(([a, b]) => (r + a) * 8 + c + b);
    KNIGHT[i] = jumps([[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]);
    KING[i] = jumps([[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]);
    const ray = ([a, b]) => { const out = []; let rr = r + a, cc = c + b; while (inB(rr, cc)) { out.push(rr * 8 + cc); rr += a; cc += b; } return out; };
    DIAG[i] = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(ray);
    ORTH[i] = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(ray);
    QUEEN[i] = DIAG[i].concat(ORTH[i]);
  }
  // Rok hakları: 1=K 2=Q 4=k 8=q. Bir kareden çıkış/varış hangi hakları siler.
  const CR = new Array(64).fill(15);
  CR[60] = 15 & ~3; CR[63] = 15 & ~1; CR[56] = 15 & ~2;
  CR[4] = 15 & ~12; CR[7] = 15 & ~4; CR[0] = 15 & ~8;

  class Chess {
    constructor(fen) { this.load(fen || START); }

    load(fen) {
      const parts = String(fen).trim().split(/\s+/);
      const b = new Array(64).fill('');
      let i = 0;
      for (const ch of parts[0]) {
        if (ch === '/') continue;
        if (ch >= '1' && ch <= '8') i += +ch;
        else if ('pnbrqkPNBRQK'.includes(ch) && i < 64) b[i++] = ch;
        else throw new Error('Geçersiz FEN');
      }
      if (i !== 64) throw new Error('Geçersiz FEN');
      const wk = b.indexOf('K'), bk = b.indexOf('k');
      if (wk < 0 || bk < 0) throw new Error('İki tarafın da şahı olmalı');
      this.b = b;
      this.turn = parts[1] === 'b' ? 'b' : 'w';
      const c = parts[2] || '-';
      let cr = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
      if (b[60] !== 'K') cr &= ~3; if (b[63] !== 'R') cr &= ~1; if (b[56] !== 'R') cr &= ~2;
      if (b[4] !== 'k') cr &= ~12; if (b[7] !== 'r') cr &= ~4; if (b[0] !== 'r') cr &= ~8;
      this.castling = cr;
      this.ep = parts[3] && parts[3] !== '-' ? index(parts[3]) : -1;
      this.half = parseInt(parts[4], 10) || 0;
      this.full = parseInt(parts[5], 10) || 1;
      this.kings = { w: wk, b: bk };
      this.stack = [];
      this.sanList = [];
      this.keys = [this.key()];
      this.startFen = this.fen();
      return this;
    }

    fen() {
      let s = '';
      for (let r = 0; r < 8; r++) {
        let e = 0;
        for (let c = 0; c < 8; c++) {
          const p = this.b[r * 8 + c];
          if (!p) e++; else { if (e) { s += e; e = 0; } s += p; }
        }
        if (e) s += e;
        if (r < 7) s += '/';
      }
      const k = this.castling;
      const cr = (k & 1 ? 'K' : '') + (k & 2 ? 'Q' : '') + (k & 4 ? 'k' : '') + (k & 8 ? 'q' : '');
      return `${s} ${this.turn} ${cr || '-'} ${this.ep >= 0 ? name(this.ep) : '-'} ${this.half} ${this.full}`;
    }

    epCapturable() {
      if (this.ep < 0) return false;
      const pawn = this.turn === 'w' ? 'P' : 'p';
      const row = this.turn === 'w' ? this.ep + 8 : this.ep - 8;
      const c = this.ep & 7;
      return (c > 0 && this.b[row - 1] === pawn) || (c < 7 && this.b[row + 1] === pawn);
    }

    key() { return this.b.join(',') + this.turn + this.castling + (this.epCapturable() ? this.ep : -1); }

    get(sq) { return this.b[typeof sq === 'string' ? index(sq) : sq]; }

    attacked(sq, by) {
      const b = this.b, r = sq >> 3, c = sq & 7;
      if (by === 'w') {
        if (r < 7) { if (c > 0 && b[sq + 7] === 'P') return true; if (c < 7 && b[sq + 9] === 'P') return true; }
      } else if (r > 0) {
        if (c > 0 && b[sq - 9] === 'p') return true; if (c < 7 && b[sq - 7] === 'p') return true;
      }
      const w = by === 'w';
      const N = w ? 'N' : 'n', K = w ? 'K' : 'k', B = w ? 'B' : 'b', R = w ? 'R' : 'r', Q = w ? 'Q' : 'q';
      for (const t of KNIGHT[sq]) if (b[t] === N) return true;
      for (const t of KING[sq]) if (b[t] === K) return true;
      for (const ray of DIAG[sq]) for (const t of ray) { const p = b[t]; if (p) { if (p === B || p === Q) return true; break; } }
      for (const ray of ORTH[sq]) for (const t of ray) { const p = b[t]; if (p) { if (p === R || p === Q) return true; break; } }
      return false;
    }

    inCheck(color) { color = color || this.turn; return this.attacked(this.kings[color], color === 'w' ? 'b' : 'w'); }

    _pseudo(capsOnly) {
      const b = this.b, white = this.turn === 'w', out = [];
      for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (!p || (p < 'a') !== white) continue;
        const t = p.toLowerCase();
        if (t === 'p') {
          const fwd = white ? -8 : 8, r = i >> 3, c = i & 7;
          const promo = white ? r === 1 : r === 6;
          const start = white ? r === 6 : r === 1;
          const one = i + fwd;
          if (!b[one]) {
            if (promo) { for (const pr of 'qrbn') if (!capsOnly || pr === 'q') out.push({ from: i, to: one, piece: p, captured: '', promotion: pr }); }
            else if (!capsOnly) {
              out.push({ from: i, to: one, piece: p, captured: '' });
              if (start && !b[one + fwd]) out.push({ from: i, to: one + fwd, piece: p, captured: '', double: true });
            }
          }
          for (let dc = -1; dc <= 1; dc += 2) {
            if (c + dc < 0 || c + dc > 7) continue;
            const t2 = one + dc, q = b[t2];
            if (q && (q < 'a') !== white) {
              if (promo) { for (const pr of 'qrbn') if (!capsOnly || pr === 'q') out.push({ from: i, to: t2, piece: p, captured: q, promotion: pr }); }
              else out.push({ from: i, to: t2, piece: p, captured: q });
            } else if (t2 === this.ep && !q) out.push({ from: i, to: t2, piece: p, captured: white ? 'p' : 'P', ep: true });
          }
        } else if (t === 'n' || t === 'k') {
          for (const t2 of (t === 'n' ? KNIGHT : KING)[i]) {
            const q = b[t2];
            if (!q) { if (!capsOnly) out.push({ from: i, to: t2, piece: p, captured: '' }); }
            else if ((q < 'a') !== white) out.push({ from: i, to: t2, piece: p, captured: q });
          }
          if (t === 'k' && !capsOnly) {
            const opp = white ? 'b' : 'w';
            if (white && i === 60) {
              if ((this.castling & 1) && !b[61] && !b[62] && b[63] === 'R' && !this.attacked(60, opp) && !this.attacked(61, opp) && !this.attacked(62, opp))
                out.push({ from: 60, to: 62, piece: p, captured: '', castle: 'k' });
              if ((this.castling & 2) && !b[59] && !b[58] && !b[57] && b[56] === 'R' && !this.attacked(60, opp) && !this.attacked(59, opp) && !this.attacked(58, opp))
                out.push({ from: 60, to: 58, piece: p, captured: '', castle: 'q' });
            } else if (!white && i === 4) {
              if ((this.castling & 4) && !b[5] && !b[6] && b[7] === 'r' && !this.attacked(4, opp) && !this.attacked(5, opp) && !this.attacked(6, opp))
                out.push({ from: 4, to: 6, piece: p, captured: '', castle: 'k' });
              if ((this.castling & 8) && !b[3] && !b[2] && !b[1] && b[0] === 'r' && !this.attacked(4, opp) && !this.attacked(3, opp) && !this.attacked(2, opp))
                out.push({ from: 4, to: 2, piece: p, captured: '', castle: 'q' });
            }
          }
        } else {
          const rays = t === 'b' ? DIAG[i] : t === 'r' ? ORTH[i] : QUEEN[i];
          for (const ray of rays) for (const t2 of ray) {
            const q = b[t2];
            if (!q) { if (!capsOnly) out.push({ from: i, to: t2, piece: p, captured: '' }); }
            else { if ((q < 'a') !== white) out.push({ from: i, to: t2, piece: p, captured: q }); break; }
          }
        }
      }
      return out;
    }

    _make(m) {
      const b = this.b, us = this.turn;
      this.stack.push([m, this.castling, this.ep, this.half, this.full]);
      b[m.from] = '';
      b[m.to] = m.promotion ? (us === 'w' ? m.promotion.toUpperCase() : m.promotion) : m.piece;
      if (m.ep) b[us === 'w' ? m.to + 8 : m.to - 8] = '';
      if (m.castle === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ''; }
      else if (m.castle === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ''; }
      if (m.piece === 'K') this.kings.w = m.to; else if (m.piece === 'k') this.kings.b = m.to;
      this.castling &= CR[m.from] & CR[m.to];
      this.ep = m.double ? (m.from + m.to) >> 1 : -1;
      this.half = (m.piece === 'P' || m.piece === 'p' || m.captured) ? 0 : this.half + 1;
      if (us === 'b') this.full++;
      this.turn = us === 'w' ? 'b' : 'w';
    }

    _undo() {
      const [m, cr, ep, half, full] = this.stack.pop();
      const b = this.b;
      this.turn = this.turn === 'w' ? 'b' : 'w';
      const us = this.turn;
      b[m.from] = m.piece;
      if (m.ep) { b[m.to] = ''; b[us === 'w' ? m.to + 8 : m.to - 8] = m.captured; }
      else b[m.to] = m.captured;
      if (m.castle === 'k') { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = ''; }
      else if (m.castle === 'q') { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = ''; }
      if (m.piece === 'K') this.kings.w = m.from; else if (m.piece === 'k') this.kings.b = m.from;
      this.castling = cr; this.ep = ep; this.half = half; this.full = full;
      return m;
    }

    _legal() {
      const us = this.turn, them = us === 'w' ? 'b' : 'w', out = [];
      for (const m of this._pseudo(false)) {
        this._make(m);
        if (!this.attacked(this.kings[us], them)) out.push(m);
        this._undo();
      }
      return out;
    }

    moves(opts) {
      let ms = this._legal();
      if (opts && opts.square != null) {
        const s = typeof opts.square === 'string' ? index(opts.square) : opts.square;
        ms = ms.filter(m => m.from === s);
      }
      return ms;
    }

    _san(m, legal) {
      let s;
      if (m.castle) s = m.castle === 'k' ? 'O-O' : 'O-O-O';
      else {
        const t = m.piece.toUpperCase();
        if (t === 'P') {
          s = m.captured ? FILES[m.from & 7] + 'x' : '';
          s += name(m.to);
          if (m.promotion) s += '=' + m.promotion.toUpperCase();
        } else {
          s = t;
          const others = legal.filter(x => x.piece === m.piece && x.to === m.to && x.from !== m.from);
          if (others.length) {
            const sf = others.some(x => (x.from & 7) === (m.from & 7));
            const sr = others.some(x => (x.from >> 3) === (m.from >> 3));
            if (!sf) s += FILES[m.from & 7]; else if (!sr) s += (8 - (m.from >> 3)); else s += name(m.from);
          }
          if (m.captured) s += 'x';
          s += name(m.to);
        }
      }
      this._make(m);
      if (this.inCheck()) s += this._legal().length ? '+' : '#';
      this._undo();
      return s;
    }

    move(input) {
      const legal = this._legal();
      let m;
      if (typeof input === 'string') {
        const clean = input.replace(/[+#?!]/g, '').replace(/0/g, 'O').trim();
        m = legal.find(x => this._san(x, legal).replace(/[+#]/g, '') === clean);
      } else if (input) {
        const from = typeof input.from === 'string' ? index(input.from) : input.from;
        const to = typeof input.to === 'string' ? index(input.to) : input.to;
        const cands = legal.filter(x => x.from === from && x.to === to);
        if (cands.length && cands[0].promotion) m = cands.find(x => x.promotion === (input.promotion || 'q'));
        else m = cands[0];
      }
      if (!m) return null;
      const san = this._san(m, legal);
      this._make(m);
      this.sanList.push(san);
      this.keys.push(this.key());
      return Object.assign({}, m, {
        san, color: m.piece < 'a' ? 'w' : 'b', promotion: m.promotion || '',
        check: /[+#]$/.test(san), mate: san.endsWith('#')
      });
    }

    undo() {
      if (!this.stack.length) return null;
      this.keys.pop(); this.sanList.pop();
      return this._undo();
    }

    insufficient() {
      const minors = [];
      for (let i = 0; i < 64; i++) {
        const p = this.b[i];
        if (!p) continue;
        const t = p.toLowerCase();
        if (t === 'k') continue;
        if (t === 'p' || t === 'r' || t === 'q') return false;
        minors.push({ t, sq: ((i >> 3) + (i & 7)) & 1 });
      }
      if (minors.length <= 1) return true;
      return minors.every(m => m.t === 'b' && m.sq === minors[0].sq);
    }

    // Süre bittiğinde: bu renk mat edebilecek taşa sahip mi?
    canMate(color) {
      let minor = 0;
      for (const p of this.b) {
        if (!p || colorOf(p) !== color) continue;
        const t = p.toLowerCase();
        if (t === 'p' || t === 'r' || t === 'q') return true;
        if (t === 'n' || t === 'b') minor++;
      }
      return minor >= 2;
    }

    repetitions() {
      const k = this.keys[this.keys.length - 1];
      let n = 0;
      for (const x of this.keys) if (x === k) n++;
      return n;
    }

    status() {
      const legal = this._legal();
      if (!legal.length) {
        return this.inCheck()
          ? { over: true, winner: this.turn === 'w' ? 'b' : 'w', reason: 'checkmate' }
          : { over: true, winner: null, reason: 'stalemate' };
      }
      if (this.insufficient()) return { over: true, winner: null, reason: 'insufficient' };
      if (this.half >= 100) return { over: true, winner: null, reason: 'fifty' };
      if (this.repetitions() >= 3) return { over: true, winner: null, reason: 'repetition' };
      return { over: false };
    }
  }

  Chess.START = START;
  Chess.sqName = name;
  Chess.index = index;
  Chess.colorOf = colorOf;
  Chess.T = { KNIGHT, KING, DIAG, ORTH, QUEEN };

  if (typeof module !== 'undefined' && module.exports) module.exports = Chess;
  else root.Chess = Chess;
})(typeof self !== 'undefined' ? self : this);
