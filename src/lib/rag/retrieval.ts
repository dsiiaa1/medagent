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
  // ── ESI Framework ──────────────────────────────────────────────────────────
  {
    title: 'ESI Level 1 — Immediate Life-Saving Intervention',
    content_snippet:
      'ESI Level 1 requires immediate life-saving intervention. Indicators: respiratory arrest, cardiac arrest, severe respiratory distress, SpO2 < 90%, unresponsive patient (GCS < 9), or hemodynamic instability (systolic BP < 90 mmHg). No waiting — begin resuscitation immediately.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'ESI Level 2 — High Risk Situation',
    content_snippet:
      'ESI Level 2: High-risk situation, should not wait. Includes: confused/lethargic/disoriented patient, severe pain/distress (pain score ≥7), vital sign danger zone (HR >150 or <40, RR >29, SpO2 90-94%), or signs of acute coronary syndrome or new-onset altered mentation.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'ESI Level 3 — Urgent, Multiple Resources',
    content_snippet:
      'ESI Level 3: Stable patient requiring two or more resources (labs, imaging, IV meds, specialty consult). Examples: abdominal pain needing IV analgesia + CT scan, chest pain needing ECG + troponin + chest X-ray. Patient is stable but needs comprehensive workup.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'ESI Level 4 — Less Urgent, One Resource',
    content_snippet:
      'ESI Level 4: Stable patient requiring one resource (simple lab, x-ray, or prescription). Examples: minor lacerations needing sutures, uncomplicated UTI needing urinalysis, or ankle sprain needing x-ray only. No immediate risk.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'ESI Level 5 — Non-Urgent',
    content_snippet:
      'ESI Level 5: Stable patient requiring no resources beyond history and physical. Examples: medication refill, minor cold/cough, well-child check, or rash without systemic symptoms. Can safely wait.',
    source: 'ESI Implementation Handbook v4, AHRQ',
  },
  {
    title: 'Triase Warna Kemenkes — Permenkes 47/2018',
    content_snippet:
      'Berdasarkan Permenkes No. 47 Tahun 2018: Merah (prioritas 1, mengancam jiwa, intervensi segera), Kuning (prioritas 2, darurat tidak mengancam jiwa, dapat ditunda terbatas), Hijau (prioritas 3, tidak darurat, dapat menunggu), Hitam (meninggal atau tidak mungkin diselamatkan dengan sumber daya yang ada).',
    source: 'Permenkes No. 47 Tahun 2018 tentang Pelayanan Kegawatdaruratan',
  },

  // ── Cardiovascular Emergencies ─────────────────────────────────────────────
  {
    title: 'Sindrom Koroner Akut (SKA) — STEMI & NSTEMI',
    content_snippet:
      'SKA: nyeri dada kiri/substernal menjalar ke lengan kiri, rahang, atau punggung; berkeringat dingin; mual; sesak napas. EKG 12 lead dalam 10 menit. Troponin serial. Aspirin 160-320 mg loading bila tidak kontraindikasi. Oksigen bila SpO2 <94%. STEMI → aktivasi kateterisasi segera bila tersedia.',
    source: 'Panduan Tatalaksana SKA PERKI 2021',
  },
  {
    title: 'Gagal Jantung Akut — Edema Paru Akut',
    content_snippet:
      'Edema paru akut: ortopnea, paroxysmal nocturnal dyspnea, ronki basah bilateral, JVP meningkat, edema perifer. Posisi duduk tegak, oksigen HFNC atau NIPPV. Furosemid IV 40-80 mg. Monitor urine output dan elektrolit. Hindari cairan berlebih.',
    source: 'ESC Guidelines Heart Failure 2021',
  },
  {
    title: 'Aritmia Mengancam Jiwa — VT/VF',
    content_snippet:
      'Ventricular Tachycardia (VT) dengan hemodinamik tidak stabil atau Ventricular Fibrillation (VF): segera kardioversi/defibrilasi. HR >150 bpm dengan tanda syok → kardioversi sinkronisasi 100-200J. Tanpa nadi → defibrilasi 200J, mulai CPR, epinefrin 1 mg IV tiap 3-5 menit.',
    source: 'AHA ACLS Guidelines 2020',
  },

  // ── Respiratory Emergencies ────────────────────────────────────────────────
  {
    title: 'Asma Akut Eksaserbasi Berat',
    content_snippet:
      'Eksaserbasi asma berat: RR >30 x/mnt, SpO2 <92%, bicara terbata-bata, penggunaan otot bantu napas. Salbutamol nebulisasi tiap 20 menit (3x). Kortikosteroid sistemik (metilprednisolon 0.5-1 mg/kgBB IV). Oksigen target SpO2 >94%. Bila tidak membaik → pertimbangkan intubasi.',
    source: 'GINA Guidelines 2023',
  },
  {
    title: 'Pneumonia Berat — Kriteria PSI & PORT Score',
    content_snippet:
      'Pneumonia berat: RR >30 x/mnt, PaO2/FiO2 <250, infiltrat multilobar, confusion, BUN >20 mg/dL, tekanan darah rendah. Antibiotik empiris dalam 1 jam pertama. Ceftriaxone + Azithromycin untuk community-acquired pneumonia. HFNC atau ventilasi mekanik bila gagal napas.',
    source: 'PDPI Pedoman Diagnosis dan Tatalaksana Pneumonia 2020',
  },

  // ── Neurological Emergencies ───────────────────────────────────────────────
  {
    title: 'Stroke Iskemik — Tanda FAST & Golden Period',
    content_snippet:
      'FAST: Face drooping, Arm weakness, Speech difficulty, Time. Golden period trombolisis IV (rtPA 0.9 mg/kgBB, maks 90 mg): dalam 4.5 jam onset. CT scan non-kontras segera untuk eksklusi perdarahan. Target: door-to-needle <60 menit. Kontrol gula darah, suhu, tekanan darah.',
    source: 'Pedoman Nasional Pelayanan Kedokteran Stroke, Perdossi 2019',
  },
  {
    title: 'Status Epileptikus — Protokol Manajemen',
    content_snippet:
      'Status epileptikus (kejang >5 menit atau ≥2 kejang tanpa pulih kesadaran): Stabilisasi ABC. Diazepam IV 0.15-0.2 mg/kgBB atau Lorazepam IV 0.1 mg/kgBB. Bila tidak respon: Fenitoin IV 20 mg/kgBB atau Levetiracetam 60 mg/kgBB IV. Tahap refrakter: midazolam infus atau anestesi umum.',
    source: 'Perhimpunan Dokter Spesialis Saraf Indonesia (PERDOSSI) 2020',
  },
  {
    title: 'Cedera Kepala — Primary & Secondary Survey',
    content_snippet:
      'Cedera kepala berat (GCS ≤8): Airway management prioritas (intubasi bila perlu). Hindari hipoksia (SpO2 >95%) dan hipotensi (sistol >90 mmHg). CT scan kepala segera. Tanda peningkatan TIK: pupil anisokor, Cushing reflex (bradikardi + hipertensi + napas tidak teratur). Manitol 20% bila herniasi.',
    source: 'ATLS Advanced Trauma Life Support, 10th Edition',
  },

  // ── Sepsis & Infections ────────────────────────────────────────────────────
  {
    title: 'Sepsis — qSOFA dan Protokol Hour-1 Bundle',
    content_snippet:
      'qSOFA ≥2 → suspek sepsis (RR ≥22, GCS <15, sistol ≤100). Hour-1 Bundle: (1) Ukur laktat (reorder bila >2); (2) Kultur darah sebelum antibiotik; (3) Antibiotik spektrum luas IV; (4) Resusitasi kristaloid 30 mL/kgBB bila hipotensi/laktat ≥4; (5) Vasopressor bila MAP <65 setelah resusitasi.',
    source: 'Surviving Sepsis Campaign Guidelines 2021',
  },

  // ── Metabolic Emergencies ──────────────────────────────────────────────────
  {
    title: 'Hipoglikemia Berat — Tatalaksana Darurat',
    content_snippet:
      'Hipoglikemia berat (GDS <50 mg/dL atau gejala neuroglikopenik: confusion, kejang, tidak sadar): Dekstrosa 40% 25 mL (= 50% 50 mL) IV bolus, ulangi tiap 15 menit bila belum sadar. Glukagon 1 mg IM bila tidak ada akses IV. Setelah sadar: karbohidrat kompleks oral. Monitor GDS tiap 30 menit.',
    source: 'PERKENI Konsensus Pengelolaan Hipoglikemia 2021',
  },
  {
    title: 'Ketoasidosis Diabetik (KAD)',
    content_snippet:
      'KAD: GDS >250 mg/dL, pH <7.3, bikarbonat <15, keton positif. Tatalaksana: resusitasi cairan NaCl 0.9% 1L/jam pertama. Insulin regular 0.1 unit/kgBB/jam. Monitor elektrolit tiap 2 jam, terutama kalium (koreksi sebelum insulin bila K <3.5 mEq/L). Cari dan tangani faktor presipitasi (infeksi).',
    source: 'PERKENI Konsensus Pengelolaan DM Tipe 2 2021 & ADA Standards',
  },
  {
    title: 'Hiperkalemia Berat — Gambaran EKG dan Tatalaksana',
    content_snippet:
      'Hiperkalemia berat (K >6.5 mEq/L atau ada perubahan EKG: peaked T wave, wide QRS, sine wave pattern): Stabilisasi membran → Kalsium glukonat 1g IV perlahan. Shift kalium → Insulin 10 unit + Dekstrosa 40% 25 mL IV, atau Salbutamol nebulisasi. Ekskresi kalium → Furosemid, kayexalate, atau hemodialisis.',
    source: 'Panduan Tatalaksana Hiperkalemia, Pernefri 2020',
  },

  // ── Trauma & Surgical Emergencies ─────────────────────────────────────────
  {
    title: 'Syok Hipovolemik — Klasifikasi dan Resusitasi',
    content_snippet:
      'Syok hipovolemik derajat III-IV (>30% kehilangan darah): HR >120 bpm, sistol <90 mmHg, kesadaran menurun, produksi urin <5 mL/jam. Resusitasi: 2 IV line besar, kristaloid 2L bolus cepat, lanjut produk darah ratio 1:1:1 (PRC:FFP:Platelets). Kontrol sumber perdarahan segera.',
    source: 'ATLS Advanced Trauma Life Support, 10th Edition',
  },
  {
    title: 'Fraktur Femur — Tatalaksana Nyeri dan Komplikasi',
    content_snippet:
      'Fraktur femur dapat menyebabkan kehilangan darah 500-2000 mL (risiko syok). Imobilisasi dengan traction splint. Analgesik adekuat (hindari NSAID bila ada risiko perdarahan). Monitor tanda-tanda emboli lemak: petechiae, konfusi, SpO2 turun 24-72 jam pasca trauma. Konsultasi ortopedi segera.',
    source: 'ATLS Advanced Trauma Life Support, 10th Edition',
  },
  {
    title: 'Luka Bakar — Estimasi TBSA dan Resusitasi Cairan',
    content_snippet:
      'Luka bakar: Hitung luas (Rule of Nines: kepala 9%, dada 18%, abdomen 18%, punggung 18%, tiap lengan 9%, tiap tungkai 18%). Bakar derajat 2-3 TBSA >20% → resusitasi Parkland Formula: 4 mL x kgBB x %TBSA dalam 24 jam (50% di 8 jam pertama, sisanya 16 jam). Wound dressing, analgesik, tetanus profilaksis.',
    source: 'ISBI Practice Guidelines for Burn Care 2016',
  },

  // ── Poisoning & Allergic Reactions ────────────────────────────────────────
  {
    title: 'Anafilaksis — Diagnosis dan Tatalaksana',
    content_snippet:
      'Anafilaksis: onset cepat setelah paparan alergen, kombinasi gejala kulit (urtikaria, angioedema) + sistem lain (respiratory distress, syok, GI). Epinefrin 0.3-0.5 mg IM (paha anterolateral) SEGERA — ini obat pertama. Diphenhydramine dan kortikosteroid sebagai terapi tambahan. Posisi berbaring, IV fluid.',
    source: 'World Allergy Organization Anaphylaxis Guidelines 2020',
  },
  {
    title: 'Keracunan Organofosfat — Tanda SLUDGE',
    content_snippet:
      'Organofosfat (pestisida): SLUDGE → Salivasi, Lakrimasi, Urinasi, Defekasi, GI distress, Emesis. Juga: miosis, bradikardia, bronkospasme, kejang. Tatalaksana: Atropin 2-4 mg IV tiap 5-10 menit hingga sekresi mengering (bukan sampai takikardia). Pralidoksim 2g IV dalam 30 menit bila dalam 24 jam paparan.',
    source: 'WHO Clinical Management of Acute Pesticide Intoxication 2009',
  },
  {
    title: 'Overdosis Opioid — Tatalaksana Nalokson',
    content_snippet:
      'Overdosis opioid: miosis (pinpoint pupils), depresi napas, penurunan kesadaran. Nalokson (antagonis opioid) 0.4-2 mg IV/IM/intranasil, dapat diulang tiap 2-3 menit hingga RR >12 x/mnt dan GCS membaik. Efek nalokson <1 jam — monitoring ketat karena opioid bisa lebih lama kerjanya.',
    source: 'WHO Clinical Guidelines for Withdrawal Management 2009',
  },

  // ── Obstetric Emergencies ─────────────────────────────────────────────────
  {
    title: 'Eklampsia — Kejang pada Ibu Hamil',
    content_snippet:
      'Eklampsia: kejang tonik-klonik pada pasien hamil atau pasca persalinan dengan preeklamsia. Obat pilihan: MgSO4 4g IV loading dalam 20 menit, lanjut 1-2 g/jam maintenance. Monitor refleks patella, urine output, RR. Antidotum MgSO4: kalsium glukonat 1g IV. Lahirkan bayi bila kondisi memungkinkan.',
    source: 'WHO Recommendations on Prevention & Treatment Eclampsia 2011',
  },
  {
    title: 'Perdarahan Postpartum (HPP)',
    content_snippet:
      'HPP: perdarahan >500 mL (persalinan normal) atau >1000 mL (SC). Penyebab 4T: Tonus (atonia), Trauma, Tissue (sisa plasenta), Thrombin (koagulopati). Oksitosin 10 IU IM atau 20 IU dalam 500 mL IV drip cepat. Masase uterus. Misoprostol 800 mcg sublingual. Resusitasi agresif. Pertimbangkan B-Lynch suture.',
    source: 'WHO Recommendations for Prevention & Treatment of PPH 2012',
  },

  // ── Pediatric Emergencies ─────────────────────────────────────────────────
  {
    title: 'Kegawatan Pediatrik — Pediatric Assessment Triangle (PAT)',
    content_snippet:
      'PAT: Appearance (tonus, interaktivitas, konsolabilitas, pandangan mata, tangis), Work of Breathing (postur, suara napas, retraksi, nasal flaring), Circulation to Skin (warna kulit: pucat/sianosis/mottling). PAT abnormal tanpa vital terganggu → disfungsi kompensasi. Tiga abnormal → cardiopulmonary failure.',
    source: 'Pediatric Emergency Assessment Recognition & Stabilization (PEARS), AHA',
  },
  {
    title: 'Demam pada Bayi <3 Bulan — Risiko Tinggi',
    content_snippet:
      'Demam ≥38.0°C pada bayi <3 bulan: KEGAWATAN — risiko infeksi bakteri serius (sepsis, meningitis). Jangan tunggu kultur: blood culture, urine culture (kateter), LP bila tidak ada kontraindikasi. Antibiotik empiris segera: Ampisilin + Gentamisin atau Cefotaxime. Rawat inap wajib.',
    source: 'American Academy of Pediatrics (AAP) Clinical Practice Guideline 2021',
  },
  {
    title: 'Diare Akut dengan Dehidrasi Berat — Anak',
    content_snippet:
      'Dehidrasi berat (>10%): tidak dapat minum, mata sangat cekung, turgor kulit sangat jelek, letargi/tidak sadar. Rencana C WHO: Ringer Laktat 100 mL/kgBB → 30 mL/kgBB dalam 30 menit (anak), sisanya 70 mL/kgBB dalam 2.5 jam. Evaluasi tiap jam. Bila bisa minum → ORS. Zinc 10-20 mg/hari selama 10-14 hari.',
    source: 'WHO Pocket Book of Hospital Care for Children, 2nd Edition',
  },

  // ── Psychiatric Emergencies ────────────────────────────────────────────────
  {
    title: 'Agitasi Akut — Manajemen dan Deeskalasi',
    content_snippet:
      'Agitasi akut: verbal deeskalasi prioritas utama (nada tenang, jaga jarak aman). Bila perlu sedasi: Olanzapin 10 mg IM atau Haloperidol 5-10 mg IM ± Lorazepam 2 mg IM. Hindari kombinasi Haloperidol + Prometazin IV (risiko kematian mendadak). Singkirkan penyebab organik (hipoglikemia, keracunan, trauma kepala).',
    source: 'RANZCP Clinical Memoranda: Behavioral Emergencies 2020',
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
