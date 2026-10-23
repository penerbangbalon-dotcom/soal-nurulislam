-- Migrasi 09: tambah tema 'malam' (gelap navy, aksen cyan-ungu) dan jadikan bawaan.
-- Aman dijalankan berulang kali.
alter table school_settings drop constraint if exists school_settings_tema_warna_check;
alter table school_settings add constraint school_settings_tema_warna_check
  check (tema_warna in ('malam','kuning','biru','hijau','ungu','teal','mawar'));
alter table school_settings alter column tema_warna set default 'malam';
update school_settings set tema_warna = 'malam' where id = 1;
