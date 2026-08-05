/**
 * ReasoningTrace — displays the orchestrator's step-by-step agent log.
 * Provides the transparency required by PRD §4.2 and §5.
 */

import type { CaseTraceRow } from '@/lib/supabase';
import { Play, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  started:   { icon: Play,         iconCls: 'text-blue-500',    lineCls: 'bg-blue-500',   bgCls: 'bg-blue-50 border-blue-200'  },
  completed: { icon: CheckCircle2, iconCls: 'text-emerald-600', lineCls: 'bg-emerald-500', bgCls: 'bg-emerald-50 border-emerald-200' },
  failed:    { icon: XCircle,      iconCls: 'text-red-600',     lineCls: 'bg-red-500',    bgCls: 'bg-red-50 border-red-200'    },
  skipped:   { icon: MinusCircle,  iconCls: 'text-gray-400',    lineCls: 'bg-gray-300',   bgCls: 'bg-gray-50 border-gray-200'  },
};

const NODE_LABELS: Record<string, string> = {
  intake:                    'Input Pasien Diterima',
  retrieve_context:          'Mengambil Referensi Medis (RAG)',
  urgency_scoring:           'Menghitung Skor Urgensi ESI',
  drug_interaction_check:    'Memeriksa Interaksi Obat',
  generate_soap:             'Membuat Draft SOAP',
  await_doctor_verification: 'Menunggu Verifikasi Dokter',
  completed:                 'Selesai',
  error:                     'Terjadi Kesalahan',
};

interface Props {
  traces: CaseTraceRow[];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function ReasoningTrace({ traces }: Props) {
  if (traces.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400 italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
        Tidak ada log tersedia.
      </div>
    );
  }

  return (
    <ol className="relative space-y-1">
      {/* Vertical connector line */}
      <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-gray-200 -z-0" />

      {traces.map((t, idx) => {
        const conf = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.completed;
        const label = NODE_LABELS[t.node_name] ?? t.node_name;
        const IconComp = conf.icon;
        const hasDetails = t.details && Object.keys(t.details).length > 0;

        return (
          <li key={t.id} className="relative ml-8 pb-4 last:pb-0">
            {/* Status icon on the timeline */}
            <div className={`absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white bg-white shadow-sm z-10`}>
              <IconComp className={`w-3.5 h-3.5 ${conf.iconCls}`} />
            </div>

            <div className={`rounded-xl border px-4 py-3 ${conf.bgCls} shadow-sm`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-sm font-bold ${conf.iconCls}`}>{label}</span>
                <time className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">{formatTime(t.created_at)}</time>
              </div>

              {/* Show key details from the trace */}
              {hasDetails && (
                <details className="mt-2 group">
                  <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1 select-none">
                    <ChevronRight className="w-3.5 h-3.5 group-open:hidden" />
                    <ChevronDown className="w-3.5 h-3.5 hidden group-open:block" />
                    Detail
                  </summary>
                  <div className="mt-2 pt-2 border-t border-current/10 space-y-1.5">
                    {Object.entries(t.details!).map(([k, v]) => {
                      if (k === 'reasoning_preview' && Array.isArray(v)) {
                        return (
                          <div key={k} className="text-xs">
                            <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">reasoning: </span>
                            <ul className="ml-3 mt-1 space-y-1">
                              {(v as string[]).map((line, i) => (
                                <li key={i} className="text-gray-700 flex items-start gap-1.5">
                                  <span className="text-gray-300 mt-0.5">•</span>
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      if (k === 'sources' && Array.isArray(v)) {
                        return (
                          <p key={k} className="text-xs text-gray-700">
                            <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">sumber: </span>
                            {(v as string[]).join(', ')}
                          </p>
                        );
                      }
                      return (
                        <p key={k} className="text-xs text-gray-700">
                          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">{k}: </span>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </p>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
