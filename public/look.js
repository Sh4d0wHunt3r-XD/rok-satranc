/* Rok Satranç — Görünüm: uygulama teması, vurgu rengi, tahta renkleri, taş renkleri */
const UI_THEMES = {
  gece: { n: 'Gece', bg: '#171512', rail: '#110f0d', surface: '#1f1c18', surface2: '#29261f', line: '#2f2b25', line2: '#403b33', fg: '#ede7dc', muted: '#a0978a', faint: '#6f675c', bone: '#ece4d6', ink: '#171512', dark: true },
  grafit: { n: 'Grafit', bg: '#16181b', rail: '#101215', surface: '#1e2125', surface2: '#272b30', line: '#2d3136', line2: '#3d4249', fg: '#e8eaed', muted: '#9aa0a8', faint: '#6a7079', bone: '#e8eaed', ink: '#16181b', dark: true },
  lacivert: { n: 'Lacivert', bg: '#121826', rail: '#0d121d', surface: '#182033', surface2: '#202a40', line: '#263149', line2: '#34405c', fg: '#e6ebf5', muted: '#98a3ba', faint: '#67718a', bone: '#e6ebf5', ink: '#121826', dark: true },
  siyah: { n: 'Simsiyah', bg: '#000000', rail: '#000000', surface: '#0e0e0e', surface2: '#1a1a1a', line: '#222222', line2: '#333333', fg: '#f2f2f2', muted: '#a3a3a3', faint: '#6e6e6e', bone: '#f2f2f2', ink: '#000000', dark: true },
  acik: { n: 'Açık', bg: '#f4f1ea', rail: '#ebe6dc', surface: '#fffdf8', surface2: '#efe9de', line: '#e0d9cc', line2: '#cdc4b4', fg: '#1d1a16', muted: '#5c554b', faint: '#857c6f', bone: '#1d1a16', ink: '#f7f3ea', dark: false }
};
const ACCENTS = { pirinc: ['#c9a253', 'Pirinç'], zumrut: ['#4fb37a', 'Zümrüt'], gok: ['#4c9be8', 'Gök'], mor: ['#a383e0', 'Mor'], mercan: ['#e4775f', 'Mercan'], pembe: ['#e06aa0', 'Pembe'] };
const PIECE_COLORS = {
  klasik: ['#ffffff', '#000000', 'Klasik'], fildisi: ['#f4ead2', '#2b2018', 'Fildişi'], gumus: ['#e9eef3', '#1f2f4a', 'Gümüş'],
  altin: ['#f2d47e', '#5a1d24', 'Altın'], nane: ['#e3f4ea', '#1d3b2c', 'Nane'], kul: ['#d9d9d9', '#3a3a3a', 'Kül']
};
Object.assign(THEMES, {
  cimen: ['#ecefd8', '#7a9b5c', 'Çimen'], kum: ['#f0e2c0', '#c9a66b', 'Kum'], buz: ['#eaf3f8', '#86aac4', 'Buz'],
  gul: ['#f3dfe3', '#c98395', 'Gül'], gecemavi: ['#c9cfd8', '#5a6b85', 'Gece'], tahta: ['#e3c391', '#8b5a2b', 'Meşe']
});
const BASE_PIECES = Object.assign({}, PIECE_SET);
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

const Look = {
  apply() {
    const s = settings, root = document.documentElement.style;
    s.custom = s.custom || { l: '#eadfcb', d: '#8c6a4a' };
    THEMES.ozel = [s.custom.l, s.custom.d, 'Özel'];
    const u = UI_THEMES[s.ui] || UI_THEMES.gece;
    const map = { bg: '--bg', rail: '--rail', surface: '--surface', surface2: '--surface-2', line: '--line', line2: '--line-2', fg: '--fg', muted: '--muted', faint: '--faint', bone: '--bone', ink: '--ink' };
    for (const [k, v] of Object.entries(map)) root.setProperty(v, u[k]);
    root.setProperty('color-scheme', u.dark ? 'dark' : 'light');
    root.setProperty('--good', u.dark ? '#8fc98a' : '#4e9a4a');
    document.documentElement.dataset.ui = u.dark ? 'dark' : 'light';
    const a = (ACCENTS[s.accent] || ACCENTS.pirinc)[0];
    root.setProperty('--accent', a);
    root.setProperty('--accent-soft', hexA(a, u.dark ? .14 : .18));
    const t = THEMES[s.theme] || THEMES.ceviz;
    root.setProperty('--light', t[0]);
    root.setProperty('--dark', t[1]);
    this.pieces();
  },
  // Taş renklerini SVG'lerin içinde değiştir
  pieces() {
    const [w, b] = PIECE_COLORS[settings.pieces] || PIECE_COLORS.klasik;
    for (const [k, svg] of Object.entries(BASE_PIECES)) {
      PIECE_SET[k] = k[0] === 'w'
        ? svg.split('fill="#fff"').join(`fill="${w}"`)
        : svg.split('fill="#000"').join(`fill="${b}"`).replace('<svg ', `<svg fill="${b}" `);
    }
    document.querySelectorAll('[data-piece]').forEach(el => { el.innerHTML = PIECE_SET[el.dataset.piece]; });
  },
  set(k, v) {
    settings[k] = v; store.set('settings', settings);
    this.apply(); renderSettings();
    if (!$('#game').hidden) render();
    else if (!$('#home').hidden) setTab(store.get('tab', 'home'));
  },
  render() {
    const box = $('#lookOpts');
    if (!box) return;
    const s = settings, cu = s.custom;
    const sw = (group, k, on, inner, title) => `<button class="sw${on ? ' on' : ''}" data-g="${group}" data-k="${k}" title="${esc(title)}" aria-label="${esc(title)}">${inner}</button>`;
    box.innerHTML = `
      <div class="field"><span class="label">Uygulama teması</span><div class="sw-row">${Object.entries(UI_THEMES).map(([k, u]) =>
        sw('ui', k, (s.ui || 'gece') === k, `<span class="sw-ui" style="background:${u.bg};border-color:${u.line2}"><i style="background:${u.surface2}"></i><i style="background:${u.fg}"></i></span><em>${u.n}</em>`, u.n)).join('')}</div></div>
      <div class="field"><span class="label">Vurgu rengi</span><div class="sw-row">${Object.entries(ACCENTS).map(([k, [c, n]]) =>
        sw('accent', k, (s.accent || 'pirinc') === k, `<span class="sw-dot" style="background:${c}"></span><em>${n}</em>`, n)).join('')}</div></div>
      <div class="field"><span class="label">Taş renkleri</span><div class="sw-row">${Object.entries(PIECE_COLORS).map(([k, [w, b, n]]) =>
        sw('pieces', k, (s.pieces || 'klasik') === k, `<span class="sw-pc"><i style="background:${w}"></i><i style="background:${b}"></i></span><em>${n}</em>`, n)).join('')}</div></div>
      <div class="field"><span class="label">Özel tahta rengi</span><div class="row-gap">
        <label class="color-in"><input type="color" id="cuL" value="${cu.l}"><span>Açık kare</span></label>
        <label class="color-in"><input type="color" id="cuD" value="${cu.d}"><span>Koyu kare</span></label>
        <button class="btn small${s.theme === 'ozel' ? ' primary' : ''}" id="cuUse">${s.theme === 'ozel' ? 'Kullanılıyor' : 'Bunu kullan'}</button>
      </div></div>
      <div class="look-preview" id="lookPrev"></div>`;
    box.onclick = e => {
      const b = e.target.closest('[data-g]');
      if (b) this.set(b.dataset.g, b.dataset.k);
      if (e.target.closest('#cuUse')) this.set('theme', 'ozel');
    };
    const onColor = () => { s.custom = { l: $('#cuL').value, d: $('#cuD').value }; s.theme = 'ozel'; store.set('settings', s); this.apply(); this.preview(); $$('#themes .theme').forEach(t => t.classList.toggle('on', t.dataset.theme === 'ozel')); };
    $('#cuL').oninput = onColor; $('#cuD').oninput = onColor;
    this.preview();
  },
  preview() {
    const el = $('#lookPrev');
    if (!el) return;
    const mb = new MiniBoard(el);
    mb.setBoard(fenToBoard('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3').slice(0, 64));
    mb.last = [sqIdx('f1'), sqIdx('c4')]; mb.render();
  }
};
// Ayarlar penceresini ve eski tema fonksiyonunu genişlet
const _renderSettings = renderSettings;
renderSettings = function () {
  _renderSettings();
  $$('#themes .theme').forEach(t => { if (t.dataset.theme === 'ozel') t.title = 'Özel'; });
  Look.render();
};
applyTheme = () => Look.apply();
Look.apply();
