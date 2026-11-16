/* Rok Satranç — Rozetler */
const BADGES = [
  { id: 'zafer', n: 'İlk zafer', d: 'Bir bota karşı kazan', t: s => s.botWins >= 1 },
  { id: 'b800', n: 'Tosun avcısı', d: '800 ya da üstü bir botu yen', t: s => s.maxBeat >= 800 },
  { id: 'b1200', n: 'Kulüp oyuncusu', d: '1200 ya da üstü bir botu yen', t: s => s.maxBeat >= 1200 },
  { id: 'b1600', n: 'Kartal avcısı', d: '1600 ya da üstü bir botu yen', t: s => s.maxBeat >= 1600 },
  { id: 'temiz', n: 'Temiz oyun', d: 'Koç hiç uyarmadan bir botu yen', t: s => s.cleanWins >= 1 },
  { id: 'seri3', n: 'Isınma', d: '3 günlük seri yap', t: s => s.bestStreak >= 3 },
  { id: 'seri7', n: 'Bir hafta', d: '7 günlük seri yap', t: s => s.bestStreak >= 7 },
  { id: 'seri30', n: 'Bir ay', d: '30 günlük seri yap', t: s => s.bestStreak >= 30 },
  { id: 'pz10', n: 'Bulmacacı', d: '10 bulmaca çöz', t: s => s.pzOk >= 10 },
  { id: 'pz100', n: 'Bulmaca kurdu', d: '100 bulmaca çöz', t: s => s.pzOk >= 100 },
  { id: 'pz500', n: 'Taktik makinesi', d: '500 bulmaca çöz', t: s => s.pzOk >= 500 },
  { id: 'ders1', n: 'İlk ders', d: 'Bir ders bitir', t: s => s.lessons >= 1 },
  { id: 'mezun', n: 'Mezun', d: 'Bütün dersleri bitir', t: s => s.lessons >= ALL_LESSONS.length },
  { id: 'acilis5', n: 'Repertuvar', d: '5 açılışı ezberden oyna', t: s => s.openings >= 5 },
  { id: 'matci', n: 'Mat ustası', d: 'Mat antrenmanında iki kale, vezir ve kale matlarını bitir', t: s => s.drills >= 3 },
  { id: 'yol5', n: 'Yolcu', d: 'Bulmaca yolunda 5. seviyeye ulaş', t: s => s.pathLevel >= 5 },
  { id: 'hata10', n: 'Hata avcısı', d: 'Kendi hatalarından 10 tanesini öğren', t: s => s.mistSolved >= 10 },
  { id: 'koord20', n: 'Keskin göz', d: 'Koordinat oyununda 20 kare bul', t: s => s.coord >= 20 },
  { id: 'usta70', n: 'Usta gibi düşün', d: 'Bir ustanın oyununda hamlelerin %70\'ini bul', t: s => s.master >= 70 },
  { id: 'cc5', n: 'Dedektif', d: '5 Chess.com oyununu incele', t: s => s.ccReviewed >= 5 }
];

const Achievements = {
  stats() {
    const h = History.list(), wins = h.filter(e => e.mode === 'bot' && History.outcome(e) === 'win');
    const db = store.get('drillBest', {});
    return {
      botWins: wins.length,
      maxBeat: Math.max(0, ...wins.map(e => (BOTS[e.bot] ? BOTS[e.bot].elo : 0))),
      cleanWins: store.get('cleanWins', 0),
      bestStreak: Math.max(store.get('bestStreak', 0), Activity.streak()),
      pzOk: store.get('pzStats', { ok: 0 }).ok,
      lessons: Object.keys(store.get('learnDone', {})).length,
      openings: Object.keys(store.get('openLearned', {})).length,
      drills: ['rr', 'q', 'r'].filter(k => db[k]).length,
      pathLevel: store.get('pzPath', { level: 1 }).level,
      mistSolved: store.get('mistSolved', 0),
      coord: Math.max(0, ...Object.values(store.get('coordBest', {}))),
      master: Math.max(0, ...Object.values(store.get('masterBest', {}))),
      ccReviewed: h.filter(e => e.mode === 'chesscom' && e.acc != null).length
    };
  },
  unlocked() { return store.get('badges', null); },
  check() {
    let have = this.unlocked();
    const first = have == null;
    have = have || {};
    const s = this.stats(), fresh = [];
    for (const b of BADGES) if (!have[b.id] && b.t(s)) { have[b.id] = Date.now(); fresh.push(b); }
    store.set('badges', have);
    if (first) return; // ilk açılışta eski başarılar sessizce eklenir
    fresh.forEach((b, i) => setTimeout(() => { toast(`Yeni rozet: ${b.n}!`, 3500); Sound.play('notify'); }, 600 + i * 1200));
  },
  count() { const h = this.unlocked() || {}; return BADGES.filter(b => h[b.id]).length; },
  html() {
    const h = this.unlocked() || {};
    return `<div class="block"><div class="row-between"><h2>Rozetler</h2><span class="muted">${this.count()}/${BADGES.length}</span></div>
      <div class="badges">${BADGES.map(b => `<div class="badge${h[b.id] ? ' on' : ''}" title="${esc(b.d)}">
        <span class="bd-ic">${icon(h[b.id] ? 'check' : 'target')}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small></div>`).join('')}</div></div>`;
  }
};
