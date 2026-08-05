'use client';

/**
 * DashboardClient — subscribes to Supabase Realtime for live updates.
 * Receives initialCases from the Server Component for instant first paint.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PatientCard } from '@/components/PatientCard';
import type { CaseRow, TriageWarna, VerificationStatus, VitalSigns } from '@/lib/supabase';

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
  { value: 'Merah',   label: '🔴 Merah'           },
  { value: 'Kuning',  label: '🟡 Kuning'          },
  { value: 'Hijau',   label: '🟢 Hijau'           },
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
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total',       value: stats.total,   cls: 'border-gray-200'  },
          { label: '🔴 Merah',    value: stats.merah,   cls: 'border-red-200 bg-red-50' },
          { label: '🟡 Kuning',   value: stats.kuning,  cls: 'border-yellow-200 bg-yellow-50' },
          { label: '🟢 Hijau',    value: stats.hijau,   cls: 'border-green-200 bg-green-50' },
          { label: '⏳ Pending',  value: stats.pending, cls: 'border-orange-200 bg-orange-50' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-lg border px-3 py-3 text-center ${cls}`}>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter + live indicator */}
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              liveIndicator ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
            }`}
          />
          {liveIndicator ? 'Update diterima' : 'Live'}
        </div>
      </div>

      {/* Case list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <p className="text-4xl mb-3">🏥</p>
          <p className="text-gray-600 font-medium">
            {cases.length === 0 ? 'Belum ada pasien terdaftar' : 'Tidak ada pasien sesuai filter'}
          </p>
          {cases.length === 0 && (
            <a href="/input" className="mt-3 inline-block text-sm text-red-600 hover:underline">
              Daftarkan pasien pertama →
            </a>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
