/**
 * ReasoningTrace — displays the orchestrator's step-by-step agent log.
 * Provides the transparency required by PRD §4.2 and §5.
 */

import type { CaseTraceRow } from '@/lib/supabase';

const STATUS_CONFIG = {
  started:   { icon: '▶', cls: 'text-blue-600'  },
  completed: { icon: '✓', cls: 'text-green-600' },
  failed:    { icon: '✗', cls: 'text-red-600'   },
  skipped:   { icon: '–', cls: 'text-gray-400'  },
};

const NODE_LABELS: Record<string, string> = {
  intake:                    'Input pasien diterima',
  retrieve_context:          'Mengambil referensi medis (RAG)',
  urgency_scoring:           'Menghitung skor urgensi ESI',
  drug_interaction_check:    'Memeriksa interaksi obat',
  generate_soap:             'Membuat ringkasan SOAP',
  await_doctor_verification: 'Menunggu verifikasi dokter',
  completed:                 'Selesai',
  error:                     'Terjadi kesalahan',
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
      <p className="text-sm text-gray-400 italic">
        Tidak ada log tersedia.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-4">
      {traces.map((t) => {
        const conf = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.completed;
        const label = NODE_LABELS[t.node_name] ?? t.node_name;

        return (
          <li key={t.id} className="ml-4">
            <div
              className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-bold ${conf.cls}`}
            >
              {conf.icon}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <span className={`text-sm font-medium ${conf.cls}`}>{label}</span>
                <time className="text-xs text-gray-400">{formatTime(t.created_at)}</time>
              </div>

              {/* Show key details from the trace */}
              {t.details && Object.keys(t.details).length > 0 && (
                <details className="mt-1">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Detail
                  </summary>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(t.details).map(([k, v]) => {
                      if (k === 'reasoning_preview' && Array.isArray(v)) {
                        return (
                          <div key={k} className="text-xs">
                            <span className="text-gray-500">reasoning: </span>
                            <ul className="ml-2 mt-0.5 space-y-0.5">
                              {(v as string[]).map((line, i) => (
                                <li key={i} className="text-gray-700">• {line}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
                      if (k === 'sources' && Array.isArray(v)) {
                        return (
                          <p key={k} className="text-xs text-gray-600">
                            <span className="text-gray-500">sumber: </span>
                            {(v as string[]).join(', ')}
                          </p>
                        );
                      }
                      return (
                        <p key={k} className="text-xs text-gray-600">
                          <span className="text-gray-500">{k}: </span>
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
