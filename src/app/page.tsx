'use client';

/**
 * / — Landing / Home page
 * Premium redesign: animated hero, live stats strip, animated flow diagram,
 * feature cards with glassmorphism, dark/light adaptive.
 */

import Link from 'next/link';
import {
  Trophy, BrainCircuit, Pill, Stethoscope, Circle,
  SearchCheck, TriangleAlert, Siren, ClipboardList,
  Zap, ShieldCheck, Activity, ArrowRight, Clock
} from 'lucide-react';

/* ── Static data ─────────────────────────────────────────────────────────────── */

const STATS = [
  { value: '<15 dtk', label: 'Waktu analisis' },
  { value: 'ESI 1–5', label: 'Level triase' },
  { value: '30+', label: 'Interaksi obat' },
  { value: '25+', label: 'Referensi RAG' },
];

const MAIN_FEATURES = [
  {
    icon: BrainCircuit,
    color: 'var(--brand-red)',
    bg: 'var(--brand-red-bg)',
    title: 'RAG + ESI Scoring',
    desc: 'Rule engine deterministik menghitung skor urgensi ESI 1–5. LLM hanya mengekstrak fitur — bukan penentu skor.',
    badge: 'AI-Powered',
  },
  {
    icon: Pill,
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: 'Cek Interaksi Obat',
    desc: 'Agent farmasi paralel memeriksa 30+ pasangan interaksi obat umum IGD secara otomatis dengan sumber Pionas BPOM.',
    badge: 'Paralel Agent',
  },
  {
    icon: Stethoscope,
    color: '#047857',
    bg: '#ecfdf5',
    title: 'Verifikasi Dokter',
    desc: 'Human-in-the-loop sejati: alur berhenti menunggu Approve/Edit/Reject dengan Vital Trigger Spotlight.',
    badge: 'Human-in-Loop',
  },
];

const SECONDARY_FEATURES = [
  {
    icon: ClipboardList,
    title: 'Ringkasan SOAP',
    desc: 'Draft SOAP (S/O/A/P) otomatis berbasis hasil triase, RAG, dan data pasien — siap diedit dokter.',
  },
  {
    icon: Circle,
    title: 'Kode Warna Kemenkes',
    desc: 'Skor ESI dipetakan ke Merah/Kuning/Hijau/Hitam sesuai Permenkes No. 47/2018.',
    iconFill: true,
  },
  {
    icon: SearchCheck,
    title: 'Transparansi Reasoning',
    desc: 'Setiap langkah agent tercatat di Case Timeline — tidak ada keputusan tersembunyi.',
  },
  {
    icon: ShieldCheck,
    title: 'Pediatric Safety Lens',
    desc: 'Estimasi skor ESI untuk pasien anak dengan ambang vital spesifik per kelompok usia.',
  },
  {
    icon: Activity,
    title: 'Realtime Dashboard',
    desc: 'Supabase Realtime: kasus baru atau perubahan status muncul otomatis tanpa refresh halaman.',
  },
  {
    icon: Zap,
    title: 'Hard Override Kritis',
    desc: 'SpO2 <90%, sistol <90 mmHg, GCS <9, HR ekstrem → sistem paksa ESI-1 tanpa pertanyaan.',
  },
];

const FLOW_STEPS = [
  { num: '1', label: 'Input Pasien', sub: 'Perawat input', icon: Siren, active: false },
  { num: '2', label: 'RAG Context', sub: 'Retrieve Referensi', icon: SearchCheck, active: false },
  { num: 'P', label: 'Paralel', sub: 'ESI + Cek Obat', icon: Zap, active: true, isParallel: true },
  { num: '4', label: 'SOAP Draft', sub: 'Generate AI', icon: ClipboardList, active: false },
  { num: '✓', label: 'Verifikasi', sub: 'Dokter Jaga', icon: Stethoscope, active: false, isFinal: true },
];

/* ── Component ───────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg-page)' }} className="relative overflow-hidden">

      {/* ── Ambient background orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-48 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-breathe"
          style={{ background: 'radial-gradient(circle, var(--brand-red) 0%, transparent 70%)', animationDelay: '0s' }}
        />
        <div
          className="absolute top-96 right-0 w-80 h-80 rounded-full opacity-10 blur-3xl animate-breathe"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-48 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl animate-breathe"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', animationDelay: '4s' }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24 relative">

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <div className="text-center mb-16 animate-fade-up">

          {/* Competition badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8 shadow-sm"
            style={{
              background: 'var(--brand-red-bg)',
              border: '1px solid var(--brand-red-muted)',
              color: 'var(--brand-red)',
            }}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            BISA AI — National AI Agent Challenge 2026 · Kategori Healthcare
          </div>

          {/* Main heading */}
          <h1
            className="text-5xl sm:text-6xl font-black tracking-tight mb-6"
            style={{ color: 'var(--fg-primary)' }}
          >
            Med<span className="gradient-text">Agent</span>
            <span className="gradient-text">-Alpha</span>
          </h1>

          <p
            className="text-xl max-w-2xl mx-auto mb-4 leading-relaxed"
            style={{ color: 'var(--fg-secondary)' }}
          >
            AI Agent otonom untuk pra-triase pasien IGD.{' '}
            <span style={{ color: 'var(--fg-primary)' }} className="font-semibold">
              Mendukung keputusan dokter lebih cepat
            </span>{' '}
            — bukan menggantikannya.
          </p>

          {/* Stats strip */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-10">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-2xl font-black" style={{ color: 'var(--brand-red)' }}>
                  {value}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              href="/dashboard"
              id="hero-dashboard-btn"
              className="rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-primary)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              Lihat Dashboard
            </Link>
            <Link
              href="/input"
              id="hero-pasien-baru-btn"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--brand-red) 0%, #fb7185 100%)',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
              }}
            >
              <Siren className="w-5 h-5" />
              Daftarkan Pasien
            </Link>
          </div>
        </div>

        {/* ── Flow Diagram ─────────────────────────────────────────────────────── */}
        <div className="mb-20">
          <h2
            className="text-center text-xs font-bold uppercase tracking-widest mb-8"
            style={{ color: 'var(--fg-muted)' }}
          >
            Alur Sistem Multi-Agent
          </h2>

          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-2">

              {/* Steps 1 & 2 */}
              {FLOW_STEPS.filter(s => !s.isParallel && !s.isFinal).slice(0, 2).map((step, i) => (
                <div key={step.num} className="flex items-center gap-2 md:gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-105"
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--fg-primary)',
                      }}
                    >
                      {step.num}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--fg-secondary)' }}>{step.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{step.sub}</span>
                  </div>
                  {/* Connector */}
                  <div
                    className="hidden md:block h-px w-8 relative overflow-hidden"
                    style={{ background: 'var(--border-default)' }}
                  >
                    <div className="absolute inset-0 w-full h-full shimmer-bg" />
                  </div>
                </div>
              ))}

              {/* Parallel box */}
              <div className="relative md:mx-2">
                <div
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: 'var(--brand-red-bg)',
                    border: '1.5px dashed var(--brand-red)',
                  }}
                >
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full animate-glow-pulse"
                    style={{
                      background: 'var(--brand-red)',
                      color: '#fff',
                    }}
                  >
                    Paralel ⚡
                  </div>
                  <div className="flex gap-5 mt-1">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                        style={{ background: 'var(--brand-red-bg)', border: '1px solid var(--brand-red)' }}
                      >
                        <BrainCircuit className="w-5 h-5" style={{ color: 'var(--brand-red)' }} />
                      </div>
                      <span className="text-[10px] font-bold w-20 text-center" style={{ color: 'var(--brand-red)' }}>
                        Urgency Scoring (ESI)
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
                        style={{ background: '#f5f3ff', border: '1px solid #7c3aed' }}
                      >
                        <Pill className="w-5 h-5 text-violet-600" />
                      </div>
                      <span className="text-[10px] font-bold w-20 text-center text-violet-600">
                        Cek Interaksi Obat
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps 4 & final */}
              {FLOW_STEPS.filter(s => !s.isParallel && !s.isFinal).slice(2).concat(FLOW_STEPS.filter(s => s.isFinal)).map((step) => (
                <div key={step.num} className="flex items-center gap-2 md:gap-3">
                  <div
                    className="hidden md:block h-px w-8 relative overflow-hidden"
                    style={{ background: 'var(--border-default)' }}
                  >
                    <div className="absolute inset-0 w-full h-full shimmer-bg" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-sm shadow-sm transition-all hover:scale-105 ${step.isFinal ? 'text-white' : ''}`}
                      style={step.isFinal ? {
                        background: 'linear-gradient(135deg, #1f2933 0%, #374151 100%)',
                        border: '1px solid #374151',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      } : {
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--fg-primary)',
                      }}
                    >
                      {step.isFinal ? <Stethoscope className="w-5 h-5" /> : step.num}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: step.isFinal ? 'var(--fg-primary)' : 'var(--fg-secondary)' }}>
                      {step.label}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{step.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Feature Cards ────────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-3 mb-5 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {MAIN_FEATURES.map(({ icon: Icon, color, bg, title, desc, badge }) => (
            <div
              key={title}
              className="glass-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 group relative overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`
                }}
              />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div
                  className="inline-flex items-center justify-center rounded-xl p-3 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: bg }}
                >
                  <Icon className="h-6 w-6" style={{ color }} />
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: bg, color }}
                >
                  {badge}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--fg-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* ── Secondary Feature Grid ────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-16 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          {SECONDARY_FEATURES.map(({ icon: Icon, title, desc, iconFill }) => (
            <div
              key={title}
              className="flex gap-4 rounded-xl p-4"
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="shrink-0 mt-0.5">
                <Icon
                  className="w-5 h-5"
                  style={{ color: 'var(--fg-muted)' }}
                  fill={iconFill ? 'currentColor' : 'none'}
                />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--fg-primary)' }}>{title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── CTA Strip ────────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-8 text-center mb-12 animate-fade-up relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--brand-red-bg) 0%, var(--bg-card) 100%)',
            border: '1px solid var(--brand-red-muted)',
            boxShadow: 'var(--shadow-glow-red)',
            animationDelay: '0.3s'
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f43f5e\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="flex items-center justify-center gap-2 mb-3 relative z-10">
            <Clock className="w-5 h-5" style={{ color: 'var(--brand-red)' }} />
            <span className="font-bold text-lg" style={{ color: 'var(--fg-primary)' }}>
              Mulai analisis dalam hitungan detik
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--fg-secondary)' }}>
            Daftarkan pasien → agen bekerja otomatis → dokter tinggal verifikasi
          </p>
          <Link
            href="/input"
            id="cta-daftar-btn"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 relative z-10"
            style={{
              background: 'linear-gradient(135deg, var(--brand-red) 0%, #fb7185 100%)',
              boxShadow: '0 6px 20px rgba(225, 29, 72, 0.4)',
            }}
          >
            <Siren className="w-5 h-5" />
            Daftarkan Pasien Sekarang
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Disclaimer ────────────────────────────────────────────────────────── */}
        <div
          className="flex gap-4 rounded-xl p-6 shadow-sm"
          style={{
            background: '#fffbeb',
            borderTop: '1px solid #fde68a',
            borderBottom: '1px solid #fde68a',
            borderRight: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <TriangleAlert className="h-6 w-6 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">Disclaimer Klinis</p>
            <p className="leading-relaxed opacity-90">
              Sistem ini adalah <strong>decision support tool</strong>, bukan pengganti keputusan medis. Seluruh data yang
              digunakan adalah <strong>data sintetis</strong> — tidak ada data pasien asli. Setiap output wajib diverifikasi
              dokter sebelum ditindaklanjuti. Skor ESI tidak menggantikan penilaian visual langsung terhadap pasien.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
