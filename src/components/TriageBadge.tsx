/**
 * TriageBadge — displays ESI score + Kemenkes warna color code
 * Used in dashboard cards and case detail header.
 */

import type { TriageWarna } from '@/lib/supabase';

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
  Kuning: { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-500', label: 'KUNING' },
  Hijau:  { bg: 'bg-green-500',  text: 'text-white',      border: 'border-green-600',  label: 'HIJAU'  },
  Hitam:  { bg: 'bg-gray-900',   text: 'text-white',      border: 'border-gray-700',   label: 'HITAM'  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
  lg: 'text-base px-4 py-2 gap-2',
};

const ESI_SIZE = {
  sm: 'text-sm font-bold w-5 h-5',
  md: 'text-base font-bold w-7 h-7',
  lg: 'text-xl font-bold w-9 h-9',
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
      <span className={`inline-flex items-center rounded-full border border-gray-300 bg-gray-100 text-gray-700 font-medium ${SIZE_CLASSES[size]}`}>
        <span className={`inline-flex items-center justify-center rounded-full bg-gray-300 text-gray-600 ${ESI_SIZE[size]}`}>
          ?
        </span>
        <span>Penilaian Manual</span>
      </span>
    );
  }

  // Score not yet computed (processing)
  if (esiScore === null || warna === null) {
    return (
      <span className={`inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 font-medium ${SIZE_CLASSES[size]}`}>
        <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        <span>Memproses...</span>
      </span>
    );
  }

  const config = WARNA_CONFIG[warna];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${config.bg} ${config.text} ${config.border} ${SIZE_CLASSES[size]}`}
      title={`ESI ${esiScore} — Prioritas ${warna}${overrideTriggered ? ' (Override Kritis)' : ''}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white/20 ${ESI_SIZE[size]}`}
      >
        {esiScore}
      </span>
      <span>{config.label}</span>
      {overrideTriggered && (
        <span className="ml-0.5 text-xs opacity-80" title="Parameter vital kritis — override aktif">
          ⚡
        </span>
      )}
    </span>
  );
}

/** Compact dot indicator for tables */
export function TriageDot({ warna }: { warna: TriageWarna | null }) {
  if (!warna) return <span className="inline-block h-3 w-3 rounded-full bg-gray-300 animate-pulse" />;
  const colors: Record<TriageWarna, string> = {
    Merah:  'bg-red-500',
    Kuning: 'bg-yellow-400',
    Hijau:  'bg-green-500',
    Hitam:  'bg-gray-800',
  };
  return <span className={`inline-block h-3 w-3 rounded-full ${colors[warna]}`} title={warna} />;
}
