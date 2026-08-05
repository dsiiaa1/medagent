/**
 * SOAPView — renders the SOAP summary in a structured, readable layout.
 * Used in the case detail page.
 */

import type { SoapSummary } from '@/lib/supabase';

interface SOAPViewProps {
  soap: SoapSummary;
  editable?: boolean;
}

const SECTIONS: { key: keyof SoapSummary; label: string; icon: string; color: string }[] = [
  { key: 'subjective', label: 'Subjective',  icon: '💬', color: 'border-blue-300   bg-blue-50'   },
  { key: 'objective',  label: 'Objective',   icon: '📊', color: 'border-purple-300 bg-purple-50' },
  { key: 'assessment', label: 'Assessment',  icon: '🔍', color: 'border-orange-300 bg-orange-50' },
  { key: 'plan',       label: 'Plan',        icon: '📋', color: 'border-green-300  bg-green-50'  },
];

export function SOAPView({ soap }: SOAPViewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SECTIONS.map(({ key, label, icon, color }) => (
        <div key={key} className={`rounded-lg border-l-4 p-4 ${color}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            {icon} {label}
          </h3>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {soap[key] || <span className="italic text-gray-400">Tidak tersedia</span>}
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
    <div className="grid gap-4 sm:grid-cols-2">
      {SECTIONS.map(({ key, label, icon, color }) => (
        <div key={key}>
          <label
            htmlFor={`${namePrefix}${key}`}
            className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1"
          >
            {icon} {label}
          </label>
          <textarea
            id={`${namePrefix}${key}`}
            name={`${namePrefix}${key}`}
            defaultValue={soap[key]}
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y ${color}`}
          />
        </div>
      ))}
    </div>
  );
}
