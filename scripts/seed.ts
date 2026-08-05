/**
 * MedAgent-Alpha — Seed Script
 *
 * Populates Supabase with 18 synthetic patient cases covering the full
 * spectrum of ESI 1–5, all age categories, and various drug interaction scenarios.
 *
 * Run: npx tsx scripts/seed.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ── Synthetic patient scenarios ───────────────────────────────────────────────
// Covers: ESI 1-5, all age categories, drug interactions, pediatric/elderly edge cases

const PATIENTS = [
  // ── KRITIS (ESI 1 — override) ──────────────────────────────────────────────
  {
    nama: 'Bapak Sudirman',
    age_value: 58, age_unit: 'Tahun', age_months: 58 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Nyeri dada kiri hebat menjalar ke lengan kiri sejak 45 menit lalu, disertai keringat dingin dan sesak napas.',
    vital_signs: { spo2: 84, systolic: 85, diastolic: 60, heart_rate: 118, respiratory_rate: 28, temperature: 36.5, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: ['Hipertensi', 'Diabetes Mellitus tipe 2'],
      alergi: [],
      obat_dikonsumsi: ['Metformin 500mg', 'Amlodipine 5mg', 'Aspirin 100mg'],
    },
  },
  {
    nama: 'Ibu Sari Dewi',
    age_value: 42, age_unit: 'Tahun', age_months: 42 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Tidak sadar tiba-tiba saat di tempat kerja, ditemukan oleh rekan.',
    vital_signs: { spo2: 88, systolic: 70, diastolic: 50, heart_rate: 38, respiratory_rate: 8, temperature: 35.2, gcs: 6 },
    riwayat_medis: {
      kondisi_kronis: ['Epilepsi'],
      alergi: ['Penisilin'],
      obat_dikonsumsi: ['Phenytoin 300mg'],
    },
  },
  {
    nama: 'Tn. Ahmad Fauzi',
    age_value: 67, age_unit: 'Tahun', age_months: 67 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Sesak napas mendadak, bibir kebiruan, tidak bisa bicara kalimat penuh.',
    vital_signs: { spo2: 79, systolic: 160, diastolic: 100, heart_rate: 158, respiratory_rate: 36, temperature: 37.8, gcs: 13 },
    riwayat_medis: {
      kondisi_kronis: ['PPOK', 'Gagal Jantung Kongestif'],
      alergi: [],
      obat_dikonsumsi: ['Furosemid 40mg', 'Digoksin 0.25mg', 'Amiodaron 200mg'],
    },
  },

  // ── BERISIKO TINGGI (ESI 2) ────────────────────────────────────────────────
  {
    nama: 'Nn. Ratna Sari',
    age_value: 29, age_unit: 'Tahun', age_months: 29 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Nyeri kepala sangat hebat (10/10), onset mendadak seperti "petir", mual muntah.',
    vital_signs: { spo2: 96, systolic: 192, diastolic: 118, heart_rate: 102, respiratory_rate: 22, temperature: 37.1, gcs: 14 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: ['Ibuprofen'],
      obat_dikonsumsi: [],
    },
  },
  {
    nama: 'Tn. Hendra Wijaya',
    age_value: 55, age_unit: 'Tahun', age_months: 55 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Bicara pelo mendadak, tangan kanan lemah sejak 1 jam lalu. Wajah tampak mencong ke kiri.',
    vital_signs: { spo2: 95, systolic: 178, diastolic: 106, heart_rate: 88, respiratory_rate: 18, temperature: 37.3, gcs: 13 },
    riwayat_medis: {
      kondisi_kronis: ['Hipertensi', 'Fibrilasi Atrium'],
      alergi: [],
      obat_dikonsumsi: ['Warfarin 3mg', 'Metoprolol 50mg', 'Aspirin 100mg'],
    },
  },
  {
    nama: 'Ibu Wulandari',
    age_value: 71, age_unit: 'Tahun', age_months: 71 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Demam 3 hari, mengigau sejak tadi malam, tidak mau makan minum.',
    vital_signs: { spo2: 93, systolic: 98, diastolic: 62, heart_rate: 116, respiratory_rate: 24, temperature: 39.8, gcs: 11 },
    riwayat_medis: {
      kondisi_kronis: ['Diabetes Mellitus tipe 2', 'Gagal Ginjal Kronik stadium 3'],
      alergi: [],
      obat_dikonsumsi: ['Metformin 1000mg', 'Insulin Novorapid'],
    },
  },

  // ── URGENT (ESI 3) ─────────────────────────────────────────────────────────
  {
    nama: 'Tn. Bambang Sutrisno',
    age_value: 45, age_unit: 'Tahun', age_months: 45 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Nyeri perut kanan bawah sejak kemarin, bertambah parah, demam ringan.',
    vital_signs: { spo2: 97, systolic: 128, diastolic: 82, heart_rate: 108, respiratory_rate: 20, temperature: 38.7, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: [],
      obat_dikonsumsi: ['Ketorolac 30mg', 'Ciprofloxacin 500mg'],
    },
  },
  {
    nama: 'Ny. Fitria Handayani',
    age_value: 33, age_unit: 'Tahun', age_months: 33 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Gula darah 38 mg/dL, pasien lemas tidak bisa berdiri, sudah minum jus tapi tidak membaik.',
    vital_signs: { spo2: 97, systolic: 110, diastolic: 70, heart_rate: 105, respiratory_rate: 18, temperature: 36.9, gcs: 13 },
    riwayat_medis: {
      kondisi_kronis: ['Diabetes Mellitus tipe 1'],
      alergi: [],
      obat_dikonsumsi: ['Insulin Lantus 20 unit', 'Insulin Novorapid 8 unit'],
    },
  },
  {
    nama: 'Tn. Dodi Prasetyo',
    age_value: 38, age_unit: 'Tahun', age_months: 38 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Nyeri dada kanan saat menarik napas, demam, batuk produktif 5 hari.',
    vital_signs: { spo2: 94, systolic: 122, diastolic: 78, heart_rate: 96, respiratory_rate: 24, temperature: 38.9, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: [],
      obat_dikonsumsi: ['Amoksisilin 500mg'],
    },
  },
  {
    nama: 'Ny. Endang Sulistyowati',
    age_value: 62, age_unit: 'Tahun', age_months: 62 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Nyeri lutut kiri tiba-tiba bengkak kemerahan, tidak bisa jalan.',
    vital_signs: { spo2: 98, systolic: 148, diastolic: 92, heart_rate: 88, respiratory_rate: 18, temperature: 38.1, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: ['Hipertensi', 'Gout'],
      alergi: [],
      obat_dikonsumsi: ['Amlodipine 10mg', 'Simvastatin 20mg', 'Allopurinol 300mg'],
    },
  },

  // ── TIDAK DARURAT (ESI 4) ─────────────────────────────────────────────────
  {
    nama: 'Tn. Rudi Hartono',
    age_value: 27, age_unit: 'Tahun', age_months: 27 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Luka laserasi di telapak tangan kanan akibat terkena kaca, perdarahan sudah berhenti.',
    vital_signs: { spo2: 99, systolic: 118, diastolic: 76, heart_rate: 82, respiratory_rate: 16, temperature: 36.8, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: [],
      obat_dikonsumsi: [],
    },
  },
  {
    nama: 'Ny. Dewi Kusuma',
    age_value: 24, age_unit: 'Tahun', age_months: 24 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Nyeri saat buang air kecil, BAK sering, urin berbau tidak sedap sejak 2 hari.',
    vital_signs: { spo2: 98, systolic: 112, diastolic: 72, heart_rate: 78, respiratory_rate: 16, temperature: 37.5, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: ['Sulfa'],
      obat_dikonsumsi: [],
    },
  },

  // ── MINOR (ESI 5) ─────────────────────────────────────────────────────────
  {
    nama: 'Tn. Agus Setiawan',
    age_value: 32, age_unit: 'Tahun', age_months: 32 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Mata kanan merah dan gatal sejak kemarin, tidak ada gangguan penglihatan.',
    vital_signs: { spo2: 99, systolic: 120, diastolic: 78, heart_rate: 74, respiratory_rate: 14, temperature: 36.6, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: [],
      obat_dikonsumsi: [],
    },
  },

  // ── PEDIATRIK — auto_scoring_eligible=false ───────────────────────────────
  {
    nama: 'Adik Rizky (anak)',
    age_value: 5, age_unit: 'Tahun', age_months: 60,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Demam tinggi 39.5°C, kejang 1x durasi 3 menit sudah berhenti, anak lemas.',
    vital_signs: { spo2: 96, systolic: 92, diastolic: 60, heart_rate: 140, respiratory_rate: 28, temperature: 39.6, gcs: 14 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: [],
      obat_dikonsumsi: [],
    },
  },
  {
    nama: 'Bayi Aulia',
    age_value: 8, age_unit: 'Bulan', age_months: 8,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Diare cair 10x/hari, muntah 3x, anak tampak lemas dan mata cekung.',
    vital_signs: { spo2: 97, systolic: 80, diastolic: 50, heart_rate: 160, respiratory_rate: 42, temperature: 38.2, gcs: 14 },
    riwayat_medis: {
      kondisi_kronis: [],
      alergi: [],
      obat_dikonsumsi: [],
    },
  },

  // ── INTERAKSI OBAT BERAT — demo multi-agent ───────────────────────────────
  {
    nama: 'Tn. Sukarno Budi',
    age_value: 61, age_unit: 'Tahun', age_months: 61 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Nyeri ulu hati berat, muntah darah sedikit, kulit terasa lebam-lebam.',
    vital_signs: { spo2: 96, systolic: 130, diastolic: 85, heart_rate: 95, respiratory_rate: 20, temperature: 37.0, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: ['Fibrilasi Atrium', 'Hipertensi'],
      alergi: [],
      obat_dikonsumsi: ['Warfarin 5mg', 'Aspirin 100mg', 'Ibuprofen 400mg'],
    },
  },
  {
    nama: 'Ny. Halimah Putri',
    age_value: 49, age_unit: 'Tahun', age_months: 49 * 12,
    jenis_kelamin: 'Perempuan',
    keluhan_utama: 'Jantung berdebar-debar, penglihatan kuning-kuning, mual sejak 2 hari.',
    vital_signs: { spo2: 97, systolic: 118, diastolic: 74, heart_rate: 44, respiratory_rate: 18, temperature: 36.9, gcs: 15 },
    riwayat_medis: {
      kondisi_kronis: ['Gagal Jantung', 'Aritmia'],
      alergi: [],
      obat_dikonsumsi: ['Digoksin 0.25mg', 'Amiodaron 200mg', 'Furosemid 40mg'],
    },
  },
  {
    nama: 'Tn. Prayoga Santoso',
    age_value: 35, age_unit: 'Tahun', age_months: 35 * 12,
    jenis_kelamin: 'Laki-laki',
    keluhan_utama: 'Agitasi, demam, otot kaku, berkeringat hebat setelah minum obat baru dari dokter lain.',
    vital_signs: { spo2: 96, systolic: 145, diastolic: 92, heart_rate: 132, respiratory_rate: 22, temperature: 39.2, gcs: 14 },
    riwayat_medis: {
      kondisi_kronis: ['Depresi Mayor'],
      alergi: [],
      obat_dikonsumsi: ['Fluoxetine 20mg', 'Tramadol 50mg'],
    },
  },
];

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  console.log(`🌱 Seeding ${PATIENTS.length} synthetic patients...\n`);

  // Clear existing seed data (optional — remove if you want to append)
  const { error: deleteErr } = await supabase
    .from('cases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (deleteErr) {
    console.warn('⚠️  Could not clear existing cases:', deleteErr.message);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const patient of PATIENTS) {
    const { data, error } = await supabase
      .from('cases')
      .insert({
        nama:          patient.nama,
        age_value:     patient.age_value,
        age_unit:      patient.age_unit,
        age_months:    patient.age_months,
        jenis_kelamin: patient.jenis_kelamin,
        keluhan_utama: patient.keluhan_utama,
        vital_signs:   patient.vital_signs,
        riwayat_medis: patient.riwayat_medis,
        current_node:  'intake',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error(`  ❌ ${patient.nama}: ${error?.message}`);
      errorCount++;
      continue;
    }

    console.log(`  ✅ ${patient.nama} (${patient.age_value} ${patient.age_unit}) → ${data.id}`);
    successCount++;

    // Trigger orchestrator for each case via local API
    // (only works if the dev server is running at localhost:3000)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/process-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: data.id }),
      });
      if (res.status === 202) {
        console.log(`     🤖 Orchestrator triggered`);
      } else {
        console.warn(`     ⚠️  Orchestrator returned ${res.status} (server may not be running)`);
      }
    } catch {
      console.warn(`     ⚠️  Could not trigger orchestrator (start dev server to process)`);
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅ Done: ${successCount} inserted, ${errorCount} failed`);
  console.log('\n💡 If orchestrator was not triggered, start the dev server and run:');
  console.log('   npx tsx scripts/seed.ts');
  console.log('   or visit /dashboard and trigger manually via POST /api/process-case\n');
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
