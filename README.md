# Absensi Digital — PKBM Nurul Islam

Aplikasi absensi siswa Paket B & Paket C: absen **Datang**/**Pulang** dengan validasi
GPS + radius sekolah + kode/QR yang berganti tiap 15 menit, waktu server (WIB), dan
kontrol admin penuh (data siswa, sesi, jadwal, rekap, audit log).

## Arsitektur

Aplikasi ini di-deploy ke **Netlify** (hosting statis + serverless functions) dan
**Supabase** (database Postgres + service role key). Netlify **tidak** menjalankan
server yang terus hidup — kode di `netlify/functions/*` berjalan sebagai *serverless
function* setiap kali frontend memanggil `/api/...`. Semua validasi penting (lokasi,
waktu, token, status siswa) dilakukan **di function ini (server), bukan di browser**.

```
public/                → frontend statis (HTML/CSS/JS) — di-deploy oleh Netlify
netlify/functions/     → API backend (Node.js), jalan sebagai Netlify Functions
supabase/schema.sql    → struktur database
supabase/seed_students.sql → data 556 siswa dari file Dapodik Anda (dibuat otomatis)
scripts/               → alat bantu konversi data & pembuatan akun admin pertama
```

Kunci keamanan: `SUPABASE_SERVICE_ROLE_KEY` (bisa baca/tulis semua tabel, bypass RLS)
**hanya** disimpan di environment variable Netlify — tidak pernah dikirim ke browser.
Browser hanya bicara dengan Netlify Functions lewat `/api/*`, dan setiap function
mengambil identitas siswa/admin dari **token JWT hasil login**, bukan dari data yang
dikirim client. Ini yang membuat siswa tidak bisa memalsukan NISN, waktu, atau lokasi
absensi mereka sendiri lewat request API manual.

## Langkah Deploy

### 1. Buat project Supabase (gratis)
1. Daftar/masuk di https://supabase.com → **New project**.
2. Setelah project jadi, buka **SQL Editor** → jalankan isi `supabase/schema.sql`.
3. Jalankan juga isi `supabase/migration_02_rekap_dan_absen_manual.sql`, lalu
   `supabase/migration_03_hari_libur.sql`, lalu `supabase/migration_04_identitas_ttd.sql`
   (urut, satu kali) di SQL Editor yang sama. Migrasi 02 menambahkan fungsi
   database `rekap_kehadiran()` yang dipakai fitur **Persentase Kehadiran**,
   **Riwayat Siswa**, dan **Rekap Semester (Rapor)**. Migrasi 03 menambahkan
   **kalender hari libur** (sudah terisi otomatis dengan libur nasional & cuti
   bersama 2026) supaya hari libur tidak ikut dihitung sebagai hari efektif
   sekolah — tanpa migrasi 03, setiap libur nasional akan membuat SEMUA siswa
   tercatat Alpa secara keliru. Migrasi 04 menambahkan kolom identitas
   yayasan/PKBM (NPSN, SK Kemenhukum, dll), tanda tangan Kepala PKBM, dan
   tabel `wali_kelas` (nama + tanda tangan wali kelas per kelas) yang dipakai
   halaman **Rekap Semester (Rapor)** — tanpa migrasi 04, menu **Kelola Tanda
   Tangan** & kop surat lampiran rapor tidak akan berfungsi.
   **Migrasi 05** (`supabase/migration_05_jadwal_pelajaran.sql`, jalankan setelah 04)
   menambahkan menu **Jadwal Pelajaran** (jadwal mapel per kelas, jam belajar, daftar
   mapel dropdown) dan **jam absen khusus Jumat** untuk fitur **Rekap Word Harian**
   di halaman Rekap Absensi. Tanpa migrasi 05, tombol Rekap Word tetap jalan tetapi
   kolom mapel kosong, dan halaman Jadwal Pelajaran menampilkan pesan error.
   **Migrasi 06** (`supabase/migration_06_muatan_mapel_dan_grup_paket_c.sql`, jalankan setelah 05)
   menambahkan tabel muatan mapel untuk **Generate Jadwal Otomatis** dan memindahkan jadwal
   Paket C yang sudah tersimpan dari nama lama (`10 IPA`, `10 IPS`, dst.) ke grup baru
   `10`, `11`, `12`. Tanpa migrasi 06, generator tetap jalan dengan muatan bawaan, tetapi muatan
   hasil edit tidak bisa disimpan dan jadwal Paket C lama tidak ikut pindah grup.
4. Buat file seed dari data siswa Anda (lihat langkah 2), lalu jalankan isi
   `supabase/seed_students.sql` di SQL Editor yang sama.
5. Buka **Project Settings → API**. Catat:
   - `Project URL` → jadi `SUPABASE_URL`
   - `service_role` key (bagian **secret**, bukan `anon`) → jadi `SUPABASE_SERVICE_ROLE_KEY`

### 2. Siapkan data siswa & akun admin pertama (di komputer Anda)
```bash
npm install
# (data/students_import.csv sudah disertakan, hasil konversi file Dapodik Anda)
node scripts/generate_seed_sql.js
# -> menghasilkan supabase/seed_students.sql, jalankan isinya di Supabase SQL Editor

node scripts/create_super_admin.js "admin@sekolah.anda" "Nama Admin" "PasswordKuatAnda123"
# -> tempel SQL yang dicetak ke Supabase SQL Editor untuk membuat login admin pertama
```

> ⚠️ **5 siswa tanpa NISN** pada file sumber (ACENG USIN, M. GIPARANA AS SIDIK,
> MUHAMMAD HABIBUR ROHMAN, RUSMANA, SITI JENAB) ikut ter-import tapi ditandai
> `butuh_konfirmasi_admin = true` dan **belum bisa login** sampai admin mengisi
> NISN mereka lewat menu **Data Siswa** di dashboard.

### 3. Deploy ke Netlify
**Opsi termudah — drag & drop:**
1. Jalankan `npm install` sekali di folder proyek (agar `node_modules` untuk functions siap — Netlify akan build ulang saat deploy via CLI/Git, tapi untuk drag-drop pastikan dependency ter-bundle oleh Netlify).
2. Buka https://app.netlify.com → **Add new site → Deploy manually**, seret folder proyek ini.
3. Buka **Site settings → Environment variables**, isi 3 variabel dari `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` (string acak panjang, mis. hasil `openssl rand -hex 32`)
4. **Trigger deploy** ulang (Deploys → Trigger deploy) supaya environment variable terbaca oleh Functions.

**Opsi disarankan — via Netlify CLI (lebih stabil untuk Functions):**
```bash
npm install -g netlify-cli
netlify login
netlify init          # hubungkan ke site baru/lama
netlify env:set SUPABASE_URL "https://xxxx.supabase.co"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "xxxxxxxx"
netlify env:set JWT_SECRET "$(openssl rand -hex 32)"
netlify deploy --prod
```

### 4. Login pertama & pengaturan sekolah
1. Buka `https://nama-site-anda.netlify.app/admin/login.html`, login dengan akun Super
   Admin yang dibuat di langkah 2.
2. Masuk ke **Pengaturan Sekolah** → isi/klik "Gunakan Lokasi Saat Ini" saat Anda berada
   di lokasi sekolah (atau isi manual latitude/longitude), atur radius (50–100 m),
   akurasi GPS maksimum, dan hari aktif.
3. Cek jadwal Paket B (07.00–12.00) & Paket C (12.30–17.00) di bagian bawah halaman
   yang sama, sesuaikan bila perlu.
4. Buka **Sesi & Token Absensi** setiap kali jam absen tiba → klik **Mulai/Perpanjang**
   untuk membuka sesi; kode/QR akan tampil dan otomatis berganti tiap 15 menit selama
   sesi berjalan (dibantu *scheduled function* di server, tidak butuh tab tetap terbuka).
   Gunakan tombol **⤢ Layar Penuh** untuk ditampilkan di proyektor/TV sekolah.
5. Siswa membuka `https://nama-site-anda.netlify.app/siswa/login.html`, login dengan
   NISN + password awal (tanggal lahir format `DDMMYYYY`), lalu diminta ganti password.

## Yang sudah berfungsi penuh
- Import 556 data siswa asli (SD / Paket B / Paket C otomatis terpisah dari kolom Rombel).
- Login siswa (NISN + password, wajib ganti password pertama kali) & login admin (RBAC Super Admin/Admin).
- Sesi absensi dengan token 6-karakter + QR yang **rotasi tiap 15 menit**, dipicu admin dan diperpanjang otomatis oleh scheduled function selama sesi dibiarkan berjalan.
- Absen Datang/Pulang: validasi token, radius (Haversine), akurasi GPS, jadwal per program, waktu **server** (Asia/Jakarta), anti-duplikat, deteksi mock-location, audit log & security event.
- Dashboard admin dengan statistik per jenjang/program (dipoll tiap 8 detik → terasa realtime tanpa refresh manual) + tabel monitoring live + ringkasan persentase kehadiran bulan berjalan & daftar siswa dengan kehadiran terendah.
- Data Siswa: cari, filter, tambah, edit, nonaktifkan, hapus (dengan konfirmasi), reset password.
- Rekap Absensi dengan filter lengkap + ekspor **CSV** dan **Excel (.xlsx)**; ekspor **PDF** disediakan lewat tombol cetak (Print to PDF) dari tampilan rekap yang sudah tertata rapi (menu, sidebar, dan tombol otomatis disembunyikan saat mencetak).
- **Persentase Kehadiran** per siswa (bulanan/semester/rentang bebas), tampil di Dashboard Admin, menu Persentase Kehadiran, dan profil siswa; ekspor CSV/Excel. Perhitungan hari efektif sudah mengecualikan hari libur (lihat **Kalender Hari Libur** di Pengaturan Sekolah).
- **Rekap Semester (Rapor)**: rekap kehadiran per semester lengkap dengan **deskripsi kehadiran otomatis** (kalimat penilaian yang kata-katanya bisa diedit sendiri lewat Pengaturan Sekolah), tampil sebagai kartu per siswa siap dicetak/disimpan sebagai PDF untuk lampiran rapor, dan ekspor Excel (tabel + kolom deskripsi).
- **Absen Manual** (khusus Super Admin): input kehadiran (Hadir/Terlambat/Izin/Sakit/Tidak Hadir, lengkap jam datang & pulang bila perlu) untuk siswa yang tidak punya HP / tidak bisa absen mandiri lewat aplikasi — termasuk **mode massal per kelas** (isi satu kelas sekaligus dalam satu kali submit, dengan tombol "Tandai Semua Hadir"). Tercatat di audit log dan ditandai "manual" pada data absensi.
- **Kalender Hari Libur** (di menu Pengaturan Sekolah): daftar tanggal yang dikecualikan dari perhitungan hari efektif sekolah (persentase kehadiran & rapor) dan otomatis menutup absensi mandiri siswa pada tanggal tersebut. Sudah terisi 25 tanggal libur nasional & cuti bersama 2026 dari SKB 3 Menteri; tambahkan sendiri libur khusus sekolah (libur semester, dll.) kapan saja.
- Audit log aktivitas & log keamanan (anti-kecurangan) dengan paginasi.
- **Laporan Absensi Siswa** (menu 📄 Laporan): tiap siswa melihat laporan kehadiran pribadi (bulan/semester/rentang bebas) lengkap deskripsi kehadiran, lalu mengunduh sebagai **PDF** (cetak/simpan PDF, dengan kop sekolah), **Excel**, atau **CSV**. Hanya data milik siswa yang login.
- **Menu admin terkelompok** (Absensi, Akademik, Pengaturan) agar sidebar ringkas; grup yang berisi halaman aktif terbuka otomatis.
- **Cetak Jadwal Pelajaran** (menu Akademik → Jadwal Pelajaran): tombol **Excel** (.xlsx, satu sheet per kelas, ada rekap JP per mapel) dan **PDF** (satu halaman per kelas dengan kop sekolah; pilih *Simpan sebagai PDF* di jendela cetak browser). Bisa per kelas atau semua kelas.
- **Generate Jadwal Otomatis** (tab *Generate Otomatis*): menyusun jadwal semua kelas sekaligus tanpa bentrok — satu kelas tidak punya dua mapel di jam yang sama, mapel yang sama tidak diajarkan di dua kelas pada jam bertumpuk (lintas Paket B & C pada hari Jumat), Muatan Lokal maksimal 2 JP/minggu, blok jam tidak melintasi istirahat. Hasil berupa pratinjau yang baru tersimpan setelah klik *Simpan ke Jadwal*. Muatan JP per mapel tiap kelas dapat diedit dan disimpan.
  - Catatan: JP per mapel bawaan adalah pembagian proporsional ke jam pelajaran yang tersedia (30 JP/minggu pada jam belajar bawaan), bukan angka resmi per mapel. Sesuaikan dengan kurikulum operasional PKBM.
  - Ketentuan 1 JP = 40 menit (Paket B) dan 45 menit (Paket C); halaman akan memberi peringatan bila jam belajar yang diatur berbeda.
  - Sistem belum menyimpan data guru, sehingga "bentrok" dihitung per mapel (satu mapel dianggap satu guru/ruang).
- **Rekap Word Paket C digabung per tingkat**: kelas 10, 11, 12 (IPA/IPS dan rombel diabaikan). Jadwal Pelajaran Paket C juga memakai grup 10/11/12.
- Riwayat & statistik kehadiran pribadi siswa — bisa dilihat per bulan, per semester, atau rentang tanggal bebas (siswa hanya bisa melihat datanya sendiri).

## Rotasi Token & Paket Gratis Netlify
Kode/QR absensi berganti tiap 15 menit lewat **Netlify Scheduled Functions**
(`scheduled-rotate-token`, jadwal `*/15 * * * *` di `netlify.toml`). Fitur ini
masih berstatus **beta** di Netlify, dan beberapa paket (termasuk kemungkinan
paket gratis) punya batas jadwal minimum per **jam**, bukan per 15 menit.

**Cara memastikan aman dipakai di paket gratis:**
1. Setelah deploy, buka menu **Sesi & Token Absensi**, mulai satu sesi, lalu
   perhatikan hitungan mundurnya. Kalau melewati 00:00 dan berubah jadi
   peringatan merah "⚠ Belum diperpanjang otomatis", berarti jadwal bawaan
   Netlify tidak berjalan setiap 15 menit di paket Anda.
2. Kalau itu terjadi, tambahkan cadangan **gratis** memakai cron eksternal:
   - Set environment variable `CRON_SECRET` di Netlify (string acak bebas).
   - Daftar gratis di https://cron-job.org (atau layanan cron gratis lain).
   - Buat cron job baru: tiap 15 menit, method `GET`, URL
     `https://<domain-anda>/.netlify/functions/scheduled-rotate-token`,
     dengan header tambahan `x-cron-secret: <isi CRON_SECRET Anda>`.
   - Ini berjalan independen dari jadwal Netlify — jadi kalaupun jadwal bawaan
     Netlify tidak konsisten di paket gratis, token tetap berganti tepat waktu.
3. Sebagai jaring pengaman terakhir, tombol **"Mulai / Perpanjang"** di menu
   Sesi & Token selalu bisa dipakai admin kapan saja secara manual.


- **Ekspor PDF** (Rekap Absensi, Persentase Kehadiran, Rekap Semester) memakai
  fitur cetak bawaan browser ("Print to PDF"), bukan generator PDF di server —
  jadi hasilnya tergantung pengaturan printer/PDF di browser admin (disarankan
  Chrome, pilih "Save as PDF", orientasi sesuai isi tabel).
- **Deskripsi kehadiran otomatis** di Rekap Semester hanya kalimat penilaian
  akhirnya yang bisa diedit lewat Pengaturan Sekolah (templat Sangat Baik/Baik/
  Cukup/Kurang); kalimat rincian angka (jumlah hadir/izin/sakit/alpa) selalu
  dihasilkan otomatis dari data agar tetap akurat.
- **Foto selfie**: pengaturan "wajib/tidak" sudah ada di database & UI pengaturan, tapi
  alur pengambilan+penyimpanan foto ke Supabase Storage belum disambungkan di frontend —
  ini titik pengembangan lanjutan yang paling mudah ditambahkan berikutnya (upload ke
  bucket Storage, simpan URL-nya ke kolom `checkin_photo_url`/`checkout_photo_url` yang
  sudah tersedia di database).
- **Deteksi mock-location** memakai flag `GeolocationCoordinates.mocked` yang hanya
  tersedia di sebagian platform/browser; ini dipakai sebagai lapisan tambahan, bukan
  satu-satunya pertahanan (radius + akurasi + token + audit log tetap berjalan).
- **Auto-rotate token** memakai Netlify Scheduled Functions (cron tiap 15 menit). Jika
  paket Netlify Anda tidak mengaktifkan fitur ini, admin cukup menekan ulang
  **Mulai/Perpanjang** secara manual — sistem tetap berfungsi, hanya tidak otomatis.
- Import ulang data siswa di masa depan bisa memakai `scripts/convert_students.py` →
  `scripts/generate_seed_sql.js` lagi dengan file Dapodik terbaru.

## Keamanan ringkas
- RLS aktif di semua tabel, **tanpa policy untuk anon/authenticated** → hanya
  `service_role` (dipakai backend) yang bisa akses; browser tidak pernah bicara
  langsung ke Supabase.
- Password di-hash dengan bcrypt; sesi login memakai JWT (siswa 12 jam, admin 8 jam).
- Rate limiting sederhana pada login & absen; semua absen tercatat di `audit_logs`,
  semua percobaan mencurigakan (di luar radius, akurasi buruk, token salah, indikasi
  mock location) tercatat di `attendance_security_events` dengan status yang tetap
  jujur (tidak otomatis diubah jadi "Hadir").
