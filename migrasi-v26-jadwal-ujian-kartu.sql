-- v26: menu Jadwal Ujian (Paket B / Paket C) + Kartu Peserta Ujian.
-- Jalankan sekali di Supabase SQL Editor (aman diulang).
-- Jadwal disimpan 1 baris per jadwal; daftar mapel/tanggal/jam ada di kolom "baris" (JSON).
create table if not exists public.jadwal_ujian (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  jenis_ujian text not null,
  program text not null,
  kelas text not null,            -- 'VII'..'XII' atau 'SEMUA' (gabungan semua kelas paket tsb)
  jurusan text,                   -- 'IPA' / 'IPS' / null
  semester text,
  tahun_ajaran text,
  pengaturan jsonb not null default '{}'::jsonb,
  baris jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jadwal_ujian enable row level security;
drop policy if exists "guru login bisa akses jadwal ujian" on public.jadwal_ujian;
create policy "guru login bisa akses jadwal ujian" on public.jadwal_ujian for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
