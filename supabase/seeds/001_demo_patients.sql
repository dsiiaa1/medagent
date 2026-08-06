-- =============================================================================
-- MedAgent-Alpha — Seed Data: Skenario Pasien Sintetis
-- =============================================================================
-- Data pasien FIKTIF untuk demo & testing. Tidak ada data pasien asli.
-- Sesuai aturan kompetisi BISA AI NAIC 2026 (larangan data asli).
--
-- Cara pakai:
--   1. Jalankan 001_initial_schema.sql terlebih dahulu
--   2. Jalankan file ini di Supabase SQL Editor
-- =============================================================================

-- Bersihkan data lama (untuk re-seed bersih)
truncate table public.case_trace cascade;
truncate table public.cases cascade;

-- ── Insert Skenario Pasien ────────────────────────────────────────────────────

insert into public.cases (
  nama, age_value, age_unit, age_months, jenis_kelamin,
  keluhan_utama, vital_signs, riwayat_medis,
  current_node, age_category, auto_scoring_eligible,
  esi_score, triage_warna, override_triggered, confidence_level,
  triage_flags, drug_interactions, rag_references, soap_summary,
  verification_status
) values

-- ── ESI-1: MERAH (Override Kritis — SpO2 Sangat Rendah) ──────────────────────
(
  'Pasien Demo 01', 68, 'Tahun', 816, 'Laki-laki',
  'Sesak napas berat, tidak bisa berbicara penuh kalimat, sianosis',
  '{"spo2": 82, "systolic": 88, "diastolic": 60, "heart_rate": 130, "respiratory_rate": 32, "temperature": 37.2, "gcs": 13}'::jsonb,
  '{"kondisi_kronis": ["PPOK", "Hipertensi"], "alergi": [], "obat_dikonsumsi": ["Salbutamol", "Amlodipine"]}'::jsonb,
  'completed', 'lansia', true,
  1, 'Merah', true, 'high',
  ARRAY['gejala_atipikal'],
  '[{"drug_a": "Salbutamol", "drug_b": "Amlodipine", "severity": "ringan", "description": "Kombinasi ini dapat menyebabkan takikardia ringan. Monitor HR secara ketat."}]'::jsonb,
  '[{"title": "ESI Handbook v4 — Respiratory Distress", "content_snippet": "Pasien dengan SpO2 < 90% dan penggunaan otot napas bantu memenuhi kriteria ESI-1.", "source": "ESI Handbook v4"}]'::jsonb,
  '{"subjective": "Pasien mengeluhkan sesak napas berat sejak 2 jam lalu, semakin memburuk. Riwayat PPOK.", "objective": "SpO2 82%, TD 88/60, HR 130 bpm, RR 32x/mnt, sianosis perifer terlihat.", "assessment": "Eksaserbasi PPOK berat dengan gagal napas hipoksemik. ESI-1 dengan override vital kritis.", "plan": "Oksigenasi segera (masker non-rebreather), akses IV 2 jalur, nebulisasi salbutamol, pertimbangkan NIV."}'::jsonb,
  'approved'
),

-- ── ESI-1: MERAH (GCS Menurun Drastis) ───────────────────────────────────────
(
  'Pasien Demo 02', 45, 'Tahun', 540, 'Perempuan',
  'Penurunan kesadaran mendadak, ditemukan tidak sadar di rumah',
  '{"spo2": 91, "systolic": 200, "diastolic": 120, "heart_rate": 95, "respiratory_rate": 18, "temperature": 36.8, "gcs": 6}'::jsonb,
  '{"kondisi_kronis": ["Hipertensi", "DM Tipe 2"], "alergi": ["Penisilin"], "obat_dikonsumsi": ["Metformin", "Captopril", "Aspirin"]}'::jsonb,
  'completed', 'dewasa', true,
  1, 'Merah', true, 'high',
  ARRAY[]::text[],
  '[{"drug_a": "Aspirin", "drug_b": "Captopril", "severity": "ringan", "description": "Aspirin dapat sedikit mengurangi efek antihipertensi Captopril. Pantau tekanan darah."}]'::jsonb,
  '[{"title": "Permenkes 47/2018 — Tatalaksana Kegawatan Neurologis", "content_snippet": "GCS < 9 memerlukan penanganan airway segera dan evaluasi neurologis cepat.", "source": "Permenkes 47/2018"}]'::jsonb,
  '{"subjective": "Pasien perempuan 45 tahun dengan riwayat hipertensi dan DM, ditemukan tidak sadar oleh keluarga.", "objective": "GCS 6, TD 200/120 mmHg, HR 95 bpm, SpO2 91%.", "assessment": "Kemungkinan CVA hemoragik. ESI-1 karena GCS < 9 (hard override aktif).", "plan": "Lindungi airway, posisi kepala 30°, IV akses, CT Scan kepala segera, konsul neurologi."}'::jsonb,
  'approved'
),

-- ── ESI-2: MERAH (Nyeri Dada Akut) ───────────────────────────────────────────
(
  'Pasien Demo 03', 55, 'Tahun', 660, 'Laki-laki',
  'Nyeri dada seperti tertekan, menjalar ke lengan kiri, berkeringat dingin sejak 1 jam lalu',
  '{"spo2": 95, "systolic": 140, "diastolic": 90, "heart_rate": 110, "respiratory_rate": 22, "temperature": 36.5, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": ["DM Tipe 2", "Dislipidemia"], "alergi": [], "obat_dikonsumsi": ["Simvastatin", "Metformin"]}'::jsonb,
  'await_doctor_verification', 'dewasa', true,
  2, 'Merah', false, 'high',
  ARRAY[]::text[],
  '[]'::jsonb,
  '[{"title": "Pedoman Tatalaksana ACS — PERKI 2022", "content_snippet": "Nyeri dada tipikal dengan faktor risiko kardiovaskular harus dievaluasi sebagai ACS sampai terbukti sebaliknya.", "source": "PERKI 2022"}]'::jsonb,
  '{"subjective": "Nyeri dada seperti tertekan menjalar ke lengan kiri, berkeringat dingin. Onset 1 jam. Riwayat DM dan dislipidemia.", "objective": "SpO2 95%, TD 140/90, HR 110 bpm, RR 22x/mnt, pasien tampak gelisah.", "assessment": "Suspek STEMI / NSTEMI. Diperlukan EKG 12 lead dan troponin segera.", "plan": "EKG 12 lead segera, aspirasi 325 mg stat, IV akses, monitor jantung, konsul kardiologi."}'::jsonb,
  'pending'
),

-- ── ESI-2: KUNING (Reaksi Alergi Berat — Suspek Anafilaksis) ─────────────────
(
  'Pasien Demo 04', 28, 'Tahun', 336, 'Perempuan',
  'Gatal-gatal seluruh tubuh, bengkak bibir dan tenggorokan terasa mengganjal setelah makan udang',
  '{"spo2": 96, "systolic": 95, "diastolic": 60, "heart_rate": 118, "respiratory_rate": 24, "temperature": 37.0, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": [], "alergi": ["Seafood", "Penisilin"], "obat_dikonsumsi": []}'::jsonb,
  'completed', 'dewasa', true,
  2, 'Merah', true, 'high',
  ARRAY[]::text[],
  '[]'::jsonb,
  '[{"title": "ESI Handbook v4 — Allergic Reaction", "content_snippet": "Anafilaksis dengan keterlibatan airway dikategorikan ESI-1. Hipotensi tanpa stridor dapat dikategorikan ESI-2.", "source": "ESI Handbook v4"}]'::jsonb,
  '{"subjective": "Pasien 28 tahun datang dengan urtikaria dan angioedema bibir setelah konsumsi udang. Riwayat alergi seafood.", "objective": "SpO2 96%, TD 95/60, HR 118 bpm, urtikaria generalisata, edema bibir terlihat.", "assessment": "Suspek anafilaksis derajat sedang-berat. Sistol < 90 memicu override ESI-1/2.", "plan": "Epinefrin IM 0.5 mg segera, IV akses, cairan RL, difenhidramin, monitor ketat."}'::jsonb,
  'edited'
),

-- ── ESI-3: KUNING (Infeksi Saluran Kemih Atas) ───────────────────────────────
(
  'Pasien Demo 05', 32, 'Tahun', 384, 'Perempuan',
  'Demam tinggi, nyeri pinggang kanan, mual, BAK terasa panas',
  '{"spo2": 98, "systolic": 110, "diastolic": 70, "heart_rate": 98, "respiratory_rate": 18, "temperature": 38.9, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": ["ISK berulang"], "alergi": ["Sulfa"], "obat_dikonsumsi": []}'::jsonb,
  'completed', 'dewasa', true,
  3, 'Kuning', false, 'high',
  ARRAY[]::text[],
  '[]'::jsonb,
  '[{"title": "Panduan ISK — PDUI 2021", "content_snippet": "Pielonefritis akut dengan demam > 38.5°C memerlukan antibiotik IV dan observasi minimal 24 jam.", "source": "PDUI 2021"}]'::jsonb,
  '{"subjective": "Demam 38.9°C sejak kemarin, nyeri CVA kanan, mual. Riwayat ISK berulang. Alergi Sulfa.", "objective": "SpO2 98%, TD 110/70, HR 98 bpm, nyeri ketok CVA kanan (+).", "assessment": "Pielonefritis akut. ESI-3 karena butuh minimal 2 pemeriksaan penunjang (urinalisis, kultur, USG).", "plan": "Urinalisis dan kultur urin, cek darah lengkap dan CRP, IV akses, antibiotik empiris (hindari Sulfa)."}'::jsonb,
  'approved'
),

-- ── ESI-3: KUNING (Interaksi Obat Berat Ditemukan) ───────────────────────────
(
  'Pasien Demo 06', 72, 'Tahun', 864, 'Laki-laki',
  'Nyeri lutut kanan memberat, sulit berjalan, datang untuk konsultasi obat rutin',
  '{"spo2": 97, "systolic": 135, "diastolic": 85, "heart_rate": 78, "respiratory_rate": 16, "temperature": 36.5, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": ["Gout", "Hipertensi", "AF (Fibrilasi Atrial)"], "alergi": [], "obat_dikonsumsi": ["Warfarin", "Aspirin", "Allopurinol", "Amlodipine"]}'::jsonb,
  'completed', 'lansia', true,
  3, 'Kuning', false, 'medium',
  ARRAY['gejala_atipikal'],
  '[{"drug_a": "Warfarin", "drug_b": "Aspirin", "severity": "berat", "description": "Kombinasi Warfarin + Aspirin meningkatkan risiko perdarahan mayor secara signifikan. Pantau INR dan tanda perdarahan."},{"drug_a": "Allopurinol", "drug_b": "Warfarin", "severity": "sedang", "description": "Allopurinol dapat meningkatkan efek antikoagulan Warfarin. Cek INR lebih sering."}]'::jsonb,
  '[{"title": "Formularium Nasional 2023 — Interaksi Antikoagulan", "content_snippet": "Pasien dengan AF yang menggunakan Warfarin tidak dianjurkan menggunakan Aspirin secara bersamaan kecuali ada indikasi spesifik.", "source": "Formularium Nasional 2023"}]'::jsonb,
  '{"subjective": "Lansia 72 tahun dengan AF, gout, dan hipertensi. Nyeri lutut kanan memberat. Konsumsi Warfarin + Aspirin + Allopurinol.", "objective": "SpO2 97%, TD 135/85, vital stabil. Ditemukan interaksi obat berat Warfarin-Aspirin.", "assessment": "Eksaserbasi gout akut. Perhatian utama: interaksi Warfarin-Aspirin risiko perdarahan mayor.", "plan": "Cek INR hari ini, edukasi risiko perdarahan, pertimbangkan penghentian Aspirin dengan konsultasi kardiolog, kompres dingin lutut, kolkisin (hati-hati dengan Warfarin)."}'::jsonb,
  'approved'
),

-- ── ESI-4: HIJAU (Laserasi Ringan) ───────────────────────────────────────────
(
  'Pasien Demo 07', 24, 'Tahun', 288, 'Laki-laki',
  'Luka robek di telapak tangan kiri akibat terkena pecahan kaca, perdarahan sudah berhenti',
  '{"spo2": 99, "systolic": 120, "diastolic": 78, "heart_rate": 82, "respiratory_rate": 16, "temperature": 36.7, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": [], "alergi": [], "obat_dikonsumsi": []}'::jsonb,
  'completed', 'dewasa', true,
  4, 'Hijau', false, 'high',
  ARRAY[]::text[],
  '[]'::jsonb,
  '[]'::jsonb,
  '{"subjective": "Luka robek telapak tangan kiri terkena pecahan kaca ± 2 jam lalu. Perdarahan sudah berhenti.", "objective": "Vital stabil. Laserasi 3 cm telapak tangan kiri, tepi rata, tidak ada cedera tendon/saraf.", "assessment": "Laserasi ringan. ESI-4 — butuh 1 intervensi (hecting).", "plan": "Irigasi luka dengan NaCl, hecting 3-0 nylon, antibiotik profilaksis 5 hari, imunisasi tetanus bila perlu."}'::jsonb,
  'approved'
),

-- ── ESI-5: HIJAU (Keluhan Ringan) ─────────────────────────────────────────────
(
  'Pasien Demo 08', 19, 'Tahun', 228, 'Perempuan',
  'Pilek dan sakit tenggorokan sejak 2 hari, tidak ada demam, masih bisa makan minum',
  '{"spo2": 99, "systolic": 115, "diastolic": 75, "heart_rate": 76, "respiratory_rate": 15, "temperature": 36.9, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": [], "alergi": [], "obat_dikonsumsi": []}'::jsonb,
  'completed', 'dewasa', true,
  5, 'Hijau', false, 'high',
  ARRAY[]::text[],
  '[]'::jsonb,
  '[]'::jsonb,
  '{"subjective": "Pilek dan sakit tenggorokan 2 hari, tidak demam, nafsu makan baik.", "objective": "Vital stabil. Faring hiperemis ringan, tidak ada eksudat.", "assessment": "ISPA atas ringan (faringitis viral kemungkinan). ESI-5.", "plan": "Istirahat cukup, minum air hangat, parasetamol bila nyeri/demam, tidak perlu antibiotik."}'::jsonb,
  'approved'
),

-- ── Processing State (masih dalam pipeline AI) ────────────────────────────────
(
  'Pasien Demo 09', 41, 'Tahun', 492, 'Laki-laki',
  'Nyeri perut kanan bawah, mual, demam ringan sejak pagi',
  '{"spo2": 97, "systolic": 125, "diastolic": 80, "heart_rate": 92, "respiratory_rate": 18, "temperature": 37.8, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": [], "alergi": ["Penisilin"], "obat_dikonsumsi": []}'::jsonb,
  'urgency_scoring', 'dewasa', true,
  null, null, false, null,
  ARRAY[]::text[],
  '[]'::jsonb,
  '[]'::jsonb,
  null,
  'pending'
),

-- ── Error State (untuk testing error handling) ────────────────────────────────
(
  'Pasien Demo 10', 33, 'Tahun', 396, 'Perempuan',
  'Pusing berputar hebat, mual muntah',
  '{"spo2": 98, "systolic": 118, "diastolic": 76, "heart_rate": 86, "respiratory_rate": 17, "temperature": 36.6, "gcs": 15}'::jsonb,
  '{"kondisi_kronis": ["Vertigo"], "alergi": [], "obat_dikonsumsi": ["Betahistine"]}'::jsonb,
  'error', 'dewasa', true,
  null, null, false, null,
  ARRAY[]::text[],
  '[]'::jsonb,
  '[]'::jsonb,
  null,
  'pending'
);

-- Update error message untuk pasien demo error
update public.cases
set error_message = 'LLM API timeout setelah 3x retry. Gunakan penilaian manual.'
where nama = 'Pasien Demo 10';

-- ── Insert Reasoning Trace untuk kasus yang sudah completed ───────────────────

-- Trace untuk Pasien Demo 01 (ESI-1, PPOK)
insert into public.case_trace (case_id, node_name, status, details, created_at) values
(
  (select id from public.cases where nama = 'Pasien Demo 01'),
  'intake', 'completed',
  '{"message": "Data pasien berhasil disimpan", "age_category": "lansia", "auto_scoring_eligible": true}'::jsonb,
  now() - interval '10 minutes'
),
(
  (select id from public.cases where nama = 'Pasien Demo 01'),
  'retrieve_context', 'completed',
  '{"sources": ["ESI Handbook v4", "Permenkes 47/2018"], "chunks_retrieved": 3}'::jsonb,
  now() - interval '9 minutes'
),
(
  (select id from public.cases where nama = 'Pasien Demo 01'),
  'urgency_scoring', 'completed',
  '{"esi_score": 1, "triage_warna": "Merah", "override_triggered": true, "reasoning_preview": ["SpO2 82% < 90% → PAKSA ESI-1 (Hard Override)", "Sistol 88 mmHg < 90 mmHg → konfirmasi ESI-1", "HR 130 bpm > 150 bpm belum terpenuhi, tidak berkontribusi"]}'::jsonb,
  now() - interval '8 minutes'
),
(
  (select id from public.cases where nama = 'Pasien Demo 01'),
  'drug_interaction_check', 'completed',
  '{"drugs_checked": ["Salbutamol", "Amlodipine"], "interactions_found": 1}'::jsonb,
  now() - interval '8 minutes'
),
(
  (select id from public.cases where nama = 'Pasien Demo 01'),
  'generate_soap', 'completed',
  '{"sections": ["subjective", "objective", "assessment", "plan"]}'::jsonb,
  now() - interval '7 minutes'
),
(
  (select id from public.cases where nama = 'Pasien Demo 01'),
  'await_doctor_verification', 'completed',
  '{"verified_by": "dr. Ayu", "verification_status": "approved"}'::jsonb,
  now() - interval '6 minutes'
);

-- Trace untuk Pasien Demo 09 (masih processing)
insert into public.case_trace (case_id, node_name, status, details, created_at) values
(
  (select id from public.cases where nama = 'Pasien Demo 09'),
  'intake', 'completed',
  '{"message": "Data pasien berhasil disimpan", "age_category": "dewasa", "auto_scoring_eligible": true}'::jsonb,
  now() - interval '1 minute'
),
(
  (select id from public.cases where nama = 'Pasien Demo 09'),
  'retrieve_context', 'completed',
  '{"sources": ["Panduan Apendisitis — IKABI 2020"], "chunks_retrieved": 2}'::jsonb,
  now() - interval '30 seconds'
),
(
  (select id from public.cases where nama = 'Pasien Demo 09'),
  'urgency_scoring', 'started',
  '{"message": "Menghitung skor urgensi ESI..."}'::jsonb,
  now() - interval '5 seconds'
);

-- Trace untuk Pasien Demo 10 (error)
insert into public.case_trace (case_id, node_name, status, details, created_at) values
(
  (select id from public.cases where nama = 'Pasien Demo 10'),
  'intake', 'completed',
  '{"message": "Data pasien berhasil disimpan"}'::jsonb,
  now() - interval '5 minutes'
),
(
  (select id from public.cases where nama = 'Pasien Demo 10'),
  'retrieve_context', 'failed',
  '{"error": "LLM API timeout setelah 3x retry", "retries": 3}'::jsonb,
  now() - interval '4 minutes'
);
