/**
 * / — Landing / Home page
 * Redesigned for PRD v2.0
 */

import Link from 'next/link';
import {
  Trophy,
  BrainCircuit,
  Pill,
  Stethoscope,
  Circle,
  SearchCheck,
  TriangleAlert,
  Siren,
  ClipboardList
} from 'lucide-react';

const MAIN_FEATURES = [
  {
    icon: <BrainCircuit className="h-6 w-6 text-red-600" />,
    title: 'RAG + ESI Scoring',
    desc: 'Skor urgensi ESI dihitung oleh rule engine deterministik — LLM hanya ekstraksi data, bukan penentu skor.',
  },
  {
    icon: <Pill className="h-6 w-6 text-red-600" />,
    title: 'Cek Interaksi Obat',
    desc: 'Agent farmasi paralel memeriksa 20+ pasangan interaksi obat umum IGD secara otomatis.',
  },
  {
    icon: <Stethoscope className="h-6 w-6 text-red-600" />,
    title: 'Verifikasi Dokter',
    desc: 'Human-in-the-loop: alur benar-benar berhenti menunggu approve / edit / reject dari dokter.',
  },
];

const SECONDARY_FEATURES = [
  {
    icon: <ClipboardList className="h-5 w-5 text-gray-500" />,
    title: 'Ringkasan SOAP',
    desc: 'SOAP note terstruktur dibuat otomatis berdasarkan hasil triase, referensi RAG, dan data pasien.',
  },
  {
    icon: <Circle className="h-5 w-5 fill-red-500 text-red-500" />,
    title: 'Kode Warna Kemenkes',
    desc: 'Skor ESI dipetakan ke Merah/Kuning/Hijau/Hitam sesuai Permenkes No. 47/2018.',
  },
  {
    icon: <SearchCheck className="h-5 w-5 text-gray-500" />,
    title: 'Transparansi Reasoning',
    desc: 'Setiap langkah agent tercatat di Reasoning Trace — tidak ada keputusan tersembunyi.',
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background radial gradient for depth */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#C0392B] opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-4 py-1.5 text-xs font-medium text-red-700 mb-8 shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500" />
            BISA AI — National AI Agent Challenge 2026 · Kategori Healthcare
          </div>
          <h1 className="text-5xl font-extrabold text-[#1F2933] mb-6 tracking-tight">
            MedAgent<span className="text-[#C0392B]">-Alpha</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            AI Agent otonom untuk pra-triase pasien IGD. Mendukung keputusan dokter lebih cepat —
            bukan menggantikannya.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#1F2933] px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
            >
              Lihat Dashboard
            </Link>
            <Link
              href="/input"
              className="inline-flex items-center gap-2 rounded-lg bg-[#C0392B] px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              <Siren className="w-5 h-5" />
              Daftarkan Pasien
            </Link>
          </div>
        </div>

        {/* Alur sistem diagram */}
        <div className="mb-20">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-gray-400 mb-8">
            Alur Sistem Berbasis Multi-Agent
          </h2>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm font-medium">
            {/* Step 1 & 2 */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shadow-sm z-10">1</div>
                <span className="mt-2 text-xs text-gray-600">Input Pasien</span>
              </div>
              <div className="h-0.5 w-8 bg-gray-300"></div>
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shadow-sm z-10">2</div>
                <span className="mt-2 text-xs text-gray-600">Retrieve Context</span>
              </div>
              <div className="h-0.5 w-8 bg-gray-300 hidden md:block"></div>
            </div>

            {/* Parallel Steps 3 */}
            <div className="relative flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 w-full md:w-auto mt-4 md:mt-0">
              <span className="absolute -top-3 bg-gray-50 px-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Parallel Execution</span>
              <div className="flex gap-6 mt-2">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200 shadow-sm"><BrainCircuit className="w-5 h-5"/></div>
                  <span className="mt-2 text-xs text-gray-600 w-24">Urgency Scoring<br/>(ESI)</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"><Pill className="w-5 h-5"/></div>
                  <span className="mt-2 text-xs text-gray-600 w-24">Cek Interaksi Obat</span>
                </div>
              </div>
            </div>

            {/* Step 4 & 5 */}
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className="h-0.5 w-8 bg-gray-300 hidden md:block"></div>
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shadow-sm z-10">4</div>
                <span className="mt-2 text-xs text-gray-600">Generate SOAP</span>
              </div>
              <div className="h-0.5 w-8 bg-gray-300"></div>
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2933] text-white font-bold shadow-sm z-10"><Stethoscope className="w-5 h-5"/></div>
                <span className="mt-2 text-xs font-semibold text-[#1F2933]">Verifikasi Dokter</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features - Main */}
        <div className="grid gap-6 sm:grid-cols-3 mb-6">
          {MAIN_FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-red-50 p-3">
                {icon}
              </div>
              <h3 className="font-bold text-lg text-[#1F2933] mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Features - Secondary */}
        <div className="grid gap-4 sm:grid-cols-3 mb-16">
          {SECONDARY_FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-4 rounded-xl bg-gray-50/50 border border-[#F4F5F7] p-5">
              <div className="shrink-0 mt-1">{icon}</div>
              <div>
                <h4 className="font-semibold text-sm text-[#1F2933] mb-1">{title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="flex gap-4 rounded-xl border-y border-r border-l-4 border-l-amber-500 border-y-amber-200 border-r-amber-200 bg-amber-50 p-6 shadow-sm">
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
