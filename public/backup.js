/* Rok Satranç — Yedekle ve geri yükle: bütün ilerleme tek bir dosyada.
   Bilgisayar ile telefon arasında taşımak ya da kaybolmasın diye saklamak için. */
const Backup = {
  keys() { return Object.keys(localStorage).filter(k => k.startsWith('rok:')); },
  summary(data) {
    const h = data.history || [], pz = data.pzStats || { ok: 0 }, ls = Object.keys(data.learnDone || {}).length;
    return `${h.length} oyun, ${pz.ok || 0} çözülmüş bulmaca, ${ls} ders, bot puanı ${data.rating || 800}, bulmaca puanı ${data.pzRating || 1000}`;
  },
  build() {
    const data = {};
    for (const k of this.keys()) { try { data[k.slice(4)] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* bozuk kayıt atlanır */ } }
    return { app: 'rok-satranc', v: 1, date: new Date().toISOString(), version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '', data };
  },
  async save() {
    const b = this.build(), d = new Date();
    const name = `rok-yedek-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    const file = new File([JSON.stringify(b)], name, { type: 'application/json' });
    store.set('lastBackup', Date.now());
    // Telefonda paylaşma menüsü (Drive, WhatsApp, e-posta...), bilgisayarda indirme
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file], title: 'Rok Satranç yedeği' }); this.render(); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(`Yedek indirildi: ${name}`, 3500);
    this.render();
  },
  async load(file) {
    let b;
    try { b = JSON.parse(await file.text()); } catch (e) { toast('Bu dosya okunamadı. Rok yedek dosyası (.json) seçtiğinden emin ol.', 4000); return; }
    if (!b || b.app !== 'rok-satranc' || !b.data) { toast('Bu bir Rok yedek dosyası değil.', 3500); return; }
    const when = b.date ? new Date(b.date).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'bilinmeyen tarih';
    const now = this.build().data;
    const ok = confirm(`Yedek: ${when}\n${this.summary(b.data)}\n\nBu cihazdaki ilerleme (${this.summary(now)}) yedektekiyle DEĞİŞTİRİLECEK. Devam edilsin mi?`);
    if (!ok) return;
    for (const k of this.keys()) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(b.data)) store.set(k, v);
    toast('Yedek geri yüklendi, Rok yeniden açılıyor…', 2500);
    setTimeout(() => location.reload(), 900);
  },
  render() {
    let box = $('#backupBox');
    if (!box) {
      const anchor = $('#lookOpts');
      if (!anchor) return;
      anchor.insertAdjacentHTML('afterend', '<div class="backup" id="backupBox"></div>');
      box = $('#backupBox');
    }
    const last = store.get('lastBackup', 0);
    box.innerHTML = `<h4 class="set-head">Yedekleme</h4>
      <p class="muted" style="margin:0;font-size:13px">Puanların, derslerin, rozetlerin ve oyunların bu cihazda saklanır. Yedek alıp başka cihazda geri yükleyerek bilgisayar ile telefon arasında taşıyabilirsin.</p>
      <div class="row-gap"><button class="btn" id="bkSave">${icon('file')}Yedek al</button><button class="btn" id="bkLoad">${icon('repeat')}Yedeği geri yükle</button>
        <input type="file" id="bkFile" accept=".json,application/json" hidden></div>
      <div class="muted" style="font-size:12.5px">${last ? 'Son yedek: ' + new Date(last).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Henüz yedek almadın.'}</div>`;
    $('#bkSave').onclick = () => this.save();
    $('#bkLoad').onclick = () => $('#bkFile').click();
    $('#bkFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) this.load(f); };
  }
};
// Ayarlar her açıldığında yedekleme bölümünü de çiz
const _renderSettingsBk = renderSettings;
renderSettings = function () { _renderSettingsBk(); Backup.render(); };
