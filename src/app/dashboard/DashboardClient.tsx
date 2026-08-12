'use client';

/**
 * DashboardClient — subscribes to Supabase Realtime for live updates.
 * Receives initialCases from the Server Component for instant first paint.
 * Upgraded: themed stats cards, premium live badge, colored filter pills.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PatientCard } from '@/components/PatientCard';
import type { CaseRow, TriageWarna, VerificationStatus, VitalSigns } from '@/lib/supabase';
import {
  FolderOpen, Filter, ArrowRight, Users, AlertOctagon,
  AlertTriangle, CheckCircle, ClockAlert, Wifi, WifiOff
} from 'lucide-react';
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
    const esiA = a.esi_score ?? 99;
    const esiB = b.esi_score ?? 99;
    if (esiA !== esiB) return esiA - esiB;
    return new Date(a.waktu_masuk).getTime() - new Date(b.waktu_masuk).getTime();
  });
}

const FILTER_OPTIONS = [
  { value: 'all',     label: 'Semua',             activeStyle: { background: 'var(--fg-primary)', color: 'var(--fg-inverted)' } },
  { value: 'pending', label: 'Belum Diverifikasi', activeStyle: { background: '#f59e0b', color: '#fff' } },
  { value: 'Merah',   label: 'Merah',              activeStyle: { background: '#dc2626', color: '#fff' } },
  { value: 'Kuning',  label: 'Kuning',             activeStyle: { background: '#d97706', color: '#fff' } },
  { value: 'Hijau',   label: 'Hijau',              activeStyle: { background: '#059669', color: '#fff' } },
] as const;

export function DashboardClient({ initialCases }: Props) {
  const [cases, setCases] = useState<DashboardCase[]>(() => sortCases(initialCases));
  const [filter, setFilter] = useState<string>('all');
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-cases')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        (payload) => {
          setLiveIndicator(true);
          setIsConnected(true);
          setTimeout(() => setLiveIndicator(false), 2500);

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
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

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

  const statCards = [
    {
      label: 'Total Pasien',
      value: stats.total,
      icon: Users,
      iconColor: 'var(--fg-secondary)',
      bgStyle: { background: 'var(--bg-card)', border: '1px solid var(--border-default)' },
      valueStyle: { color: 'var(--fg-primary)' },
    },
    {
      label: 'Kritis (Merah)',
      value: stats.merah,
      icon: AlertOctagon,
      iconColor: 'var(--triage-merah-text)',
      bgStyle: { background: 'var(--triage-merah-bg)', border: '1px solid var(--brand-red-muted)' },
      valueStyle: { color: 'var(--triage-merah-text)' },
    },
    {
      label: 'Urgent (Kuning)',
      value: stats.kuning,
      icon: AlertTriangle,
      iconColor: 'var(--triage-kuning-text)',
      bgStyle: { background: 'var(--triage-kuning-bg)', border: '1px solid #fde68a' },
      valueStyle: { color: 'var(--triage-kuning-text)' },
    },
    {
      label: 'Stabil (Hijau)',
      value: stats.hijau,
      icon: CheckCircle,
      iconColor: 'var(--triage-hijau-text)',
      bgStyle: { background: 'var(--triage-hijau-bg)', border: '1px solid #a7f3d0' },
      valueStyle: { color: 'var(--triage-hijau-text)' },
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      icon: ClockAlert,
      iconColor: '#d97706',
      bgStyle: { background: '#fffbeb', border: '1px solid #fde68a' },
      valueStyle: { color: '#b45309' },
    },
  ];

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, iconColor, bgStyle, valueStyle }) => (
          <div
            key={label}
            className="rounded-2xl px-4 py-4 flex flex-col items-center text-center gap-1 transition-all hover:-translate-y-0.5"
            style={{ ...bgStyle, boxShadow: 'var(--shadow-sm)' }}
          >
            <Icon className="w-5 h-5 mb-1 opacity-80" style={{ color: iconColor }} />
            <p className="text-3xl font-black leading-none" style={valueStyle}>{value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70" style={valueStyle}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter + live indicator */}
      <div
        className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <Filter className="w-4 h-4 shrink-0 mr-1" style={{ color: 'var(--fg-muted)' }} />
          {FILTER_OPTIONS.map(({ value, label, activeStyle }) => (
            <button
              key={value}
              id={`filter-${value}`}
              onClick={() => setFilter(value)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 hover:scale-[1.03]"
              style={
                filter === value
                  ? { ...activeStyle, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                  : {
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--fg-secondary)',
                    }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            color: isConnected ? 'var(--triage-hijau-text)' : 'var(--fg-muted)',
          }}
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
          )}
          <span
            className={`h-2 w-2 rounded-full transition-all duration-300 ${liveIndicator ? 'scale-125' : ''}`}
            style={{
              background: liveIndicator
                ? '#22c55e'
                : isConnected
                ? '#22c55e'
                : 'var(--fg-muted)',
              boxShadow: liveIndicator ? '0 0 8px rgba(34,197,94,0.7)' : 'none',
            }}
          />
          {liveIndicator ? 'Sinkronisasi...' : isConnected ? 'LIVE' : 'Terputus'}
        </div>
      </div>

      {/* Case list */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-3xl border border-dashed py-24 px-4 text-center"
          style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-subtle)' }}
        >
          <div
            className="p-4 rounded-full mb-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
          >
            <FolderOpen className="w-10 h-10" style={{ color: 'var(--fg-muted)' }} />
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--fg-primary)' }}>
            {cases.length === 0 ? 'Belum Ada Pasien' : 'Tidak Ditemukan'}
          </h3>
          <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--fg-muted)' }}>
            {cases.length === 0
              ? 'Antrean kosong. Silakan daftarkan pasien baru untuk memulai analisis RAG triase.'
              : 'Tidak ada pasien yang cocok dengan filter saat ini.'}
          </p>
          {cases.length === 0 && (
            <Link
              href="/input"
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{
                color: 'var(--brand-red)',
                background: 'var(--brand-red-bg)',
                border: '1px solid var(--brand-red-muted)',
              }}
            >
              Daftarkan Pasien Pertama <ArrowRight className="w-4 h-4" />
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
