/**
 * DrugInteractionList — renders drug interactions with severity coloring.
 */

import type { DrugInteraction } from '@/lib/supabase';

const SEVERITY_CONFIG = {
  berat:  { cls: 'border-red-300 bg-red-50',    badge: 'bg-red-600 text-white',     icon: '🚨', label: 'BERAT'  },
  sedang: { cls: 'border-yellow-300 bg-yellow-50', badge: 'bg-yellow-500 text-white', icon: '⚠️', label: 'SEDANG' },
  ringan: { cls: 'border-blue-200 bg-blue-50',  badge: 'bg-blue-400 text-white',    icon: 'ℹ️', label: 'RINGAN' },
};

interface Props {
  interactions: DrugInteraction[];
  checkedDrugs?: string[];
}

export function DrugInteractionList({ interactions, checkedDrugs = [] }: Props) {
  if (interactions.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        ✅ Tidak ada interaksi obat bermakna yang terdeteksi
        {checkedDrugs.length > 0 && (
          <span className="ml-1 text-green-600">
            ({checkedDrugs.join(', ')})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checkedDrugs.length > 0 && (
        <p className="text-xs text-gray-500">
          Obat yang dicek: <span className="font-medium text-gray-700">{checkedDrugs.join(', ')}</span>
        </p>
      )}
      {interactions.map((item, i) => {
        const conf = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.ringan;
        return (
          <div key={i} className={`rounded-lg border-l-4 p-4 ${conf.cls}`}>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{conf.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900">
                    {item.drug_a}
                  </span>
                  <span className="text-gray-400 text-xs">+</span>
                  <span className="font-semibold text-sm text-gray-900">
                    {item.drug_b}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${conf.badge}`}>
                    {conf.label}
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
