'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  isProcessing: boolean;
  intervalMs?: number;
}

export function ProcessingPoller({ isProcessing, intervalMs = 3000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(() => { router.refresh(); }, intervalMs);
    return () => clearInterval(id);
  }, [isProcessing, intervalMs, router]);

  return null;
}
