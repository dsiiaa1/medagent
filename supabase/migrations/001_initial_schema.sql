-- =============================================================================
-- MedAgent-Alpha — Migration 001: Initial Schema
-- =============================================================================
-- Tabel utama untuk sistem triase & verifikasi dokter.
-- Jalankan di Supabase SQL Editor:
--   Dashboard → SQL Editor → paste → Run
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────

-- pgvector untuk RAG similarity search (aktifkan jika belum)
create extension if not exists vector;

-- ── Custom Types ──────────────────────────────────────────────────────────────

-- Warna triase sesuai standar Kemenkes / ESI
create type triage_warna as enum ('Merah', 'Kuning', 'Hijau', 'Hitam');

-- Status verifikasi dokter
create type verification_status as enum ('pending', 'approved', 'edited', 'rejected');

-- Tingkat kepercayaan AI
create type confidence_level as enum ('high', 'medium', 'low');

-- Node-node dalam pipeline orchestrator
create type orchestrator_node as enum (
  'intake',
  'retrieve_context',
  'urgency_scoring',
  'clarify_with_nurse',
  'drug_interaction_check',
  'generate_soap',
  'self_critique',
  'await_doctor_verification',
  'completed',
  'error'
);

-- Satuan usia
create type age_unit as enum ('Tahun', 'Bulan');

-- Jenis kelamin
create type jenis_kelamin as enum ('Laki-laki', 'Perempuan');

-- ── Table: cases ──────────────────────────────────────────────────────────────

create table public.cases (
  -- Primary key
  id                    uuid primary key default gen_random_uuid(),

  -- ── Identitas Pasien ──────────────────────────────────────────────────────
  nama                  text not null,
  age_value             integer not null check (age_value > 0),
  age_unit              age_unit not null default 'Tahun',
  age_months            integer not null check (age_months > 0),   -- derived: age_value × 12 jika Tahun
  jenis_kelamin         jenis_kelamin not null,

  -- ── Klinis ───────────────────────────────────────────────────────────────
  keluhan_utama         text not null,

  -- JSON object berisi field opsional:
  --   spo2, systolic, diastolic, heart_rate, respiratory_rate, temperature, gcs
  vital_signs           jsonb not null default '{}'::jsonb,

  -- JSON object berisi array:
  --   kondisi_kronis[], alergi[], obat_dikonsumsi[]
  riwayat_medis         jsonb not null default '{}'::jsonb,

  -- ── Pipeline Status ───────────────────────────────────────────────────────
  waktu_masuk           timestamptz not null default now(),
  current_node          orchestrator_node not null default 'intake',

  -- ── Hasil Triase (diisi oleh engine.ts) ──────────────────────────────────
  age_category          text,                               -- 'bayi', 'balita', 'anak', 'remaja', 'dewasa', 'lansia'
  auto_scoring_eligible boolean,                           -- false = di luar cakupan MVP
  esi_score             integer check (esi_score between 1 and 5),
  triage_warna          triage_warna,
  override_triggered    boolean not null default false,    -- true = hard override karena vital kritis
  confidence_level      confidence_level,
  triage_flags          text[] not null default '{}',      -- e.g. ['gejala_atipikal', 'pediatric_assisted']
  patient_features      jsonb,                             -- fitur klinis yang diekstrak RAG

  -- ── Hasil Analisis AI ─────────────────────────────────────────────────────
  -- Array of { drug_a, drug_b, severity, description }
  drug_interactions     jsonb not null default '[]'::jsonb,

  -- Array of { title, content_snippet, source }
  rag_references        jsonb not null default '[]'::jsonb,

  -- { subjective, objective, assessment, plan }
  soap_summary          jsonb,

  clarification_data    jsonb,
  critique_feedback     jsonb,

  -- ── Verifikasi Dokter (§4.7) ──────────────────────────────────────────────
  verification_status   verification_status not null default 'pending',
  verification_note     text,
  verified_by           text,
  verified_at           timestamptz,

  -- ── Error Handling ────────────────────────────────────────────────────────
  error_message         text,

  -- ── Audit ─────────────────────────────────────────────────────────────────
  updated_at            timestamptz not null default now()
);

-- ── Table: case_trace ─────────────────────────────────────────────────────────

create table public.case_trace (
  id          bigint generated always as identity primary key,
  case_id     uuid not null references public.cases(id) on delete cascade,
  node_name   text not null,
  status      text not null check (status in ('started', 'completed', 'failed', 'skipped')),
  -- JSON object: detail tiap node (mis. esi_score, reasoning[], sources[])
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── Table: rag_documents ──────────────────────────────────────────────────────
-- Basis pengetahuan untuk RAG (pgvector similarity search)

create table public.rag_documents (
  id          bigint generated always as identity primary key,
  title       text not null,
  content     text not null,
  source      text not null,                              -- mis. 'Permenkes 47/2018', 'ESI Handbook v4'
  category    text,                                       -- mis. 'triage', 'drug', 'pediatric'
  -- Embedding 1536-dim (OpenAI) atau 768-dim (Groq/Llama) — ukuran disesuaikan
  embedding   vector(1536),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Dashboard: urutkan berdasarkan ESI score (urgent first) lalu waktu masuk
create index idx_cases_esi_waktu
  on public.cases (esi_score asc nulls last, waktu_masuk asc);

-- Filter per status verifikasi
create index idx_cases_verification_status
  on public.cases (verification_status);

-- Filter per node pipeline (untuk monitoring)
create index idx_cases_current_node
  on public.cases (current_node);

-- Reasoning trace lookup per kasus
create index idx_case_trace_case_id
  on public.case_trace (case_id, created_at asc);

-- RAG similarity search (IVFFlat untuk dataset kecil-menengah)
create index idx_rag_documents_embedding
  on public.rag_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 10);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_cases_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
-- MVP: disable RLS, semua akses via service_role key dari server.
-- Aktifkan & konfigurasi policy saat auth user ditambahkan pasca-kompetisi.

alter table public.cases        enable row level security;
alter table public.case_trace   enable row level security;
alter table public.rag_documents enable row level security;

-- Izinkan service_role (backend) membaca & menulis semua baris
create policy "service_role_all_cases"
  on public.cases for all
  to service_role using (true) with check (true);

create policy "service_role_all_case_trace"
  on public.case_trace for all
  to service_role using (true) with check (true);

create policy "service_role_all_rag_documents"
  on public.rag_documents for all
  to service_role using (true) with check (true);

-- Izinkan anon/authenticated membaca cases & case_trace (untuk Realtime subscription)
create policy "anon_read_cases"
  on public.cases for select
  to anon, authenticated using (true);

create policy "anon_read_case_trace"
  on public.case_trace for select
  to anon, authenticated using (true);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Aktifkan publikasi realtime untuk dashboard live updates

alter publication supabase_realtime add table public.cases;
