# Product Requirements Document (PRD)
# MedAgent-Alpha: Autonomous Emergency Triage & Intelligence System

**Kompetisi:** BISA AI National AI Agent Challenge (NAIC) 2026 — Kategori Healthcare
**Tim:** 2 orang
**Versi dokumen:** 1.1 (update: acuan standar triase ESI + Kemenkes, stack LLM via OpenRouter/Gemini/Mistral/Groq)
**Tanggal:** 25 Juli 2026

---

## 1. Ringkasan Produk (Product Overview)

MedAgent-Alpha adalah sebuah **AI Agent otonom** yang membantu tenaga medis di IGD (Instalasi Gawat Darurat) melakukan pra-triase pasien secara cepat. Sistem menerima input keluhan pasien, data vital, dan riwayat medis, lalu menggunakan *reasoning* berbasis RAG (Retrieval-Augmented Generation) untuk menghitung skor urgensi, mengecek interaksi obat, dan menyusun ringkasan kasus dalam format SOAP — semua sebelum dokter membuka rekam medis secara manual.

Sistem bersifat **decision support**, bukan pengganti keputusan medis. Setiap output wajib diverifikasi oleh dokter sebelum ditindaklanjuti (human-in-the-loop).

### 1.1 Masalah yang Diselesaikan
Keterlambatan proses triase di IGD akibat penumpukan pasien dan keterbatasan tenaga medis untuk membaca riwayat medis secara instan, terutama di Puskesmas/RS Daerah dengan sumber daya terbatas.

### 1.2 Target Pengguna
- **Primary user:** Dokter dan perawat jaga IGD di Puskesmas/RS Daerah.
- **Karakteristik:** Beban kerja tinggi, waktu terbatas untuk membaca dokumen panjang, butuh keputusan cepat namun tetap akurat.

### 1.3 Tujuan Produk (untuk MVP Hackathon Sprint)
Menghasilkan *working prototype* yang bisa live-demo, mendemonstrasikan seluruh alur: input pasien → agent reasoning (RAG) → multi-agent check (farmasi) → output SOAP + skor prioritas → verifikasi dokter.

---

## 2. Goals & Non-Goals

### 2.1 Goals (MVP)
- Sistem dapat menerima minimal 1 jenis input terstruktur (form teks) dan menghasilkan skor urgensi berbasis standar triase yang eksplisit.
- Ada minimal 2 agent yang bekerja secara kolaboratif dan terpisah secara arsitektural (bukan 1 prompt besar): Agent Diagnostik/RAG dan Agent Farmasi.
- Output SOAP dan dashboard prioritas dapat dilihat dan diverifikasi (approve/edit) oleh "dokter" dalam demo.
- Setiap rekomendasi menyertakan sumber referensi medis yang dipakai (evidence-based).
- Aplikasi bisa diakses lewat URL publik (Streamlit Community Cloud) untuk keperluan juri.

### 2.2 Non-Goals (secara eksplisit di luar scope MVP)
- **Bukan** sistem diagnosis final — tidak membuat keputusan medis otonom tanpa verifikasi manusia.
- **Bukan** integrasi real-time ke SIMRS/EMR sungguhan (akan pakai data sintetis).
- **Bukan** aplikasi produksi dengan multi-tenant, autentikasi berlapis, atau compliance penuh (HIPAA/UU PDP) — itu masuk roadmap pasca-kompetisi.
- Voice input (disebut di proposal) — didesain sebagai *stub*/placeholder di MVP, teks jadi jalur utama, karena kompleksitas ASR tidak sepadan dengan waktu 3 minggu untuk tim 2 orang.

> **Catatan penting untuk tim:** proposal menyebut scope penuh (multi-agent, RAG, SOAP, drug-interaction, dashboard, voice input, API jadwal dokter). Dengan tim 2 orang dan waktu 3 minggu, saya sarankan **semua fitur inti tetap dibangun** (sesuai keputusan kalian), namun voice input dan integrasi API jadwal dokter eksternal diberi status "simulasi/mock" di MVP — bukan dihapus dari cerita produk, hanya diturunkan tingkat fidelitasnya supaya deadline aman. Ini dijabarkan di bagian prioritas (§6).

---

## 3. User Personas & User Stories

### Persona 1: dr. Ayu — Dokter Jaga IGD Puskesmas
- Menangani 15-20 pasien per shift, sering overlap gejala mirip.
- Butuh ringkasan cepat begitu pasien masuk, tanpa harus scroll riwayat medis panjang.
- Tetap ingin punya kendali penuh atas keputusan akhir.

### Persona 2: Perawat Jaga (Triage Nurse)
- Orang pertama yang menginput data pasien saat pasien datang.
- Tidak punya waktu mengetik panjang — butuh form cepat.

### User Stories
1. *Sebagai perawat*, saya ingin menginput keluhan dan data vital pasien dengan cepat, agar pasien langsung masuk antrean prioritas.
2. *Sebagai dokter*, saya ingin melihat dashboard pasien terurut skor urgensi, agar saya tahu siapa yang harus ditangani lebih dulu.
3. *Sebagai dokter*, saya ingin melihat ringkasan SOAP otomatis beserta sumber referensinya, agar saya bisa memverifikasi dengan cepat tanpa membaca ulang seluruh data mentah.
4. *Sebagai dokter*, saya ingin diperingatkan jika ada potensi interaksi obat, agar saya tidak salah resep di kondisi darurat.
5. *Sebagai dokter*, saya ingin bisa meng-override/edit rekomendasi agent, karena keputusan akhir tetap ada di tangan saya.

---

## 4. Functional Requirements — Detail per Modul

### 4.1 Modul Input Pasien
- Form input: nama/ID pasien (dummy), umur, keluhan utama (free text), data vital (tekanan darah, detak jantung, suhu, saturasi oksigen, tingkat kesadaran/GCS), riwayat medis singkat (kondisi kronis, alergi, obat yang sedang dikonsumsi — semua dari dataset sintetis, lihat §7).
- Validasi input dasar (field wajib, rentang nilai vital yang masuk akal).
- **Output modul:** objek data pasien terstruktur (JSON) yang diteruskan ke orchestrator.

### 4.2 Modul Orchestrator (LangGraph)
- Bertindak sebagai *state machine* yang mengatur urutan node: `intake` → `retrieve_context` → `urgency_scoring` → `drug_interaction_check` (paralel) → `generate_soap` → `await_doctor_verification`.
- Setiap transisi node dicatat sebagai log/trace yang bisa ditampilkan ke UI (transparansi reasoning).
- Menangani error handling: jika salah satu agent gagal (misal RAG tidak menemukan konteks relevan), sistem tetap menghasilkan output dengan flag "confidence rendah" — bukan crash.

### 4.3 Modul Agent RAG (Knowledge Retrieval + Urgency Scoring)
- Basis pengetahuan: dokumen algoritma triase **Emergency Severity Index (ESI)** yang diindeks dengan LlamaIndex. ESI dipilih sebagai mesin algoritma karena Indonesia belum punya algoritma triase nasional baku yang dipublikasikan secara rinci — Permenkes No. 47/2018 mewajibkan triase berbasis keparahan klinis tapi tidak menetapkan algoritma spesifik, sehingga rumah sakit lazim mengadopsi skala internasional seperti ESI (lihat §7.3 untuk detail regulasi).
- Proses: query dibentuk dari gejala + data vital pasien → retrieval dokumen relevan → LLM menghasilkan skor urgensi dalam **skala tetap (1-5, mengacu ESI)**, bukan angka bebas.
- **Lapisan presentasi:** skor ESI 1-5 dipetakan ke **kode warna triase Kemenkes** (Merah/Kuning/Hijau/Hitam) yang familiar bagi tenaga medis Indonesia, sebelum ditampilkan di dashboard (lihat tabel pemetaan di §7.3). Ini memisahkan "mesin penilaian" (ESI) dari "bahasa yang dipakai dokter sehari-hari" (warna Kemenkes).
- **Guardrail wajib:** validasi output skor harus dalam rentang 1-5; jika LLM mengeluarkan format lain, sistem retry atau fallback ke default "perlu review manual".
- Setiap skor disertai potongan referensi dokumen yang dipakai (untuk ditampilkan sebagai citation di UI).

### 4.4 Modul Agent Farmasi (Drug Interaction Check)
- Menerima daftar obat yang sedang dikonsumsi pasien dari data intake.
- Query ke basis data interaksi obat (formularium publik/dataset interaksi obat open-source).
- Output: daftar potensi interaksi (jika ada) dengan level keparahan (ringan/sedang/berat), berjalan **paralel** dengan Modul RAG, bukan berurutan — untuk mendemonstrasikan *multi-agent collaboration* yang nyata.

### 4.5 Modul Generate SOAP
- Menyusun ringkasan otomatis dalam format SOAP (Subjective, Objective, Assessment, Plan) berdasarkan hasil dari Modul RAG dan Modul Farmasi.
- Format terstruktur (bukan paragraf bebas) agar mudah dibaca cepat oleh dokter.

### 4.6 Modul Dashboard Prioritas
- Menampilkan daftar seluruh pasien yang sudah diproses, terurut berdasarkan skor urgensi (skala warna Merah/Kuning/Hijau/Hitam sesuai konvensi triase Kemenkes, hasil pemetaan dari skor ESI — lihat §7.3).
- Klik satu pasien → membuka detail kasus (SOAP + referensi + hasil cek obat).

### 4.7 Modul Verifikasi Dokter (Human-in-the-Loop)
- Tombol **Approve** / **Edit** / **Reject** pada setiap rekomendasi.
- Status verifikasi tersimpan dan ditampilkan di dashboard (misal label "Sudah diverifikasi dr. Ayu").
- Ini secara arsitektural direpresentasikan sebagai node `await_human_input` di LangGraph — alur benar-benar berhenti menunggu input dokter, bukan sekadar tombol dekoratif di UI.

---

## 5. Non-Functional Requirements

| Aspek | Requirement |
|---|---|
| **Performance** | Waktu proses dari input hingga output SOAP maksimal ~15-20 detik untuk demo (batas wajar untuk LLM call + RAG retrieval berantai). |
| **Reliability** | Sistem tidak boleh crash total jika satu agent gagal — degradasi bertahap (graceful degradation) dengan flag "perlu review manual". |
| **Transparency** | Setiap output wajib menyertakan sumber referensi (evidence-based reasoning), sesuai nilai yang diklaim di proposal. |
| **Privacy** | Karena topik kesehatan sensitif, **tidak ada data pasien asli** yang digunakan di seluruh siklus proyek — hanya data sintetis (lihat §7). Ini harus disebutkan eksplisit di dokumentasi & video demo. |
| **Usability** | Dashboard harus bisa dipahami dalam <10 detik oleh juri yang baru pertama kali melihat (color-coded, tidak perlu training). |
| **Portability** | Aplikasi harus bisa dijalankan ulang dari GitHub repo tanpa setup rumit (requirements.txt lengkap, environment variables terdokumentasi). |

---

## 6. Prioritas Fitur (untuk Tim 2 Orang, 3 Minggu)

Karena tim memilih scope penuh sesuai proposal, berikut pembagian prioritas realistis agar semua elemen cerita produk tetap ada di demo, tanpa mengorbankan kualitas bagian inti:

**P0 — Wajib berjalan sungguhan (dinilai langsung sebagai "AI Agent Implementation" 30%):**
- Modul Input → Orchestrator → Agent RAG → Output SOAP → Dashboard → Verifikasi dokter.
- Skor urgensi berbasis RAG yang benar-benar retrieval, bukan hardcode.

**P1 — Harus ada, boleh disederhanakan implementasinya:**
- Agent Farmasi (cek interaksi obat) — boleh pakai basis data interaksi obat yang lebih kecil/terbatas dulu, tidak perlu mencakup seluruh formularium nasional.
- Reasoning trace di UI (log ringkas langkah agent).

**P2 — Boleh disimulasikan (mock) di MVP, dijelaskan sebagai roadmap saat presentasi:**
- Voice input → cukup teks dulu, sebutkan di pitch sebagai "fase berikutnya".
- Integrasi API jadwal dokter → tampilkan sebagai data dummy/simulasi di UI, jelaskan konsepnya saat Q&A.

Pendekatan ini membuat *cerita* produk tetap utuh sesuai proposal (semua fitur disebutkan dan didemokan konsepnya), sementara *effort development* difokuskan pada bagian yang paling menentukan nilai teknis.

---

## 7. Data & Privasi

### 7.1 Sumber Data Rekam Medis
**Rekomendasi: data sintetis buatan sendiri**, bukan dataset publik seperti MIMIC-IV. Alasan:
- Dataset seperti MIMIC-IV memerlukan proses credentialing (pelatihan etik + persetujuan resmi) yang tidak akan selesai dalam 3 minggu.
- Data sintetis memberi kontrol penuh atas skenario demo (bisa dirancang agar mendemonstrasikan kasus urgent vs non-urgent secara jelas ke juri).
- Menghindari isu privasi/etika sepenuhnya — penting karena "Ethics & Data Handling" termasuk yang diperhatikan panitia (lihat Competition Rules soal hak cipta & lisensi data).

### 7.2 Cara Membuat Data Sintetis
- Buat 15-20 skenario pasien dummy dengan variasi tingkat urgensi (dari kritis hingga ringan), mencakup kombinasi gejala + vital sign yang realistis.
- Bisa digenerate dengan bantuan LLM (di luar sistem produksi) lalu direview manual agar masuk akal secara medis, atau disusun manual berdasarkan textbook/protokol triase publik.
- Simpan sebagai file JSON/CSV statis yang dimuat sistem saat startup — tidak perlu database kompleks untuk MVP.

### 7.3 Basis Pengetahuan Medis (untuk RAG)
- Sumber: dokumen protokol triase publik (ESI implementation handbook, WHO clinical guidelines yang tersedia terbuka), formularium obat nasional untuk cek interaksi.
- **Wajib dicantumkan sebagai referensi eksplisit** di proposal/dokumentasi — sesuai aturan kompetisi soal mencantumkan sumber dataset/API pihak ketiga.

### 7.4 Acuan Standar Triase: ESI + Kode Warna Kemenkes

**Dasar regulasi:** Permenkes No. 47 Tahun 2018 tentang Pelayanan Kegawatdaruratan mewajibkan rumah sakit menggunakan sistem triase berbasis keparahan klinis, namun tidak menetapkan algoritma spesifik. Karena itu, banyak RS di Indonesia mengadaptasi skala triase internasional (ESI/ATS/CTAS/MTS) untuk mesin penilaiannya, sambil tetap memakai kode warna konvensional (Merah/Kuning/Hijau/Hitam) yang sudah dikenal luas tenaga medis Indonesia untuk presentasinya.

**Pendekatan MedAgent-Alpha:** ESI (5-level, algoritma terdokumentasi jelas dan publik) dipakai sebagai mesin skor di Agent RAG, lalu dipetakan ke kode warna Kemenkes untuk ditampilkan di dashboard:

| Skor ESI | Warna Kemenkes | Arti Klinis |
|---|---|---|
| ESI 1 | Merah | Butuh intervensi segera, mengancam nyawa |
| ESI 2 | Merah | Berisiko tinggi, tidak boleh menunggu |
| ESI 3 | Kuning | Butuh beberapa sumber daya, bisa menunggu terbatas |
| ESI 4 | Kuning/Hijau | Butuh satu sumber daya |
| ESI 5 | Hijau | Minor, bisa menunggu |
| (Kasus meninggal saat tiba) | Hitam | Sesuai konvensi triase bencana Indonesia |

*Catatan tim: cutoff persis antara ESI 2↔3 dan ESI 4↔5 perlu disepakati bersama saat menyusun dataset sintetis skenario pasien (§7.2), agar konsisten dengan literatur ESI yang dipakai sebagai referensi RAG.*

**Kalimat acuan untuk proposal/dokumentasi:** *"Sistem menggunakan algoritma skor Emergency Severity Index (ESI) sebagai basis perhitungan urgensi, dengan output dipetakan ke kode warna triase yang telah dikenal luas di rumah sakit Indonesia, selaras dengan Permenkes No. 47 Tahun 2018 tentang Pelayanan Kegawatdaruratan."*

---

## 8. Arsitektur Teknis & Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| **Frontend/UI** | Streamlit | Cepat dibangun, cocok untuk dashboard multi-panel, tim belum berpengalaman tapi kurva belajar pendek. |
| **Agent Framework** | LangGraph | Mengelola state machine antar-node secara eksplisit, cocok untuk alur bercabang (paralel RAG + Farmasi). |
| **RAG & Knowledge Base** | LlamaIndex | Mengindeks dan melakukan retrieval dari dokumen protokol medis. |
| **LLM Gateway** | OpenRouter | Satu API key untuk akses banyak model (Gemini, Mistral, Llama via Groq, GPT, Claude, dll) — memudahkan model-agnostic routing di LangGraph dan jadi fallback kalau satu provider down/rate-limited saat live demo. Tim sudah berpengalaman dengan tool ini di proyek sebelumnya. |
| **LLM — Agent RAG/Diagnostik utama** | Gemini atau Mistral Large (lewat OpenRouter) | Reasoning medis kompleks untuk skor urgensi berbasis ESI; cukup kuat untuk reasoning terstruktur. |
| **LLM — Agent Farmasi & tugas ringan** | Model open-weight via Groq (misal Llama/Mixtral) | Groq punya inference sangat cepat dan murah, cocok untuk task ringan (cek interaksi obat, formatting SOAP) yang butuh respons cepat saat demo. |
| **Bahasa Utama** | Python | Satu bahasa untuk seluruh stack (Streamlit + LangGraph + LlamaIndex native Python) — menyederhanakan development untuk tim 2 orang. |
| **Penyimpanan Data (MVP)** | File JSON/CSV lokal, atau SQLite jika butuh query sederhana | Tidak perlu database server terpisah untuk skala demo. |
| **Deployment** | Streamlit Community Cloud | Gratis, auto-deploy dari GitHub, menghasilkan URL publik untuk juri — cocok untuk kebutuhan Video Demo dan Live Demo. |
| **Version Control** | GitHub (private repo dengan akses panitia/juri) | Wajib sesuai ketentuan submission Hackathon Sprint. |

**Catatan model routing:** strategi ini mengikuti prinsip yang sama dengan §4.2/§4.3 — pisahkan tugas berat (reasoning medis) dari tugas ringan (klasifikasi, formatting) ke model yang sesuai, supaya biaya dan latensi lebih efisien tanpa mengorbankan kualitas di bagian yang paling menentukan penilaian juri (skor urgensi).

*(Diagram alur arsitektur sudah dibuat pada percakapan sebelumnya — lihat bagian atas untuk visualisasinya.)*

---

## 9. Struktur Halaman UI (Streamlit)

1. **Halaman Input** — form intake pasien baru (perawat).
2. **Halaman Dashboard** — daftar pasien terurut prioritas, color-coded ESI 1-5.
3. **Halaman Detail Kasus** — SOAP summary, referensi sumber, hasil cek interaksi obat, reasoning trace ringkas.
4. **Halaman Verifikasi** — tombol approve/edit/reject, riwayat siapa yang memverifikasi.

*(Opsional P2: Halaman "Jadwal Dokter" sebagai simulasi/mock data.)*

---

## 10. Pembagian Peran Tim (2 Orang)

Karena tim hanya 2 orang, pembagian yang disarankan berdasarkan batas modul yang jelas (agar minim blocking satu sama lain):

- **Orang A — Agent & Backend:** LangGraph orchestrator, integrasi LlamaIndex/RAG, Agent Farmasi, prompt engineering, guardrail validasi output.
- **Orang B — UI & Data:** Streamlit dashboard, form input, penyusunan dataset sintetis, integrasi hasil dari backend ke tampilan, dokumentasi.

Titik integrasi (sebaiknya disepakati sejak awal): format data JSON yang jadi kontrak antara backend agent dan frontend Streamlit.

---

## 11. Timeline (Mengikuti Jadwal Kompetisi)

| Tahap | Periode | Fokus PRD ini |
|---|---|---|
| Registrasi & Proposal | 8 Jul – 8 Agu 2026 | Finalisasi proposal & pitch deck (dokumen terpisah). |
| Pengumuman Top 15 | 12 Agu 2026 | — |
| **Hackathon Sprint** | 13 Agu – 3 Sep 2026 | Implementasi PRD ini: minggu 1 = P0 (orchestrator + RAG dasar berjalan), minggu 2 = P1 (agent farmasi + dashboard lengkap) + integrasi, minggu 3 = P2 (mock fitur tambahan) + polish UI + dokumentasi + video demo. |
| Pengumuman Top 5 | 7 Sep 2026 | — |
| Demo Day & Grand Final | 10 Sep 2026 | Live demo end-to-end sesuai PRD ini. |

---

## 12. Metrik Keberhasilan (dipetakan ke Judging Criteria)

| Kriteria Juri (Tahap 2 Hackathon) | Bobot | Bagaimana PRD ini menjawab |
|---|---|---|
| AI Agent Implementation | 30% | Orchestrator LangGraph nyata + tool calling aktif ke RAG & drug-check, bukan prompt tunggal. |
| Technical Architecture | 25% | Stack terdokumentasi jelas, diagram arsitektur, pemisahan layer yang rapi. |
| Functionality & UX | 20% | Dashboard color-coded, alur verifikasi dokter yang benar-benar fungsional. |
| Potential Impact | 15% | Use case jelas untuk Puskesmas/RS Daerah, klaim manfaat realistis (hindari angka mengambang tanpa dasar). |
| Documentation & Code Quality | 10% | README lengkap, referensi sumber data dicantumkan, kode terstruktur per modul sesuai PRD ini. |

---

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| LLM menghasilkan skor urgensi di luar skala / format tidak konsisten | Guardrail validasi output + retry logic + fallback ke "perlu review manual". |
| Waktu respons terlalu lambat saat live demo (jaringan panitia/juri) | Siapkan video demo sebagai cadangan jika live demo gagal karena koneksi. |
| RAG retrieval tidak relevan karena basis dokumen terlalu sedikit | Kurasi 5-10 dokumen protokol medis berkualitas dari awal, uji query representatif sebelum minggu ke-3. |
| Tim 2 orang kehabisan waktu untuk semua fitur | Ikuti prioritas P0/P1/P2 di §6 — P0 tidak boleh dikorbankan, P2 boleh disederhanakan/disimulasikan. |
| Kesan "hanya chatbot berbalut UI" di mata juri | Pastikan reasoning trace dan multi-agent paralel benar-benar terlihat saat demo, bukan disembunyikan di balik satu tombol. |

---

## 14. Out of Scope / Pengembangan Selanjutnya

- Integrasi nyata ke SIMRS/EMR rumah sakit.
- Voice input dengan ASR sungguhan.
- Autentikasi multi-role (admin, dokter, perawat) dengan permission berlapis.
- Kepatuhan regulasi data kesehatan formal (UU PDP, standar keamanan data medis).
- Integrasi wearable real-time (disebutkan di proposal sebagai rencana jangka panjang).

---

## 15. Pertanyaan Terbuka (untuk didiskusikan tim sebelum mulai coding)

- Apakah nama tim, ketua tim, dan institusi untuk identitas proposal sudah difinalisasi? *(Ditunda — akan diisi belakangan oleh tim.)*
