# PRD MedAgent-Alpha
## v2.0 — Rencana Penyelesaian, Penguatan Fitur & Modernisasi UI

*Dari MVP fungsional menuju produk yang siap dinilai juri, siap dipakai, dan siap tumbuh*

**Kompetisi:** BISA AI — National AI Agent Challenge (NAIC) 2026 · Kategori Healthcare
**Dokumen:** kelanjutan dari `PRD_MedAgent-Alpha v1.4` — disusun dari audit langsung terhadap kode di repo MEDAGENT
**Tanggal:** 5 Agustus 2026

---

## 0. Ringkasan Eksekutif — Jawaban Langsung

Pertanyaannya: apakah tampilan dan build yang sudah ada sekarang cukup? Jawabannya belum, dan penilaian itu tepat. Kabar baiknya: yang belum selesai bukan fondasinya. Orchestrator, rule engine ESI, RAG, cek interaksi obat, dan alur verifikasi dokter sudah berjalan dan arsitekturnya sudah rapi (lihat Bagian 1). Yang belum selesai ada di tiga lapisan:

1. **Permukaan (UI/UX)** — seluruh halaman masih memakai emoji sebagai ikon (10 dari 13 file komponen/halaman), layout landing page masih generik ala template, dan tampilan belum terasa seperti alat klinis yang bisa dipercaya sekilas pandang.
2. **Kedalaman fitur** — beberapa janji di PRD v1.4 milik tim sendiri belum sepenuhnya terimplementasi. Contoh paling jelas: §7.5 poin 5 menjanjikan panel verifikasi "menampilkan vital sign kunci yang memicu skor secara mencolok" untuk mencegah automation bias — di kode saat ini (`VerificationPanel.tsx`), panel hanya menampilkan tombol Setujui/Edit/Tolak tanpa highlight vital apa pun.
3. **Bukti kualitas** — automated test hanya menutup satu modul (triage engine), dan tidak ada jejak dokumentasi/video pitch di repo padahal deadline Tahap 1 (proposal + video pitch) adalah 8 Agustus 2026 — tiga hari dari sekarang.

Dokumen ini adalah PRD v2.0: kelanjutan dari v1.4, bukan penggantinya. Isinya audit temuan dari kode aktual, gap analysis dengan prioritas P0/P1/P2, tiga fitur andalan baru yang realistis untuk tim 2 orang, spesifikasi modernisasi UI (termasuk migrasi penuh emoji → icon set `lucide-react` yang sudah ter-install tapi belum dipakai satu pun), dan timeline yang dipetakan ke tanggal kompetisi yang sesungguhnya, dimulai dari hari ini.

> **Konteks waktu yang perlu disadari sejak awal**
> Hari ini 5 Agustus 2026. Batas submit Tahap 1 (AI Project Proposal + Video Pitch, maks. 3 menit) adalah **8 Agustus 2026** — tersisa 3 hari. Hackathon Sprint (pengembangan MVP penuh) baru dimulai 13 Agustus dan berakhir 3 September. Artinya: prioritas 3 hari ke depan **bukan** menyelesaikan semua gap di dokumen ini, melainkan memastikan apa yang tampil di video pitch (landing page + 1-2 alur inti) terlihat meyakinkan. Bagian 5 (Timeline) memisahkan dua horizon ini secara eksplisit.

---

## 1. Hasil Audit — Apa yang Sudah Benar

Sebelum ke kekurangan: bagian yang paling menentukan penilaian juri untuk kriteria "AI Agent Implementation" (bobot 30% di Tahap 2) justru sudah dibangun dengan benar. Ini bukan basa-basi menyemangati — berikut buktinya, dikutip langsung dari struktur kode di repo.

| Komponen | Bukti dari kode | Kenapa ini penting bagi juri |
|---|---|---|
| **Pemisahan LLM vs skor** | `src/lib/triage/engine.ts` — `evaluateTriage()` murni deterministik, tanpa panggilan LLM. `src/lib/rag/retrieval.ts` — `extractPatientFeatures()` hanya mengekstrak fitur, tidak pernah mengembalikan skor. | Pertanyaan paling umum dari juri kategori Healthcare: "bagaimana kalau LLM salah hitung skor?" Jawabannya sudah ada di arsitektur, bukan cuma di slide. |
| **Hard override zona bahaya** | `checkHardOverride()` di `engine.ts`: SpO2<90, sistol<90, GCS<9, HR<40/>150 → paksa ESI-1, dengan unit test khusus di `engine.test.ts`. | Bias ke over-triage saat ragu adalah pilihan desain yang aman secara klinis dan mudah dijelaskan saat tanya jawab. |
| **Reasoning trace nyata** | `orchestrator/index.ts` mencatat setiap transisi node ke tabel `case_trace` di database, bukan log sementara yang hilang setelah proses selesai. | Transparansi reasoning adalah klaim inti proposal — dan ini benar-benar bisa dibuktikan live di database, bukan cuma diklaim. |
| **Resiliensi saat demo** | `llm.ts`: `DEMO_MODE` + fallback otomatis OpenRouter → Groq; `retrieval.ts`: fallback ke keyword search kalau pgvector kosong/gagal. | Live demo paling sering gagal karena API/koneksi panitia. Mitigasinya sudah tertanam di kode. |
| **Dashboard realtime** | `DashboardClient.tsx` berlangganan Supabase Realtime untuk INSERT/UPDATE/DELETE pada tabel `cases` — auto-update tanpa refresh. | Ini bahkan bukan bagian dari rencana Streamlit awal (PRD v1.4 §8) — nilai tambah nyata yang tinggal dipoles tampilannya. |
| **Validasi berlapis** | Zod schema dipakai konsisten di `actions.ts` (form) maupun `engine.ts` (fitur klinis), termasuk rentang nilai vital. | Mengurangi risiko data korup yang bisa merusak jalannya demo langsung. |
| **Data sintetis terstruktur** | `scripts/seed.ts` menyiapkan 18 skenario pasien mencakup ESI 1–5, semua kategori usia, dan skenario interaksi obat. | Selaras dengan §7.2 PRD v1.4 dan aturan kompetisi soal larangan data pasien asli. |

Kesimpulannya: masalah bukan "belum ada apa-apa". Masalahnya, kualitas yang sudah bagus di lapisan logika belum tercermin di permukaan yang dilihat juri lebih dulu, dan beberapa janji di dokumen tim sendiri belum tuntas. Itu yang dibedah di Bagian 2.

---

## 2. Gap Analysis — Kelemahan, Dampak, dan Solusi

Prioritas mengikuti sistem yang sama dengan PRD v1.4 §6: **P0** = wajib selesai sebelum Hackathon Sprint berakhir (3 September), **P1** = penting, boleh disederhanakan bila waktu ketat, **P2** = nice-to-have / roadmap yang cukup disebut saat presentasi.

| # | Area | Kelemahan (temuan) | Dampak | Solusi | Prio |
|---|---|---|---|---|---|
| 1 | UI / Ikon | Emoji dipakai sebagai ikon di 10 dari 13 file (landing page, dashboard, kartu pasien, panel verifikasi, dsb.) — padahal `lucide-react` sudah ada di `package.json` tapi tidak dipakai sama sekali. | Render emoji tidak konsisten antar OS/browser (terlihat di screenshot kamu sendiri), dan kesan yang muncul adalah prototipe hobi, bukan alat klinis. Ini hal pertama yang dilihat juri di video pitch. | Migrasi penuh ke `lucide-react`. Peta ikon lengkap ada di Bagian 4.2. | **P0** |
| 2 | Landing Page | Layout kartu generik, hierarki visual datar, "alur sistem" cuma badge statis berjejer, identitas visual cuma mengandalkan warna merah. | Landing page adalah aset utama video pitch (§ Video Pitch, guideline hlm. 10) — 30 detik pertama menentukan kesan juri terhadap keseluruhan tim. | Redesign hero + alur sistem jadi diagram bertahap yang hidup (lihat Bagian 4.3). | **P0** |
| 3 | Automation bias mitigation | PRD v1.4 §7.5 poin 5 menjanjikan highlight vital sign pemicu skor di layar approve. `VerificationPanel.tsx` belum mengimplementasikan ini — hanya ada tombol dan textarea catatan. | Ini justru mitigasi risiko klinis yang paling sering ditanyakan juri ("bagaimana mencegah dokter asal klik approve?"), dan sekarang jawabannya tidak cocok dengan kode. | Bangun komponen "Vital Trigger Spotlight" — detail di Fitur Andalan #2, Bagian 3. | **P0** |
| 4 | Cakupan usia anak | Pasien usia < 12 tahun (`age_months < 144`) di-exclude total dari skor otomatis — hanya tampil badge "perlu penilaian langsung". | Di Puskesmas/RS Daerah, pasien anak adalah porsi signifikan kunjungan IGD. Kalau juri menguji kasus anak saat demo, sistem terlihat tidak berfungsi untuk skenario umum. | Tambahkan jalur estimasi berbasis Pediatric Assessment Triangle (PAT) sebagai "lensa terpisah", bukan skor ESI dewasa yang dipaksakan. Detail di Fitur Andalan #1, Bagian 3. | **P1** |
| 5 | Akuntabilitas verifikasi | Field `verified_by` cuma input teks bebas dengan default terisi otomatis "dr. Ayu" — tidak ada sesi/login sama sekali. | Untuk kategori Healthcare, juri kemungkinan menanyakan siapa yang benar-benar bertanggung jawab atas approve/reject. Default ter-hardcode terlihat seperti data dummy yang lupa dihapus. | Untuk MVP: ganti default kosong (bukan "dr. Ayu") + dropdown pilih dari daftar dokter jaga dummy (bukan free text). Auth sungguhan masuk roadmap pasca-kompetisi (sudah benar di §14 v1.4). | **P1** |
| 6 | Basis pengetahuan RAG | Basis dokumen hanya 8 chunk statis (`DEMO_KNOWLEDGE` di `retrieval.ts`). Tidak ada bukti dokumen ESI/Kemenkes sungguhan sudah di-ingest ke pgvector. | Klaim "RAG" jadi rapuh kalau juri menguji query di luar 8 topik itu (luka bakar, keracunan, kegawatan obstetri, dsb.) — tidak ada hasil relevan, melemahkan nilai "AI Agent Solution & Innovation" (25%). | Ingest minimal 25–30 dokumen sungguhan (ESI Handbook, Permenkes 47/2018, 3–4 pedoman IDI/Kemenkes) ke pgvector sebelum Hackathon Sprint berakhir. | **P1** |
| 7 | Cakupan interaksi obat | ≈ 17 pasangan obat hardcoded di `drug-interactions.ts`, sedikit di bawah klaim landing page "20+ pasangan", tanpa sumber/sitasi per pasangan yang tampil di UI. | Kesenjangan kecil antara klaim dan implementasi bisa jadi celah pertanyaan juri; tanpa sitasi, klaim "evidence-based" di §2.1 PRD v1.4 tidak konsisten dengan modul ini. | Naikkan ke ≥25 pasangan bersumber dari Pionas BPOM/formularium nasional, tampilkan sumber di UI (selaras dengan modul RAG yang sudah menampilkan sitasi). | **P2** |
| 8 | Cakupan automated test | Hanya `src/lib/triage/engine.test.ts` yang punya test. Orchestrator, RAG retrieval, drug-interaction check, SOAP generator, dan Server Actions (`actions.ts`) tidak punya test sama sekali. | "Documentation & Code Quality" bernilai 10% di Tahap 2. Lebih penting lagi: regresi diam-diam di modul tanpa test bisa merusak demo tepat saat presentasi ke juri nasional. | Tambahkan test untuk: `retrieveContext()` (fallback keyword search), `checkDrugInteractions()`, dan minimal satu test integrasi orchestrator end-to-end dengan `DEMO_MODE=true`. | **P1** |
| 9 | Status proses tidak terlihat | Setelah submit intake, `actions.ts` memicu orchestrator secara fire-and-forget lalu langsung redirect ke dashboard. Tidak ada indikator progres per-node yang terlihat perawat/dokter. | Saat demo live, ada jeda beberapa detik di mana kasus baru terlihat "diam" di dashboard sebelum `current_node` berubah — berisiko terlihat seperti bug di depan juri. | Tambahkan progress indicator bertahap (intake → retrieve_context → …) di kartu pasien memakai data `current_node` yang sudah tersedia dari Realtime subscription — tidak perlu backend baru. | **P0** |
| 10 | Dokumentasi & video pitch | Tidak ditemukan file pitch deck atau video di repo, sementara deadline Tahap 1 adalah 8 Agustus 2026. | Tanpa ini, tim tidak lolos ke Top 15 terlepas seberapa bagus kode-nya. | Prioritas tertinggi 3 hari ke depan — lihat Bagian 5.1. | **P0** |

---

## 3. Fitur Andalan Baru (Flagship Features)

Tiga fitur ini dipilih dengan satu saringan: harus benar-benar bisa dikerjakan tim 2 orang dalam sisa waktu Hackathon Sprint, dan harus langsung menaikkan skor di kriteria juri yang berbobot besar (AI Agent Solution & Innovation 25%, Potential Impact 15–20%) — bukan sekadar fitur pemanis.

### 3.1 Lensa Triase Pediatrik (Pediatric Safety Lens)

**Masalah:** Pasien anak (usia < 12 tahun) saat ini 100% di-exclude dari skor otomatis. Di Puskesmas/RS Daerah, ini bisa jadi porsi kunjungan IGD yang besar — sistem yang "menyerah" di sini terlihat setengah jadi saat didemokan.

**Kenapa bukan sekadar pakai ambang ESI dewasa:** Ambang vital anak secara klinis berbeda tajam per rentang usia (HR 150 = bahaya untuk dewasa, normal untuk bayi) — ini alasan tim sendiri mengecualikannya di v1.3–v1.4, dan itu keputusan yang benar. Solusinya bukan memaksakan ambang dewasa ke anak, tapi memberi anak "lensa" penilaian yang sesuai.

**Cara kerja yang diusulkan:** Tambahkan langkah baru di rule engine khusus kategori Bayi/Balita & Anak-anak, mengadaptasi prinsip Pediatric Assessment Triangle (Tampilan/*Appearance*, Usaha Napas/*Work of Breathing*, Sirkulasi Kulit/*Circulation to Skin*) yang tidak butuh alat tambahan — dikombinasikan dengan tabel ambang vital spesifik per kelompok usia anak (mis. HR & RR normal bayi vs balita vs anak berbeda tabel, bukan satu angka).

- Output tetap berupa `esi_score`, tapi dengan flag `pediatric_assisted: true` dan badge UI berbeda warna dari skor dewasa — tetap jujur soal keterbatasannya (bukan silent auto-score), hanya tidak lagi "kosong" di dashboard.
- Confidence level untuk kasus pediatrik dikunci maksimal "medium" apa pun kelengkapan datanya — sinyal eksplisit bahwa ini estimasi berbantuan, bukan skor penuh.
- Acceptance test setara §4.3.1 PRD v1.4: ada unit test yang membuktikan ambang pediatrik tidak pernah memakai jalur `computeEsiScore()` milik dewasa.

**Dampak ke penilaian:** Menjawab gap #4 di Bagian 2, sekaligus jadi contoh nyata "inovasi yang bertanggung jawab" saat sesi tanya jawab — lebih kuat daripada mengklaim skor 100% otomatis untuk semua usia.

### 3.2 Sorotan Vital Pemicu Skor (Vital Trigger Spotlight)

**Masalah:** Ini fitur yang sudah dijanjikan tim sendiri di PRD v1.4 §7.5 poin 5 untuk mencegah automation bias, tapi belum ada di kode (lihat gap #3).

**Cara kerja:** Rule engine (`engine.ts`) sudah menghasilkan array `reasoning` berisi jejak keputusan tiap cabang (mis. "SpO2 85% < 90% → PAKSA ESI-1") — data ini sudah ada, tinggal ditampilkan. Di `VerificationPanel`, sebelum tombol Setujui aktif, tampilkan 1–2 baris reasoning paling menentukan sebagai kartu visual bertanda, dengan nilai vital penyebabnya ditandai warna berbeda dari vital normal lainnya.

- Kalau `override_triggered = true`, kartu ini wajib tampil dan tidak bisa di-collapse — dokter harus melihatnya sebelum tombol Setujui bisa diklik.
- Kalau `confidence = low`, tampilkan juga daftar field vital yang kosong sebagai alasan kenapa skor tidak percaya diri.

**Dampak ke penilaian:** Menutup gap paling berisiko secara klinis di dokumen tim sendiri, dan memberi contoh konkret "human-in-the-loop yang sungguhan" saat demo — bukan hanya tombol dekoratif.

### 3.3 Linimasa Kasus & Peta Keputusan Agent (Case Timeline)

**Masalah:** Reasoning trace sudah tersimpan lengkap di tabel `case_trace` (kekuatan #3 di Bagian 1), tapi berdasarkan struktur PRD v1.4 §9 ditampilkan sebagai "log ringkas" — berisiko dianggap juri sebagai daftar teks biasa, bukan bukti multi-agent yang jalan paralel.

**Cara kerja:** Ubah tampilan reasoning trace di halaman `/case/[id]` dari daftar teks menjadi diagram linimasa vertikal: setiap node (`retrieve_context`, `urgency_scoring`, `drug_interaction_check`, `generate_soap`) sebagai titik dengan waktu proses masing-masing, dan tandai secara visual dua node yang berjalan paralel (`urgency_scoring` & `drug_interaction_check`) berdampingan, bukan berurutan — supaya paralelisme multi-agent yang sudah benar-benar diimplementasikan (lihat `orchestrator/index.ts`, `Promise.all`) juga terlihat jelas, bukan cuma benar di kode tapi tersembunyi di UI.

- Setiap titik bisa diklik untuk expand detail dari kolom `details` di `case_trace` (sudah tersimpan, tinggal dirender).
- Total waktu proses (dari intake sampai `await_doctor_verification`) ditampilkan sebagai ringkasan di atas linimasa — mendukung klaim performa di §5 PRD v1.4.

**Dampak ke penilaian:** Fitur ini murah untuk dikerjakan (data sudah ada, ini murni pekerjaan tampilan) tapi efeknya besar: mengubah kekuatan arsitektur yang sudah ada (Bagian 1) menjadi sesuatu yang benar-benar terlihat dan dipahami juri dalam hitungan detik, sesuai NFR Usability di §5 PRD v1.4 ("dipahami <10 detik oleh juri baru").

---

## 4. Rencana Modernisasi UI/UX

Tujuan modernisasi ini bukan "mempercantik" dalam artian kosmetik. Untuk produk kesehatan, tampilan yang tenang, konsisten, dan dapat dipercaya adalah bagian dari fungsi — dokter yang lelah di shift malam butuh dashboard yang bisa dibaca sekilas, bukan yang ramai. Prinsip ini yang dipakai di setiap keputusan desain di bawah.

### 4.1 Sistem Desain (Design Tokens)

**Warna**

| Token | Nilai | Pemakaian |
|---|---|---|
| Primary (aksi utama) | `#C0392B` (merah klinis, bukan merah cerah alarm) | Tombol utama, aksen brand — dipertahankan dari desain lama karena sudah dikenali, tapi dipertegas konsistensinya. |
| Ink (teks utama) | `#1F2933` | Semua teks isi — lebih lembut dari hitam pekat, mengurangi kelelahan mata saat dipakai lama. |
| Triase — Merah | `#C0392B` di atas latar `#FBEAE8` | ESI 1–2, kode Kemenkes Merah. |
| Triase — Kuning | `#B7791F` di atas latar `#FCF3E3` | ESI 3, kode Kemenkes Kuning. |
| Triase — Hijau | `#1E7E4F` di atas latar `#E7F5EC` | ESI 4–5, kode Kemenkes Hijau. |
| Triase — Hitam | `#1F2933` di atas latar `#E4E6EA` | Konvensi triase bencana. |
| Netral / garis | `#F4F5F7` latar, `#D9DCE1` garis | Kartu, tabel, pembatas — konsisten di seluruh halaman. |

- Kode warna triase SELALU dipasangkan dengan label teks & ikon, tidak pernah warna saja — mempertahankan aksesibilitas untuk dokter/perawat dengan buta warna parsial (sudah dilakukan sebagian di `PatientCard`, dijadikan aturan wajib di semua tempat).

**Tipografi & Spasi**

- Font tetap Geist (sudah dipakai, sudah bagus) — pertahankan, jangan ganti tanpa alasan kuat.
- Skala ukuran dirapikan ke 6 langkah tetap (12/14/16/20/24/32px) supaya hierarki konsisten antar halaman, bukan ukuran ad-hoc per komponen seperti sekarang.
- Radius sudut konsisten: 8px untuk elemen kecil (badge, input), 12px untuk kartu, 16px untuk panel besar — saat ini bercampur antara `rounded-lg`/`rounded-xl` tanpa pola jelas.

### 4.2 Migrasi Ikon: Emoji → `lucide-react`

`lucide-react` versi 1.26.0 sudah terpasang di `package.json` tapi belum diimpor di satu file pun. Ini migrasi murni teknis (bukan desain ulang), berisiko rendah, dan efeknya langsung terlihat di seluruh aplikasi. Peta penggantian lengkap:

| Emoji lama | Dipakai di | Ikon `lucide-react` pengganti |
|---|---|---|
| 🏆 (trofi) | Landing page — badge kompetisi | `Trophy` |
| 🧠 (otak) | Landing page — fitur RAG+ESI | `BrainCircuit` |
| 💊 (pil) | Landing page — fitur cek obat | `Pill` |
| 📝 (memo) | Landing page, SOAPView — ringkasan SOAP | `ClipboardList` |
| 👨‍⚕️ (dokter) | Landing page — fitur verifikasi | `Stethoscope` |
| 🔴 🟡 🟢 (bulatan warna) | Dashboard, PatientCard, filter — kode warna Kemenkes | `Circle` (diisi warna sesuai token 4.1) berdampingan dengan label teks |
| 🔍 (kaca pembesar) | Landing page, case detail — transparansi reasoning | `SearchCheck` |
| ⚠️ (segitiga seru) | Disclaimer, PatientCard, drug interaction, input page | `TriangleAlert` |
| 🚑 (ambulans) | Navbar, landing, input — tombol "Pasien Baru" | `Siren` |
| ⏳ (jam pasir) | VerificationPanel, dashboard stats — status pending | `Clock` |
| ✅ / ❌ (centang/silang) | VerificationPanel — approve/reject | `CircleCheck` / `CircleX` |
| ✏️ (pensil) | VerificationPanel — edit SOAP | `Pencil` |
| 💾 (disket) | VerificationPanel — simpan editan | `Save` |
| 🏥 (rumah sakit) | Dashboard — empty state | `Building2` |
| 🚨 (lampu sirine) | DrugInteractionList — interaksi berat | `OctagonAlert` |
| ⚡ (petir) | TriageBadge, case detail — urgensi | `Zap` |
| 📚 (buku) | Case detail — referensi RAG | `BookOpen` |
| 💬 (bubble chat) | SOAPView | `MessageSquare` |
| 📊 (grafik) | SOAPView, case detail | `ClipboardCheck` |

Aturan penerapan: ukuran ikon konsisten per konteks (16px inline di teks, 20px di tombol, 28–32px di kartu fitur), warna ikon mengikuti warna teks di sekitarnya (bukan warna asli emoji) supaya tetap tunduk pada sistem warna di 4.1, dan setiap ikon status (approve/reject/pending) tetap disertai label teks — ikon memperkuat makna, bukan menggantikan teks.

### 4.3 Redesain per Halaman

**Landing Page (`/`)**
- Hero: pertahankan struktur (badge kompetisi → judul → deskripsi → dua tombol) tapi naikkan kontras & kedalaman — tambahkan lapisan visual halus (gradasi radial tipis di belakang judul, bukan flat putih polos) supaya terasa seperti produk, bukan wireframe.
- "Alur Sistem": ganti dari badge berjejer statis menjadi diagram bertahap dengan nomor urut, ikon per tahap, dan penanda visual jelas dua tahap yang berjalan paralel (Urgency Scoring & Cek Interaksi Obat) — ini kesempatan menunjukkan multi-agent architecture sejak detik pertama video pitch, bukan cuma teks "Alur Sistem" generik.
- Kartu fitur: turunkan dari 6 kartu setara jadi 3 kartu utama (RAG+ESI, Cek Obat, Verifikasi Dokter) yang lebih besar dan detail + 3 kartu sekunder lebih ringkas di bawahnya — hierarki visual membantu juri menangkap apa yang paling penting dalam beberapa detik pertama.
- Disclaimer klinis: pertahankan isinya (sudah tepat secara etik) tapi pisahkan secara visual lebih tegas dari konten marketing di atasnya — kotak dengan border kiri tebal warna amber, ikon `TriangleAlert`, bukan cuma latar kuning muda.

**Dashboard (`/dashboard`)**
- Stats bar: pertahankan 5 angka ringkasan, tapi beri setiap kartu ikon lucide + warna latar sesuai token triase (4.1), bukan emoji bulat warna.
- Tambahkan progress indicator per-kasus (menutup gap #9, Bagian 2) langsung di `PatientCard` — titik-titik kecil menunjukkan tahap `current_node`, terisi progresif, memakai warna netral sampai selesai lalu warna triase final.
- Indikator "Live" Realtime dipertegas jadi badge kecil dengan titik berdenyut halus — sudah ada logikanya di kode, tinggal diperkuat secara visual supaya juri sadar ini bukan halaman statis.

**Halaman Input (`/input`)**
- Kelompokkan form jadi tahapan visual jelas (Identitas → Keluhan → Tanda Vital → Riwayat) dengan indikator langkah di atas, bukan satu form panjang tanpa jeda — form panjang untuk perawat yang terburu-buru (Persona 2, §3 PRD v1.4) perlu terasa cepat diisi, bukan cuma cepat diketik.
- Field vital sign diberi indikator rentang normal ringan di sebelah label (mis. "SpO2 (normal: 95–100%)") — membantu perawat sekaligus jadi bukti visual ke juri bahwa validasi rentang klinis (sudah ada di Zod schema) benar-benar dikomunikasikan ke pengguna, bukan cuma tervalidasi diam-diam di backend.

**Detail Kasus & Verifikasi (`/case/[id]`)**
- Terapkan Case Timeline (Fitur Andalan #3) menggantikan daftar teks reasoning trace.
- Terapkan Vital Trigger Spotlight (Fitur Andalan #2) di atas tombol aksi VerificationPanel.
- SOAP summary ditampilkan sebagai 4 kartu berlabel S/O/A/P dengan ikon berbeda tiap kartu, bukan blok teks panjang — mendukung NFR Usability §5 PRD v1.4 soal keterbacaan cepat.

---

## 5. Timeline Eksekusi — Dipetakan ke Tanggal Sesungguhnya

Timeline ini menggantikan §11 PRD v1.4 dengan versi yang sudah disesuaikan ke posisi tim hari ini (5 Agustus 2026) — termasuk fakta bahwa prototipe sudah berjalan lebih maju dari jadwal awal, tapi materi submisi Tahap 1 belum terlihat siap.

### 5.1 Horizon 1 — Sisa 3 Hari sampai Batas Tahap 1 (5–8 Agustus)

> **Fokus horizon ini BUKAN menuntaskan semua gap di Bagian 2.** Tahap 1 hanya menilai Problem Understanding, AI Agent Solution & Innovation, Technical Feasibility, Potential Impact, dan kualitas Pitch Deck & Video Pitch (lihat tabel Judging Criteria guideline hlm. 14) — prototipe yang benar-benar jalan bukan syarat wajib di tahap ini, tapi kalau sudah ada (dan memang sudah), pemakaiannya di video jadi nilai tambah besar asal terlihat meyakinkan.

1. **Hari 1 (5 Agu, hari ini):** terapkan migrasi ikon (4.2) dan redesain hero landing page (4.3) — ini yang akan direkam di video, jadi diprioritaskan di atas gap teknis lain.
2. **Hari 1–2:** susun AI Project Proposal sesuai struktur wajib di guideline (Identitas, Problem Statement, AI Agent Solution, Technology & Architecture, Impact & Future Development) — draf bisa banyak menarik langsung dari PRD v1.4 §1–3 dan §7 yang sudah lengkap.
3. **Hari 2:** rekam Video Pitch (maks. 3 menit, 720p, 16:9, MP4) mengikuti struktur wajib guideline: Perkenalan Tim (±20 dtk) → Problem Statement (±40 dtk) → AI Agent Solution (±90 dtk, tampilkan landing page yang sudah dipoles + satu alur demo singkat) → Impact & Closing (±30 dtk).
4. **Hari 3 (8 Agu):** finalisasi portofolio di `bisa.ai/portofolio`, unggah link video (YouTube unlisted/Google Drive), submit form pendaftaran sebelum tenggat.

### 5.2 Horizon 2 — Hackathon Sprint (13 Agustus – 3 September, menunggu pengumuman Top 15 di 12 Agustus)

| Minggu | Periode | Fokus |
|---|---|---|
| Minggu 1 | 13–19 Agu | Semua item P0 di Bagian 2 (gap #1, #2, #3, #9) + mulai Fitur Andalan #1 (Pediatric Safety Lens) dan #2 (Vital Trigger Spotlight). |
| Minggu 2 | 20–26 Agu | Selesaikan Fitur Andalan #1–#3, mulai item P1 (gap #4 auth ringan, #6 perluasan RAG, #8 test coverage). |
| Minggu 3 | 27 Agu – 3 Sep | Item P2 (gap #7 perluasan interaksi obat), polish akhir UI (4.3), dokumentasi lengkap (README + PRD ini dilampirkan), rekam Video Demo (maks. 5 menit sesuai guideline Hackathon Sprint), submit GitHub private repo + link portofolio. |

### 5.3 Horizon 3 — Demo Day & Grand Final (10 September)

- Siapkan 2–3 skenario live-demo yang sudah diuji berkali-kali sebelumnya (bukan improvisasi): 1 kasus ESI-1 (menunjukkan hard override), 1 kasus dewasa ESI-3/4 dengan interaksi obat, 1 kasus anak (menunjukkan Pediatric Safety Lens).
- Siapkan video demo sebagai cadangan kalau koneksi panitia bermasalah saat sesi 10 menit presentasi + 10 menit tanya jawab (format sesuai guideline hlm. 12).
- Latih jawaban untuk pertanyaan yang paling mungkin muncul: penanganan pasien anak, akuntabilitas verifikasi dokter, dan validasi medis (§7.5 PRD v1.4) — jawaban jujur soal keterbatasan lebih kuat di mata juri daripada klaim berlebihan.

---

## 6. Definition of Done

Checklist ini dipakai untuk menilai "sudah selesai atau belum" secara objektif — bukan perasaan subjektif seperti pertanyaan di awal dokumen ini.

**6.1 Sebelum submit Tahap 1 (8 Agustus)**
- [ ] Tidak ada emoji tersisa di landing page (halaman yang tampil di video).
- [ ] Hero & diagram alur sistem sudah memakai desain baru (4.1–4.3).
- [ ] AI Project Proposal lengkap 5 bagian sesuai struktur guideline, diunggah sebagai portofolio di bisa.ai.
- [ ] Video Pitch ≤ 3 menit, 720p, 16:9, MP4, sudah diunggah dan tautannya tercantum di form pendaftaran.

**6.2 Sebelum submit Hackathon Sprint (3 September)**
- [ ] Semua item P0 & P1 di Bagian 2 selesai; item P2 minimal terdokumentasi sebagai roadmap kalau tidak sempat.
- [ ] Tiga Fitur Andalan di Bagian 3 berfungsi dan bisa didemokan.
- [ ] Tidak ada emoji tersisa di seluruh aplikasi (bukan cuma landing page).
- [ ] Test coverage mencakup minimal: rule engine (sudah ada), RAG fallback, drug-interaction check, dan satu test integrasi orchestrator.
- [ ] README + dokumentasi arsitektur diperbarui mengikuti keputusan di dokumen ini.
- [ ] Video Demo ≤ 5 menit + source code GitHub (private, akses panitia/juri) + link portofolio terkirim lewat form panitia.

---

## 7. Pemetaan ke Judging Criteria (Tahap 2 — Hackathon Sprint)

| Kriteria juri | Bobot | Kondisi sebelum dokumen ini | Kondisi setelah rencana ini dijalankan |
|---|---|---|---|
| AI Agent Implementation | 30% | Sudah kuat di backend, tapi paralelisme & reasoning trace tidak terlihat jelas di UI. | Case Timeline (3.3) membuat arsitektur multi-agent yang sudah benar terlihat jelas dalam hitungan detik. |
| Technical Architecture | 25% | Terdokumentasi baik di PRD v1.4, tapi basis RAG tipis (8 dokumen) dan test coverage minim. | RAG diperluas (gap #6), test coverage naik (gap #8) — klaim arsitektur didukung bukti, bukan cuma dokumen. |
| Functionality & UX | 20% | Emoji, layout generik, status proses tidak terlihat, automation-bias mitigation belum ada di kode. | Migrasi ikon (4.2), redesain halaman (4.3), progress indicator (gap #9), dan Vital Trigger Spotlight (3.2) langsung menaikkan kriteria ini. |
| Potential Impact | 15% | Klaim manfaat kuat di teori, tapi porsi pasien anak (populasi nyata Puskesmas) di-exclude total. | Pediatric Safety Lens (3.1) memperluas cakupan populasi nyata yang bisa dilayani sistem, sambil tetap jujur soal batasannya. |
| Documentation & Code Quality | 10% | README template default, dokumentasi arsitektur ada tapi terpisah dari kode, test coverage satu modul. | README diperbarui, test diperluas ke modul kunci, PRD ini jadi lampiran dokumentasi teknis. |
