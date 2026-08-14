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

// DEMO_KNOWLEDGE and rankByKeyword have been removed for production.

// ── Core retrieval function ───────────────────────────────────────────────────

export async function retrieveContext(
  query: string,
  topK: number = 4
): Promise<RagReference[]> {
  try {
    // 1. Expand query to clinical terms
    const expandedQuery = await expandQuery(query);
    const searchString = expandedQuery !== query ? `${query} ${expandedQuery}` : query;

    // 2. Generate embedding for the expanded search string
    const embedding = await generateEmbedding(searchString);
    const admin = getSupabaseAdmin();

    // 3. Supabase RPC for pgvector cosine similarity search
    const { data, error } = await admin.rpc('match_knowledge_docs', {
      query_embedding: embedding,
      match_count: topK,
    });

    if (error) {
      console.error('[RAG] pgvector search error:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[RAG] No results from pgvector');
      return [];
    }

    return (data as Array<{ title: string; content: string; source: string }>).map((row) => ({
      title: row.title,
      content_snippet: row.content.slice(0, 400),
      source: row.source ?? 'Knowledge Base',
    }));
  } catch (err) {
    console.error('[RAG] Retrieval failed:', err);
    return [];
  }
}

/**
 * Expand naive patient query into medical terminology
 */
async function expandQuery(query: string): Promise<string> {

  const prompt = `Sebagai asisten medis, rumuskan ulang keluhan pasien berikut menjadi 3-5 istilah medis (diagnosa banding atau gejala klinis) yang sangat relevan untuk keperluan pencarian database (RAG). 
Contoh: "dada sesak tembus belakang" -> "sindrom koroner akut, STEMI, nyeri dada iskemik".
Keluhan pasien: "${query}"
Hanya kembalikan istilah medisnya, pisahkan dengan koma, tanpa penjelasan tambahan.`;

  try {
    const raw = await callDiagnosticLLM([{ role: 'user', content: prompt }], { max_tokens: 512, temperature: 0.1 });
    // Cleanup LLM output (remove quotes, brackets, etc.)
    return raw.replace(/["\[\]]/g, '').trim();
  } catch (err) {
    console.error('[RAG] Query expansion failed:', err);
    return query;
  }
}

// rankByKeyword has been removed

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
      { response_format: { type: 'json_object' }, temperature: 0.1, max_tokens: 1024 }
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
