/* Rok Satranç — Öğren: üniteler, dersler ve etkileşimli adımlar */
const UNITS = [
  {
    title: 'Taşlar ve hareketleri', desc: 'Her taş nasıl gider, neyi alabilir.',
    lessons: [
      { id: 'kale', title: 'Kale', sub: 'Düz çizgiler', steps: [
        { t: 'info', text: 'Kale yatay ve dikey gider, istediği kadar kare ilerleyebilir. Başka bir taşın üstünden atlayamaz.', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'h4'], ['d4', 'd1'], ['d4', 'a4']] },
        { t: 'stars', text: 'Kaleyle bütün yıldızları topla.', piece: 'R', at: 'a1', stars: ['a6', 'f6', 'f2'] },
        { t: 'stars', text: 'Kendi piyonların yolu kapatıyor, etrafından dolaş.', piece: 'R', at: 'a1', walls: ['a4', 'c2'], stars: ['a3', 'h3', 'h8', 'c8'] }
      ] },
      { id: 'fil', title: 'Fil', sub: 'Çapraz çizgiler', steps: [
        { t: 'info', text: 'Fil çapraz gider ve hep aynı renk karelerde kalır. Beyaz kareli fil siyah karelere hiç geçemez.', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', arrows: [['d4', 'h8'], ['d4', 'a7'], ['d4', 'g1'], ['d4', 'a1']] },
        { t: 'stars', text: 'Fille yıldızları topla.', piece: 'B', at: 'c1', stars: ['e3', 'h6', 'f8'] },
        { t: 'stars', text: 'Bir tane daha. Hangi çaprazdan gideceğini önce düşün.', piece: 'B', at: 'f1', stars: ['b5', 'd7', 'a4'] }
      ] },
      { id: 'vezir', title: 'Vezir', sub: 'En güçlü taş', steps: [
        { t: 'info', text: 'Vezir, kale ile filin birleşimidir: düz de gider, çapraz da. Tahtadaki en güçlü taştır, o yüzden onu kolay kolay kaptırma.', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'h8'], ['d4', 'h4'], ['d4', 'g1'], ['d4', 'd1'], ['d4', 'a1'], ['d4', 'a4'], ['d4', 'a7']] },
        { t: 'stars', text: 'Vezirle yıldızları topla.', piece: 'Q', at: 'd1', stars: ['d7', 'a4', 'h4', 'h8'] }
      ] },
      { id: 'at', title: 'At', sub: 'L şeklinde zıplar', steps: [
        { t: 'info', text: 'At "L" çizer: bir yöne iki kare, sonra yana bir kare. Taşların üstünden atlayabilen tek taştır. Her hamlede kare rengi değiştirir.', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', arrows: [['d4', 'e6'], ['d4', 'c6'], ['d4', 'f5'], ['d4', 'f3'], ['d4', 'e2'], ['d4', 'c2'], ['d4', 'b3'], ['d4', 'b5']] },
        { t: 'stars', text: 'Atla yıldızları topla.', piece: 'N', at: 'b1', stars: ['c3', 'e4', 'f6', 'h7'] },
        { t: 'stars', text: 'Biraz daha zor. Her hamleden önce atın gidebileceği kareleri say.', piece: 'N', at: 'g1', stars: ['e2', 'c3', 'a4', 'b6'] }
      ] },
      { id: 'sah', title: 'Şah', sub: 'Yavaş ama en önemli', steps: [
        { t: 'info', text: 'Şah her yöne yalnızca bir kare gider. Oyunun amacı rakibin şahını yakalamaktır, o yüzden kendi şahını tehlikeye atan bir hamle yapamazsın.', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1' },
        { t: 'stars', text: 'Şahla yıldızları topla.', piece: 'K', at: 'e1', stars: ['d2', 'd3', 'e4', 'f4'] }
      ] },
      { id: 'piyon', title: 'Piyon', sub: 'İleri gider, çapraz alır', steps: [
        { t: 'info', text: 'Piyon sadece ileri gider, geri dönemez. İlk hamlesinde iki kare gidebilir. Taş alırken çapraz alır. Son sıraya ulaşırsa vezire (ya da başka bir taşa) dönüşür.', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', arrows: [['e2', 'e4']] },
        { t: 'stars', text: 'Piyonla yıldızları topla. Siyah piyonu çapraz alabilirsin.', piece: 'P', at: 'e2', prey: ['d5'], stars: ['e4', 'd5', 'd6'] }
      ] }
    ]
  },
  {
    title: 'Oyunun kuralları', desc: 'Şah, mat, pat ve özel hamleler.',
    lessons: [
      { id: 'sahcek', title: 'Şah çekmek', sub: 'Şahı tehdit etmek', steps: [
        { t: 'info', text: 'Bir taş rakibin şahına saldırıyorsa buna "şah" denir. Şah çekilen oyuncu bundan kurtulmak zorundadır: şahını kaçırır, araya taş koyar ya da saldıran taşı alır.' },
        { t: 'find', text: 'Siyah şaha şah çek.', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', goal: 'check', ok: 'Kale artık siyah şahı tehdit ediyor.' },
        { t: 'find', text: 'Beyaz şaha şah çekilmiş. Vezir korumasız: onu al.', fen: '4k3/8/8/8/8/8/4q3/4K3 w - - 0 1', sol: ['e1e2'], ok: 'Saldıran taşı almak şahtan kurtulmanın bir yolu.' },
        { t: 'quiz', text: 'Şah çekildiğinde hangisi yapılamaz?', opts: ['Şahı kaçırmak', 'Araya taş koymak', 'Şahı görmezden gelip başka hamle yapmak'], a: 2, why: 'Şah çekildiyse o hamlede mutlaka şahı kurtarmalısın.' }
      ] },
      { id: 'mat', title: 'Şah mat', sub: 'Oyunu kazanmak', steps: [
        { t: 'info', text: 'Şah çekilmiş ve kurtulacak hiçbir yol yoksa bu "şah mat"tır, oyun biter. Mat etmeden önce her zaman şunu sor: "Şah nereye kaçabilir?"' },
        { t: 'find', text: 'Tek hamlede mat et.', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', goal: 'mate', ok: 'Arka sıra matı! Siyahın piyonları kendi şahını hapsetti.' },
        { t: 'find', text: 'Tek hamlede mat et. Kendi şahın yardım ediyor.', fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', goal: 'mate', ok: 'Şahın g7 ve h7 karelerini tutuyor, vezir de son sırayı.' },
        { t: 'find', text: 'Bir tane daha: tek hamlede mat.', fen: '3k4/8/3K4/8/8/8/8/7R w - - 0 1', goal: 'mate', ok: 'Kale ve şah birlikte: klasik kale matı.' }
      ] },
      { id: 'pat', title: 'Pat', sub: 'Kazanırken berabere kalma', steps: [
        { t: 'info', text: 'Sıra rakipteyse, şahı tehdit altında değilse ama yapabileceği hiçbir yasal hamle yoksa bu "pat"tır ve oyun berabere biter. Çok öndeyken en sık yapılan hata budur.', fen: 'k7/8/1Q6/8/8/8/8/2K5 b - - 0 1' },
        { t: 'quiz', text: 'Tahtadaki pozisyonda sıra siyahta. Bu ne?', fen: 'k7/8/1Q6/8/8/8/8/2K5 b - - 0 1', opts: ['Şah mat', 'Pat', 'Oyun devam ediyor'], a: 1, why: 'Siyah şah tehdit altında değil ama a7, b7 ve b8 karelerinin hepsini vezir tutuyor. Hamle yok: pat.' },
        { t: 'find', text: 'Mat et ama dikkat: bir hamle pat yapıyor.', fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1', goal: 'mate', ok: 'Şahının koruduğu vezir b7\'de: mat.' },
        { t: 'drill', text: 'Pat yapmadan mat etmeyi gerçek bir rakibe karşı dene. Mat antrenmanında pat koruması seni uyarır.', id: 'q' }
      ] },
      { id: 'rok', title: 'Rok', sub: 'Şahı güvenliğe al', steps: [
        { t: 'info', text: 'Rok, şah ile kalenin aynı anda oynandığı özel hamledir. Şah kaleye doğru iki kare gider, kale şahın üstünden atlar. Şah ve o kale daha önce oynamamış olmalı, araları boş olmalı ve şah tehdit altından geçmemeli.' },
        { t: 'find', text: 'Kısa rok at: şahı g1\'e götür.', fen: 'r3k2r/pppq1ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPPQ1PPP/R3K2R w KQkq - 0 1', sol: ['e1g1'], ok: 'Şahın artık köşede, piyonların arkasında güvende.' },
        { t: 'quiz', text: 'Rok ne zaman atılabilir?', opts: ['Şah daha önce oynadıysa', 'Şah şu an şah altındaysa', 'Şah ve kale hiç oynamadıysa ve aralarında taş yoksa'], a: 2, why: 'Ayrıca şah, rakibin saldırdığı bir kareden geçemez.' }
      ] },
      { id: 'terfi', title: 'Terfi', sub: 'Piyon vezir olur', steps: [
        { t: 'info', text: 'Piyon son sıraya ulaşınca vezir, kale, fil ya da ata dönüşür. Neredeyse her zaman vezir seçilir. Rok\'ta bu tahtada otomatik olarak vezir seçilir.' },
        { t: 'find', text: 'Piyonu ilerletip vezir yap.', fen: '8/4P3/8/8/8/8/k7/4K3 w - - 0 1', sol: ['e7e8q'], ok: 'Yeni bir vezirin oldu!' }
      ] },
      { id: 'gecerken', title: 'Geçerken alma', sub: 'En şaşırtıcı kural', steps: [
        { t: 'info', text: 'Rakip piyon iki kare ilerleyip senin piyonunun hemen yanına gelirse, onu sanki tek kare gitmiş gibi çapraz alabilirsin. Bu hakkı sadece hemen bir sonraki hamlede kullanabilirsin.' },
        { t: 'find', text: 'Siyah az önce d7\'den d5\'e oynadı. Onu geçerken al.', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', sol: ['e5d6'], ok: 'Piyonun d6\'ya geçti ve d5\'teki piyon tahtadan kalktı.' }
      ] }
    ]
  },
  {
    title: 'Taş değerleri', desc: 'Hangi taş ne kadar eder, ne zaman takas yapılır.',
    lessons: [
      { id: 'deger', title: 'Taşların değeri', sub: 'Piyon 1, vezir 9', steps: [
        { t: 'info', text: 'Yaklaşık değerler: piyon 1, at 3, fil 3, kale 5, vezir 9. Şahın değeri yoktur çünkü kaybedilirse oyun biter. Takas yaparken bu sayıları topla.' },
        { t: 'quiz', text: 'Kale mi daha değerli, fil mi?', opts: ['Kale (5)', 'Fil (3)', 'İkisi eşit'], a: 0, why: 'Kale 5, fil 3 eder. Filini verip kale almak iyi bir takastır.' },
        { t: 'quiz', text: 'Vezirini verip rakibin kalesini almak iyi bir takas mı?', opts: ['Evet', 'Hayır'], a: 1, why: 'Vezir 9, kale 5 eder. 4 puan kaybedersin.' },
        { t: 'quiz', text: 'At ve fil birlikte mi, tek kale mi daha değerli?', opts: ['At + fil (6)', 'Kale (5)', 'Eşitler'], a: 0, why: 'İki küçük taş genelde bir kaleden daha değerlidir.' }
      ] },
      { id: 'bedava', title: 'Bedava taş', sub: 'Korumasız taşı yakala', steps: [
        { t: 'info', text: 'Korunmayan bir taşa "asılı" taş denir. Her hamlede iki şeye bak: rakibin asılı taşı var mı, ve benim asılı taşım var mı?' },
        { t: 'find', text: 'Siyahın korumasız taşını al.', fen: '4k3/pp3ppp/8/3n4/8/8/PP3PPP/3QK3 w - - 0 1', sol: ['d1d5'], ok: 'At korumasızdı, vezirin bedavaya aldı.' },
        { t: 'pz', theme: 'hangingPiece', n: 3, max: 1100 }
      ] }
    ]
  },
  {
    title: 'Açılışın temelleri', desc: 'İlk 10 hamlede ne yapmalı.',
    lessons: [
      { id: 'merkez', title: 'Merkez ve gelişim', sub: 'Üç altın kural', steps: [
        { t: 'info', text: '1) Merkezi piyonlarla tut (e4, d4). 2) Atlarını ve fillerini çıkar, her taşı bir kez oyna. 3) Erken rok at. Vezirle erken saldırmak genelde zaman kaybettirir.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', arrows: [['e2', 'e4'], ['d2', 'd4'], ['g1', 'f3'], ['b1', 'c3']] },
        { t: 'quiz', text: 'Oyunun ilk hamlesi için hangisi daha iyi bir fikir?', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', opts: ['h4', 'e4', 'a3'], a: 1, why: 'e4 merkezi tutar, vezir ve filin önünü açar.' },
        { t: 'find', text: 'Bir taş geliştir: atını merkeze doğru çıkar.', line: ['e4', 'e5'], accept: ['g1f3', 'b1c3'], sol: ['g1f3'], ok: 'At merkezi kontrol ediyor ve rok için yolu açıyor.' },
        { t: 'quiz', text: 'Taşlarını çıkardın. Şimdi en önemli şey ne?', opts: ['Veziri ileri sürmek', 'Rok atıp şahı güvene almak', 'Kenar piyonlarını oynamak'], a: 1, why: 'Şah ortada kalırsa açılan hatlardan saldırı yer.' }
      ] },
      { id: 'coban', title: 'Çoban matı', sub: '4 hamlelik tuzak', steps: [
        { t: 'info', text: 'Beyaz veziri ve fili f7\'ye saldırtırsa, f7 sadece şahla korunduğu için 4. hamlede mat olabilir. Başlangıç seviyesinde çok sık görülür.', line: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], arrows: [['h5', 'f7'], ['c4', 'f7']] },
        { t: 'find', text: 'Siyahsın. Vezir ve fil f7\'yi tehdit ediyor. Savun!', line: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5'], sol: ['g7g6'], accept: ['g7g6', 'd8e7', 'd8f6'], ok: 'f7 artık korunuyor ya da vezir kovalanıyor.' },
        { t: 'find', text: 'Siyah yanlış savundu. Beyazsın: mat et.', line: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6'], goal: 'mate', ok: 'Çoban matı! Bunu sana yapmalarına izin verme.' }
      ] }
    ]
  },
  {
    title: 'Taktikler', desc: 'Taş kazandıran kısa hamle dizileri.',
    lessons: [
      { id: 'catal', title: 'Çatal', sub: 'Aynı anda iki saldırı', steps: [
        { t: 'info', text: 'Bir taş aynı anda iki rakip taşa saldırırsa buna çatal denir. Rakip ikisini birden kurtaramaz. Atlar çatal yapmakta çok iyidir.' },
        { t: 'find', text: 'Atla çatal yap: şaha ve kaleye aynı anda saldır.', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', sol: ['b5c7'], ok: 'Şah kaçmak zorunda, sonra kaleyi alırsın.' },
        { t: 'pz', theme: 'fork', n: 4, max: 1000 }
      ] },
      { id: 'acmaz', title: 'Açmaz', sub: 'Kıpırdayamayan taş', steps: [
        { t: 'info', text: 'Bir taşın arkasında daha değerli bir taş varsa, öndeki taş kımıldarsa arkadaki yakalanır. Bu duruma açmaz denir. Şaha açmaz olan taş hiç kımıldayamaz.' },
        { t: 'pz', theme: 'pin', n: 3, max: 1400 }
      ] },
      { id: 'sis', title: 'Şiş', sub: 'Ters açmaz', steps: [
        { t: 'info', text: 'Şiş, açmazın tersidir: önde değerli taş, arkada daha az değerli taş vardır. Değerli taş kaçınca arkadaki alınır.' },
        { t: 'find', text: 'Fille şah çek. Şah çaprazdan çekilmek zorunda kalınca arkasındaki kale korumasız kalacak.', fen: '8/1r6/8/8/8/5k2/7K/5B2 w - - 0 1', sol: ['f1g2'], ok: 'Şiş! Şah nereye kaçarsa kaçsın, sonraki hamlede fil b7\'deki kaleyi alır. Filini şahın koruyor.' },
        { t: 'pz', theme: 'skewer', n: 3, max: 1500 }
      ] },
      { id: 'acarak', title: 'Açarak saldırı', sub: 'Gizli saldırgan', steps: [
        { t: 'info', text: 'Bir taşı oynayınca arkasındaki taşın yolu açılır ve iki saldırı birden ortaya çıkar. Öndeki taş şah çekiyorsa buna açarak şah denir.' },
        { t: 'pz', theme: 'discoveredAttack', n: 3, max: 1200 }
      ] },
      { id: 'saptirma', title: 'Saptırma', sub: 'Savunmacıyı uzaklaştır', steps: [
        { t: 'info', text: 'Önemli bir kareyi ya da taşı koruyan rakip taşı başka bir yere çekersen, korumasız kalan hedefe ulaşırsın.' },
        { t: 'pz', theme: 'deflection', n: 3, max: 1300 }
      ] }
    ]
  },
  {
    title: 'Mat kalıpları', desc: 'Görünce tanıyacağın matlar.',
    lessons: [
      { id: 'mat1', title: '1 hamlede mat', sub: 'Gözünü alıştır', steps: [
        { t: 'info', text: 'Her hamlede önce şah çeken hamlelere bak. Her biri için "şah nereye kaçabilir?" diye sor. Kaçış yoksa mattır.' },
        { t: 'pz', theme: 'mateIn1', n: 5, max: 900 }
      ] },
      { id: 'arkasira', title: 'Arka sıra matı', sub: 'Piyonlar kapıyı kapatır', steps: [
        { t: 'info', text: 'Şahın önündeki piyonlar hiç oynamadıysa, son sıraya gelen bir kale ya da vezir mat edebilir. Bu yüzden ileride şahına bir "kaçış deliği" açmak iyidir (örneğin h3).' },
        { t: 'pz', theme: 'backRankMate', n: 3, max: 1300 }
      ] },
      { id: 'bogmaca', title: 'Boğmaca mat', sub: 'Kendi taşlarında boğulmak', steps: [
        { t: 'info', text: 'Şah kendi taşlarıyla çevriliyse, tek bir at onu mat edebilir. Atı kimse engelleyemez.' },
        { t: 'pz', theme: 'smotheredMate', n: 2, max: 2000 }
      ] },
      { id: 'mat2', title: '2 hamlede mat', sub: 'Bir adım ileriyi gör', steps: [
        { t: 'info', text: 'İlk hamle genelde zorlayıcıdır: şah, alış ya da büyük tehdit. Rakibin cevabı sınırlıysa ikinci hamlede matı ararsın.' },
        { t: 'pz', theme: 'mateIn2', n: 4, max: 1000 }
      ] }
    ]
  },
  {
    title: 'Oyun sonları', desc: 'Kazandığın oyunu kazanmayı bitir.',
    lessons: [
      { id: 'vezirmat', title: 'Vezirle mat', sub: 'Mat antrenmanı', steps: [
        { t: 'info', text: 'Veziri rakip şaha at hamlesi uzaklığında tutup kenara it. Şah kenara gelince veziri durdur ve kendi şahını getir. Köşede pat\'a dikkat.' },
        { t: 'drill', text: 'Gerçek bir rakip şaha karşı vezirle mat et.', id: 'q' }
      ] },
      { id: 'kalemat', title: 'Kaleyle mat', sub: 'Mat antrenmanı', steps: [
        { t: 'info', text: 'Kale rakip şahın alanını bir çizgiyle keser. Şahını rakip şahın karşısına getirince kaleyle şah çekip alanı bir sıra daralt.' },
        { t: 'drill', text: 'Gerçek bir rakip şaha karşı kaleyle mat et.', id: 'r' }
      ] },
      { id: 'piyonson', title: 'Piyon oyun sonu', sub: 'Opozisyon ve terfi', steps: [
        { t: 'info', text: 'Piyon oyun sonunda şahın aktif olmalı. İki şah aralarında bir kare boşlukla karşı karşıya durduğunda, sırası gelen oyuncu geri çekilmek zorunda kalır. Buna opozisyon denir.' },
        { t: 'pz', theme: 'pawnEndgame', n: 3, max: 1300 }
      ] },
      { id: 'kaleson', title: 'Kale oyun sonu', sub: 'En sık görülen son', steps: [
        { t: 'info', text: 'Kale oyun sonlarında kaleni aktif tut: rakip piyonların arkasına geç, kendi geçer piyonunun arkasında dur.' },
        { t: 'pz', theme: 'rookEndgame', n: 3, max: 1400 }
      ] }
    ]
  }
];
const ALL_LESSONS = UNITS.flatMap((u, ui) => u.lessons.map(l => Object.assign(l, { unit: ui })));

/* Taşın boş tahtadaki hamleleri (yıldız toplama adımları için) */
function pieceTargets(b, sq) {
  const p = b[sq], t = p.toUpperCase(), r = sq >> 3, c = sq & 7, out = [];
  const ok = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const own = s => b[s] && b[s] === b[s].toUpperCase();
  const slide = dirs => { for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (ok(rr, cc)) { const s = rr * 8 + cc; if (own(s)) break; out.push(s); if (b[s]) break; rr += dr; cc += dc; } } };
  const step = list => { for (const [dr, dc] of list) { const rr = r + dr, cc = c + dc; if (ok(rr, cc) && !own(rr * 8 + cc)) out.push(rr * 8 + cc); } };
  const D = [[1, 1], [1, -1], [-1, 1], [-1, -1]], S = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (t === 'R') slide(S);
  else if (t === 'B') slide(D);
  else if (t === 'Q') slide(S.concat(D));
  else if (t === 'N') step([[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]);
  else if (t === 'K') step(S.concat(D));
  else if (t === 'P') {
    if (r > 0 && !b[sq - 8]) { out.push(sq - 8); if (r === 6 && !b[sq - 16]) out.push(sq - 16); }
    for (const dc of [-1, 1]) { const s = sq - 8 + dc; if (r > 0 && ok(r - 1, c + dc) && b[s] && !own(s)) out.push(s); }
  }
  return out;
}

const Learn = {
  view: 'home', lesson: null, steps: [], si: 0, st: null, mb: null,
  done() { return store.get('learnDone', {}); },
  nextLesson() { const d = this.done(); return ALL_LESSONS.find(l => !d[l.id]) || null; },
  progress() { const d = this.done(); return { n: ALL_LESSONS.filter(l => d[l.id]).length, total: ALL_LESSONS.length }; },

  renderHome() {
    this.view = 'home'; this.lesson = null;
    const pane = $('#pane-learn'), d = this.done(), nx = this.nextLesson(), pr = this.progress();
    pane.innerHTML = `
      <header class="pane-head"><h1>Öğren</h1><p>Kısa, etkileşimli dersler. Her ders birkaç dakika sürer ve tamamen ücretsiz.</p></header>
      <div class="learn-top">
        <div class="lt-main">
          <span class="label">İlerleme</span>
          <div class="lt-num">${pr.n}<span>/${pr.total} ders</span></div>
          <div class="bar"><div style="width:${pr.n / pr.total * 100}%"></div></div>
        </div>
        ${nx ? `<div class="lt-next"><span class="label">Sıradaki ders</span><div class="lt-title">${esc(nx.title)}</div><div class="muted">${esc(UNITS[nx.unit].title)} · ${esc(nx.sub)}</div>
          <button class="btn primary big" data-ls="${nx.id}">${icon('play')}Derse başla</button></div>`
        : '<div class="lt-next"><div class="lt-title">Bütün dersleri bitirdin!</div><div class="muted">İstediğin dersi tekrar açabilirsin.</div></div>'}
      </div>
      ${UNITS.map((u, ui) => {
        const n = u.lessons.filter(l => d[l.id]).length;
        return `<section class="unit">
          <div class="unit-head"><div class="unit-no">${ui + 1}</div><div><h2>${esc(u.title)}</h2><div class="muted">${esc(u.desc)}</div></div><div class="unit-count">${n}/${u.lessons.length}</div></div>
          <div class="path">${u.lessons.map(l => `<button class="node${d[l.id] ? ' done' : ''}${nx && nx.id === l.id ? ' next' : ''}" data-ls="${l.id}">
            <span class="node-dot">${d[l.id] ? icon('check') : ''}</span><span class="node-t">${esc(l.title)}</span><span class="node-s">${esc(l.sub)}</span></button>`).join('')}</div>
        </section>`;
      }).join('')}`;
    pane.onclick = e => { const b = e.target.closest('[data-ls]'); if (b) this.open(b.dataset.ls); };
  },

  async open(id) {
    const l = ALL_LESSONS.find(x => x.id === id);
    if (!l) return;
    let steps = [];
    for (const s of l.steps) {
      if (s.t !== 'pz') { steps.push(s); continue; }
      try { await Puzzle.load(); } catch (e) { toast('Bulmacalar yüklenemedi'); continue; }
      const list = Puzzle.data.filter(p => p.themes.includes(s.theme) && p.rating <= s.max).sort((a, b) => a.rating - b.rating).slice(0, s.n);
      list.forEach((p, i) => steps.push({ t: 'find', text: `Bulmaca ${i + 1}/${list.length}: en iyi hamleyi bul.`, fen: p.fen, pre: p.moves[0], sol: p.moves.slice(1), anyMate: true, ok: 'Doğru!' }));
    }
    if ($('#home').hidden) showScreen('home');
    setTab('learn'); // önce sekmeyi aç (ders listesini çizer), sonra dersi üstüne kur
    this.lesson = l; this.steps = steps; this.view = 'lesson';
    this.renderLesson();
    this.go(0);
  },

  renderLesson() {
    const l = this.lesson, pane = $('#pane-learn');
    pane.innerHTML = `
      <div class="lesson">
        <div class="lesson-head">
          <button class="icon-btn" id="lsBack" aria-label="Derslere dön">${icon('back')}</button>
          <div><div class="muted">${esc(UNITS[l.unit].title)}</div><h1>${esc(l.title)}</h1></div>
        </div>
        <div class="lesson-body">
          <div class="lesson-board"><div id="lsBoard"></div></div>
          <div class="lesson-side">
            <div class="steps" id="lsSteps"></div>
            <div class="lesson-text" id="lsText"></div>
            <div class="lesson-fb" id="lsFb"></div>
            <div class="row-gap" id="lsAct"></div>
          </div>
        </div>
      </div>`;
    this.mb = new MiniBoard($('#lsBoard'));
    $('#lsBack').onclick = () => this.renderHome();
  },

  go(i) {
    this.si = i;
    const s = this.steps[i];
    if (!s) return this.finish();
    this.st = { s, fb: '', fbk: '', ok: false, tries: 0 };
    const mb = this.mb;
    mb.last = []; mb.stars = new Set(); mb.marks = {}; mb.arrows = []; mb.orient = 'w';
    mb.legal = () => []; mb.onMove = null;
    if (s.t === 'stars') {
      const b = new Array(64).fill('');
      b[sqIdx(s.at)] = s.piece;
      (s.walls || []).forEach(w => { b[sqIdx(w)] = 'P'; });
      (s.prey || []).forEach(w => { b[sqIdx(w)] = 'p'; });
      mb.stars = new Set(s.stars.map(sqIdx));
      this.st.pos = sqIdx(s.at); this.st.moves = 0;
      mb.legal = sq => (sq === this.st.pos ? pieceTargets(mb.b, sq) : []);
      mb.onMove = (f, t) => this.starMove(f, t);
      mb.setBoard(b);
    } else {
      if (s.arrows) mb.arrows = s.arrows.map(([a, b]) => ({ from: sqIdx(a), to: sqIdx(b) }));
      if (s.t !== 'find') {
        if (s.line) mb.setChess(this.posOf(s));
        else mb.setBoard(fenToBoard(s.fen || START_FEN));
        this.renderSide();
        return;
      }
      const ch = this.posOf(s);
      this.st.ch = ch;
      {
        this.st.k = 0;
        if (s.pre) {
          mb.orient = ch.turn === 'w' ? 'b' : 'w';
          mb.setChess(ch);
          this.st.busy = true;
          setTimeout(() => { if (this.st.s !== s) return; const r = chessMove(ch, ...this.uci(s.pre)); mb.last = r ? [r.from, r.to] : []; this.st.busy = false; this.bindFind(); mb.setChess(ch); this.renderSide(); }, 600);
        } else { mb.orient = ch.turn; this.bindFind(); mb.setChess(ch); }
      }
    }
    this.renderSide();
  },
  posOf(s) {
    if (!s.line) return new Chess(s.fen || START_FEN);
    const c = new Chess();
    for (const m of sanLine(s.line)) c.move({ from: m.from, to: m.to, promotion: m.promotion });
    return c;
  },
  uci(u) { return [sqIdx(u.slice(0, 2)), sqIdx(u.slice(2, 4)), u[4] || '']; },

  starMove(f, t) {
    const st = this.st, mb = this.mb, b = mb.b.slice();
    b[t] = b[f]; b[f] = ''; st.pos = t; st.moves++;
    mb.stars.delete(t); mb.last = [f, t];
    Sound.play(this.mb.b[t] ? 'capture' : 'move');
    mb.setBoard(b);
    if (!mb.stars.size) { st.ok = true; st.fb = `Harika! ${st.moves} hamlede topladın.`; st.fbk = 'ok'; Sound.play('notify'); mb.legal = () => []; }
    this.renderSide();
  },

  bindFind() {
    const st = this.st, mb = this.mb, me = st.ch.turn;
    st.me = me;
    mb.legal = sq => (st.busy || st.ok ? [] : chessTargets(st.ch, sq, me));
    mb.onMove = (f, t) => this.findMove(f, t);
  },
  findMove(f, t) {
    const st = this.st, s = st.s, ch = st.ch, mb = this.mb;
    const probe = new Chess(ch.fen());
    const r = chessMove(probe, f, t);
    if (!r) return;
    const played = uciOf(r), exp = s.sol ? s.sol[st.k] : null;
    let how = null; // 'sol': beklenen hamle (cevap gelir), 'alt': kabul edilen başka hamle (adım biter)
    if (exp && (played === exp || (exp.length === 4 && played.slice(0, 4) === exp))) how = 'sol';
    else if (st.k === 0 && s.accept && s.accept.includes(played)) how = 'alt';
    else if ((s.goal === 'mate' || s.anyMate) && r.mate) how = 'alt';
    else if (s.goal === 'check' && r.check) how = 'alt';
    const res = chessMove(ch, f, t);
    mb.last = [res.from, res.to];
    Sound.play(res.mate ? 'capture' : res.check ? 'check' : res.captured ? 'capture' : 'move');
    if (how) {
      st.k++;
      const reply = how === 'sol' && !r.mate ? s.sol[st.k] : null;
      if (reply) {
        st.busy = true; st.fb = 'Doğru, devam et.'; st.fbk = 'ok';
        mb.setChess(ch); this.renderSide();
        setTimeout(() => {
          if (this.st !== st) return;
          const rr = chessMove(ch, ...this.uci(reply));
          if (rr) mb.last = [rr.from, rr.to];
          st.k++; st.busy = false;
          if (st.k >= s.sol.length) return this.stepDone();
          mb.setChess(ch); this.renderSide();
        }, 500);
        return;
      }
      return this.stepDone();
    }
    st.tries++;
    const stale = ch.status().reason === 'stalemate';
    st.fb = stale ? 'Pat oldu! Rakibin hiç hamlesi kalmadı, oyun berabere. Tekrar dene.' : s.goal === 'mate' ? 'Bu mat değil. Şah nereye kaçabiliyor?' : s.goal === 'check' ? 'Bu hamle şah çekmiyor.' : 'Bu değil, tekrar dene.';
    st.fbk = 'bad'; st.busy = true;
    Sound.play('illegal');
    mb.setChess(ch); this.renderSide();
    setTimeout(() => { if (this.st !== st) return; ch.undo(); mb.last = []; st.busy = false; mb.setChess(ch); }, 700);
  },
  stepDone() {
    const st = this.st;
    st.ok = true; st.busy = false; st.fb = st.s.ok || 'Doğru!'; st.fbk = 'ok';
    Sound.play('notify');
    this.mb.setChess(st.ch); this.renderSide();
  },
  hint() {
    const st = this.st, s = st.s;
    if (st.busy || st.ok) return;
    let u = s.sol ? s.sol[st.k] : null;
    if (!u) {
      const m = st.ch.moves().find(x => { const t = new Chess(st.ch.fen()); const r = t.move(x); return r && (s.goal === 'mate' ? r.mate : r.check); });
      if (m) u = uciOf(m);
    }
    if (!u) return;
    this.mb.marks = { [sqIdx(u.slice(0, 2))]: 'hint' };
    this.mb.render();
  },
  answer(i) {
    const st = this.st, s = st.s;
    if (st.ok) return;
    if (i === s.a) { st.ok = true; st.fb = 'Doğru! ' + (s.why || ''); st.fbk = 'ok'; Sound.play('notify'); }
    else { st.fb = 'Yanlış. Tekrar düşün.'; st.fbk = 'bad'; st.picked = i; Sound.play('illegal'); }
    this.renderSide();
  },

  renderSide() {
    const st = this.st, s = st.s;
    $('#lsSteps').innerHTML = this.steps.map((x, i) => `<span class="${i < this.si ? 'done' : i === this.si ? 'cur' : ''}"></span>`).join('');
    let t = `<p>${esc(s.text)}</p>`;
    if (s.t === 'quiz') t += `<div class="quiz">${s.opts.map((o, i) => `<button class="btn${st.ok && i === s.a ? ' correct' : ''}${!st.ok && st.picked === i ? ' wrong' : ''}" data-q="${i}">${esc(o)}</button>`).join('')}</div>`;
    if (s.t === 'stars') t += `<p class="muted">Kalan yıldız: <b>${this.mb.stars.size}</b> · Hamle: ${st.moves}</p>`;
    if (s.t === 'drill') t += `<div class="row-gap"><button class="btn" id="lsDrill">${icon('play')}Mat antrenmanını aç</button></div>`;
    $('#lsText').innerHTML = t;
    const fb = $('#lsFb');
    fb.className = 'lesson-fb ' + st.fbk; fb.textContent = st.fb; fb.hidden = !st.fb;
    const a = $('#lsAct');
    const last = this.si === this.steps.length - 1;
    const canNext = st.ok || s.t === 'info' || s.t === 'drill';
    let h = '';
    if (s.t === 'find' && !st.ok) h += `<button class="btn" id="lsHint">${icon('bulb')}İpucu</button>`;
    if (s.t === 'stars' || s.t === 'find') h += `<button class="btn ghost" id="lsRetry">${icon('repeat')}Baştan</button>`;
    if (!canNext) h += `<button class="btn ghost" id="lsSkip">Atla</button>`;
    h += `<button class="btn primary" id="lsNext"${canNext ? '' : ' disabled'}>${last ? 'Dersi bitir' : 'Devam'}${icon('next')}</button>`;
    a.innerHTML = h;
    a.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'lsNext') this.go(this.si + 1);
      if (b.id === 'lsSkip') this.go(this.si + 1);
      if (b.id === 'lsRetry') this.go(this.si);
      if (b.id === 'lsHint') this.hint();
    };
    $('#lsText').onclick = e => {
      const q = e.target.closest('[data-q]'); if (q) this.answer(Number(q.dataset.q));
      if (e.target.closest('#lsDrill')) Drill.start(s.id);
    };
  },

  finish() {
    const l = this.lesson, d = this.done();
    const first = !d[l.id];
    d[l.id] = Date.now(); store.set('learnDone', d);
    Activity.mark('ls');
    const nx = this.nextLesson();
    $('#lsSteps').innerHTML = this.steps.map(() => '<span class="done"></span>').join('');
    $('#lsText').innerHTML = `<div class="lesson-done"><div class="ld-badge">${icon('check')}</div><h2>${esc(l.title)} tamamlandı!</h2><p class="muted">${first ? 'Yeni bir ders bitirdin.' : 'Dersi tekrar ettin.'} ${this.progress().n}/${this.progress().total} ders tamam.</p></div>`;
    $('#lsFb').hidden = true;
    $('#lsAct').innerHTML = `${nx ? `<button class="btn primary" id="lsNx">${icon('play')}Sonraki ders: ${esc(nx.title)}</button>` : ''}<button class="btn" id="lsHome">Derslere dön</button>`;
    $('#lsAct').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'lsNx') this.open(nx.id); if (b.id === 'lsHome') this.renderHome(); };
    Sound.play('end');
  }
};
