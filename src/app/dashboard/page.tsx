/**
 * /dashboard — Priority-sorted patient list.
 * Server Component for initial render; client component handles Realtime updates.
 */

import { getDashboardCases } from '@/app/actions';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const initialCases = await getDashboardCases();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Triase IGD</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pasien diurutkan berdasarkan tingkat urgensi tertinggi. Klik kartu untuk detail &amp; verifikasi.
          </p>
        </div>
        <a
          href="/input"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          🚑 Pasien Baru
        </a>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {[
          { color: 'bg-red-500',    label: 'Merah — ESI 1–2 (Kritis/Berisiko tinggi)' },
          { color: 'bg-yellow-400', label: 'Kuning — ESI 3 (Urgent)'                  },
          { color: 'bg-green-500',  label: 'Hijau — ESI 4–5 (Tidak darurat)'          },
          { color: 'bg-gray-400',   label: 'Abu — Menunggu/proses'                    },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-gray-600">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      <DashboardClient initialCases={initialCases} />
    </div>
  );
}
