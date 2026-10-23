// ===== Warna aplikasi: satu warna untuk seluruh sekolah (admin & siswa), diatur Super Admin =====
const TEMA_APP = [
  { id: 'malam', nama: 'Malam (Neon)', warna: 'linear-gradient(135deg,#22D3EE,#7C5CFC)' },
  { id: 'kuning', nama: 'Kuning Emas', warna: '#F5B301' },
  { id: 'biru', nama: 'Biru', warna: '#2563EB' },
  { id: 'hijau', nama: 'Hijau', warna: '#059669' },
  { id: 'ungu', nama: 'Ungu', warna: '#7C3AED' },
  { id: 'teal', nama: 'Teal', warna: '#0D9488' },
  { id: 'mawar', nama: 'Merah Muda', warna: '#E11D48' },
];
function terapkanTema(id) { document.documentElement.setAttribute('data-tema', id); }
function bukaPilihTema() {
  const awal = document.documentElement.getAttribute('data-tema') || 'malam';
  let pilih = awal;
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `<div class="modal" style="max-width:440px;">
    <h3>Warna aplikasi</h3>
    <p>Warna yang Anda simpan berlaku untuk semua pengguna, termasuk siswa.</p>
    <div class="tema-grid">${TEMA_APP.map((t) => `<button type="button" class="tema-opsi ${t.id === awal ? 'aktif' : ''}" data-tema="${t.id}"><i style="background:${t.warna}"></i>${t.nama}</button>`).join('')}</div>
    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button type="button" class="btn btn-outline" data-aksi="batal">Batal</button>
      <button type="button" class="btn btn-primary" data-aksi="simpan">Simpan untuk semua</button>
    </div>
  </div>`;
  const tutup = () => { terapkanTema(awal); el.remove(); };
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('.tema-opsi');
    if (b) { pilih = b.dataset.tema; terapkanTema(pilih); el.querySelectorAll('.tema-opsi').forEach((x) => x.classList.toggle('aktif', x === b)); return; }
    if (e.target === el || e.target.dataset.aksi === 'batal') return tutup();
    if (e.target.dataset.aksi === 'simpan') {
      e.target.disabled = true;
      try {
        await apiCall('/admin-settings', { method: 'PUT', body: { settings: { tema_warna: pilih } } });
        try { localStorage.setItem('tema_sekolah', pilih); } catch { /* abaikan */ }
        toast('Warna aplikasi disimpan untuk semua pengguna.', 'success');
        el.remove();
      } catch (err) { e.target.disabled = false; toast(err.message, 'error'); }
    }
  });
  document.body.appendChild(el);
}

// Merender sidebar + topbar admin secara konsisten di semua halaman.
// Menu dikelompokkan supaya sidebar ringkas: grup yang berisi halaman aktif otomatis terbuka,
// grup lain bisa dibuka/ditutup (pilihan diingat di browser).
const IC = (d) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  home: IC('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  jam: IC('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  akademik: IC('<path d="M2 8l10-5 10 5-10 5z"/><path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5"/>'),
  atur: IC('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  warna: IC('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="11" r="1"/>'),
  keluar: IC('<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H9"/>'),
};
const ADMIN_MENU = [
  { href: '/admin/dashboard.html', icon: ICON.home, label: 'Dashboard' },
  { id: 'absensi', icon: ICON.jam, label: 'Absensi', items: [
    { href: '/admin/token.html', label: 'Sesi & Token Absensi' },
    { href: '/admin/absen-manual.html', label: 'Absen Manual', superAdminOnly: true },
    { href: '/admin/rekap.html', label: 'Rekap Absensi' },
  ] },
  { id: 'akademik', icon: ICON.akademik, label: 'Akademik', items: [
    { href: '/admin/siswa.html', label: 'Data Siswa' },
    { href: '/admin/jadwal.html', label: 'Jadwal Pelajaran' },
    { href: '/admin/persentase.html', label: 'Persentase Kehadiran' },
    { href: '/admin/rapor.html', label: 'Rekap Semester (Rapor)' },
  ] },
  { id: 'sistem', icon: ICON.atur, label: 'Pengaturan', items: [
    { href: '/admin/pengaturan.html', label: 'Pengaturan Sekolah' },
    { href: '/admin/users.html', label: 'User Admin' },
    { href: '/admin/audit.html', label: 'Audit Log' },
  ] },
];

function bacaNavTerbuka() {
  try { return JSON.parse(localStorage.getItem('admin_nav_open') || '{}'); } catch { return {}; }
}
function renderMenuAdmin(activeHref, isSuperAdmin) {
  const terbuka = bacaNavTerbuka();
  return ADMIN_MENU.map((m) => {
    if (!m.items) return `<a href="${m.href}" class="${m.href === activeHref ? 'active' : ''}">${m.icon} ${m.label}</a>`;
    const items = m.items.filter((x) => !x.superAdminOnly || isSuperAdmin);
    if (!items.length) return '';
    const aktif = items.some((x) => x.href === activeHref);
    const buka = aktif || terbuka[m.id] === true;
    return `<details class="nav-group ${aktif ? 'has-active' : ''}" data-grup="${m.id}" ${buka ? 'open' : ''}>
      <summary>${m.icon} ${m.label}<span class="caret">▾</span></summary>
      <div class="nav-sub">${items.map((x) => `<a href="${x.href}" class="${x.href === activeHref ? 'active' : ''}">${x.label}</a>`).join('')}</div>
    </details>`;
  }).join('');
}

function renderAdminShell(activeHref, pageTitle) {
  requireAdminAuth();
  const info = JSON.parse(localStorage.getItem('admin_info') || '{}');
  const isSuperAdmin = info.role === 'SUPER_ADMIN';
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="admin-shell">
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="brand-center">
          <div class="brand-tile">NI</div>
          <div class="brand-name">Absensi Digital<br>PKBM Nurul Islam</div>
        </div>
        <input type="search" id="menu-search" class="menu-search" placeholder="Cari menu..." autocomplete="off" aria-label="Cari menu">
        <nav>
          ${renderMenuAdmin(activeHref, isSuperAdmin)}
          ${isSuperAdmin ? `<a href="#" id="btn-tema-admin" data-keep style="margin-top:14px;">${ICON.warna} Warna Aplikasi</a>` : ''}
          <a href="#" id="btn-logout-admin" data-keep style="color:var(--danger);">${ICON.keluar} Keluar</a>
        </nav>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn btn-ghost menu-toggle" id="menu-toggle">☰</button>
            <h2 style="font-size:1.1rem;">${pageTitle}</h2>
          </div>
          <div style="font-size:0.85rem; color:var(--ink-muted);">${info.nama || ''} · <span style="text-transform:capitalize;">${(info.role || '').replace('_',' ').toLowerCase()}</span></div>
        </div>
        <div class="admin-content" id="admin-content-slot"></div>
      </div>
    </div>
  `);
  let sedangCari = false;
  document.querySelectorAll('#admin-sidebar details.nav-group').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (sedangCari) return; const st = bacaNavTerbuka(); st[d.dataset.grup] = d.open;
      try { localStorage.setItem('admin_nav_open', JSON.stringify(st)); } catch { /* abaikan */ }
    });
  });
  document.getElementById('menu-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const nav = document.querySelector('#admin-sidebar nav');
    sedangCari = true;
    nav.querySelectorAll(':scope > a:not([data-keep])').forEach((a) => { a.style.display = !q || a.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    nav.querySelectorAll('details.nav-group').forEach((d) => {
      const labelCocok = d.querySelector('summary').textContent.toLowerCase().includes(q);
      let ada = false;
      d.querySelectorAll('.nav-sub a').forEach((a) => {
        const cocok = !q || labelCocok || a.textContent.toLowerCase().includes(q);
        a.style.display = cocok ? '' : 'none'; if (cocok) ada = true;
      });
      d.style.display = !q || ada ? '' : 'none';
      if (q && ada) d.open = true;
    });
    setTimeout(() => { sedangCari = false; }, 0);
  });
  document.getElementById('menu-toggle').onclick = () => document.getElementById('admin-sidebar').classList.toggle('open');
  const btnTema = document.getElementById('btn-tema-admin');
  if (btnTema) btnTema.onclick = (e) => { e.preventDefault(); bukaPilihTema(); };
  document.getElementById('btn-logout-admin').onclick = (e) => { e.preventDefault(); logoutAdmin(); };
  return document.getElementById('admin-content-slot');
}
