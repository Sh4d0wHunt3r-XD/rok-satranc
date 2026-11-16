/* Rok Satranç — Telefona kurulabilir sürüm ve sunucusuz çalışma.
   GitHub Pages gibi bir siteden açıldığında sunucu yoktur: online oda kurma kapanır, geri kalan her şey telefonun içinde çalışır. */
var NO_SERVER = location.protocol === 'file:' || (location.protocol === 'https:' && !/^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)/.test(location.hostname));
const APP_VERSION = 'rok-v6'; // sw.js'teki VERSION ile aynı olmalı

const Pwa = {
  prompt: null, pendingReload: false,
  init() {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').then(reg => {
        // Uygulamaya her dönüldüğünde yeni sürüm var mı diye bak
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
      }).catch(() => {});
      // Yeni sürüm devreye girince sayfayı yenile; oyun sürüyorsa oyun bitip menüye dönünce yenile
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) return;
        if (this.inGame()) { this.pendingReload = true; toast('Rok\'un yeni sürümü hazır. Menüye dönünce yüklenecek.', 4000); }
        else location.reload();
      });
    }
    const cr = $('#settingsModal .credit');
    if (cr) cr.insertAdjacentHTML('beforeend', ` Sürüm: ${APP_VERSION.replace('rok-v', '')}.`);
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; this.renderBtn(); });
    window.addEventListener('appinstalled', () => { this.prompt = null; this.renderBtn(); toast('Rok telefonuna kuruldu!'); });
    if (NO_SERVER) this.noServer();
  },
  inGame() { return !$('#game').hidden && G.mode && !G.over && G.moves.length > 0; },
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
