# Supabase SQL — MedAgent-Alpha

Folder ini berisi semua file SQL untuk database Supabase proyek MedAgent-Alpha.

## Struktur Folder

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    ← Schema utama (tabel, tipe, RLS, Realtime)
│   └── 002_rag_knowledge_base.sql ← Fungsi RAG + seed dokumen pengetahuan
├── seeds/
│   └── 001_demo_patients.sql     ← 10 skenario pasien fiktif untuk demo
├── utils/
│   └── diagnostics.sql           ← Query debugging & monitoring
└── README.md                     ← File ini
```

## Cara Setup (Pertama Kali)

### 1. Buat Project Supabase
1. Buka [supabase.com](https://supabase.com) → New Project
2. Catat: **Project URL**, **Anon Key**, **Service Role Key**

### 2. Isi `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Jalankan Migrasi (Urutan Wajib)

Buka **Supabase Dashboard → SQL Editor → New Query**, lalu paste dan jalankan:

**Langkah 1:** `migrations/001_initial_schema.sql`
> Membuat semua tabel, tipe, index, RLS policy, dan Realtime publication

**Langkah 2:** `migrations/002_rag_knowledge_base.sql`
> Membuat fungsi similarity search dan mengisi dokumen pengetahuan medis dasar

**Langkah 3 (opsional):** `seeds/001_demo_patients.sql`
> Mengisi 10 skenario pasien fiktif untuk demo/testing

### 4. Aktifkan pgvector Extension
Di Supabase Dashboard → **Database → Extensions** → cari `vector` → Enable

---

## Tabel Utama

### `public.cases`
Tabel utama untuk semua kasus pasien. Setiap baris = 1 kunjungan IGD.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | Primary key (auto-generate) |
| `nama` | text | Nama/ID rekam medis pasien |
| `age_value` | integer | Nilai usia |
| `age_unit` | enum | `Tahun` atau `Bulan` |
| `age_months` | integer | Usia dalam bulan (derived) |
| `jenis_kelamin` | enum | `Laki-laki` atau `Perempuan` |
| `keluhan_utama` | text | Keluhan utama saat datang |
| `vital_signs` | jsonb | SpO2, TD, HR, RR, Suhu, GCS |
| `riwayat_medis` | jsonb | Kondisi kronis, alergi, obat |
| `waktu_masuk` | timestamptz | Waktu kunjungan |
| `current_node` | enum | Posisi di pipeline AI |
| `esi_score` | integer | Skor ESI 1-5 (null = belum diproses) |
| `triage_warna` | enum | Merah/Kuning/Hijau/Hitam |
| `override_triggered` | boolean | True jika vital kritis memicu override |
| `confidence_level` | enum | high/medium/low |
| `drug_interactions` | jsonb | Array interaksi obat ditemukan |
| `soap_summary` | jsonb | Draft SOAP dari AI |
| `verification_status` | enum | pending/approved/edited/rejected |
| `verified_by` | text | Nama dokter verifikator |

### `public.case_trace`
Log reasoning step-by-step dari orchestrator (mendukung §4.2 transparansi PRD).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | Auto-increment |
| `case_id` | uuid | FK ke `cases.id` |
| `node_name` | text | Nama node pipeline |
| `status` | text | started/completed/failed/skipped |
| `details` | jsonb | Detail: reasoning, sources, skor |

### `public.rag_documents`
Basis pengetahuan untuk RAG similarity search.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | Auto-increment |
| `title` | text | Judul dokumen |
| `content` | text | Isi dokumen |
| `source` | text | Sumber (mis. "ESI Handbook v4") |
| `category` | text | Kategori medis |
| `embedding` | vector(1536) | Vektor embedding (OpenAI) |

---

## Fungsi PostgreSQL

### `match_rag_documents(query_embedding, match_threshold, match_count)`
Similarity search menggunakan cosine distance via pgvector.
Dipakai oleh `src/lib/rag/retrieval.ts`.

### `search_rag_documents_text(query_text, match_count)`
Fallback keyword search menggunakan full-text search PostgreSQL.
Dipakai saat embedding belum di-generate.

---

## Realtime
Tabel `cases` sudah terdaftar di `supabase_realtime` publication.
Dashboard (`DashboardClient.tsx`) berlangganan otomatis via:
```js
supabase.channel('dashboard-cases')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, ...)
```

---

## Notes
- Semua akses backend menggunakan **service_role key** (bypass RLS).
- Akses frontend (Realtime subscription) menggunakan **anon key** dengan RLS policy `select` terbuka.
- Auth user (login dokter) direncanakan pasca-kompetisi (lihat PRD v2.0 §roadmap).
