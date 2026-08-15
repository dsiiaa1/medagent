/**
 * /dashboard — Priority-sorted patient list.
 * Server Component for initial render; client component handles Realtime updates.
 */

import { getDashboardCases } from '@/app/actions';
import { DashboardClient } from './DashboardClient';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const initialCases = await getDashboardCases();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5"
            style={{ color: 'var(--fg-primary)' }}
          >
            Dashboard Triase IGD
          </h1>
          <p className="text-sm max-w-xl leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
            Pasien diurutkan berdasarkan tingkat urgensi tertinggi{' '}
            <span
              className="font-semibold px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--triage-merah-bg)', color: 'var(--triage-merah-text)' }}
            >
              Merah
            </span>
            {' → '}
            <span
              className="font-semibold px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--triage-hijau-bg)', color: 'var(--triage-hijau-text)' }}
            >
              Hijau
            </span>
            . Klik kartu untuk detail &amp; verifikasi.
          </p>
        </div>
        <Link
          href="/input"
          id="dashboard-pasien-baru-btn"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md"
          style={{
            background: 'linear-gradient(135deg, var(--brand-red) 0%, #fb7185 100%)',
            boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
          }}
        >
          <UserPlus className="w-4 h-4" />
          Pasien Baru
        </Link>
      </div>

      <DashboardClient initialCases={initialCases} />
    </div>
  );
}
