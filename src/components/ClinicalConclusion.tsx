import { Lightbulb, AlertTriangle, Info } from 'lucide-react';
import type { SoapSummary } from '@/lib/supabase';

interface Props {
  soap: SoapSummary;
  esiScore: number | null;
}

export function ClinicalConclusion({ soap, esiScore }: Props) {
  const conclusion = soap.conclusion;
  if (!conclusion) return null;

  const isCritical = esiScore === 1 || esiScore === 2;
  const isWarn    = esiScore === 3;

  const colors = isCritical
    ? 'bg-red-50 border-red-300 text-red-900'
    : isWarn
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : 'bg-blue-50 border-blue-200 text-blue-900';

  const iconColors = isCritical
    ? 'text-red-500'
    : isWarn
    ? 'text-amber-500'
    : 'text-blue-500';

  const Icon = isCritical ? AlertTriangle : isWarn ? Lightbulb : Info;

  // Strip emoji prefix added by template fallback
  const cleanText = conclusion.replace(/^[^\w\s]+\s*KESIMPULAN:\s*/i, '').trim();

  return (
    <div className={`rounded-2xl border-2 p-5 shadow-md ${colors}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 shrink-0 mt-0.5 ${iconColors}`} />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">
            Kesimpulan &amp; Rekomendasi Klinis AI
          </p>
          <p className="text-base font-semibold leading-snug">{cleanText}</p>
          <p className="text-[11px] mt-2 opacity-60 font-medium">
            Ini adalah rangkuman bantuan keputusan AI. Penilaian klinis dokter tetap menjadi otoritas akhir.
          </p>
        </div>
      </div>
    </div>
  );
}
