/**
 * MedAgent-Alpha — RAG Retrieval Module
 *
 * Implements §4.3 of PRD v1.4:
 * - Documents chunked → embedded → stored in Supabase pgvector
 * - Query: similarity search via cosine distance in SQL
 * - LLM only extracts structured features; scoring is deterministic
 *
 * In DEMO_MODE returns curated static context snippets (no DB call needed).
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/llm';
import type { RagReference } from '@/lib/supabase';

// ── Static demo knowledge chunks ─────────────────────────────────────────────
// Used when DEMO_MODE=true or when Supabase is unavailable.

const DEMO_KNOWLEDGE: RagReference[] = [
  {
    title: 'ESI Level 1 — Immediate',
    content_snippet:
      'ESI Level 1 requires immediate life-saving intervention. Indicators: respiratory arrest, cardiac arrest, severe respiratory distress, SpO2 < 90%, unresponsive patient (GCS < 9), or hemodynamic instability (systolic BP < 90 mmHg).',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'ESI Level 2 — High Risk',
    content_snippet:
      'ESI Level 2: High-risk situation, should not wait. Includes: confused/lethargic/disoriented patient, severe pain/distress (pain score ≥7), vital sign danger zone (HR >150, RR >29, SpO2 90-94%), or signs of acute coronary syndrome.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'ESI Level 3 — Urgent',
    content_snippet:
      'ESI Level 3: Stable patient requiring two or more resources (labs, imaging, IV meds, specialty consult). Examples: abdominal pain needing IV analgesia + CT scan, chest pain needing ECG + troponin + chest X-ray.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'Triase Warna Kemenkes',
    content_snippet:
      'Berdasarkan Permenkes No. 47 Tahun 2018: Merah (prioritas 1, mengancam jiwa, intervensi segera), Kuning (prioritas 2, darurat tidak mengancam jiwa, dapat ditunda terbatas), Hijau (prioritas 3, tidak darurat), Hitam (meninggal atau tidak mungkin diselamatkan).',
    source: 'Permenkes No. 47 Tahun 2018 tentang Pelayanan Kegawatdaruratan',
  },
  {
    title: 'Sindrom Koroner Akut — Tanda Bahaya',
    content_snippet:
      'SKA: nyeri dada kiri/substernal menjalar ke lengan kiri, rahang, atau punggung; berkeringat dingin; mual; sesak napas. Segera EKG 12 lead, troponin serial, akses IV, oksigen bila SpO2 <94%. Aspirin 320 mg bila tidak ada kontraindikasi.',
    source: 'Panduan Tatalaksana SKA PERKI 2021',
  },
  {
    title: 'Stroke — Tanda FAST',
    content_snippet:
      'FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency. Golden period stroke iskemik: trombolisis dalam 4.5 jam onset. CT scan non-kontras segera. Hindari hipoglikemia dan hipertermia.',
    source: 'Pedoman Nasional Pelayanan Kedokteran Stroke, Perdossi 2019',
  },
  {
    title: 'Sepsis — Kriteria qSOFA',
    content_snippet:
      'qSOFA: RR ≥22 x/mnt, altered mentation (GCS <15), systolic BP ≤100 mmHg. Skor ≥2 → suspek sepsis. Tindakan: kultur darah sebelum antibiotik, antibiotik IV dalam 1 jam, resusitasi cairan 30 mL/kgBB kristaloid, target MAP ≥65 mmHg.',
    source: 'Surviving Sepsis Campaign Guidelines 2021',
  },
  {
    title: 'Hipoglikemia — Tatalaksana Darurat',
    content_snippet:
      'Hipoglikemia berat (GDS <50 mg/dL atau gejala neuroglikopenik): dekstrosa 40% 25 mL IV bolus, ulangi bila belum sadar dalam 15 menit. Setelah sadar: karbohidrat kompleks oral. Monitor GDS tiap 30 menit.',
    source: 'PERKENI Konsensus Pengelolaan Hipoglikemia 2021',
  },
];

// ── Core retrieval function ───────────────────────────────────────────────────

export async function retrieveContext(
  query: string,
  topK: number = 4
): Promise<RagReference[]> {
  // DEMO_MODE: return static snippets ranked by naive keyword overlap
  if (process.env.DEMO_MODE === 'true') {
    return rankByKeyword(query, DEMO_KNOWLEDGE, topK);
  }

  // Production: pgvector similarity search
  try {
    const embedding = await generateEmbedding(query);
    const admin = getSupabaseAdmin();

    // Supabase RPC for pgvector cosine similarity search
    // Requires SQL function `match_knowledge_docs` (see below)
    const { data, error } = await admin.rpc('match_knowledge_docs', {
      query_embedding: embedding,
      match_count: topK,
    });

    if (error) {
      console.error('[RAG] pgvector search error:', error.message);
      return rankByKeyword(query, DEMO_KNOWLEDGE, topK);
    }

    if (!data || data.length === 0) {
      console.warn('[RAG] No results from pgvector, falling back to demo knowledge');
      return rankByKeyword(query, DEMO_KNOWLEDGE, topK);
    }

    return (data as Array<{ title: string; content: string; source: string }>).map((row) => ({
      title: row.title,
      content_snippet: row.content.slice(0, 400),
      source: row.source ?? 'Knowledge Base',
    }));
  } catch (err) {
    console.error('[RAG] Retrieval failed, using demo fallback:', err);
    return rankByKeyword(query, DEMO_KNOWLEDGE, topK);
  }
}

// ── Keyword ranking fallback ──────────────────────────────────────────────────

function rankByKeyword(query: string, docs: RagReference[], topK: number): RagReference[] {
  const tokens = query.toLowerCase().split(/\s+/);
  const scored = docs.map((doc) => {
    const text = (doc.title + ' ' + doc.content_snippet).toLowerCase();
    const score = tokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
    return { doc, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.doc);
}

// ── LLM feature extraction from free text + vitals ──────────────────────────
// (§4.3.1 step a: structured extraction, not scoring)

import { callDiagnosticLLM, parseLLMJson } from '@/lib/llm';
import type { PatientFeatures } from '@/lib/triage/engine';
import type { VitalSigns } from '@/lib/supabase';

export interface ExtractionResult {
  features: PatientFeatures;
  raw_response: string;
  extraction_successful: boolean;
}

export async function extractPatientFeatures(
  keluhanUtama: string,
  vitalSigns: VitalSigns
): Promise<ExtractionResult> {
  // Build the extraction prompt
  const prompt = `Kamu adalah asisten medis yang mengekstrak data klinis terstruktur.

Tugas: Ubah informasi pasien berikut menjadi JSON dengan field tanda vital yang tervalidasi.
JANGAN menghitung skor ESI — hanya ekstrak dan validasi nilai yang tersedia.

Keluhan utama: "${keluhanUtama}"

Tanda vital yang diinput perawat:
- SpO2: ${vitalSigns.spo2 ?? 'tidak diisi'} %
- Tekanan darah sistolik: ${vitalSigns.systolic ?? 'tidak diisi'} mmHg
- Tekanan darah diastolik: ${vitalSigns.diastolic ?? 'tidak diisi'} mmHg
- Detak jantung: ${vitalSigns.heart_rate ?? 'tidak diisi'} bpm
- Laju napas: ${vitalSigns.respiratory_rate ?? 'tidak diisi'} x/mnt
- Suhu: ${vitalSigns.temperature ?? 'tidak diisi'} °C
- GCS: ${vitalSigns.gcs ?? 'tidak diisi'}

Balas HANYA dalam format JSON berikut (isi hanya field yang tersedia, lewati field yang null/tidak diisi):
{
  "spo2": <number 0-100 atau null>,
  "systolic": <number 0-300 atau null>,
  "diastolic": <number 0-200 atau null>,
  "heart_rate": <number 0-300 atau null>,
  "respiratory_rate": <number 0-100 atau null>,
  "temperature": <number 20-45 atau null>,
  "gcs": <number 3-15 atau null>
}`;

  try {
    const raw = await callDiagnosticLLM(
      [{ role: 'user', content: prompt }],
      { response_format: { type: 'json_object' }, temperature: 0.1, max_tokens: 256 }
    );

    const parsed = parseLLMJson<Record<string, number | null>>(raw);
    if (!parsed) {
      return { features: buildFeaturesFromVitals(vitalSigns), raw_response: raw, extraction_successful: false };
    }

    // Merge LLM output with direct vital sign input (direct input takes precedence)
    const features: PatientFeatures = buildFeaturesFromVitals(vitalSigns);

    // Fill in any missing fields from LLM extraction
    if (features.spo2 === undefined && typeof parsed.spo2 === 'number') features.spo2 = parsed.spo2;
    if (features.systolic === undefined && typeof parsed.systolic === 'number') features.systolic = parsed.systolic;
    if (features.diastolic === undefined && typeof parsed.diastolic === 'number') features.diastolic = parsed.diastolic;
    if (features.heart_rate === undefined && typeof parsed.heart_rate === 'number') features.heart_rate = parsed.heart_rate;
    if (features.respiratory_rate === undefined && typeof parsed.respiratory_rate === 'number') features.respiratory_rate = parsed.respiratory_rate;
    if (features.temperature === undefined && typeof parsed.temperature === 'number') features.temperature = parsed.temperature;
    if (features.gcs === undefined && typeof parsed.gcs === 'number') features.gcs = parsed.gcs;

    return { features, raw_response: raw, extraction_successful: true };
  } catch (err) {
    console.error('[RAG] Feature extraction failed:', err);
    return { features: buildFeaturesFromVitals(vitalSigns), raw_response: '', extraction_successful: false };
  }
}

function buildFeaturesFromVitals(v: VitalSigns): PatientFeatures {
  const f: PatientFeatures = {};
  if (v.spo2 !== undefined && v.spo2 !== null)              f.spo2 = v.spo2;
  if (v.systolic !== undefined && v.systolic !== null)      f.systolic = v.systolic;
  if (v.diastolic !== undefined && v.diastolic !== null)    f.diastolic = v.diastolic;
  if (v.heart_rate !== undefined && v.heart_rate !== null)  f.heart_rate = v.heart_rate;
  if (v.respiratory_rate !== undefined && v.respiratory_rate !== null) f.respiratory_rate = v.respiratory_rate;
  if (v.temperature !== undefined && v.temperature !== null) f.temperature = v.temperature;
  if (v.gcs !== undefined && v.gcs !== null)                f.gcs = v.gcs;
  return f;
}

/*
── SQL function required in Supabase (add to schema.sql migration) ─────────────

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
*/
