-- =============================================================================
-- MedAgent-Alpha — Migration 002: RAG Knowledge Base
-- =============================================================================
-- Tabel dan fungsi untuk RAG (Retrieval-Augmented Generation).
-- Jalankan SETELAH 001_initial_schema.sql
-- =============================================================================

-- ── Fungsi: Similarity Search ─────────────────────────────────────────────────
-- Dipakai oleh src/lib/rag/retrieval.ts untuk mencari dokumen relevan.
-- Parameter:
--   query_embedding  — vektor embedding dari keluhan pasien
--   match_threshold  — batas minimum cosine similarity (0.0 – 1.0)
--   match_count      — jumlah hasil yang dikembalikan

create or replace function public.match_rag_documents (
  query_embedding  vector(1536),
  match_threshold  float default 0.7,
  match_count      int default 5
)
returns table (
  id               bigint,
  title            text,
  content          text,
  source           text,
  category         text,
  similarity       float
)
language plpgsql
as $$
begin
  return query
  select
    rd.id,
    rd.title,
    rd.content,
    rd.source,
    rd.category,
    1 - (rd.embedding <=> query_embedding) as similarity
  from public.rag_documents rd
  where 1 - (rd.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- ── Seed: Dokumen Pengetahuan Dasar ──────────────────────────────────────────
-- Ini adalah versi teks-saja (tanpa embedding).
-- Embedding harus di-generate via scripts/embed-rag-docs.ts
-- sebelum similarity search dapat berfungsi.
--
-- Sementara embedding belum di-generate, sistem menggunakan
-- fallback keyword search di src/lib/rag/retrieval.ts.

insert into public.rag_documents (title, content, source, category) values

-- ESI: Prinsip Umum
(
  'ESI — Emergency Severity Index: Prinsip Triage 5 Level',
  'Emergency Severity Index (ESI) adalah sistem triage 5 tingkat yang digunakan di unit gawat darurat. ESI-1: segera butuh tindakan penyelamatan jiwa. ESI-2: kondisi berisiko tinggi atau sangat nyeri. ESI-3: stabil tapi butuh banyak pemeriksaan. ESI-4: stabil, butuh 1 pemeriksaan. ESI-5: stabil, tidak butuh pemeriksaan. Sistem ESI tidak boleh digunakan sebagai pengganti penilaian klinis langsung.',
  'ESI Handbook v4', 'triage'
),

-- ESI: Hard Override
(
  'ESI — Kriteria Hard Override (Paksa ESI-1)',
  'Beberapa kondisi vital secara otomatis memaksa skor ESI-1 tanpa memandang presentasi lain: SpO2 < 90% (hipoksemia berat), Tekanan darah sistolik < 90 mmHg (hipotensi/syok), GCS < 9 (penurunan kesadaran berat), Heart rate < 40 bpm (bradikardia ekstrem) atau > 150 bpm (takikardia ekstrem). Kondisi-kondisi ini mengindikasikan ancaman jiwa segera dan memerlukan resusitasi tanpa tunda.',
  'ESI Handbook v4', 'triage'
),

-- ESI: Triase Nyeri Dada
(
  'Evaluasi Nyeri Dada di IGD',
  'Pasien dengan nyeri dada yang tiba-tiba, menjalar, atau disertai diaforesis harus dievaluasi sebagai kondisi berisiko tinggi (minimal ESI-2) sampai terbukti sebaliknya. Prioritaskan EKG 12 lead dalam 10 menit pertama. Sindrom koroner akut (ACS) mencakup STEMI, NSTEMI, dan angina tidak stabil. Faktor risiko: hipertensi, DM, dislipidemia, merokok, riwayat keluarga.',
  'PERKI 2022 — Panduan Tatalaksana ACS', 'kardiovaskular'
),

-- Anafilaksis
(
  'Anafilaksis — Identifikasi dan Penanganan Awal',
  'Anafilaksis adalah reaksi alergi sistemik yang mengancam jiwa. Kriteria diagnosis: onset akut dengan keterlibatan kulit/mukosa + salah satu dari (gangguan napas ATAU hipotensi). Penatalaksanaan: Epinefrin IM 0.3-0.5 mg segera (paha lateral), posisi supine dengan tungkai diangkat, O2 aliran tinggi, IV akses dan cairan, difenhidramin IV. Hipotensi (sistol < 90) pada anafilaksis termasuk hard override ESI-1/2.',
  'Pedoman Anafilaksis IDAI/PERALMUNI 2022', 'alergi'
),

-- Stroke / CVA
(
  'Stroke Akut — Tanda, Waktu, dan Tindakan',
  'Kenali tanda stroke dengan FAST: Face drooping, Arm weakness, Speech difficulty, Time to call. Stroke hemoragik: onset sangat mendadak, nyeri kepala hebat seperti disambar petir, kesadaran menurun. Stroke iskemik: onset bisa bertahap, defisit fokal. GCS < 9 pada stroke adalah kriteria ESI-1 (hard override). Window periode trombolisis untuk stroke iskemik: 4.5 jam. CT Scan non-kontras adalah pemeriksaan awal pilihan.',
  'Permenkes 47/2018 — Tatalaksana Kegawatan Neurologis', 'neurologi'
),

-- Sepsis
(
  'Sepsis dan Syok Sepsis — Skrining dan Manajemen Awal',
  'Sepsis: disfungsi organ yang mengancam jiwa akibat respons tubuh terhadap infeksi. Kriteria qSOFA: RR ≥ 22, GCS < 15, sistol ≤ 100. 2 dari 3 qSOFA positif = risiko tinggi sepsis. Syok sepsis: sepsis + butuh vasopressor + laktat > 2 mmol/L. Bundles sepsis 1 jam: kultur darah, antibiotik IV broad-spectrum, cairan 30 ml/kgBB jika hipotensi. Sistol < 90 = hard override ESI-1.',
  'Surviving Sepsis Campaign 2021 (adaptasi Kemenkes)', 'infeksi'
),

-- Sesak Napas / PPOK
(
  'Sesak Napas Berat — Triage dan Evaluasi Awal',
  'Pasien dengan sesak napas berat (tidak bisa mengucapkan kalimat penuh, penggunaan otot bantu napas, sianosis) dikategorikan ESI-1 atau ESI-2. SpO2 < 90% adalah hard override ESI-1. Penyebab umum: PPOK eksaserbasi, asma akut berat, pneumonia, edema paru, pneumotoraks. Tindakan awal: posisi duduk, oksigen, akses IV. Pada PPOK, target SpO2 88-92% (bukan > 95%).',
  'ESI Handbook v4 — Respiratory Distress', 'respirasi'
),

-- Pielonefritis
(
  'Infeksi Saluran Kemih Atas (Pielonefritis Akut)',
  'Pielonefritis akut: ISK dengan keterlibatan ginjal. Gejala: demam > 38°C, nyeri ketok costovertebral angle (CVA), disuria, frekuensi berkemih. Pemeriksaan: urinalisis, kultur urin, darah lengkap, CRP. Antibiotik empiris IV pilihan: Ceftriaxone 1g/12 jam (hindari Sulfa pada pasien alergi). Indikasi rawat: demam tinggi, mual-muntah, tidak bisa minum oral. ESI biasanya 3 pada pasien hemodinamik stabil.',
  'PDUI 2021 — Panduan ISK', 'urologi'
),

-- Apendisitis
(
  'Apendisitis Akut — Evaluasi Klinis',
  'Apendisitis akut: peradangan appendiks vermiformis. Presentasi klasik: nyeri bermula periumbilikal lalu berpindah ke RLQ (McBurney), anoreksia, demam ringan, mual. Skor Alvarado membantu stratifikasi risiko. Pemeriksaan: darah lengkap (leukositosis), USG abdomen (pilihan pertama), CT Scan bila USG tidak konklusif. Nyeri RLQ dengan demam umumnya ESI-3. Perforasi: ESI-2.',
  'IKABI 2020 — Panduan Apendisitis', 'bedah'
),

-- Gout Akut
(
  'Gout Akut dan Interaksi Obat Warfarin',
  'Gout akut: artritis mikrokristal akibat deposisi urat. Presentasi: nyeri sendi mendadak (sering MTP-1), hiperemis, bengkak. Tatalaksana: kolkisin, NSAID, atau steroid. PERHATIAN PENTING: Pada pasien dengan AF yang menggunakan Warfarin, hindari NSAID (terutama Aspirin) karena meningkatkan risiko perdarahan mayor. Allopurinol dapat meningkatkan efek Warfarin — perlu pemantauan INR lebih ketat.',
  'Formularium Nasional 2023 — Reumatologi', 'reumatologi'
),

-- Pediatrik: Demam
(
  'Demam pada Anak — Triage dan Tanda Bahaya',
  'Tanda bahaya demam pada anak (segera rujuk ESI-1/2): kejang, tidak responsif, pernapasan cepat/sulit, sianosis, ruam petekie/purpura. Demam tanpa tanda bahaya: ESI-3-4 tergantung usia dan durasi. Bayi < 3 bulan dengan demam > 38°C: ESI-2 (risiko infeksi serius). Alat bantu klinis pediatrik: Pediatric Assessment Triangle (Appearance, Work of Breathing, Circulation).',
  'IDAI — Panduan Tatalaksana Demam pada Anak 2022', 'pediatri'
),

-- Interaksi Warfarin-Aspirin
(
  'Interaksi Obat Kritis: Warfarin dan Aspirin',
  'Warfarin + Aspirin: kombinasi yang meningkatkan risiko perdarahan secara signifikan (bukti level 1A). Aspirin menginhibisi tromboksan A2 dan memiliki efek antiplatelet, sementara Warfarin mencegah sintesis faktor koagulasi. Bersama-sama, risiko perdarahan GI mayor meningkat 2-3x. Kombinasi ini hanya diindikasikan pada kondisi tertentu (misal: AF + ACS pasca-stent) dengan pemantauan ketat. Pada kasus gout, gunakan kolkisin sebagai alternatif.',
  'Formularium Nasional 2023 — Interaksi Antikoagulan', 'farmakologi'
),

-- Interaksi Metformin-Kontras
(
  'Interaksi Penting: Metformin dan Media Kontras Iodine',
  'Pasien dengan DM yang menggunakan Metformin harus menghentikan obat 48 jam sebelum prosedur menggunakan media kontras iodine (CT Scan dengan kontras) karena risiko asidosis laktat akibat akumulasi Metformin saat ginjal terstress. Setelah prosedur, Metformin baru boleh dilanjutkan setelah 48 jam dan dikonfirmasi fungsi ginjal normal.',
  'Formularium Nasional 2023 — Farmakologi DM', 'farmakologi'
);

-- Buat indeks pencarian teks (sebagai fallback keyword search)
create index if not exists idx_rag_documents_title_content
  on public.rag_documents using gin (to_tsvector('indonesian', title || ' ' || content));

-- Fungsi: keyword search (fallback saat embedding belum tersedia)
create or replace function public.search_rag_documents_text (
  query_text   text,
  match_count  int default 5
)
returns table (
  id        bigint,
  title     text,
  content   text,
  source    text,
  category  text
)
language sql
as $$
  select
    id, title, content, source, category
  from public.rag_documents
  where
    to_tsvector('indonesian', title || ' ' || content) @@
    plainto_tsquery('indonesian', query_text)
  limit match_count;
$$;
