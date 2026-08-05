/**
 * TriageBadge — displays ESI score + Kemenkes warna color code
 * Used in dashboard cards and case detail header.
 */

import type { TriageWarna } from '@/lib/supabase';
import { Zap } from 'lucide-react';

interface TriageBadgeProps {
  esiScore: number | null;
  warna: TriageWarna | null;
  autoScoringEligible?: boolean | null;
  overrideTriggered?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const WARNA_CONFIG: Record<
  TriageWarna,
  { bg: string; text: string; border: string; label: string }
> = {
  Merah:  { bg: 'bg-red-600',    text: 'text-white',      border: 'border-red-700',    label: 'MERAH'  },
  Kuning: { bg: 'bg-amber-400',  text: 'text-amber-950',  border: 'border-amber-500',  label: 'KUNING' },
  Hijau:  { bg: 'bg-emerald-500',text: 'text-white',      border: 'border-emerald-600',label: 'HIJAU'  },
  Hitam:  { bg: 'bg-gray-900',   text: 'text-white',      border: 'border-gray-700',   label: 'HITAM'  },
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1.5 shadow-sm',
  md: 'text-xs px-3 py-1 gap-2 shadow-sm',
  lg: 'text-sm px-4 py-1.5 gap-2.5 shadow-md',
};

const ESI_SIZE = {
  sm: 'text-xs font-black w-5 h-5',
  md: 'text-sm font-black w-6 h-6',
  lg: 'text-base font-black w-7 h-7',
};

export function TriageBadge({
  esiScore,
  warna,
  autoScoringEligible,
  overrideTriggered = false,
  size = 'md',
}: TriageBadgeProps) {
  // Not eligible for auto scoring
  if (autoScoringEligible === false) {
    return (
      <span className={`inline-flex items-center rounded-full border border-gray-300 bg-gray-100 text-gray-700 font-bold uppercase tracking-wider ${SIZE_CLASSES[size]}`}>
        <span className={`inline-flex items-center justify-center rounded-full bg-gray-300/50 text-gray-600 ${ESI_SIZE[size]}`}>
          ?
        </span>
        <span>Manual</span>
      </span>
    );
  }

  // Score not yet computed (processing)
  if (esiScore === null || warna === null) {
    return (
      <span className={`inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 font-bold uppercase tracking-wider ${SIZE_CLASSES[size]}`}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span>Analisis</span>
      </span>
    );
  }

  const config = WARNA_CONFIG[warna];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${config.bg} ${config.text} ${config.border} ${SIZE_CLASSES[size]}`}
      title={`ESI ${esiScore} — Prioritas ${warna}${overrideTriggered ? ' (Override Kritis)' : ''}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white/25 shadow-inner ${ESI_SIZE[size]}`}
      >
        {esiScore}
      </span>
      <span>{config.label}</span>
      {overrideTriggered && (
        <span className="opacity-90" title="Parameter vital kritis — override aktif">
          <Zap className="w-3.5 h-3.5 fill-current" />
        </span>
      )}
    </span>
  );
}

/** Compact dot indicator for tables */
export function TriageDot({ warna }: { warna: TriageWarna | null }) {
  if (!warna) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 animate-pulse" />;
  const colors: Record<TriageWarna, string> = {
    Merah:  'bg-red-500',
    Kuning: 'bg-amber-400',
    Hijau:  'bg-emerald-500',
    Hitam:  'bg-gray-800',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full shadow-sm ${colors[warna]}`} title={warna} />;
}
