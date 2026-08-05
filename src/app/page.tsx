/**
 * / — Landing / Home page
 * Quick entry point with links to dashboard and input.
 */

import Link from 'next/link';

const FEATURES = [
  {
    icon: '🧠',
    title: 'RAG + ESI Scoring',
    desc: 'Skor urgensi ESI dihitung oleh rule engine deterministik — LLM hanya ekstraksi data, bukan penentu skor.',
  },
  {
    icon: '💊',
    title: 'Cek Interaksi Obat',
    desc: 'Agent farmasi paralel memeriksa 20+ pasangan interaksi obat umum IGD secara otomatis.',
  },
  {
    icon: '📝',
    title: 'Ringkasan SOAP',
    desc: 'SOAP note terstruktur dibuat otomatis berdasarkan hasil triase, referensi RAG, dan data pasien.',
  },
  {
    icon: '👨‍⚕️',
    title: 'Verifikasi Dokter',
    desc: 'Human-in-the-loop: alur benar-benar berhenti menunggu approve / edit / reject dari dokter.',
  },
  {
    icon: '🔴',
    title: 'Kode Warna Kemenkes',
    desc: 'Skor ESI dipetakan ke Merah/Kuning/Hijau/Hitam sesuai Permenkes No. 47/2018.',
  },
  {
    icon: '🔍',
    title: 'Transparansi Reasoning',
    desc: 'Setiap langkah agent tercatat di Reasoning Trace — tidak ada keputusan tersembunyi.',
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-4 py-1.5 text-xs font-medium text-red-700 mb-6">
          🏆 BISA AI — National AI Agent Challenge 2026 · Kategori Healthcare
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          MedAgent<span className="text-red-600">-Alpha</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8 leading-relaxed">
          AI Agent otonom untuk pra-triase pasien IGD. Mendukung keputusan dokter lebih cepat —
          bukan menggantikannya.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href="/dashboard"
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Lihat Dashboard
          </Link>
          <Link
            href="/input"
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            🚑 Daftarkan Pasien
          </Link>
        </div>
      </div>

      {/* Alur sistem */}
      <div className="mb-12">
        <h2 className="text-center text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">
          Alur Sistem
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
          {[
            'Input Pasien',
            'Retrieve Context (RAG)',
            'Urgency Scoring (ESI)',
            'Cek Interaksi Obat',
            'Generate SOAP',
            'Verifikasi Dokter',
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-gray-300 font-bold">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <div className="text-2xl mb-3">{icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800">
        <p className="font-semibold mb-1">⚠️ Disclaimer Klinis</p>
        <p className="leading-relaxed">
          Sistem ini adalah <strong>decision support tool</strong>, bukan pengganti keputusan medis. Seluruh data yang
          digunakan adalah <strong>data sintetis</strong> — tidak ada data pasien asli. Setiap output wajib diverifikasi
          dokter sebelum ditindaklanjuti. Skor ESI tidak menggantikan penilaian visual langsung terhadap pasien.
        </p>
      </div>
    </div>
  );
}
