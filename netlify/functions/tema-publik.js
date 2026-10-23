const { supabaseAdmin } = require('./_lib/supabaseAdmin');
const { json, preflight } = require('./_lib/utils');

// Warna aplikasi yang dipilih Super Admin. Boleh dibaca tanpa login (hanya nama warna, tidak ada data lain)
// supaya halaman login dan halaman siswa ikut berwarna sama. Kalau gagal dibaca, pakai warna bawaan.
const TEMA_VALID = ['malam', 'kuning', 'biru', 'hijau', 'ungu', 'teal', 'mawar'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  let tema = 'malam';
  try {
    const { data } = await supabaseAdmin().from('school_settings').select('tema_warna').eq('id', 1).maybeSingle();
    if (data && TEMA_VALID.includes(data.tema_warna)) tema = data.tema_warna;
  } catch { /* pakai bawaan */ }
  return json(200, { tema });
};
