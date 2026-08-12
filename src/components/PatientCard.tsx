'use client';

/**
 * PatientCard — used in the dashboard list.
 * Upgraded: CSS variable theming, glassmorphism for critical cases,
 * dramatic hover state, improved VitalPill, themed pipeline progress.
 */

import Link from 'next/link';
import { TriageBadge } from './TriageBadge';
import type { TriageWarna, VerificationStatus, VitalSigns } from '@/lib/supabase';
import {
  Clock, Activity, TriangleAlert, CheckCircle2,
  AlertCircle, HelpCircle, Zap
} from 'lucide-react';

interface PatientCardProps {
  id: string;
  nama: string;
  ageValue: number;
  ageUnit: 'Tahun' | 'Bulan';
  jenisKelamin: string;
  keluhanUtama: string;
  waktuMasuk: string;
  esiScore: number | null;
  triageWarna: TriageWarna | null;
  autoScoringEligible: boolean | null;
  overrideTriggered: boolean;
  confidenceLevel: string | null;
  currentNode: string;
  verificationStatus: VerificationStatus;
  vitalSigns: VitalSigns;
  triageFlags?: string[];
}

const NODE_LABELS: Record<string, string> = {
  intake:                    'Intake Data',
  retrieve_context:          'Mengambil Referensi...',
  urgency_scoring:           'Analisis ESI...',
  drug_interaction_check:    'Cek Interaksi Obat...',
  generate_soap:             'Menyusun SOAP...',
  await_doctor_verification: 'Menunggu Dokter',
  completed:                 'Selesai',
  error:                     'Terjadi Kesalahan',
};

const PIPELINE_STEPS = [
  'intake',
  'retrieve_context',
  'urgency_scoring',
  'drug_interaction_check',
  'generate_soap',
  'await_doctor_verification',
  'completed',
];

function PipelineProgress({ currentNode }: { currentNode: string }) {
  const currentIdx = PIPELINE_STEPS.indexOf(currentNode);
  const isError = currentNode === 'error';

  return (
    <div className="flex items-center gap-1 mt-3" aria-label="Pipeline progress">
      {PIPELINE_STEPS.map((step, i) => {
        const isDone    = currentIdx > i;
        const isCurrent = currentIdx === i;
        const isLast    = step === 'completed';

        let dotStyle: React.CSSProperties = {
          width: isCurrent ? '8px' : '6px',
          height: isCurrent ? '8px' : '6px',
          borderRadius: '50%',
          flexShrink: 0,
          transition: 'all 0.3s ease',
        };

        if (isError && isCurrent) {
          dotStyle.background = '#ef4444';
        } else if (isCurrent) {
          dotStyle.background = '#3b82f6';
          dotStyle.boxShadow = '0 0 0 3px rgba(59,130,246,0.2)';
        } else if (isDone) {
          dotStyle.background = '#10b981';
        } else {
          dotStyle.background = 'var(--border-strong)';
        }

        return (
          <div key={step} className="flex items-center gap-1" title={NODE_LABELS[step]}>
            <div
              style={dotStyle}
              className={isCurrent && !isError ? 'animate-pulse' : ''}
            />
            {!isLast && (
              <div
                style={{
                  height: '1px',
                  width: '12px',
                  borderRadius: '1px',
                  background: isDone ? '#10b981' : 'var(--border-default)',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

const VERIFY_CONFIG: Record<VerificationStatus, { label: string; iconColor: string; bg: string; border: string; icon: any }> = {
  pending:  {
    label: 'Review Dokter',
    iconColor: '#d97706',
    bg: 'var(--triage-kuning-bg)',
    border: '#fde68a',
    icon: HelpCircle
  },
  approved: {
    label: 'Disetujui',
    iconColor: '#059669',
    bg: 'var(--triage-hijau-bg)',
    border: '#a7f3d0',
    icon: CheckCircle2
  },
  edited: {
    label: 'Dimodifikasi',
    iconColor: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    icon: CheckCircle2
  },
  rejected: {
    label: 'Ditolak',
    iconColor: 'var(--triage-merah-text)',
    bg: 'var(--triage-merah-bg)',
    border: 'var(--brand-red-muted)',
    icon: AlertCircle
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function VitalPill({
  label, value, unit, warn
}: { label: string; value?: number; unit: string; warn?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <div
      className="flex flex-col rounded-lg px-2 py-1.5 shrink-0"
      style={{
        background: warn ? 'var(--triage-merah-bg)' : 'var(--bg-subtle)',
        border: `1px solid ${warn ? 'var(--brand-red-muted)' : 'var(--border-default)'}`,
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase mb-0.5"
        style={{ color: warn ? 'var(--triage-merah-text)' : 'var(--fg-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-xs font-bold font-mono"
        style={{ color: warn ? 'var(--triage-merah-text)' : 'var(--fg-primary)' }}
      >
        {value}
        <span className="text-[10px] font-normal ml-0.5" style={{ color: warn ? 'var(--triage-merah-text)' : 'var(--fg-muted)' }}>
          {unit}
        </span>
      </span>
    </div>
  );
}

// Accent bar color per triage
function accentColor(warna: TriageWarna | null): string {
  if (warna === 'Merah')  return '#ef4444';
  if (warna === 'Kuning') return '#f59e0b';
  if (warna === 'Hijau')  return '#10b981';
  if (warna === 'Hitam')  return '#374151';
  return 'var(--border-default)';
}

export function PatientCard({
  id, nama, ageValue, ageUnit, jenisKelamin, keluhanUtama,
  waktuMasuk, esiScore, triageWarna, autoScoringEligible,
  overrideTriggered, confidenceLevel, currentNode,
  verificationStatus, vitalSigns, triageFlags
}: PatientCardProps) {
  const isProcessing = currentNode !== 'await_doctor_verification'
    && currentNode !== 'completed'
    && currentNode !== 'error';

  const verifyConf = VERIFY_CONFIG[verificationStatus];
  const VerifyIcon = verifyConf.icon;
  const isCritical = esiScore !== null && esiScore <= 2;

  return (
    <Link href={`/case/${id}`} className="block h-full" aria-label={`Detail pasien ${nama}`}>
      <article
        className="group relative h-full flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1.5"
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'}`,
          boxShadow: isCritical
            ? '0 2px 8px rgba(239,68,68,0.12)'
            : 'var(--shadow-sm)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = isCritical
            ? '0 16px 40px rgba(239,68,68,0.18)'
            : 'var(--shadow-lg)';
          (e.currentTarget as HTMLElement).style.borderColor = isCritical
            ? 'rgba(239,68,68,0.5)'
            : 'var(--border-strong)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = isCritical
            ? '0 2px 8px rgba(239,68,68,0.12)'
            : 'var(--shadow-sm)';
          (e.currentTarget as HTMLElement).style.borderColor = isCritical
            ? 'rgba(239,68,68,0.3)'
            : 'var(--border-default)';
        }}
      >
        {/* Accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl transition-all duration-200 group-hover:w-2"
          style={{ background: accentColor(triageWarna) }}
        />

        {/* Critical glow overlay */}
        {isCritical && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.04) 0%, transparent 60%)' }}
          />
        )}

        <div className="flex flex-col flex-grow p-4 pl-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3
                className="font-bold truncate text-base transition-colors"
                style={{ color: 'var(--fg-primary)' }}
              >
                {nama}
              </h3>
              <p className="text-xs font-medium flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                {ageValue} {ageUnit}
                <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border-strong)' }} />
                {jenisKelamin}
                {overrideTriggered && (
                  <span className="ml-1">
                    <Zap className="w-3 h-3 text-red-500 fill-red-500" />
                  </span>
                )}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TriageBadge
                esiScore={esiScore}
                warna={triageWarna}
                autoScoringEligible={autoScoringEligible}
                overrideTriggered={overrideTriggered}
                pediatricAssisted={triageFlags?.includes('pediatric_assisted')}
                size="sm"
              />
            </div>
          </div>

          {/* Chief complaint */}
          <p
            className="text-sm line-clamp-2 mb-3 flex-grow p-2 rounded-lg"
            style={{
              color: 'var(--fg-secondary)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {keluhanUtama}
          </p>

          {/* Pipeline progress (only when processing) */}
          {(isProcessing || currentNode === 'error') && (
            <PipelineProgress currentNode={currentNode} />
          )}

          {/* Vital signs quick view */}
          {vitalSigns && (vitalSigns.spo2 || vitalSigns.systolic || vitalSigns.heart_rate || vitalSigns.gcs) && (
            <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-1">
              <VitalPill label="SpO2" value={vitalSigns.spo2}       unit="%" warn={vitalSigns.spo2 !== undefined && vitalSigns.spo2 < 90} />
              <VitalPill label="TD"   value={vitalSigns.systolic}    unit=""   warn={vitalSigns.systolic !== undefined && vitalSigns.systolic < 90} />
              <VitalPill label="HR"   value={vitalSigns.heart_rate}  unit="bpm" warn={vitalSigns.heart_rate !== undefined && (vitalSigns.heart_rate < 40 || vitalSigns.heart_rate > 150)} />
              <VitalPill label="GCS"  value={vitalSigns.gcs}         unit=""   warn={vitalSigns.gcs !== undefined && vitalSigns.gcs < 9} />
            </div>
          )}

          {/* Footer row */}
          <div
            className="flex items-center justify-between gap-2 mt-auto pt-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                  style={{ color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe' }}
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  {NODE_LABELS[currentNode] ?? currentNode}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                  style={{
                    color: verifyConf.iconColor,
                    background: verifyConf.bg,
                    border: `1px solid ${verifyConf.border}`,
                  }}
                >
                  <VerifyIcon className="w-3.5 h-3.5" style={{ color: verifyConf.iconColor }} />
                  {verifyConf.label}
                </span>
              )}

              {confidenceLevel === 'low' && !isProcessing && (
                <span
                  className="rounded-full p-1"
                  title="Data tidak lengkap — confidence rendah"
                  style={{
                    color: '#d97706',
                    background: 'var(--triage-kuning-bg)',
                    border: '1px solid #fde68a',
                  }}
                >
                  <TriangleAlert className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <time className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(waktuMasuk)}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}
