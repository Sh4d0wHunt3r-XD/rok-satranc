/* Rok Satranç — Stockfish 19 (lite, tek iş parçacığı) ile UCI üzerinden konuşan küçük aracı.
   Stockfish yüklenemezse SF.ok false olur ve uygulama kendi motoruna döner. */
'use strict';
const SF = {
  w: null, ready: null, ok: null, listeners: [], queue: Promise.resolve(), gen: 0, busy: false,
  start() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const fail = err => { this.ok = false; this.ready = null; if (this.w) { this.w.terminate(); this.w = null; } reject(err); };
      try { this.w = new Worker('stockfish/stockfish-19-lite-single.js'); } catch (e) { fail(e); return; }
      this.w.onmessage = e => {
        const line = typeof e.data === 'string' ? e.data : '';
        for (const l of this.listeners.slice()) l(line);
      };
      this.w.onerror = () => fail(new Error('Stockfish yüklenemedi'));
      const timer = setTimeout(() => fail(new Error('Stockfish zaman aşımı')), 20000);
      this.once(l => l === 'uciok', () => {
        this.send('setoption name Hash value 32');
        this.send('isready');
        this.once(l => l === 'readyok', () => { clearTimeout(timer); this.ok = true; resolve(); });
      });
      this.send('uci');
    });
    return this.ready;
  },
  send(s) { if (this.w) this.w.postMessage(s); },
  once(pred, fn) {
    const h = l => { if (pred(l)) { this.listeners.splice(this.listeners.indexOf(h), 1); fn(l); } };
    this.listeners.push(h);
  },
  // Aramalar sırayla yapılır. opts: { moves, movetime, depth, elo }
  search(fen, opts = {}) {
    const gen = this.gen;
    const job = this.queue.then(() => (gen === this.gen ? this._search(fen, opts) : null));
    this.queue = job.catch(() => null);
    return job;
  },
  cancelAll() {
    this.gen++;
    if (this.busy) this.send('stop');
  },
  async _search(fen, opts) {
    await this.start();
    this.busy = true;
    if (opts.elo) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, opts.elo))}`);
    } else this.send('setoption name UCI_LimitStrength value false');
    this.send(`position fen ${fen}${opts.moves && opts.moves.length ? ' moves ' + opts.moves.join(' ') : ''}`);
    return new Promise(resolve => {
      const last = { cp: 0, mate: null, depth: 0, pv: [] };
      const h = l => {
        if (l.startsWith('info ') && l.includes(' pv ') && !/ multipv [2-9]/.test(l)) {
          const d = l.match(/ depth (\d+)/), cp = l.match(/ score cp (-?\d+)/), mt = l.match(/ score mate (-?\d+)/), pv = l.match(/ pv (.+)$/);
          if (d) last.depth = +d[1];
          if (cp) { last.cp = +cp[1]; last.mate = null; }
          if (mt) { last.mate = +mt[1]; last.cp = last.mate > 0 ? 100000 : -100000; }
          if (pv) last.pv = pv[1].trim().split(/\s+/);
        } else if (l.startsWith('bestmove')) {
          this.listeners.splice(this.listeners.indexOf(h), 1);
          this.busy = false;
          const bm = l.split(/\s+/)[1];
          resolve(Object.assign({ best: bm && bm !== '(none)' ? bm : null }, last));
        }
      };
      this.listeners.push(h);
      this.send(opts.depth ? `go depth ${opts.depth}` : `go movetime ${Math.max(30, Math.round(opts.movetime || 1000))}`);
    });
  },
  // Kendi motorumuzun biçimine çevir: skor sıradaki taraf açısından, mat = 100000 - yarım hamle
  toEngine(r) {
    if (!r || !r.best) return null;
    let score = r.cp;
    if (r.mate != null) score = r.mate > 0 ? 100000 - (2 * r.mate - 1) : -(100000 - 2 * Math.abs(r.mate));
    const u = r.best;
    return {
      move: { from: Chess.index(u.slice(0, 2)), to: Chess.index(u.slice(2, 4)), promotion: u[4] || '' },
      score, depth: Math.min(r.depth, 60), pv: r.pv
    };
  }
};
