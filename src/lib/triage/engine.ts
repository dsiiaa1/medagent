/**
 * MedAgent-Alpha — Triage Engine (Deterministic Rule Engine)
 *
 * Implements §4.3.1 of PRD v1.4:
 *   Step a.5 — Age routing
 *   Step b   — ESI decision tree (deterministic, no LLM)
 *   Step c   — Hard override for critical vitals
 *   Step d   — Confidence & completeness check
 *
 * Key safety principle: LLM never determines the final score.
 * LLM only extracts structured features; this engine makes the decision.
 */

import { z } from 'zod';

// ── Schemas ─────────────────────────────────────────────────────────────────

export const PatientFeaturesSchema = z.object({
  spo2:              z.number().min(0).max(100).optional(),
  systolic:          z.number().min(0).max(300).optional(),
  diastolic:         z.number().min(0).max(200).optional(),
  heart_rate:        z.number().min(0).max(300).optional(),
  respiratory_rate:  z.number().min(0).max(100).optional(),
  temperature:       z.number().min(20).max(45).optional(),
  gcs:               z.number().min(3).max(15).optional(),
});

export type PatientFeatures = z.infer<typeof PatientFeaturesSchema>;

export type AgeCategory = 'Bayi/Balita' | 'Anak-anak' | 'Dewasa' | 'Lansia';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type TriageWarna = 'Merah' | 'Kuning' | 'Hijau' | 'Hitam';

export interface TriageResult {
  /** ESI age category (internal use) */
  age_category: AgeCategory;
  /** Whether deterministic scoring applies for this age group */
  auto_scoring_eligible: boolean;
  /** ESI score 1-5, or null when not eligible / insufficient data */
  esi_score: number | null;
  /** Kode warna Kemenkes mapped from ESI score */
  triage_warna: TriageWarna | null;
  /** Whether a critical vital sign forced ESI-1 override */
  override_triggered: boolean;
  /** Data completeness / validity confidence */
  confidence: ConfidenceLevel;
  /** Additional clinical flags */
  flags: string[];
  /** Human-readable audit trail of each decision branch taken */
  reasoning: string[];
}

// ── Age category routing (§4.3.1 step a.5) ──────────────────────────────────

export function getAgeCategory(ageMonths: number): {
  category: AgeCategory;
  eligible: boolean;
} {
  if (ageMonths <= 23)   return { category: 'Bayi/Balita', eligible: true };
  if (ageMonths <= 143)  return { category: 'Anak-anak',   eligible: true };
  if (ageMonths <= 779)  return { category: 'Dewasa',       eligible: true  };
  return                        { category: 'Lansia',        eligible: true  };
}

// ── Hard override thresholds (§4.3.1 step c, adults & seniors only) ─────────

interface OverrideResult {
  triggered: boolean;
  reasons: string[];
}

function checkHardOverride(features: PatientFeatures): OverrideResult {
  const reasons: string[] = [];

  if (features.spo2       !== undefined && features.spo2 < 90)         reasons.push(`SpO2 ${features.spo2}% < 90%`);
  if (features.systolic   !== undefined && features.systolic < 90)     reasons.push(`Sistol ${features.systolic} mmHg < 90 mmHg`);
  if (features.gcs        !== undefined && features.gcs < 9)           reasons.push(`GCS ${features.gcs} < 9`);
  if (features.heart_rate !== undefined && features.heart_rate < 40)   reasons.push(`HR ${features.heart_rate} bpm < 40 bpm`);
  if (features.heart_rate !== undefined && features.heart_rate > 150)  reasons.push(`HR ${features.heart_rate} bpm > 150 bpm`);

  return { triggered: reasons.length > 0, reasons };
}

// ── ESI decision tree (§4.3.1 step b, Dewasa/Lansia only) ───────────────────
//
// ESI 5-level algorithm simplified from ESI Implementation Handbook v4:
//   Level 1: Requires immediate life-saving intervention
//   Level 2: High risk situation; severe pain/distress; confused/lethargic
//   Level 3: Stable, needs ≥2 resources
//   Level 4: Stable, needs 1 resource
//   Level 5: Stable, no resources needed
//
// NOTE: This is a best-effort approximation from vital signs alone.
// Clinical gestalt (visual assessment) cannot be captured from text/numbers.

function computeEsiScore(features: PatientFeatures, reasoning: string[]): number {
  // ── Already handled by hard override (step c); this runs only if no override ──

  // Check for respiratory distress indicators → ESI 2
  if (features.respiratory_rate !== undefined) {
    if (features.respiratory_rate > 29 || features.respiratory_rate < 8) {
      reasoning.push(`RR ${features.respiratory_rate} x/mnt (diluar batas normal 8-29) → indikasi distres napas → ESI 2`);
      return 2;
    }
  }

  // SpO2 borderline (90-94%) → ESI 2
  if (features.spo2 !== undefined && features.spo2 >= 90 && features.spo2 < 94) {
    reasoning.push(`SpO2 ${features.spo2}% (90-93%) → hipoksemia ringan-sedang → ESI 2`);
    return 2;
  }

  // Hypotension borderline (90-99 systolic) → ESI 2
  if (features.systolic !== undefined && features.systolic >= 90 && features.systolic < 100) {
    reasoning.push(`Sistol ${features.systolic} mmHg (90-99) → hipotensi ringan → ESI 2`);
    return 2;
  }

  // Severe hypertension (systolic ≥180) → ESI 2
  if (features.systolic !== undefined && features.systolic >= 180) {
    reasoning.push(`Sistol ${features.systolic} mmHg ≥ 180 → hipertensi berat/krisis → ESI 2`);
    return 2;
  }

  // Altered consciousness (GCS 9-12) → ESI 2
  if (features.gcs !== undefined && features.gcs >= 9 && features.gcs <= 12) {
    reasoning.push(`GCS ${features.gcs} (9-12) → gangguan kesadaran → ESI 2`);
    return 2;
  }

  // Tachycardia (100-150) → ESI 3
  if (features.heart_rate !== undefined && features.heart_rate >= 100 && features.heart_rate <= 150) {
    reasoning.push(`HR ${features.heart_rate} bpm (100-150) → takikardia → ESI 3`);
    return 3;
  }

  // Bradycardia (40-59) → ESI 3
  if (features.heart_rate !== undefined && features.heart_rate >= 40 && features.heart_rate < 60) {
    reasoning.push(`HR ${features.heart_rate} bpm (40-59) → bradikardia → ESI 3`);
    return 3;
  }

  // Elevated temperature (≥38.5) or hypothermia (<35) → ESI 3
  if (features.temperature !== undefined) {
    if (features.temperature >= 38.5) {
      reasoning.push(`Suhu ${features.temperature}°C ≥ 38.5 → demam tinggi → ESI 3`);
      return 3;
    }
    if (features.temperature < 35.0) {
      reasoning.push(`Suhu ${features.temperature}°C < 35 → hipotermia → ESI 3`);
      return 3;
    }
  }

  // Mild SpO2 reduction (94-95%) → ESI 3
  if (features.spo2 !== undefined && features.spo2 >= 94 && features.spo2 <= 95) {
    reasoning.push(`SpO2 ${features.spo2}% (94-95%) → desaturasi ringan → ESI 3`);
    return 3;
  }

  // Hypertension stage 2 (160-179 systolic) → ESI 3
  if (features.systolic !== undefined && features.systolic >= 160 && features.systolic < 180) {
    reasoning.push(`Sistol ${features.systolic} mmHg (160-179) → hipertensi stage 2 → ESI 3`);
    return 3;
  }

  // Normal vitals with some concern → ESI 3 (default for eligible with multiple vitals present)
  const presentVitals = Object.values(features).filter(v => v !== undefined).length;
  if (presentVitals >= 4) {
    reasoning.push('Tanda vital dalam batas normal/mendekati normal → estimasi ESI 3 (perlu asesmen sumber daya)');
    return 3;
  }

  // Minimal vitals, appears stable → ESI 4
  if (presentVitals >= 2) {
    reasoning.push('Tanda vital lengkap terbatas, tampak stabil → estimasi ESI 4');
    return 4;
  }

  reasoning.push('Data vital minimal → estimasi ESI 4 (fallback)');
  return 4;
}

// ── Pediatric ESI decision tree (§3.1 Fitur Andalan #1) ──────────────────────
//
// Lensa Triase Pediatrik: Uses age-specific thresholds (approximate ranges).
// Confidence level is strictly capped at 'medium' to indicate an assisted estimate.

function computePediatricEsiScore(features: PatientFeatures, ageMonths: number, reasoning: string[]): number {
  reasoning.push('Menggunakan Lensa Triase Pediatrik (Pediatric Assessment Triangle / Ambang Khusus)');

  // 1. Hard overrides similar to adults (GCS < 9, SpO2 < 90) -> ESI 1
  if (features.gcs !== undefined && features.gcs < 9) {
    reasoning.push(`GCS ${features.gcs} < 9 → ESI 1`);
    return 1;
  }
  if (features.spo2 !== undefined && features.spo2 < 90) {
    reasoning.push(`SpO2 ${features.spo2}% < 90% → hipoksemia berat → ESI 1`);
    return 1;
  }

  // Define age-specific thresholds
  const isBayi = ageMonths <= 11;
  const isBalita = ageMonths > 11 && ageMonths <= 35; // 1-3 yrs (up to 35 mo)

  const maxHR = isBayi ? 160 : (isBalita ? 150 : 120);
  const minHR = isBayi ? 100 : (isBalita ? 90 : 70);
  const maxRR = isBayi ? 60 : (isBalita ? 40 : 30);
  const minRR = isBayi ? 30 : (isBalita ? 24 : 18);

  // 2. Tachycardia/Bradycardia or Tachypnea
  if (features.heart_rate !== undefined) {
    if (features.heart_rate > maxHR + 20 || features.heart_rate < minHR - 20) {
      reasoning.push(`HR ${features.heart_rate} bpm (di luar rentang normal ekstrim ${minHR}-${maxHR}) → ESI 2`);
      return 2;
    }
    if (features.heart_rate > maxHR || features.heart_rate < minHR) {
      reasoning.push(`HR ${features.heart_rate} bpm (di luar rentang normal ${minHR}-${maxHR}) → ESI 3`);
      return 3;
    }
  }

  if (features.respiratory_rate !== undefined) {
    if (features.respiratory_rate > maxRR + 10 || features.respiratory_rate < minRR - 10) {
      reasoning.push(`RR ${features.respiratory_rate} x/mnt (di luar batas ekstrim ${minRR}-${maxRR}) → ESI 2`);
      return 2;
    }
    if (features.respiratory_rate > maxRR || features.respiratory_rate < minRR) {
      reasoning.push(`RR ${features.respiratory_rate} x/mnt (di atas/bawah normal ${minRR}-${maxRR}) → ESI 3`);
      return 3;
    }
  }

  // 3. Fever in infants < 3 months is a high risk -> ESI 2
  if (features.temperature !== undefined && ageMonths < 3 && features.temperature >= 38.0) {
    reasoning.push(`Suhu ${features.temperature}°C pada bayi < 3 bulan → risiko infeksi serius → ESI 2`);
    return 2;
  }

  // 4. General fever
  if (features.temperature !== undefined && features.temperature >= 38.5) {
    reasoning.push(`Suhu ${features.temperature}°C ≥ 38.5 → demam tinggi → ESI 3`);
    return 3;
  }

  const presentVitals = Object.values(features).filter(v => v !== undefined).length;
  if (presentVitals >= 3) {
    reasoning.push('Tanda vital pediatrik dalam batas normal/mendekati normal → estimasi ESI 3 (perlu observasi lanjut)');
    return 3;
  }

  reasoning.push('Data vital minimal → estimasi ESI 4 (fallback)');
  return 4;
}

// ── Confidence check (§4.3.1 step d) ────────────────────────────────────────

const REQUIRED_VITALS: (keyof PatientFeatures)[] = [
  'spo2', 'systolic', 'diastolic', 'heart_rate', 'gcs', 'respiratory_rate', 'temperature',
];

export function computeConfidence(features: PatientFeatures): {
  confidence: ConfidenceLevel;
  missingFields: string[];
} {
  const missingFields = REQUIRED_VITALS.filter(k => features[k] === undefined);
  const filledCount = REQUIRED_VITALS.length - missingFields.length;

  let confidence: ConfidenceLevel;
  if (filledCount >= 5)      confidence = 'high';
  else if (filledCount >= 3) confidence = 'medium';
  else                       confidence = 'low';

  return { confidence, missingFields };
}

// ── ESI → Kemenkes warna mapping (§7.3) ─────────────────────────────────────

export function esiToWarna(esiScore: number | null): TriageWarna | null {
  if (esiScore === null) return null;
  if (esiScore <= 2) return 'Merah';
  if (esiScore <= 3) return 'Kuning';
  return 'Hijau';
}

// ── Main evaluation function ─────────────────────────────────────────────────

export function evaluateTriage(ageMonths: number, features: PatientFeatures): TriageResult {
  const reasoning: string[] = [];
  const flags: string[] = [];

  // Validate features schema
  const parsed = PatientFeaturesSchema.safeParse(features);
  const validFeatures: PatientFeatures = parsed.success ? parsed.data : {};

  // Step a.5: Age routing
  const { category: age_category, eligible: auto_scoring_eligible } = getAgeCategory(ageMonths);
  reasoning.push(
    `Usia: ${ageMonths} bulan → Kategori: ${age_category} → Auto-scoring: ${auto_scoring_eligible ? 'YA' : 'TIDAK'}`
  );

  if (age_category === 'Lansia') {
    flags.push('gejala_atipikal');
    reasoning.push('Lansia: tambahkan flag gejala_atipikal (ambang ESI dewasa dipakai, waspada presentasi tidak khas)');
  }

  if (age_category === 'Bayi/Balita' || age_category === 'Anak-anak') {
    flags.push('pediatric_assisted');
    reasoning.push('Pediatrik: tambahkan flag pediatric_assisted (Skor merupakan estimasi berbantuan AI)');
  }

  if (!auto_scoring_eligible) {
    // This should no longer trigger unless we introduce a new age category that's ineligible
    const { confidence, missingFields } = computeConfidence(validFeatures);
    return {
      age_category,
      auto_scoring_eligible: false,
      esi_score: null,
      triage_warna: null,
      override_triggered: false,
      confidence,
      flags,
      reasoning: [
        ...reasoning,
        `Kategori usia di luar cakupan skor otomatis MVP — perlu penilaian langsung`,
        missingFields.length > 0 ? `Field vital kosong: ${missingFields.join(', ')}` : 'Semua field vital terisi',
      ],
    };
  }

  // Step d: Confidence check (do this before scoring)
  let { confidence, missingFields } = computeConfidence(validFeatures);
  
  // Pediatric cap
  if (flags.includes('pediatric_assisted') && confidence === 'high') {
    confidence = 'medium';
    reasoning.push('Confidence di-cap ke "medium" karena ini adalah kasus pediatrik (skor berbantuan)');
  }

  if (missingFields.length > 0) {
    reasoning.push(`Field vital tidak tersedia: ${missingFields.join(', ')}`);
  }
  reasoning.push(`Confidence: ${confidence} (${REQUIRED_VITALS.length - missingFields.length}/${REQUIRED_VITALS.length} field vital terisi)`);

  // Step c: Hard override (Adults & Seniors only)
  if (!flags.includes('pediatric_assisted')) {
    const override = checkHardOverride(validFeatures);
    if (override.triggered) {
      reasoning.push(`HARD OVERRIDE TRIGGERED: ${override.reasons.join('; ')} → PAKSA ESI-1`);
      return {
        age_category,
        auto_scoring_eligible: true,
        esi_score: 1,
        triage_warna: 'Merah',
        override_triggered: true,
        confidence,
        flags,
        reasoning,
      };
    }
  }

  // If confidence is low, don't auto-score
  if (confidence === 'low') {
    reasoning.push('Confidence rendah (< 3 field vital tersedia) → skor otomatis tidak dihasilkan, perlu review manual');
    return {
      age_category,
      auto_scoring_eligible: true,
      esi_score: null,
      triage_warna: null,
      override_triggered: false,
      confidence: 'low',
      flags,
      reasoning,
    };
  }

  // Step b: Deterministic ESI scoring
  reasoning.push('--- Mulai perhitungan ESI ---');
  let esiScore: number;
  if (flags.includes('pediatric_assisted')) {
    esiScore = computePediatricEsiScore(validFeatures, ageMonths, reasoning);
  } else {
    esiScore = computeEsiScore(validFeatures, reasoning);
  }
  
  const triageWarna = esiToWarna(esiScore);

  reasoning.push(`Skor ESI final: ${esiScore} → Warna Kemenkes: ${triageWarna}`);

  return {
    age_category,
    auto_scoring_eligible: true,
    esi_score: esiScore,
    triage_warna: triageWarna,
    override_triggered: false,
    confidence,
    flags,
    reasoning,
  };
}
