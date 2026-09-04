# Ringkasan Proyek: MedAgent-Alpha

## 1. Ringkasan Proyek
MedAgent-Alpha adalah sistem **autonomous triage berbasis AI** yang dirancang khusus untuk Instalasi Gawat Darurat (IGD) di Puskesmas dan Rumah Sakit Daerah. Proyek ini dikembangkan untuk mengikuti **BISA AI — National AI Agent Challenge 2026** (Kategori Healthcare). 

Sistem ini memecahkan permasalahan antrean panjang dan keterbatasan tenaga medis awal dengan menggunakan pendekatan *multi-agent AI* yang berfungsi sebagai alat pendukung keputusan klinis (*Clinical Decision Support System*). AI ini memproses keluhan awal pasien beserta tanda-tanda vital untuk mengkalkulasi rekomendasi triase (berdasarkan *Emergency Severity Index* / ESI 1-5) dan menyusun draf laporan SOAP (*Subjective, Objective, Assessment, Plan*).

---

## 2. Teknologi yang Digunakan
Sistem ini dibangun dengan *tech stack* modern yang *robust*, berfokus pada performa *real-time* dan kemampuan *agentic*:

- **Framework Utama:** [Next.js 16 (App Router)](https://nextjs.org/) dengan React 19.
- **Styling:** TailwindCSS v4 beserta variabel CSS kustom untuk mendukung mode terang dan gelap (*Light/Dark mode*).
- **Database & Backend:** [Supabase](https://supabase.com/) (PostgreSQL) yang memanfaatkan:
  - **Realtime:** Untuk *update dashboard* perawat/dokter IGD secara instan saat ada pasien masuk.
  - **pgvector:** Ekstensi PostgreSQL untuk pencarian kesamaan vektor (RAG - *Retrieval-Augmented Generation*) guna mencocokkan keluhan pasien dengan basis pengetahuan medis.
- **Integrasi AI / LLM:** Memanfaatkan `openai` SDK (dapat disambungkan dengan Gemini atau model LLM lain).
- **Validasi:** `zod` untuk memastikan struktur data (seperti respons JSON dari agen AI) valid secara statis.
- **Ikonografi:** `lucide-react`.

---

## 3. Penjelasan Agentic AI & Arsitektur (Multi-Agent System)
MedAgent bukanlah sekadar sistem *prompting* AI biasa (memasukkan teks dan mendapat jawaban). Sistem ini mengimplementasikan konsep **Agentic AI** di mana beberapa "agen" digital beroperasi secara otonom, saling mengevaluasi, dan bisa mengambil jeda untuk meminta klarifikasi layaknya manusia:

1. **Clarification Loop (Human-in-the-Loop):**
   Alih-alih memberikan diagnosis dengan data yang kurang (yang bisa menyebabkan misdiagnosis), agen akan menghitung *Confidence Level* secara mandiri. Jika datanya meragukan, agen melakukan *Agentic Pause* (berhenti) dan memformulasikan **pertanyaan klarifikasi spesifik** kepada perawat (Misal: *"Tekanan darah tidak dimasukkan, padahal pasien mengeluh pusing berputar, mohon lengkapi"*).

2. **Dynamic DAG & Self-Critique Agent:**
   Workflow tidak berjalan lurus. Terdapat agen **Evaluator (Self-Critique)** yang bertugas memeriksa hasil draf SOAP buatan agen utama. Jika Evaluator mendeteksi kontradiksi (contoh: ESI 1 / Gawat Darurat, tapi *Plan* hanya disuruh istirahat di rumah), Evaluator akan memaksa agen pembuat SOAP untuk **merevisi** output-nya secara otonom.

3. **Iterative RAG (Self-Correcting Retrieval):**
   Agen LLM pertama-tama akan mereformulasi bahasa awam pasien (contoh: "dada sakit seperti ditimpa benda berat") menjadi kueri medis profesional ("*ischemic chest pain, STEMI*"). Kueri medis inilah yang lalu diubah ke *vektor* untuk di-RAG-kan ke database referensi medis Kemenkes/AHA via `pgvector`. Hasilnya dikembalikan ke agen untuk membuat draf laporan.

4. **Context-Aware Pharma Agent (Clinical Pharmacist):**
   Agen ini bertugas paralel untuk mengecek kemungkinan interaksi obat dengan menggabungkan dua hal: 1) *Deterministic Rule Engine* (pencocokan data statis dari BPOM), dan 2) LLM Penalaran. LLM tidak sekadar bilang ada interaksi, tapi memberi penjelasan klinis berdasarkan kondisi pasien itu sendiri (*"Obat X bahaya jika diberikan karena tekanan darah pasien Y ini sedang sangat rendah"*).

---

## 4. Cara Menjalankan Agentic AI (Panduan Eksekusi)

Keseluruhan *engine* AI ini dirancang untuk berjalan di sisi *server* dari arsitektur Next.js. Berikut adalah cara mendetail untuk menjalankannya secara *local*:

### A. Persiapan (Prerequisites)
- **Node.js:** Versi 20+ sudah terinstal.
- **Akun Supabase:** Telah memiliki proyek di Supabase untuk menghosting PostgreSQL.
- **API Key AI:** Memiliki *API Key* dari *provider* LLM (OpenAI atau Gemini API).

### B. Setup Database (Supabase)
1. Buka *dashboard* proyek Supabase Anda dan masuk ke menu **SQL Editor**.
2. Salin isi file `supabase/migrations/001_initial_schema.sql` (atau file *schema* SQL dari dalam *repository* ini) lalu eksekusi/jalankan.
3. Skrip ini akan membuat tabel, Enum, *Vector Extension* (`pgvector`), fungsi-fungsi *Realtime*, serta RLS *(Row Level Security)*.

### C. Konfigurasi Environment (Variabel Lingkungan)
1. Buat file baru dengan nama `.env.local` di *root* folder proyek (sejajar dengan `package.json`).
2. Masukkan dan sesuaikan nilai-nilai berikut:
   ```env
   # Ambil URL dan Anon Key dari Supabase Dashboard > Project Settings > API
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...

   # Ambil Service Role Key dari tempat yang sama (Hanya digunakan di server, jangan di-share)
   SUPABASE_SERVICE_ROLE_KEY=ey...

   # Masukkan API Key dari LLM Provider yang Anda gunakan (wajib)
   LLM_API_KEY=sk-...
   ```

### D. Instalasi & Menjalankan Server
1. Buka terminal atau *command prompt* dan arahkan ke dalam folder proyek (`MEDAGENT`).
2. Jalankan perintah instalasi dependensi:
   ```bash
   npm install
   ```
3. Jalankan server *development*:
   ```bash
   npm run dev
   ```
4. Server akan menyala di `http://localhost:3000`.

### E. Simulasi Cara Kerja Agentic AI (User Workflow)
1. **Intake Data:** Buka browser ke `http://localhost:3000/input`. Isi form pendaftaran triase IGD (keluhan utama dan angka vital sign).
2. **AI Processing:** Saat tombol disubmit, *server action* akan memicu semua agen AI di latar belakang (melakukan RAG, *Scoring ESI*, dan pengecekan Farmasi).
3. **Clarification (Bila ada):** Jika Anda sengaja mengosongkan data vital yang krusial bagi keluhan tersebut, AI mungkin akan menghentikan proses dan langsung meminta Anda melengkapinya.
4. **Dashboard:** Buka `http://localhost:3000/dashboard` untuk melihat kartu pasien yang telah selesai dikalkulasi.
5. **Human Verification:** Klik detail kasus pasien (misal ke halaman `/case/[id]`). Di sini peran manusia kembali (*Human-in-the-loop*); seorang dokter wajib membaca analisis para Agen AI dan melakukan modifikasi, *approve*, atau menolak draf tersebut sebelum diubah menjadi tindakan medis resmi.

---
> **Disclaimer Klinis:** Sistem AI (MedAgent) ini bersifat **Decision Support Tool**. Sistem tidak boleh dijadikan satu-satunya dasar pengambilan keputusan tindakan intervensi medis di dunia nyata. Semua *output* yang dihasilkan wajib divalidasi oleh dokter penanggung jawab jaga.
