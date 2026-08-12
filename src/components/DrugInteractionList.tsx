/**
 * DrugInteractionList — renders drug interactions with severity coloring.
 */

import type { DrugInteraction } from '@/lib/supabase';
import { AlertTriangle, Info, CheckCircle2, ArrowLeftRight } from 'lucide-react';

const SEVERITY_CONFIG = {
  berat:  { cls: 'border-red-200 bg-gradient-to-br from-red-50 to-white',   badge: 'bg-red-600 text-white border-red-700',     icon: AlertTriangle, iconCls: 'text-red-600',    label: 'BERAT'  },
  sedang: { cls: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white', badge: 'bg-amber-500 text-white border-amber-600', icon: AlertTriangle,  iconCls: 'text-amber-500',  label: 'SEDANG' },
  ringan: { cls: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white',  badge: 'bg-blue-500 text-white border-blue-600',   icon: Info,           iconCls: 'text-blue-500',   label: 'RINGAN' },
};

interface Props {
  interactions: DrugInteraction[];
  checkedDrugs?: string[];
}

export function DrugInteractionList({ interactions, checkedDrugs = [] }: Props) {
  if (interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
        <p className="text-sm font-bold text-emerald-800">Tidak ada interaksi obat bermakna</p>
        {checkedDrugs.length > 0 && (
          <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
            Dicek: {checkedDrugs.join(', ')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checkedDrugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3 border-b border-gray-100">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 self-center">Dicek:</span>
          {checkedDrugs.map((drug) => (
            <span key={drug} className="text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
              {drug}
            </span>
          ))}
        </div>
      )}
      {interactions.map((item, i) => {
        const conf = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.ringan;
        const IconComp = conf.icon;
        return (
          <div key={i} className={`rounded-xl border p-4 shadow-sm ${conf.cls}`}>
            <div className="flex items-start gap-3">
              <IconComp className={`w-5 h-5 mt-0.5 shrink-0 ${conf.iconCls}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className="font-black text-sm text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm">
                    {item.drug_a}
                  </span>
                  <ArrowLeftRight className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-black text-sm text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm">
                    {item.drug_b}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border ${conf.badge}`}>
                    {conf.label}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                {item.source && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 pt-2 border-t border-gray-100">
                    <Info className="w-3.5 h-3.5" />
                    Sumber: <span className="font-medium italic">{item.source}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
