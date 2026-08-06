/**
 * /case/[id] — Case detail page.
 * Shows SOAP, triage result, drug interactions, reasoning trace, and verification panel.
 * Server Component — fetches data server-side.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCaseDetail } from '@/app/actions';
import { TriageBadge } from '@/components/TriageBadge';
import { SOAPView } from '@/components/SOAPView';
import { DrugInteractionList } from '@/components/DrugInteractionList';
import { ReasoningTrace } from '@/components/ReasoningTrace';
import { VerificationPanel } from './VerificationPanel';
import type {
  CaseRow, CaseTraceRow, SoapSummary, DrugInteraction,
  RagReference, TriageWarna, VerificationStatus, VitalSigns,
} from '@/lib/supabase';
import { 
  ArrowLeft, Activity, Pill, History, FileText, 
  BookOpen, BrainCircuit, AlertTriangle, Info, Zap 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function VitalRow({ label, value, unit, critical }: { label: string; value?: number | null; unit: string; critical?: boolean }) {
  if (value === undefined || value === null) {
    return (
      <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="text-gray-300 italic text-xs">Tidak diisi</span>
      </div>
    );
  }
  return (
    <div className={`flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0 ${critical ? 'bg-red-50/50 -mx-2 px-2 rounded-lg border-transparent' : ''}`}>
      <span className={`font-medium ${critical ? 'text-red-700' : 'text-gray-600'}`}>{label}</span>
      <span className={`font-bold font-mono ${critical ? 'text-red-700' : 'text-gray-900'}`}>
        {value} <span className="text-[10px] font-normal uppercase opacity-70 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

function SectionCard({ title, icon, children, headerRight }: { title: string; icon: React.ReactNode; children: React.ReactNode, headerRight?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase">{title}</h2>
        </div>
        {headerRight}
      </div>
      <div className="p-5 flex-grow">{children}</div>
    </section>
  );
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getCaseDetail(id);

  if (!data) notFound();

  const c = data.case as CaseRow;
  const traces = data.trace as CaseTraceRow[];

  const vitals = c.vital_signs as VitalSigns;
  const soap = c.soap_summary as SoapSummary | null;
  const drugInteractions = (c.drug_interactions ?? []) as DrugInteraction[];
  const ragRefs = (c.rag_references ?? []) as RagReference[];
  const isProcessing = !['await_doctor_verification', 'completed', 'error'].includes(c.current_node);

  // Determine which vitals are critical (for automation bias mitigation, §7.5 #5)
  const criticalVitals = {
    spo2:        vitals.spo2 !== undefined && vitals.spo2 < 90,
    systolic:    vitals.systolic !== undefined && vitals.systolic < 90,
    heart_rate:  vitals.heart_rate !== undefined && (vitals.heart_rate < 40 || vitals.heart_rate > 150),
    gcs:         vitals.gcs !== undefined && vitals.gcs < 9,
  };
  const hasCriticalVital = Object.values(criticalVitals).some(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
      </div>

      {/* Case header */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Accent Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-2 ${
            c.triage_warna === 'Merah'  ? 'bg-red-500' :
            c.triage_warna === 'Kuning' ? 'bg-amber-400' :
            c.triage_warna === 'Hijau'  ? 'bg-emerald-500' :
            c.triage_warna === 'Hitam'  ? 'bg-gray-800' :
            'bg-gray-200'
        }`} />

        <div className="pl-3">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{c.nama}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm font-medium text-gray-600">
            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
               {c.age_value} {c.age_unit}
            </span>
            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
              {c.jenis_kelamin}
            </span>
            <span className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
              <span className="opacity-70">Masuk:</span> {formatDateTime(c.waktu_masuk)}
            </span>
          </div>
          <div className="mt-4 bg-gray-50/80 p-3 rounded-lg border border-gray-100 inline-block">
            <p className="text-sm text-gray-800 font-medium">
              <span className="text-gray-500 mr-1">Keluhan:</span> {c.keluhan_utama}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
          <TriageBadge
            esiScore={c.esi_score}
            warna={c.triage_warna as TriageWarna | null}
            autoScoringEligible={c.auto_scoring_eligible}
            overrideTriggered={c.override_triggered ?? false}
            pediatricAssisted={c.triage_flags?.includes('pediatric_assisted')}
            size="lg"
          />
          {c.confidence_level && (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${
              c.confidence_level === 'high'   ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              c.confidence_level === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              Confidence: {c.confidence_level}
            </span>
          )}
        </div>
      </div>

      {/* Warnings & Processing States */}
      <div className="mb-8 space-y-3">
        {c.triage_flags?.includes('gejala_atipikal') && (
          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <strong>Pasien Lansia:</strong> Waspadai presentasi gejala tidak khas. Ambang ESI dewasa digunakan — verifikasi klinis lebih menyeluruh diperlukan.
            </div>
          </div>
        )}
        {c.auto_scoring_eligible === false && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Kategori usia di luar cakupan skor otomatis MVP.</strong> Perlu penilaian klinis langsung. Skor ESI tidak dihitung secara otomatis.
            </div>
          </div>
        )}
        {isProcessing && (
          <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-900 shadow-sm">
            <span className="h-5 w-5 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
            Agent AI sedang memproses dan menganalisis kasus ini...
          </div>
        )}
        {c.current_node === 'error' && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong>Terjadi kesalahan sistem saat memproses:</strong> {c.error_message ?? 'Unknown error'}. Kasus ini membutuhkan penilaian manual penuh.
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left column: vitals + drug interactions */}
        <div className="space-y-6 lg:col-span-4">

          {/* Critical vital highlight moved to VerificationPanel */}

          {/* Tanda Vital */}
          <SectionCard title="Tanda Vital" icon={<Activity className="w-4 h-4 text-blue-500" />}>
            <div className="flex flex-col">
              <VitalRow label="SpO2"          value={vitals.spo2}             unit="%" critical={criticalVitals.spo2} />
              <VitalRow label="TD Sistol"     value={vitals.systolic}         unit="mmHg" critical={criticalVitals.systolic} />
              <VitalRow label="TD Diastol"    value={vitals.diastolic}        unit="mmHg" />
              <VitalRow label="Detak Jantung" value={vitals.heart_rate}       unit="bpm" critical={criticalVitals.heart_rate} />
              <VitalRow label="Laju Napas"    value={vitals.respiratory_rate} unit="x/mnt" />
              <VitalRow label="Suhu"          value={vitals.temperature}      unit="°C" />
              <VitalRow label="GCS"           value={vitals.gcs}              unit="" critical={criticalVitals.gcs} />
            </div>
          </SectionCard>

          {/* Riwayat Medis */}
          <SectionCard title="Riwayat Medis" icon={<History className="w-4 h-4 text-emerald-500" />}>
            {(['kondisi_kronis', 'alergi', 'obat_dikonsumsi'] as const).map((field) => {
              const labels = { kondisi_kronis: 'Kondisi Kronis', alergi: 'Alergi', obat_dikonsumsi: 'Obat Dikonsumsi' };
              const items = c.riwayat_medis?.[field] ?? [];
              return (
                <div key={field} className="py-3 border-b border-gray-100 last:border-0 last:pb-0 first:pt-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{labels[field]}</p>
                  {items.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item: string) => (
                        <span key={item} className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md border border-gray-200">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded-md">Tidak ada data</span>
                  )}
                </div>
              );
            })}
          </SectionCard>
        </div>

        {/* Right column: SOAP, interactions, trace, verification */}
        <div className="space-y-6 lg:col-span-8 flex flex-col">

          {/* Verification Panel (§4.7) */}
          <VerificationPanel
            caseId={c.id}
            verificationStatus={c.verification_status as VerificationStatus}
            verifiedBy={c.verified_by}
            verifiedAt={c.verified_at}
            verificationNote={c.verification_note}
            soap={soap}
            isProcessing={isProcessing}
            hasCriticalVital={hasCriticalVital}
            criticalVitals={criticalVitals}
            vitals={vitals}
            confidenceLevel={c.confidence_level}
          />

          {/* SOAP Summary */}
          <SectionCard title="Draft SOAP AI" icon={<FileText className="w-4 h-4 text-indigo-500" />}>
            {soap ? (
              <SOAPView soap={soap} />
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <span className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium">AI sedang menyusun draft SOAP...</p>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Draft SOAP tidak dapat dihasilkan.
              </div>
            )}
          </SectionCard>

          {/* Drug Interactions */}
          <SectionCard title="Cek Interaksi Obat" icon={<Pill className="w-4 h-4 text-pink-500" />}>
            <DrugInteractionList
              interactions={drugInteractions}
              checkedDrugs={c.riwayat_medis?.obat_dikonsumsi ?? []}
            />
          </SectionCard>

          {/* RAG References */}
          {ragRefs.length > 0 && (
            <SectionCard title="Referensi Medis (RAG)" icon={<BookOpen className="w-4 h-4 text-amber-500" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {ragRefs.map((ref, i) => (
                  <div key={i} className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:bg-white hover:border-amber-200 hover:shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{ref.title}</h4>
                    <p className="text-xs text-gray-600 mb-3 flex-grow line-clamp-3 leading-relaxed">{ref.content_snippet}</p>
                    <div className="mt-auto pt-2 border-t border-gray-200/60">
                       <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded">
                         {ref.source}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Reasoning Trace */}
          <SectionCard title="Jejak Reasoning AI" icon={<BrainCircuit className="w-4 h-4 text-purple-500" />}>
            <ReasoningTrace traces={traces} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
