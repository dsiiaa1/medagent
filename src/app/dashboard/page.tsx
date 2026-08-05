/**
 * /dashboard — Priority-sorted patient list.
 * Server Component for initial render; client component handles Realtime updates.
 */

import { getDashboardCases } from '@/app/actions';
import { DashboardClient } from './DashboardClient';
import { UserPlus, Info } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const initialCases = await getDashboardCases();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Triase IGD</h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-xl leading-relaxed">
            Pasien diurutkan berdasarkan tingkat urgensi tertinggi (Merah → Hijau). Klik kartu untuk detail, panel AI, &amp; verifikasi.
          </p>
        </div>
        <Link
          href="/input"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Pasien Baru
        </Link>
      </div>

      {/* Legend & Stats Overview */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50/80 rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
          {[
            { color: 'bg-red-500',    label: 'Merah (ESI 1-2)' },
            { color: 'bg-amber-400',  label: 'Kuning (ESI 3)' },
            { color: 'bg-emerald-500',label: 'Hijau (ESI 4-5)' },
            { color: 'bg-gray-400',   label: 'Abu (Memproses)' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-2 text-gray-700">
              <span className={`h-2.5 w-2.5 rounded-full ${color} shadow-sm`} />
              {label}
            </span>
          ))}
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
           <Info className="w-3.5 h-3.5 text-blue-500" />
           <em>Real-time updates active</em>
        </div>
      </div>

      <DashboardClient initialCases={initialCases} />
    </div>
  );
}
