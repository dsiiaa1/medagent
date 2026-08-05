/**
 * SOAPView — renders the SOAP summary in a structured, readable layout.
 * Used in the case detail page.
 */

import type { SoapSummary } from '@/lib/supabase';
import { MessageSquare, Activity, Stethoscope, ClipboardList } from 'lucide-react';

interface SOAPViewProps {
  soap: SoapSummary;
  editable?: boolean;
}

const SECTIONS: { key: keyof SoapSummary; label: string; icon: any; color: string }[] = [
  { key: 'subjective', label: 'Subjective',  icon: MessageSquare, color: 'border-blue-300   bg-blue-50/50 text-blue-700'   },
  { key: 'objective',  label: 'Objective',   icon: Activity,      color: 'border-purple-300 bg-purple-50/50 text-purple-700' },
  { key: 'assessment', label: 'Assessment',  icon: Stethoscope,   color: 'border-amber-300 bg-amber-50/50 text-amber-700' },
  { key: 'plan',       label: 'Plan',        icon: ClipboardList, color: 'border-emerald-300  bg-emerald-50/50 text-emerald-700'  },
];

export function SOAPView({ soap }: SOAPViewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SECTIONS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className={`rounded-xl border-l-4 p-4 shadow-sm border ${color.split(' ')[0]} bg-white`}>
          <div className={`flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 ${color.split(' ')[2]}`}>
             <Icon className="w-4 h-4" />
             <h3 className="text-xs font-black uppercase tracking-wider">
               {label}
             </h3>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-medium">
            {soap[key] || <span className="italic text-gray-400 font-normal">Tidak tersedia</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Editable textarea version for the verification edit form */
export function SOAPEditFields({
  soap,
  namePrefix = 'soap_',
}: {
  soap: SoapSummary;
  namePrefix?: string;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {SECTIONS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="flex flex-col">
          <label
            htmlFor={`${namePrefix}${key}`}
            className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider mb-2 ${color.split(' ')[2]}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </label>
          <textarea
            id={`${namePrefix}${key}`}
            name={`${namePrefix}${key}`}
            defaultValue={soap[key]}
            rows={5}
            className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm resize-y bg-gray-50/50`}
          />
        </div>
      ))}
    </div>
  );
}
