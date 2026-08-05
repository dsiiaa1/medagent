-- MedAgent-Alpha v1.4 — Supabase Schema
-- Jalankan di SQL Editor Supabase, atau lewat supabase db push

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- KNOWLEDGE BASE (RAG — pgvector)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT         NOT NULL,
  content    TEXT         NOT NULL,
  source     TEXT,                         -- judul buku/panduan/URL asal
  category   TEXT,                         -- 'esi_algorithm' | 'local_guideline' | 'drug_interaction'
  metadata   JSONB        DEFAULT '{}',
  embedding  vector(1536),                 -- dimensi text-embedding-3-small (OpenAI) / gemini text-embedding-004 (768)
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- HNSW index untuk cosine similarity search
CREATE INDEX IF NOT EXISTS knowledge_docs_embedding_idx
  ON knowledge_docs USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- CASES — data pasien + status orchestrator
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data intake pasien
  nama                   VARCHAR(255) NOT NULL,
  age_value              INTEGER      NOT NULL CHECK (age_value > 0),
  age_unit               VARCHAR(10)  NOT NULL CHECK (age_unit IN ('Tahun','Bulan')),
  age_months             INTEGER      NOT NULL CHECK (age_months > 0),
  jenis_kelamin          VARCHAR(15)  NOT NULL CHECK (jenis_kelamin IN ('Laki-laki','Perempuan')),
  keluhan_utama          TEXT         NOT NULL,
  vital_signs            JSONB        NOT NULL,
  -- vital_signs shape: { spo2, systolic, diastolic, heart_rate, respiratory_rate, temperature, gcs }
  riwayat_medis          JSONB        DEFAULT '{}',
  -- riwayat_medis shape: { kondisi_kronis: string[], alergi: string[], obat_dikonsumsi: string[] }
  waktu_masuk            TIMESTAMPTZ  DEFAULT NOW(),

  -- Orchestrator state machine
  current_node           VARCHAR(60)  DEFAULT 'intake'
                                      CHECK (current_node IN (
                                        'intake','retrieve_context','urgency_scoring',
                                        'drug_interaction_check','generate_soap',
                                        'await_doctor_verification','completed','error'
                                      )),

  -- Hasil agent RAG / triage
  age_category           VARCHAR(30),
  auto_scoring_eligible  BOOLEAN,
  esi_score              SMALLINT     CHECK (esi_score BETWEEN 1 AND 5),
  triage_warna           VARCHAR(10)  CHECK (triage_warna IN ('Merah','Kuning','Hijau','Hitam')),
  override_triggered     BOOLEAN      DEFAULT FALSE,
  confidence_level       VARCHAR(10)  CHECK (confidence_level IN ('high','medium','low')),
  triage_flags           TEXT[]       DEFAULT '{}',
  rag_references         JSONB        DEFAULT '[]',
  -- rag_references: [{ title, content_snippet, source }]

  patient_features       JSONB,
  -- Hasil ekstraksi terstruktur LLM

  -- Hasil agent farmasi
  drug_interactions      JSONB        DEFAULT '[]',
  -- drug_interactions: [{ drug_a, drug_b, severity, description }]

  -- SOAP summary
  soap_summary           JSONB,
  -- soap_summary: { subjective, objective, assessment, plan }

  -- Status verifikasi dokter
  verification_status    VARCHAR(20)  DEFAULT 'pending'
                                      CHECK (verification_status IN (
                                        'pending','approved','edited','rejected'
                                      )),
  verification_note      TEXT,
  verified_by            VARCHAR(255),
  verified_at            TIMESTAMPTZ,

  -- Error handling
  error_message          TEXT,

  updated_at             TIMESTAMPTZ  DEFAULT NOW()
);

-- Index untuk query dashboard (urutan prioritas + waktu masuk)
CREATE INDEX IF NOT EXISTS cases_triage_idx ON cases (esi_score ASC NULLS LAST, waktu_masuk ASC);
CREATE INDEX IF NOT EXISTS cases_status_idx ON cases (verification_status, current_node);

-- ============================================================
-- CASE TRACE — log setiap langkah orchestrator (transparansi)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_trace (
  id         BIGSERIAL   PRIMARY KEY,
  case_id    UUID        NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  node_name  VARCHAR(60) NOT NULL,
  status     VARCHAR(20) NOT NULL CHECK (status IN ('started','completed','failed','skipped')),
  details    JSONB       DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS case_trace_case_idx ON case_trace (case_id, created_at ASC);

-- ============================================================
-- TRIGGER: auto-update updated_at pada cases
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (open policy untuk MVP)
-- ============================================================
ALTER TABLE knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases           ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_trace      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mvp_open" ON knowledge_docs;
DROP POLICY IF EXISTS "mvp_open" ON cases;
DROP POLICY IF EXISTS "mvp_open" ON case_trace;

CREATE POLICY "mvp_open" ON knowledge_docs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_open" ON cases           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_open" ON case_trace      FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME: aktifkan publikasi untuk tabel cases
-- (diperlukan Supabase Realtime subscription di dashboard)
-- ============================================================
-- Jalankan di Supabase Dashboard → Database → Replication:
--   Tambahkan tabel `cases` ke publikasi supabase_realtime
-- Atau lewat SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE cases;

-- ============================================================
-- RAG: PGVECTOR MATCH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION match_knowledge_docs(
  query_embedding vector(1536),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id      bigint,
  title   text,
  content text,
  source  text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT id, title, content, source,
         1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_docs
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
