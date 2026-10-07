# Deploy Aplikasi Absensi ke Vercel

Folder ini sudah ditambahkan `api/[...path].js` + `vercel.json` supaya bisa
di-deploy ke Vercel TANPA mengubah satu pun file di `netlify/functions/`.
Deployment Netlify yang sudah ada tetap jalan seperti biasa — dua platform
ini memakai kode backend yang sama persis, cuma beda "jembatan" pemanggilan.

## Yang ditambahkan (baru, tidak mengubah yang lama)
- `api/[...path].js` — satu adapter yang meneruskan semua `/api/xxx` ke
  handler yang sesuai di `netlify/functions/xxx.js`.
- `vercel.json` — memberi tahu Vercel bahwa file statis (index.html, admin/,
  siswa/, assets/) ada di folder `public/`, dan mengatur `api/*` sebagai
  serverless function.

## Langkah deploy
1. Push folder ini (termasuk `public/`, `netlify/`, `api/`, `vercel.json`,
   `package.json`) ke repo GitHub — boleh repo yang sama dengan yang
   dipakai Netlify.
2. Di Vercel: Import Project dari repo itu. Root Directory `./`.
   Framework Preset: **Other**. Tidak perlu ubah Build Command / Install
   Command (biarkan default `npm install`).
3. Isi Environment Variables di Vercel Project Settings (nilai SAMA seperti
   yang sudah kamu isi di Netlify):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `CRON_SECRET` (opsional, lihat bagian Rotasi Token di bawah)
4. Deploy. Setelah selesai, buka `https://nama-project.vercel.app` — harus
   tampil halaman yang sama seperti di Netlify.

## Rotasi token QR (scheduled function)
`scheduled-rotate-token.js` awalnya didesain jalan otomatis tiap 15 menit
lewat Netlify Scheduled Functions. Vercel punya mekanisme cron sendiri, tapi
paket gratisnya biasanya cuma bisa dipicu 1x/hari — TIDAK cukup untuk rotasi
tiap 15 menit.

Kabar baiknya, kode ini **sudah** dirancang untuk dipicu dari luar (cron
eksternal gratis, misalnya cron-job.org), persis untuk mengatasi batasan
serupa di Netlify. Jadi di Vercel pun caranya sama:

1. Isi `CRON_SECRET` di Environment Variables Vercel dengan string acak.
2. Di cron-job.org (atau layanan sejenis), buat job yang memanggil setiap
   15 menit:
   `POST https://nama-project.vercel.app/api/scheduled-rotate-token`
   dengan header `x-cron-secret: <nilai CRON_SECRET>`.

Kalau kamu sudah pakai cron eksternal ini untuk Netlify, tinggal tambahkan
URL Vercel-nya sebagai job kedua (atau ganti total ke Vercel kalau nanti
sudah pindah sepenuhnya).

## Catatan keamanan
- `SUPABASE_SERVICE_ROLE_KEY` dan `JWT_SECRET` HARUS diisi terpisah di
  Vercel (tidak otomatis ikut dari Netlify atau dari GitHub).
- Jangan commit file `.env` berisi nilai asli ke repo — pakai `.env.example`
  sebagai referensi saja.
