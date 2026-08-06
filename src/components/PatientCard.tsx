/**
 * PatientCard — used in the dashboard list.
 * Shows patient summary, triage badge, vitals preview, and verification status.
 */

import Link from 'next/link';
import { TriageBadge } from './TriageBadge';
import type { TriageWarna, VerificationStatus, VitalSigns } from '@/lib/supabase';
import { Clock, Activity, TriangleAlert, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

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
  retrieve_context:          'Mengambil Referensi (RAG)...',
  urgency_scoring:           'Analisis ESI Score...',
  drug_interaction_check:    'Cek Interaksi Obat...',
  generate_soap:             'Menyusun Draft SOAP...',
  await_doctor_verification: 'Menunggu Dokter',
  completed:                 'Selesai',
  error:                     'Terjadi Kesalahan',
};

// Pipeline steps in order (for the progress indicator)
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
        const isDone = currentIdx > i;
        const isCurrent = currentIdx === i;
        const isLast = step === 'completed';
        return (
          <div key={step} className="flex items-center gap-1" title={NODE_LABELS[step]}>
            <div
              className={`rounded-full transition-all ${
                isError && isCurrent ? 'bg-red-500 w-2 h-2' :
                isCurrent           ? 'bg-blue-500 w-2 h-2 ring-2 ring-blue-200 animate-pulse' :
                isDone              ? 'bg-emerald-500 w-2 h-2' :
                                      'bg-gray-200 w-1.5 h-1.5'
              }`}
            />
            {!isLast && (
              <div className={`h-px w-3 rounded-full ${
                isDone ? 'bg-emerald-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const VERIFY_CONFIG: Record<VerificationStatus, { label: string; cls: string; icon: any }> = {
  pending:  { label: 'Review Dokter', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: HelpCircle },
  approved: { label: 'Disetujui',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  edited:   { label: 'Dimodifikasi',  cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  rejected: { label: 'Ditolak',       cls: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  });
}

function VitalPill({ label, value, unit, warn }: { label: string; value?: number; unit: string; warn?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <div className={`flex flex-col rounded-lg px-2 py-1.5 border ${warn ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
      <span className="text-[10px] font-semibold uppercase opacity-60 mb-0.5">{label}</span>
      <span className="text-xs font-bold font-mono">
        {value}<span className="text-[10px] font-normal ml-0.5">{unit}</span>
      </span>
    </div>
  );
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
    <Link href={`/case/${id}`} className="block h-full">
      <article
        className={`
          group relative h-full flex flex-col bg-white rounded-2xl border transition-all duration-200
          hover:shadow-lg hover:-translate-y-1 cursor-pointer overflow-hidden
          ${isCritical ? 'border-red-200 shadow-sm shadow-red-100' : 'border-gray-200 shadow-sm'}
        `}
      >
        {/* Left accent bar (Thicker & brighter based on triage) */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-2 transition-colors ${
            triageWarna === 'Merah'  ? 'bg-red-500' :
            triageWarna === 'Kuning' ? 'bg-amber-400' :
            triageWarna === 'Hijau'  ? 'bg-emerald-500' :
            triageWarna === 'Hitam'  ? 'bg-gray-800' :
            'bg-gray-200'
          }`}
        />

        <div className="flex flex-col flex-grow p-4 pl-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-lg group-hover:text-blue-600 transition-colors">{nama}</h3>
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mt-0.5">
                {ageValue} {ageUnit} <span className="w-1 h-1 rounded-full bg-gray-300"/> {jenisKelamin}
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
          <p className="text-sm text-gray-700 line-clamp-2 mb-4 flex-grow bg-gray-50/50 p-2 rounded-lg border border-gray-100">
            {keluhanUtama}
          </p>

          {/* Pipeline progress indicator */}
          {(isProcessing || currentNode === 'error') && (
            <PipelineProgress currentNode={currentNode} />
          )}

          {/* Vital signs quick view */}
          {vitalSigns && (vitalSigns.spo2 || vitalSigns.systolic || vitalSigns.heart_rate || vitalSigns.gcs) && (
            <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
              <VitalPill label="SpO2" value={vitalSigns.spo2} unit="%" warn={vitalSigns.spo2 !== undefined && vitalSigns.spo2 < 90} />
              <VitalPill label="TD" value={vitalSigns.systolic} unit="" warn={vitalSigns.systolic !== undefined && vitalSigns.systolic < 90} />
              <VitalPill label="HR" value={vitalSigns.heart_rate} unit="bpm" warn={vitalSigns.heart_rate !== undefined && (vitalSigns.heart_rate < 40 || vitalSigns.heart_rate > 150)} />
              <VitalPill label="GCS" value={vitalSigns.gcs} unit="" warn={vitalSigns.gcs !== undefined && vitalSigns.gcs < 9} />
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  {NODE_LABELS[currentNode] ?? currentNode}
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${verifyConf.cls}`}>
                  <VerifyIcon className="w-3.5 h-3.5" />
                  {verifyConf.label}
                </span>
              )}

              {confidenceLevel === 'low' && !isProcessing && (
                <span title="Data tidak lengkap atau AI ragu" className="text-amber-500 bg-amber-50 rounded-full p-1 border border-amber-200">
                  <TriangleAlert className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            
            <time className="flex items-center gap-1 text-xs font-semibold text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(waktuMasuk)}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}
