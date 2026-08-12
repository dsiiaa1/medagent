# MedAgent-Alpha

![MedAgent](https://via.placeholder.com/1200x400/1f2933/c0392b?text=MedAgent-Alpha)

**Sistem autonomous triage berbasis AI untuk IGD Puskesmas dan RS Daerah.**

Dikembangkan untuk **BISA AI — National AI Agent Challenge 2026** (Kategori Healthcare). MedAgent adalah multi-agent system yang bertugas untuk mendukung keputusan klinis awal di IGD, memecahkan masalah antrean dan keterbatasan tenaga medis.

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

# Untuk demo mode (tanpa API keys)
DEMO_MODE=true

# Jika menggunakan LLM sungguhan (DEMO_MODE=false)
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
