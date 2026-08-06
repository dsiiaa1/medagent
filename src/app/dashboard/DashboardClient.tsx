'use client';

/**
 * DashboardClient — subscribes to Supabase Realtime for live updates.
 * Receives initialCases from the Server Component for instant first paint.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PatientCard } from '@/components/PatientCard';
import type { CaseRow, TriageWarna, VerificationStatus, VitalSigns } from '@/lib/supabase';
import { FolderOpen, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type DashboardCase = Pick<
  CaseRow,
  | 'id' | 'nama' | 'age_value' | 'age_unit' | 'age_months' | 'jenis_kelamin'
  | 'keluhan_utama' | 'waktu_masuk' | 'current_node' | 'esi_score' | 'triage_warna'
  | 'auto_scoring_eligible' | 'confidence_level' | 'override_triggered' | 'triage_flags'
  | 'verification_status' | 'vital_signs' | 'error_message'
>;

interface Props {
  initialCases: DashboardCase[];
}

function sortCases(cases: DashboardCase[]): DashboardCase[] {
  return [...cases].sort((a, b) => {
    // ESI 1 first, nulls last, then by arrival time
    const esiA = a.esi_score ?? 99;
    const esiB = b.esi_score ?? 99;
    if (esiA !== esiB) return esiA - esiB;
    return new Date(a.waktu_masuk).getTime() - new Date(b.waktu_masuk).getTime();
  });
}

const FILTER_OPTIONS = [
  { value: 'all',     label: 'Semua'              },
  { value: 'pending', label: 'Belum diverifikasi' },
  { value: 'Merah',   label: 'Merah'           },
  { value: 'Kuning',  label: 'Kuning'          },
  { value: 'Hijau',   label: 'Hijau'           },
] as const;

export function DashboardClient({ initialCases }: Props) {
  const [cases, setCases] = useState<DashboardCase[]>(() => sortCases(initialCases));
  const [filter, setFilter] = useState<string>('all');
  const [liveIndicator, setLiveIndicator] = useState(false);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-cases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        (payload) => {
          setLiveIndicator(true);
          setTimeout(() => setLiveIndicator(false), 2000);

          if (payload.eventType === 'INSERT') {
            setCases((prev) => sortCases([...prev, payload.new as DashboardCase]));
          } else if (payload.eventType === 'UPDATE') {
            setCases((prev) =>
              sortCases(
                prev.map((c) =>
                  c.id === (payload.new as DashboardCase).id
                    ? { ...c, ...(payload.new as DashboardCase) }
                    : c
                )
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCases((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filtering
  const filtered = cases.filter((c) => {
    if (filter === 'all')     return true;
    if (filter === 'pending') return c.verification_status === 'pending';
    return c.triage_warna === filter;
  });

  const stats = {
    total:   cases.length,
    merah:   cases.filter((c) => c.triage_warna === 'Merah').length,
    kuning:  cases.filter((c) => c.triage_warna === 'Kuning').length,
    hijau:   cases.filter((c) => c.triage_warna === 'Hijau').length,
    pending: cases.filter((c) => c.verification_status === 'pending').length,
  };

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total',       value: stats.total,   cls: 'border-gray-200 bg-white'  },
          { label: 'Merah (Kritis)',    value: stats.merah,   cls: 'border-red-200 bg-red-50 text-red-900' },
          { label: 'Kuning (Urgent)',   value: stats.kuning,  cls: 'border-amber-200 bg-amber-50 text-amber-900' },
          { label: 'Hijau (Stabil)',    value: stats.hijau,   cls: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
          { label: 'Belum Diverifikasi',  value: stats.pending, cls: 'border-orange-200 bg-orange-50 text-orange-900' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-2xl border px-4 py-4 text-center shadow-sm ${cls}`}>
            <p className="text-3xl font-black mb-1">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter + live indicator */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <Filter className="w-4 h-4 text-gray-400 shrink-0 mr-1" />
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                filter === value
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full shrink-0">
          <span
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              liveIndicator ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'
            }`}
          />
          {liveIndicator ? 'Sinkronisasi...' : 'Koneksi Stabil'}
        </div>
      </div>

      {/* Case list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50 py-24 px-4 text-center">
          <div className="bg-white p-4 rounded-full shadow-sm mb-4 border border-gray-100">
             <FolderOpen className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {cases.length === 0 ? 'Belum Ada Pasien' : 'Tidak Ditemukan'}
          </h3>
          <p className="text-gray-500 text-sm max-w-sm mb-6">
            {cases.length === 0 
              ? 'Antrean kosong. Silakan daftarkan pasien baru untuk memulai analisis RAG triase.' 
              : 'Tidak ada pasien yang cocok dengan filter saat ini.'}
          </p>
          {cases.length === 0 && (
            <Link href="/input" className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
              Daftarkan Pasien Pertama <ArrowRight className="w-4 h-4"/>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <PatientCard
              key={c.id}
              id={c.id}
              nama={c.nama}
              ageValue={c.age_value}
              ageUnit={c.age_unit}
              jenisKelamin={c.jenis_kelamin}
              keluhanUtama={c.keluhan_utama}
              waktuMasuk={c.waktu_masuk}
              esiScore={c.esi_score}
              triageWarna={c.triage_warna as TriageWarna | null}
              autoScoringEligible={c.auto_scoring_eligible}
              overrideTriggered={c.override_triggered ?? false}
              confidenceLevel={c.confidence_level}
              currentNode={c.current_node}
              verificationStatus={c.verification_status as VerificationStatus}
              vitalSigns={c.vital_signs as VitalSigns}
              triageFlags={c.triage_flags}
            />
          ))}
        </div>
      )}
    </div>
  );
}
