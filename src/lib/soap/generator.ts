/**
 * MedAgent-Alpha — SOAP Generator
 *
 * Implements §4.5 of PRD v1.4.
 * Takes triage result, RAG references, drug interactions, and patient data
 * to produce a structured SOAP note via the pharma/SOAP LLM.
 *
 * In DEMO_MODE returns a deterministic template-based SOAP.
 */

import { callPharmaLLM, parseLLMJson } from '@/lib/llm';
import type { SoapSummary, VitalSigns, RiwayatMedis, DrugInteraction, RagReference } from '@/lib/supabase';
import type { TriageResult } from '@/lib/triage/engine';

// ── Template-based SOAP (used in DEMO_MODE or as fallback) ───────────────────

function buildTemplateSOAP(
  namaKeluhan: string,
  vitalSigns: VitalSigns,
  triageResult: TriageResult,
  riwayat: RiwayatMedis,
  drugInteractions: DrugInteraction[]
): SoapSummary {
  const vitalsText = [
    vitalSigns.spo2 !== undefined ? `SpO2 ${vitalSigns.spo2}%` : null,
    vitalSigns.systolic !== undefined
      ? `TD ${vitalSigns.systolic}/${vitalSigns.diastolic ?? '?'} mmHg`
      : null,
    vitalSigns.heart_rate !== undefined ? `HR ${vitalSigns.heart_rate} bpm` : null,
    vitalSigns.respiratory_rate !== undefined ? `RR ${vitalSigns.respiratory_rate} x/mnt` : null,
    vitalSigns.temperature !== undefined ? `Suhu ${vitalSigns.temperature}°C` : null,
    vitalSigns.gcs !== undefined ? `GCS ${vitalSigns.gcs}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const obatText =
    riwayat.obat_dikonsumsi && riwayat.obat_dikonsumsi.length > 0
      ? riwayat.obat_dikonsumsi.join(', ')
      : 'tidak ada';

  const kondisiText =
    riwayat.kondisi_kronis && riwayat.kondisi_kronis.length > 0
      ? riwayat.kondisi_kronis.join(', ')
      : 'tidak ada';

  const alergiText =
    riwayat.alergi && riwayat.alergi.length > 0 ? riwayat.alergi.join(', ') : 'tidak ada';

  const interaksiText =
    drugInteractions.length > 0
      ? `\n⚠️ Potensi interaksi obat terdeteksi:\n` +
        drugInteractions
          .map((i) => `  - ${i.drug_a} + ${i.drug_b} [${i.severity.toUpperCase()}]: ${i.description}`)
          .join('\n')
      : '';

  const esiText = triageResult.esi_score
    ? `ESI ${triageResult.esi_score} (${triageResult.triage_warna})`
    : `Kategori usia di luar cakupan skor otomatis — perlu penilaian langsung`;

  const assessmentBase =
    triageResult.confidence === 'low'
      ? `Data tanda vital tidak lengkap. Prioritas triase tidak dapat ditentukan secara otomatis — diperlukan penilaian klinis langsung.`
      : triageResult.esi_score === 1
      ? `Kondisi kritis mengancam jiwa. ${triageResult.override_triggered ? 'Parameter vital kritis terdeteksi (hard override aktif).' : ''} Butuh intervensi segera.`
      : triageResult.esi_score === 2
      ? `Kondisi berisiko tinggi. Pasien tidak boleh menunggu terlalu lama.`
      : `Kondisi relatif stabil, memerlukan asesmen dan tata laksana sesuai keluhan.`;

  return {
    subjective: `Pasien datang dengan keluhan: ${namaKeluhan}.\nRiwayat penyakit: ${kondisiText}.\nAlergi: ${alergiText}.\nObat yang sedang dikonsumsi: ${obatText}.`,
    objective: `Tanda vital: ${vitalsText || 'data tidak lengkap'}.\nKategori usia: ${triageResult.age_category}.\nSkor triase: ${esiText}.${triageResult.flags.includes('gejala_atipikal') ? '\n⚠️ Catatan: Pasien lansia — waspadai presentasi gejala tidak khas.' : ''}`,
    assessment: `${assessmentBase}${interaksiText}`,
    plan: buildPlanText(triageResult, drugInteractions),
  };
}

function buildPlanText(triageResult: TriageResult, drugInteractions: DrugInteraction[]): string {
  const plans: string[] = [];

  if (triageResult.esi_score === 1 || triageResult.override_triggered) {
    plans.push('1. Panggil dokter segera — kondisi mengancam jiwa.');
    plans.push('2. Pasang monitor EKG, oksimetri, dan tekanan darah kontinyu.');
    plans.push('3. Akses IV besar, siapkan resusitasi cairan/obat emergensi.');
    plans.push('4. Siapkan troli emergensi dan defibrilator.');
  } else if (triageResult.esi_score === 2) {
    plans.push('1. Prioritaskan pemeriksaan dokter segera (tidak boleh menunggu).');
    plans.push('2. Pasang akses IV, ambil darah untuk pemeriksaan laboratorium dasar.');
    plans.push('3. Monitor tanda vital tiap 15 menit.');
  } else if (triageResult.esi_score === 3) {
    plans.push('1. Pemeriksaan dokter dalam 30 menit.');
    plans.push('2. Rencanakan pemeriksaan penunjang sesuai indikasi klinis.');
    plans.push('3. Monitor tanda vital tiap 30 menit.');
  } else if (!triageResult.auto_scoring_eligible) {
    plans.push('1. Diperlukan penilaian klinis langsung oleh dokter (kategori usia di luar cakupan skor otomatis).');
    plans.push('2. Gunakan protokol triase pediatrik atau konsultasi spesialis anak sesuai kondisi.');
  } else {
    plans.push('1. Pasien dapat menunggu di ruang triase hijau.');
    plans.push('2. Pemeriksaan dokter sesuai antrean.');
    plans.push('3. Edukasi pasien untuk segera lapor bila kondisi memburuk.');
  }

  if (drugInteractions.some((i) => i.severity === 'berat')) {
    plans.push('\n⚠️ Perhatian interaksi obat berat — konfirmasi dengan apoteker klinis sebelum pemberian obat baru.');
  }

  plans.push('\n⚠️ Disclaimer: Skor ini tidak menggantikan penilaian visual langsung terhadap pasien. Verifikasi dokter wajib sebelum tindakan.');

  return plans.join('\n');
}

// ── LLM-enhanced SOAP ────────────────────────────────────────────────────────

export async function generateSOAP(params: {
  nama: string;
  keluhanUtama: string;
  vitalSigns: VitalSigns;
  ageMonths: number;
  triageResult: TriageResult;
  riwayatMedis: RiwayatMedis;
  drugInteractions: DrugInteraction[];
  ragReferences: RagReference[];
}): Promise<SoapSummary> {
  const {
    nama,
    keluhanUtama,
    vitalSigns,
    ageMonths,
    triageResult,
    riwayatMedis,
    drugInteractions,
    ragReferences,
  } = params;

  // Always start with template as fallback
  const templateSOAP = buildTemplateSOAP(
    keluhanUtama,
    vitalSigns,
    triageResult,
    riwayatMedis,
    drugInteractions
  );

  if (process.env.DEMO_MODE === 'true') {
    return templateSOAP;
  }

  // Build LLM prompt
  const refText =
    ragReferences.length > 0
      ? ragReferences.map((r) => `[${r.source}]: ${r.content_snippet}`).join('\n')
      : 'Tidak ada referensi spesifik tersedia.';

  const interaksiText =
    drugInteractions.length > 0
      ? drugInteractions
          .map(
            (i) =>
              `- ${i.drug_a} + ${i.drug_b} [${i.severity.toUpperCase()}]: ${i.description}`
          )
          .join('\n')
      : 'Tidak ada interaksi terdeteksi.';

  const prompt = `Kamu adalah dokter IGD yang membuat catatan SOAP singkat dan terstruktur untuk rekam medis.

DATA PASIEN:
- Nama: ${nama}
- Usia: ${Math.floor(ageMonths / 12)} tahun (${ageMonths} bulan), kategori: ${triageResult.age_category}
- Keluhan utama: ${keluhanUtama}
- Tanda vital: SpO2 ${vitalSigns.spo2 ?? '?'}%, TD ${vitalSigns.systolic ?? '?'}/${vitalSigns.diastolic ?? '?'} mmHg, HR ${vitalSigns.heart_rate ?? '?'} bpm, RR ${vitalSigns.respiratory_rate ?? '?'} x/mnt, Suhu ${vitalSigns.temperature ?? '?'}°C, GCS ${vitalSigns.gcs ?? '?'}
- Riwayat: ${(riwayatMedis.kondisi_kronis ?? []).join(', ') || 'tidak ada'}
- Alergi: ${(riwayatMedis.alergi ?? []).join(', ') || 'tidak ada'}
- Obat: ${(riwayatMedis.obat_dikonsumsi ?? []).join(', ') || 'tidak ada'}

HASIL TRIASE:
- Skor ESI: ${triageResult.esi_score ?? 'tidak dapat dihitung otomatis'}
- Warna: ${triageResult.triage_warna ?? 'N/A'}
- Confidence: ${triageResult.confidence}
- Override: ${triageResult.override_triggered ? 'YA — parameter vital kritis' : 'Tidak'}

INTERAKSI OBAT:
${interaksiText}

REFERENSI MEDIS RELEVAN:
${refText}

Buatkan SOAP note SINGKAT dalam Bahasa Indonesia. Sertakan disclaimer bahwa ini adalah DECISION SUPPORT, bukan pengganti penilaian dokter.
Balas HANYA dalam format JSON:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "..."
}`;

  try {
    const raw = await callPharmaLLM(
      [{ role: 'user', content: prompt }],
      { response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 800 }
    );

    const parsed = parseLLMJson<SoapSummary>(raw);
    if (
      parsed &&
      typeof parsed.subjective === 'string' &&
      typeof parsed.objective === 'string' &&
      typeof parsed.assessment === 'string' &&
      typeof parsed.plan === 'string'
    ) {
      return parsed;
    }
    return templateSOAP;
  } catch (err) {
    console.error('[SOAP] LLM generation failed, using template:', err);
    return templateSOAP;
  }
}
