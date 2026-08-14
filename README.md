# MedAgent-Alpha

![MedAgent](https://via.placeholder.com/1200x400/1f2933/c0392b?text=MedAgent-Alpha)

**Sistem autonomous triage berbasis AI untuk IGD Puskesmas dan RS Daerah.**

Dikembangkan untuk **BISA AI — National AI Agent Challenge 2026** (Kategori Healthcare). MedAgent adalah multi-agent system yang bertugas untuk mendukung keputusan klinis awal di IGD, memecahkan masalah antrean dan keterbatasan tenaga medis.

---

## 🤖 10/10 Agentic AI Architecture

MedAgent-Alpha bukan sekadar pipeline otomasi kaku. Sistem ini dirancang dari awal untuk menjadi sistem otonom (Agentic AI) sejati yang mensimulasikan kecerdasan, persepsi klinis, dan iterasi seorang profesional medis di IGD. Berikut adalah empat pilar utamanya:

### 1. Clarification Loop (Human-in-the-Loop Interaktif)
Pipeline AI konvensional akan memaksakan diri memproses data meskipun datanya kurang, yang berisiko pada keselamatan pasien (halusinasi skor triase). 
**Bagaimana MedAgent bekerja:**
- **Perception:** Agent secara otomatis mengkalkulasi *Confidence Level* dari data masuk (keluhan utama dan 7 indikator tanda vital).
- **Agentic Pause:** Bila *Confidence* bernilai `low`, orchestrator MedAgent **menghentikan eksekusi**.
- **Interactive Query:** Agent memanggil LLM untuk merumuskan **pertanyaan klarifikasi spesifik** yang ditargetkan kepada perawat (misal: "Berapa tekanan darah sistolik pasien? Data ini krusial karena pasien mengeluh pusing hebat").
- **Resume:** Setelah perawat melengkapi data di dashboard, agent melanjutkan tugasnya secara otonom dari titik di mana ia berhenti.

### 2. Dynamic DAG & Self-Critique (Refleksi Diri)
Workflow MedAgent dijalankan di dalam sebuah siklus berulang (*State Machine Loop*), bukan garis lurus statis.
**Bagaimana MedAgent bekerja:**
- Setelah Agent selesai membuat rancangan SOAP, tugas ini **tidak** langsung diserahkan kepada dokter.
- Rancangan tersebut masuk ke **Self-Critique Agent**. Agent kedua ini (bertindak sebagai evaluator) memeriksa silang apakah *Plan* yang dibuat sudah sesuai dengan skor *Urgency* dan parameter vital pasien.
- **Loop-back:** Bila evaluator menemukan kontradiksi (misal: "Pasien di-skor ESI 2 tapi plan hanya observasi rawat jalan tanpa akses IV"), sistem akan membatalkan draft tersebut dan **memerintahkan agen pembuat SOAP untuk merevisinya**, hingga batas iterasi yang ditentukan.

### 3. Iterative RAG (Self-Correcting Retrieval)
MedAgent dilengkapi dengan RAG (Retrieval-Augmented Generation) berbasis PgVector untuk mencari referensi klinis (pedoman AHA, Kemenkes, dll). 
**Bagaimana MedAgent bekerja:**
- Agent tidak mencari berbekal "keluhan awam pasien" secara buta. 
- **Query Expansion:** Keluhan pasien dikirim ke agen LLM diagnostik terlebih dahulu untuk di-reformulasi menjadi istilah klinis yang akurat (contoh: "dada sesak tembus belakang" ➡️ "sindrom koroner akut, nyeri dada iskemik, STEMI").
- Istilah medis inilah yang dijadikan vektor pencarian, menghasilkan referensi medis tingkat lanjut yang 100% akurat.

### 4. Context-Aware Pharma Agent (Clinical Pharmacist)
Pengecekan obat di sistem tradisional hanya menggunakan tabel pencocokan statis (A berinteraksi dengan B).
**Bagaimana MedAgent bekerja:**
- Agent farmasi menggabungkan kepastian *Deterministic Rule Engine* (pencarian di database Pionas BPOM lokal) dengan kedalaman penalaran *Generative AI*.
- Setelah interaksi antar obat ditemukan, Agent menyerap **Konteks Pasien** (Keluhan dan Tanda Vital).
- **Contextual Reasoning:** Agent memberikan peringatan spesifik pasien. Bukannya peringatan generik, Agent akan melaporkan: *"Interaksi antara Bisoprolol dan Verapamil SANGAT KRITIS untuk pasien ini karena detak jantung (HR) saat ini sudah sangat rendah (45 bpm)."*

---

## 🚀 Fitur Utama

- **🧠 RAG + ESI Scoring**: Menggabungkan Retrieval-Augmented Generation (referensi medis standar) dengan *Deterministic Rule Engine* untuk menghitung Emergency Severity Index (ESI) 1-5.
- **💊 Cek Interaksi Obat Paralel**: Agen farmasi secara paralel memvalidasi 30+ potensi interaksi obat menggunakan dataset referensi lokal (Pionas BPOM / Formularium Nasional).
- **👶 Pediatric Safety Lens**: Penyesuaian otomatis ambang batas tanda vital untuk pasien anak sesuai usia.
- **🛡️ Human-in-the-loop**: Keputusan AI *tidak final* sampai disetujui (atau direvisi) oleh dokter melalui Verification Panel.
- **⚡ Real-time Dashboard**: Terintegrasi dengan Supabase Realtime; kasus baru otomatis muncul di dashboard IGD.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Styling**: TailwindCSS + `globals.css` (CSS variables, Dark/Light mode)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime + `pgvector` untuk RAG)
- **AI/LLM**: `openai` SDK (dapat disambungkan ke API Gemini/OpenAI lokal/cloud)
- **Icons**: `lucide-react`

---

## 🏗️ Arsitektur Multi-Agent

MedAgent menggunakan workflow **LangGraph-style state machine** di belakang layar:
1. **Intake Data**: Perawat memasukkan data awal pasien via `/input`.
2. **Retrieve Context (RAG)**: Mengambil referensi medis (SKK, Kemenkes, AHA) via `pgvector` cosine similarity.
3. **Paralel Execution**:
   - `urgency_scoring`: LLM mengekstrak fitur, *Engine* menghitung ESI.
   - `drug_interaction`: LLM & Static DB mencari interaksi berbahaya.
4. **Generate SOAP**: Merangkum hasil triage ke dalam format Subjective, Objective, Assessment, Plan.
5. **Human Verification**: Proses terhenti; dokter mereview di `/case/[id]`.

---

## 💻 Cara Menjalankan (Local Development)

### 1. Prerequisites
- Node.js ≥ 20
- npm / pnpm / yarn
- Akun Supabase (untuk database)
- OpenAI / Gemini API Key

### 2. Setup Environment Variables
Buat file `.env.local` di root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Jika menggunakan LLM (Wajib diisi)
LLM_API_KEY=your_llm_api_key
```

### 3. Install & Run
```bash
npm install
npm run dev
```
Buka `http://localhost:3000` di browser.

### 4. Setup Supabase
Jalankan file SQL yang ada di `supabase/migrations/001_initial_schema.sql` di SQL Editor Supabase Anda untuk membuat tabel, tipe data enum, RLS policies, dan trigger realtime.

---

## ⚠️ Disclaimer Klinis

Sistem ini adalah **Decision Support Tool**, bukan pengganti keputusan medis. Seluruh data pasien yang digunakan adalah **sintetis** (tidak ada data nyata). Output dari AI *wajib* diverifikasi oleh tenaga medis (dokter) sebelum ditindaklanjuti. Skor ESI dari aplikasi tidak dapat menggantikan penilaian visual (*clinical gestalt*) secara langsung terhadap pasien.
