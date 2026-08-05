/**
 * PatientCard — used in the dashboard list.
 * Shows patient summary, triage badge, vitals preview, and verification status.
 */

import Link from 'next/link';
import { TriageBadge } from './TriageBadge';
import type { TriageWarna, VerificationStatus, VitalSigns } from '@/lib/supabase';

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
}

const NODE_LABELS: Record<string, string> = {
  intake:                    'Intake',
  retrieve_context:          'Mengambil referensi...',
  urgency_scoring:           'Menghitung skor...',
  drug_interaction_check:    'Cek interaksi obat...',
  generate_soap:             'Membuat SOAP...',
  await_doctor_verification: 'Menunggu verifikasi',
  completed:                 'Selesai',
  error:                     'Error',
};

const VERIFY_CONFIG: Record<VerificationStatus, { label: string; cls: string }> = {
  pending:  { label: 'Belum diverifikasi', cls: 'bg-orange-100 text-orange-700' },
  approved: { label: 'Disetujui',          cls: 'bg-green-100 text-green-700'   },
  edited:   { label: 'Diedit dokter',      cls: 'bg-blue-100 text-blue-700'     },
  rejected: { label: 'Ditolak',            cls: 'bg-red-100 text-red-700'       },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function VitalPill({ label, value, unit, warn }: { label: string; value?: number; unit: string; warn?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${warn ? 'bg-red-100 text-red-700 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
      <span className="opacity-60">{label}</span>
      <span>{value}{unit}</span>
    </span>
  );
}

export function PatientCard({
  id, nama, ageValue, ageUnit, jenisKelamin, keluhanUtama,
  waktuMasuk, esiScore, triageWarna, autoScoringEligible,
  overrideTriggered, confidenceLevel, currentNode,
  verificationStatus, vitalSigns,
}: PatientCardProps) {
  const isProcessing = currentNode !== 'await_doctor_verification'
    && currentNode !== 'completed'
    && currentNode !== 'error';

  const verifyConf = VERIFY_CONFIG[verificationStatus];
  const isCritical = esiScore !== null && esiScore <= 2;

  return (
    <Link href={`/case/${id}`}>
      <article
        className={`
          group relative bg-white rounded-xl border transition-all duration-150
          hover:shadow-md hover:-translate-y-0.5 cursor-pointer
          ${isCritical ? 'border-red-300 shadow-red-100 shadow-sm' : 'border-gray-200'}
        `}
      >
        {/* Left accent bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
            triageWarna === 'Merah'  ? 'bg-red-500' :
            triageWarna === 'Kuning' ? 'bg-yellow-400' :
            triageWarna === 'Hijau'  ? 'bg-green-500' :
            triageWarna === 'Hitam'  ? 'bg-gray-800' :
            'bg-gray-200'
          }`}
        />

        <div className="pl-4 pr-4 py-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{nama}</p>
              <p className="text-xs text-gray-500">
                {ageValue} {ageUnit} · {jenisKelamin}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TriageBadge
                esiScore={esiScore}
                warna={triageWarna}
                autoScoringEligible={autoScoringEligible}
                overrideTriggered={overrideTriggered}
                size="sm"
              />
            </div>
          </div>

          {/* Chief complaint */}
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{keluhanUtama}</p>

          {/* Vital signs quick view — highlight the trigger vitals */}
          <div className="flex flex-wrap gap-1 mb-3">
            <VitalPill label="SpO2 " value={vitalSigns.spo2}             unit="%" warn={vitalSigns.spo2 !== undefined && vitalSigns.spo2 < 90} />
            <VitalPill label="TD "   value={vitalSigns.systolic}          unit="mmHg" warn={vitalSigns.systolic !== undefined && vitalSigns.systolic < 90} />
            <VitalPill label="HR "   value={vitalSigns.heart_rate}        unit="bpm" warn={vitalSigns.heart_rate !== undefined && (vitalSigns.heart_rate < 40 || vitalSigns.heart_rate > 150)} />
            <VitalPill label="GCS "  value={vitalSigns.gcs}               unit="" warn={vitalSigns.gcs !== undefined && vitalSigns.gcs < 9} />
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {NODE_LABELS[currentNode] ?? currentNode}
                </span>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verifyConf.cls}`}>
                  {verifyConf.label}
                </span>
              )}
              {confidenceLevel === 'low' && !isProcessing && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
                  ⚠ Data tidak lengkap
                </span>
              )}
            </div>
            <time className="text-xs text-gray-400">{formatTime(waktuMasuk)}</time>
          </div>
        </div>
      </article>
    </Link>
  );
}
