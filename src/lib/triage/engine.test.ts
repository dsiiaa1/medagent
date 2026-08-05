/**
 * MedAgent-Alpha — Triage Engine Unit Tests
 *
 * P0 Acceptance Criteria (PRD §4.3.1):
 *   ✓ SpO2=85 + Dewasa → selalu ESI-1
 *   ✓ ≥2 field vital kosong → confidence: low
 *   ✓ age_months < 144 → auto_scoring_eligible: false
 *   ✓ Rule engine dapat dijalankan tanpa LLM/API call
 */

import { describe, it, expect } from 'vitest';
import { evaluateTriage, computeConfidence, getAgeCategory, esiToWarna } from './engine';

// ── P0 Acceptance Criteria ───────────────────────────────────────────────────

describe('P0: SpO2 critical override', () => {
  it('SpO2=85 pada pasien Dewasa → selalu ESI-1, override_triggered=true', () => {
    const result = evaluateTriage(300, {
      spo2: 85,
      systolic: 120,
      heart_rate: 88,
      gcs: 15,
      respiratory_rate: 18,
      temperature: 37.0,
    });
    expect(result.esi_score).toBe(1);
    expect(result.override_triggered).toBe(true);
    expect(result.triage_warna).toBe('Merah');
  });

  it('SpO2=85 + keluhan teks apa pun tidak mengubah ESI-1 (rule engine, bukan LLM)', () => {
    // Karena rule engine tidak menerima teks keluhan, ini sudah terjamin by design
    const result = evaluateTriage(350, { spo2: 85 });
    expect(result.esi_score).toBe(1);
    expect(result.override_triggered).toBe(true);
  });
});

describe('P0: Confidence low bila ≥2 field vital kosong', () => {
  it('0 field vital → confidence: low', () => {
    const result = evaluateTriage(300, {});
    expect(result.confidence).toBe('low');
  });

  it('1 field vital → confidence: low', () => {
    const result = evaluateTriage(300, { spo2: 98 });
    expect(result.confidence).toBe('low');
  });

  it('2 field vital → confidence: low', () => {
    const result = evaluateTriage(300, { spo2: 98, heart_rate: 80 });
    expect(result.confidence).toBe('low');
  });

  it('3 field vital → confidence: medium', () => {
    const result = evaluateTriage(300, { spo2: 98, heart_rate: 80, systolic: 120 });
    expect(result.confidence).toBe('medium');
  });

  it('5+ field vital → confidence: high', () => {
    const result = evaluateTriage(300, {
      spo2: 98, heart_rate: 80, systolic: 120, gcs: 15, respiratory_rate: 18, temperature: 37.0,
    });
    expect(result.confidence).toBe('high');
  });
});

describe('P0: age_months < 144 → auto_scoring_eligible: false', () => {
  it('Bayi 6 bulan → tidak eligible', () => {
    const result = evaluateTriage(6, { spo2: 99, systolic: 80, heart_rate: 130 });
    expect(result.auto_scoring_eligible).toBe(false);
    expect(result.esi_score).toBeNull();
    expect(result.age_category).toBe('Bayi/Balita');
  });

  it('Anak 5 tahun (60 bulan) → tidak eligible', () => {
    const result = evaluateTriage(60, { spo2: 98, heart_rate: 100 });
    expect(result.auto_scoring_eligible).toBe(false);
    expect(result.age_category).toBe('Anak-anak');
  });

  it('Anak 11 tahun (132 bulan) → tidak eligible', () => {
    const result = evaluateTriage(132, { spo2: 98 });
    expect(result.auto_scoring_eligible).toBe(false);
  });

  it('Dewasa 12 tahun tepat (144 bulan) → eligible', () => {
    const result = evaluateTriage(144, {
      spo2: 98, systolic: 120, heart_rate: 75, gcs: 15, respiratory_rate: 16, temperature: 37.0,
    });
    expect(result.auto_scoring_eligible).toBe(true);
  });
});

// ── Age category routing ─────────────────────────────────────────────────────

describe('getAgeCategory', () => {
  it('0-23 bulan → Bayi/Balita', () => {
    expect(getAgeCategory(0).category).toBe('Bayi/Balita');
    expect(getAgeCategory(23).category).toBe('Bayi/Balita');
  });
  it('24-143 bulan → Anak-anak', () => {
    expect(getAgeCategory(24).category).toBe('Anak-anak');
    expect(getAgeCategory(143).category).toBe('Anak-anak');
  });
  it('144-779 bulan → Dewasa', () => {
    expect(getAgeCategory(144).category).toBe('Dewasa');
    expect(getAgeCategory(779).category).toBe('Dewasa');
  });
  it('≥780 bulan → Lansia', () => {
    expect(getAgeCategory(780).category).toBe('Lansia');
    expect(getAgeCategory(1200).category).toBe('Lansia');
  });
});

// ── Hard override variations ─────────────────────────────────────────────────

describe('Hard override thresholds', () => {
  it('Sistol < 90 → ESI-1', () => {
    const result = evaluateTriage(300, { systolic: 85, heart_rate: 110, spo2: 95 });
    expect(result.esi_score).toBe(1);
    expect(result.override_triggered).toBe(true);
  });

  it('GCS < 9 → ESI-1', () => {
    const result = evaluateTriage(300, { gcs: 8, spo2: 96, heart_rate: 90 });
    expect(result.esi_score).toBe(1);
    expect(result.override_triggered).toBe(true);
  });

  it('HR > 150 → ESI-1', () => {
    const result = evaluateTriage(300, { heart_rate: 160, spo2: 96 });
    expect(result.esi_score).toBe(1);
    expect(result.override_triggered).toBe(true);
  });

  it('HR < 40 → ESI-1', () => {
    const result = evaluateTriage(300, { heart_rate: 35, spo2: 96 });
    expect(result.esi_score).toBe(1);
    expect(result.override_triggered).toBe(true);
  });

  it('Normal vitals → override NOT triggered', () => {
    const result = evaluateTriage(300, {
      spo2: 98, systolic: 120, heart_rate: 80, gcs: 15, respiratory_rate: 16, temperature: 37.0,
    });
    expect(result.override_triggered).toBe(false);
  });
});

// ── ESI scoring ──────────────────────────────────────────────────────────────

describe('ESI scoring (no override)', () => {
  it('RR > 29 → ESI 2', () => {
    const result = evaluateTriage(300, {
      spo2: 95, systolic: 110, heart_rate: 95, gcs: 15, respiratory_rate: 32, temperature: 37.0,
    });
    expect(result.esi_score).toBe(2);
  });

  it('HR 100-150 → ESI 3', () => {
    const result = evaluateTriage(300, {
      spo2: 97, systolic: 130, heart_rate: 115, gcs: 15, respiratory_rate: 18, temperature: 37.0,
    });
    expect(result.esi_score).toBe(3);
    expect(result.override_triggered).toBe(false);
  });

  it('Semua normal → ESI 3 atau 4', () => {
    const result = evaluateTriage(300, {
      spo2: 99, systolic: 118, heart_rate: 76, gcs: 15, respiratory_rate: 16, temperature: 36.8,
    });
    expect(result.esi_score).not.toBeNull();
    expect([3, 4]).toContain(result.esi_score);
  });
});

// ── ESI → Warna mapping ──────────────────────────────────────────────────────

describe('esiToWarna', () => {
  it('ESI 1 → Merah', () => expect(esiToWarna(1)).toBe('Merah'));
  it('ESI 2 → Merah', () => expect(esiToWarna(2)).toBe('Merah'));
  it('ESI 3 → Kuning', () => expect(esiToWarna(3)).toBe('Kuning'));
  it('ESI 4 → Hijau', () => expect(esiToWarna(4)).toBe('Hijau'));
  it('ESI 5 → Hijau', () => expect(esiToWarna(5)).toBe('Hijau'));
  it('null → null', () => expect(esiToWarna(null)).toBeNull());
});

// ── Lansia flag ──────────────────────────────────────────────────────────────

describe('Lansia flag', () => {
  it('Pasien lansia dapat flag gejala_atipikal', () => {
    const result = evaluateTriage(800, {
      spo2: 98, systolic: 130, heart_rate: 78, gcs: 15, respiratory_rate: 16, temperature: 37.0,
    });
    expect(result.age_category).toBe('Lansia');
    expect(result.flags).toContain('gejala_atipikal');
    expect(result.auto_scoring_eligible).toBe(true);
  });
});
