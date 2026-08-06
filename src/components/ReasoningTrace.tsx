/**
 * ReasoningTrace — displays the orchestrator's step-by-step agent log.
 * Provides the transparency required by PRD §4.2 and §5.
 */

import type { CaseTraceRow } from '@/lib/supabase';
import { Play, CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronRight, Clock } from 'lucide-react';

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

  // Group traces by node_name to get start/end times and final status
  const nodeMap = new Map<string, {
    node_name: string;
    started?: CaseTraceRow;
    completed?: CaseTraceRow;
    failed?: CaseTraceRow;
  }>();

  traces.forEach(t => {
    if (!nodeMap.has(t.node_name)) {
      nodeMap.set(t.node_name, { node_name: t.node_name });
    }
    const n = nodeMap.get(t.node_name)!;
    if (t.status === 'started') n.started = t;
    else if (t.status === 'completed') n.completed = t;
    else if (t.status === 'failed') n.failed = t;
  });

  const nodes = Array.from(nodeMap.values());

  // Group into sequential steps. urgency_scoring and drug_interaction_check should be together.
  const steps: { id: string; nodes: typeof nodes }[] = [];
  
  const handledNodes = new Set<string>();
  
  for (const n of nodes) {
    if (handledNodes.has(n.node_name)) continue;
    
    if (n.node_name === 'urgency_scoring' || n.node_name === 'drug_interaction_check') {
      const parallelNodes = nodes.filter(x => x.node_name === 'urgency_scoring' || x.node_name === 'drug_interaction_check');
      steps.push({ id: 'parallel_step', nodes: parallelNodes });
      parallelNodes.forEach(x => handledNodes.add(x.node_name));
    } else {
      steps.push({ id: n.node_name, nodes: [n] });
      handledNodes.add(n.node_name);
    }
  }

  // Calculate total time
  const firstTrace = traces[0];
  const lastTrace = traces[traces.length - 1];
  const totalMs = new Date(lastTrace.created_at).getTime() - new Date(firstTrace.created_at).getTime();
  const totalSecs = (totalMs / 1000).toFixed(1);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-50 inline-flex px-3 py-1.5 rounded-lg border border-gray-200">
        <Clock className="w-4 h-4 text-gray-400" />
        Total Waktu Proses: {totalSecs}s
      </div>
      <ol className="relative space-y-4">
        {/* Vertical connector line */}
        <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-gray-200 -z-0" />

        {steps.map((step) => {
          const isParallel = step.nodes.length > 1;
          
          return (
            <li key={step.id} className="relative ml-8 pb-2">
              {/* Timeline marker */}
              <div className="absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white bg-white shadow-sm z-10">
                {step.nodes.some(n => n.failed) ? (
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                ) : step.nodes.every(n => n.completed) ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-blue-500" />
                )}
              </div>

              {isParallel && (
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Multi-Agent Parallel Execution
                </div>
              )}

              <div className={`grid gap-3 ${isParallel ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                {step.nodes.map(n => {
                  const finalTrace = n.failed || n.completed || n.started;
                  if (!finalTrace) return null;
                  
                  const conf = STATUS_CONFIG[finalTrace.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.completed;
                  const label = NODE_LABELS[n.node_name] ?? n.node_name;
                  const IconComp = conf.icon;
                  
                  // Detail comes from completed or failed trace preferably
                  const detailsTrace = n.completed || n.failed || n.started;
                  const hasDetails = detailsTrace?.details && Object.keys(detailsTrace.details).length > 0;
                  
                  let durationMs = 0;
                  if (n.started && (n.completed || n.failed)) {
                    const end = new Date((n.completed || n.failed)!.created_at).getTime();
                    const start = new Date(n.started.created_at).getTime();
                    durationMs = end - start;
                  }

                  return (
                    <div key={n.node_name} className={`rounded-xl border px-4 py-3 ${conf.bgCls} shadow-sm relative overflow-hidden`}>
                      {isParallel && <div className="absolute top-0 left-0 w-1 h-full bg-blue-400" />}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-bold ${conf.iconCls} flex items-center gap-1.5`}>
                           <IconComp className="w-4 h-4" />
                           {label}
                        </span>
                        <time className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                          {formatTime(finalTrace.created_at)}
                        </time>
                      </div>
                      
                      {durationMs > 0 && (
                        <div className="text-[10px] font-medium text-gray-500 mb-2">
                          Durasi: {durationMs}ms
                        </div>
                      )}

                      {/* Show key details from the trace */}
                      {hasDetails && (
                        <details className="mt-2 group">
                          <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1 select-none bg-white/50 px-2 py-1 rounded w-max border border-current/10">
                            <ChevronRight className="w-3.5 h-3.5 group-open:hidden" />
                            <ChevronDown className="w-3.5 h-3.5 hidden group-open:block" />
                            Detail Eksekusi
                          </summary>
                          <div className="mt-2 pt-2 border-t border-current/10 space-y-1.5 bg-white/40 p-2 rounded-lg">
                            {Object.entries(detailsTrace!.details!).map(([k, v]) => {
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
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
