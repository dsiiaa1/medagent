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
      <div className="flex justify-between text-sm py-1 border-b border-gray-100">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-300 italic">Tidak diisi</span>
      </div>
    );
  }
  return (
    <div className={`flex justify-between text-sm py-1 border-b border-gray-100 ${critical ? 'font-semibold' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={critical ? 'text-red-600' : 'text-gray-900'}>
        {value} {unit} {critical && '⚡'}
      </span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back */}
      <div className="mb-5">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Kembali ke Dashboard
        </Link>
      </div>

      {/* Case header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{c.nama}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {c.age_value} {c.age_unit} · {c.jenis_kelamin} · Masuk: {formatDateTime(c.waktu_masuk)}
            </p>
            <p className="mt-2 text-sm text-gray-700 font-medium">
              Keluhan: <span className="font-normal">{c.keluhan_utama}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <TriageBadge
              esiScore={c.esi_score}
              warna={c.triage_warna as TriageWarna | null}
              autoScoringEligible={c.auto_scoring_eligible}
              overrideTriggered={c.override_triggered ?? false}
              size="lg"
            />
            {c.confidence_level && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                c.confidence_level === 'high'   ? 'bg-green-100 text-green-700' :
                c.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                Confidence: {c.confidence_level}
              </span>
            )}
          </div>
        </div>

        {/* Flags */}
        {c.triage_flags?.includes('gejala_atipikal') && (
          <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
            ⚠️ <strong>Lansia:</strong> Waspadai presentasi gejala tidak khas. Ambang ESI dewasa digunakan — verifikasi klinis lebih menyeluruh diperlukan.
          </div>
        )}
        {!c.auto_scoring_eligible && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            ℹ️ <strong>Kategori usia di luar cakupan skor otomatis MVP</strong> — perlu penilaian klinis langsung. Skor ESI tidak dihitung secara otomatis.
          </div>
        )}
        {isProcessing && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-blue-400/40 border-t-blue-600 animate-spin" />
            Agent sedang memproses kasus ini...
          </div>
        )}
        {c.current_node === 'error' && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            ⚠️ Terjadi kesalahan saat memproses: {c.error_message ?? 'Unknown error'}. Kasus perlu penilaian manual.
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column: vitals + drug interactions */}
        <div className="space-y-5 lg:col-span-1">

          {/* Critical vital highlight (§7.5 #5 — automation bias mitigation) */}
          {hasCriticalVital && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-2">
                ⚡ Parameter Vital Kritis (Pemicu Override)
              </p>
              {criticalVitals.spo2      && <p className="text-sm text-red-800 font-semibold">SpO2 {vitals.spo2}% — sangat rendah</p>}
              {criticalVitals.systolic  && <p className="text-sm text-red-800 font-semibold">TD Sistol {vitals.systolic} mmHg — hipotensi</p>}
              {criticalVitals.heart_rate && <p className="text-sm text-red-800 font-semibold">HR {vitals.heart_rate} bpm — aritmia</p>}
              {criticalVitals.gcs       && <p className="text-sm text-red-800 font-semibold">GCS {vitals.gcs} — gangguan kesadaran</p>}
            </div>
          )}

          {/* Tanda Vital */}
          <SectionCard title="📊 Tanda Vital">
            <VitalRow label="SpO2"          value={vitals.spo2}             unit="%" critical={criticalVitals.spo2} />
            <VitalRow label="TD Sistol"     value={vitals.systolic}         unit="mmHg" critical={criticalVitals.systolic} />
            <VitalRow label="TD Diastol"    value={vitals.diastolic}        unit="mmHg" />
            <VitalRow label="Detak Jantung" value={vitals.heart_rate}       unit="bpm" critical={criticalVitals.heart_rate} />
            <VitalRow label="Laju Napas"    value={vitals.respiratory_rate} unit="x/mnt" />
            <VitalRow label="Suhu"          value={vitals.temperature}      unit="°C" />
            <VitalRow label="GCS"           value={vitals.gcs}              unit="" critical={criticalVitals.gcs} />
          </SectionCard>

          {/* Riwayat Medis */}
          <SectionCard title="📋 Riwayat Medis">
            {(['kondisi_kronis', 'alergi', 'obat_dikonsumsi'] as const).map((field) => {
              const labels = { kondisi_kronis: 'Kondisi Kronis', alergi: 'Alergi', obat_dikonsumsi: 'Obat Dikonsumsi' };
              const items = c.riwayat_medis?.[field] ?? [];
              return (
                <div key={field} className="py-1.5 border-b border-gray-100 last:border-0">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{labels[field]}</p>
                  {items.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {items.map((item: string) => (
                        <span key={item} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 italic">Tidak ada</span>
                  )}
                </div>
              );
            })}
          </SectionCard>
        </div>

        {/* Right column: SOAP, interactions, trace, verification */}
        <div className="space-y-5 lg:col-span-2">

          {/* Verification Panel (§4.7) */}
          <VerificationPanel
            caseId={c.id}
            verificationStatus={c.verification_status as VerificationStatus}
            verifiedBy={c.verified_by}
            verifiedAt={c.verified_at}
            verificationNote={c.verification_note}
            soap={soap}
            isProcessing={isProcessing}
          />

          {/* SOAP Summary */}
          <SectionCard title="📝 Ringkasan SOAP">
            {soap ? (
              <SOAPView soap={soap} />
            ) : isProcessing ? (
              <p className="text-sm text-gray-400 italic flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                Membuat ringkasan SOAP...
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">SOAP tidak tersedia.</p>
            )}
            <p className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
              ⚠️ Skor ini tidak menggantikan penilaian visual langsung terhadap pasien. Verifikasi dokter wajib sebelum tindakan.
            </p>
          </SectionCard>

          {/* Drug Interactions */}
          <SectionCard title="💊 Interaksi Obat">
            <DrugInteractionList
              interactions={drugInteractions}
              checkedDrugs={c.riwayat_medis?.obat_dikonsumsi ?? []}
            />
          </SectionCard>

          {/* RAG References */}
          {ragRefs.length > 0 && (
            <SectionCard title="📚 Referensi Medis (RAG)">
              <div className="space-y-2">
                {ragRefs.map((ref, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700">{ref.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">{ref.content_snippet}</p>
                    <p className="text-xs text-gray-400 mt-1">Sumber: {ref.source}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Reasoning Trace */}
          <SectionCard title="🔍 Jejak Reasoning Agent">
            <ReasoningTrace traces={traces} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
