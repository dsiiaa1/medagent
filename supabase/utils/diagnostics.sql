-- =============================================================================
-- MedAgent-Alpha — Utility SQL: Reset & Diagnostics
-- =============================================================================
-- File ini berisi query berguna untuk development & debugging.
-- JANGAN jalankan di production environment.
--
-- Cara pakai: copy query yang dibutuhkan ke Supabase SQL Editor → Run
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RESET: Hapus semua data (untuk re-seed)
-- ─────────────────────────────────────────────────────────────────────────────

-- PERINGATAN: Menghapus SEMUA data kasus dan trace. Tidak bisa dibatalkan.
/*
truncate table public.case_trace cascade;
truncate table public.cases cascade;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DIAGNOSTICS: Cek jumlah data
-- ─────────────────────────────────────────────────────────────────────────────

select
  (select count(*) from public.cases)          as total_cases,
  (select count(*) from public.case_trace)     as total_traces,
  (select count(*) from public.rag_documents)  as total_rag_docs;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DIAGNOSTICS: Distribusi ESI & Triage
-- ─────────────────────────────────────────────────────────────────────────────

select
  esi_score,
  triage_warna,
  count(*) as jumlah,
  round(count(*) * 100.0 / sum(count(*)) over (), 1) as persen
from public.cases
where esi_score is not null
group by esi_score, triage_warna
order by esi_score asc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DIAGNOSTICS: Distribusi Status Verifikasi
-- ─────────────────────────────────────────────────────────────────────────────

select
  verification_status,
  count(*) as jumlah
from public.cases
group by verification_status
order by jumlah desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DIAGNOSTICS: Kasus dengan Override Aktif
-- ─────────────────────────────────────────────────────────────────────────────

select
  nama,
  age_value,
  age_unit,
  esi_score,
  triage_warna,
  vital_signs->>'spo2'       as spo2,
  vital_signs->>'systolic'   as sistol,
  vital_signs->>'heart_rate' as heart_rate,
  vital_signs->>'gcs'        as gcs,
  override_triggered
from public.cases
where override_triggered = true
order by waktu_masuk desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DIAGNOSTICS: Kasus dengan Interaksi Obat Berat
-- ─────────────────────────────────────────────────────────────────────────────

select
  c.nama,
  c.esi_score,
  interaction->>'drug_a'     as obat_a,
  interaction->>'drug_b'     as obat_b,
  interaction->>'severity'   as tingkat,
  interaction->>'description' as deskripsi
from public.cases c
cross join lateral jsonb_array_elements(c.drug_interactions) as interaction
where interaction->>'severity' = 'berat'
order by c.waktu_masuk desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DIAGNOSTICS: Reasoning trace lengkap untuk satu kasus
-- ─────────────────────────────────────────────────────────────────────────────

-- Ganti <CASE_ID> dengan UUID kasus yang ingin dicek
/*
select
  node_name,
  status,
  details,
  created_at,
  created_at - lag(created_at) over (order by created_at) as durasi_node
from public.case_trace
where case_id = '<CASE_ID>'
order by created_at asc;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. DIAGNOSTICS: Dashboard view (sama dengan query di actions.ts)
-- ─────────────────────────────────────────────────────────────────────────────

select
  id,
  nama,
  age_value || ' ' || age_unit as usia,
  jenis_kelamin,
  keluhan_utama,
  esi_score,
  triage_warna,
  confidence_level,
  override_triggered,
  verification_status,
  current_node,
  waktu_masuk
from public.cases
order by
  esi_score asc nulls last,
  waktu_masuk asc
limit 20;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. DIAGNOSTICS: Status RAG documents (cek embedding)
-- ─────────────────────────────────────────────────────────────────────────────

select
  category,
  count(*) as total_docs,
  count(embedding) as docs_with_embedding,
  count(*) - count(embedding) as docs_without_embedding
from public.rag_documents
group by category
order by total_docs desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CLEANUP: Hapus kasus yang masih stuck di error > 1 jam (opsional)
-- ─────────────────────────────────────────────────────────────────────────────

/*
delete from public.cases
where current_node = 'error'
  and waktu_masuk < now() - interval '1 hour'
  and verification_status = 'pending';
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. HELPER: Tambah kasus baru secara manual (untuk quick test)
-- ─────────────────────────────────────────────────────────────────────────────

/*
insert into public.cases (
  nama, age_value, age_unit, age_months, jenis_kelamin,
  keluhan_utama, vital_signs, riwayat_medis, current_node
) values (
  'Test Manual', 40, 'Tahun', 480, 'Laki-laki',
  'Nyeri dada mendadak',
  '{"spo2": 94, "systolic": 120, "diastolic": 80, "heart_rate": 95}'::jsonb,
  '{"kondisi_kronis": [], "alergi": [], "obat_dikonsumsi": []}'::jsonb,
  'intake'
) returning id, nama;
*/
