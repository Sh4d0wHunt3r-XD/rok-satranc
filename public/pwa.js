/* Rok Satranç — Telefona kurulabilir sürüm ve sunucusuz çalışma.
   GitHub Pages gibi bir siteden açıldığında sunucu yoktur: online oda kurma kapanır, geri kalan her şey telefonun içinde çalışır. */
var NO_SERVER = location.protocol === 'file:' || (location.protocol === 'https:' && !/^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)/.test(location.hostname));

const Pwa = {
  prompt: null,
  init() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; this.renderBtn(); });
    window.addEventListener('appinstalled', () => { this.prompt = null; this.renderBtn(); toast('Rok telefonuna kuruldu!'); });
    if (NO_SERVER) this.noServer();
  },
  renderBtn() {
    let b = $('#installBtn');
    if (!this.prompt) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button');
      b.id = 'installBtn'; b.className = 'tab plain';
      b.innerHTML = `${icon('plus')}<span>Uygulamayı yükle</span>`;
      b.onclick = async () => { const p = this.prompt; if (!p) return; p.prompt(); await p.userChoice; this.prompt = null; this.renderBtn(); };
      $('.rail-foot').prepend(b);
    }
  },
  noServer() {
    const pane = $('#pane-online');
    pane.innerHTML = `<header class="pane-head"><h1>Arkadaşla</h1><p>Online oda kurmak için Rok'un bilgisayarda açık olması gerekiyor.</p></header>
      <div class="block" style="max-width:640px">
        <p>Bu sürüm internetten açıldığı için her şey senin cihazında çalışıyor: botlar, bulmacalar, dersler, analiz. Sadece arkadaşla online oyun için bir sunucu lazım.</p>
        <p class="muted">Arkadaşınla oynamak için bilgisayarda <b>baslat.bat</b> ile Rok'u aç ve "Arkadaşla" bölümünü oradan kullan. Aynı cihazda iki kişi oynamak için "Aynı bilgisayarda" bölümü burada da çalışır.</p>
      </div>`;
    const em = $('.tab[data-tab="online"] em'); if (em) em.remove();
  }
};
Pwa.init();
