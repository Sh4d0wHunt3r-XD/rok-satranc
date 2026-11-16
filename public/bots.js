/* Rok Satranç — Ek botlar: ara seviyeler ve karakterler.
   Ezberlenemezler: karakter botları açılışı birkaç hat arasından her hamlede rastgele seçer,
   kitap bitince motor gürültü ve rastgele hamle olasılığıyla oynar. Aynı oyunu iki kez göremezsin. */
const BOOKS = {
  attack: [
    'e4 e5 Qh5 Nc6 Bc4', 'e4 e5 Bc4 Nc6 Qh5', 'e4 e5 Bc4 Nf6 Qf3', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5',
    'e4 e5 Nf3 Nc6 Bc4 Nd4', 'e4 e5 Nf3 f5', 'd4 e5', 'e4 e5 f4', 'e4 c5 Nf3 d6 Bc4', 'd4 d5 e4 dxe4 Nc3'
  ],
  solid: [
    'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6', 'd4 Nf6 Bf4 e6 e3 d5 Nf3 Bd6', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5',
    'e4 c6 d4 d5 e5 Bf5 Nf3 e6', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6',
    'c4 e5 Nc3 Nf6 g3 d5', 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4'
  ],
  gambit: [
    'e4 e5 f4 exf4 Nf3 g5', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3', 'e4 c5 d4 cxd4 c3 dxc3 Nxc3',
    'e4 e5 d4 exd4 c3 dxc3 Bc4', 'd4 d5 c4 e5 dxe5 d4', 'e4 e5 Nf3 Nc6 d4 exd4 Bc4',
    'd4 Nf6 c4 c5 d5 b5', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5', 'e4 d5 exd5 Nf6 c4 c6'
  ]
};

const EXTRA_BOTS = [
  { name: 'Çaylak', elo: 500, piece: 'P', color: '#b7d3a0', desc: 'Yeni öğreniyor. Sık sık taş verir ama bazen fırsatı görür.', time: 350, cfg: { random: 0.35, depth: 1, noise: 160, time: 350 } },
  { name: 'Acemi', elo: 600, piece: 'P', color: '#a6cdb6', desc: 'Basit tehditleri görmeye başladı, ama hâlâ dikkatsiz.', time: 400, cfg: { random: 0.22, depth: 2, noise: 130, time: 400 } },
  { name: 'Hevesli', elo: 700, piece: 'N', color: '#9cc1d9', desc: 'Taşlarını çıkarmayı biliyor. Korumasız taşı görürse alır.', time: 450, cfg: { random: 0.15, depth: 2, noise: 100, time: 450 } },
  { name: 'Kalfa', elo: 900, piece: 'B', color: '#c9c08c', desc: 'Bedava taşları nadiren kaçırır. Basit çatalları görür.', time: 600, cfg: { random: 0.09, depth: 2, noise: 70, time: 600 } },
  { name: 'Sağlam', elo: 1000, piece: 'B', color: '#d6b98a', desc: 'Az hata yapar, iki hamle ilerisini düşünür.', time: 700, cfg: { random: 0.05, depth: 3, noise: 50, time: 700 } },
  { name: 'Kurnaz', elo: 1100, piece: 'R', color: '#d8a57f', desc: 'Taktiklere dikkat eder, açık bıraktığın taşı cezalandırır.', time: 800, cfg: { random: 0.03, depth: 3, noise: 40, time: 800 } },
  // Karakterler
  { name: 'Gürbüz', elo: 650, piece: 'Q', color: '#e39a7d', tag: 'Saldırgan', desc: 'Hep şahına saldırır: erken vezir, çoban matı denemeleri. Savunmayı öğrenmek için ideal.', time: 450, cfg: { random: 0.14, depth: 2, noise: 100, time: 450 }, style: 'attack', book: 'attack' },
  { name: 'Kale Gibi', elo: 850, piece: 'R', color: '#9fb1c4', tag: 'Sağlam', desc: 'Sağlam açılışlar, erken rok, takasları sever. Sabırlı oynamayı öğretir.', time: 600, cfg: { random: 0.06, depth: 2, noise: 60, time: 600 }, style: 'solid', book: 'solid' },
  { name: 'Gambitçi', elo: 950, piece: 'N', color: '#c79ad0', tag: 'Gambitçi', desc: 'Hızlı gelişim için piyon feda eder. Gambiti kabul edip savunabilir misin?', time: 650, cfg: { random: 0.04, depth: 3, noise: 45, time: 650 }, style: 'attack', book: 'gambit' }
];
const BASE_BOT_COUNT = BOTS.length;
BOTS.push(...EXTRA_BOTS);

const Bots = {
  // Kitaptan rastgele bir devam: oynanan hamlelerle uyuşan bütün hatlar arasından seç
  bookMove(bot) {
    if (!bot.book || G.startFen !== START_FEN) return null;
    const played = G.moves.map(m => m.san.replace(/[+#]/g, ''));
    const opts = BOOKS[bot.book].map(l => l.split(' ')).filter(l => l.length > played.length && played.every((s, i) => l[i] === s));
    if (!opts.length) return null;
    const san = opts[Math.floor(Math.random() * opts.length)][played.length];
    try { const m = sanLine([san], G.chess.fen())[0]; return { from: m.from, to: m.to, promotion: m.promotion || '' }; } catch (e) { return null; }
  },
  // Listede seviyeye göre sırala (indeksler kayıtlar için değişmez)
  order() { return BOTS.map((b, i) => [b, i]).sort((a, b) => a[0].elo - b[0].elo || a[1] - b[1]); }
};
