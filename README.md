# Rok Satranç

Ücretsiz ve reklamsız bir satranç antrenman uygulaması. Bilgisayarda ya da telefonda, internetsiz bile çalışır.

## Neler var

- **Bota karşı oyna:** 400'den 3200'e 17 bot. Saldırgan, sağlam ve gambitçi karakterler açılışlarını her oyunda rastgele seçer, ezberlenemez.
- **Koç modu:** Taş hediye edeceğin ya da mat yiyeceğin hamleden önce uyarır.
- **Bulmacalar:** Lichess açık veritabanından 2966 bulmaca, temaya göre seçim, günün bulmacası, bulmaca yolu, bulmaca yarışı.
- **Akıllı tekrar:** Yanlış yaptığın bulmacalar ve açılışlar 1, 3, 7 ve 14 gün sonra tekrar gelir.
- **Öğren:** 7 ünitede 33 etkileşimli ders. Oyun sonu derslerinde rakibi Stockfish oynar.
- **Açılışlar:** 12 açılış, açılış ağacı ve ezberden oynama antrenmanı.
- **Antrenman:** Koordinat oyunu ve ustaların oyunlarında hamle tahmini.
- **Oyun incelemesi:** Stockfish ile her hamleyi puanlar, kritik anları açıklar, hatalarını bulmacaya çevirir.
- **Chess.com oyunların:** Kullanıcı adını yaz, oyunların otomatik gelsin ve incelensin.
- **İstatistikler ve rozetler:** Renge, açılışa ve bota göre sonuçlar, isabet oranı, haftalık rapor.
- **Görünüm:** Açık ve koyu temalar, vurgu rengi, tahta ve taş renkleri.

## Çalıştırma

**Bilgisayarda:** `baslat.bat` dosyasına çift tıkla (Node.js gerekir). Arkadaşla online oyun sadece bu şekilde çalışır.

**İnternetten / telefonda:** GitHub Pages adresini aç. Telefonda tarayıcı menüsünden "Ana ekrana ekle" ile uygulama gibi kurulur ve internetsiz de açılır.

## Yeni sürüm yayınlamak

`main` dalına gönderilen her değişiklik GitHub Pages'e otomatik yayınlanır. Telefonlardaki önbelleğin yenilenmesi için `public/sw.js` içindeki `VERSION` değerini artır.

## Teşekkürler

- Motor: [Stockfish](https://stockfishchess.org) 19 (Stockfish.js, GPLv3) — `public/stockfish/Copying.txt`
- Taşlar: cburnett seti, Colin M.L. Burnett (GPLv2+)
- Bulmacalar: [Lichess açık bulmaca veritabanı](https://database.lichess.org) (CC0)
- Yazı tipleri: Archivo ve JetBrains Mono (SIL Open Font License)
