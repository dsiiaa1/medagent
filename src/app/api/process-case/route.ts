/**
 * MedAgent-Alpha — Route Handler: POST /api/process-case
 *
 * Receives a caseId and runs the orchestrator asynchronously.
 * Called fire-and-forget from the submitIntake Server Action.
 * Returns 202 immediately so the UI redirect is not blocked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runOrchestrator } from '@/lib/orchestrator';

export const maxDuration = 60; // Fix Vercel timeout limit


export async function POST(req: NextRequest): Promise<NextResponse> {
  let caseId: string | undefined;

  try {
    const body = await req.json();
    caseId = typeof body?.caseId === 'string' ? body.caseId : undefined;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
  }

  // Await the orchestrator so Vercel does not freeze the container early
  try {
    await runOrchestrator(caseId);
  } catch (err) {
    console.error('[ProcessCase] Unhandled orchestrator error:', err);
  }

  return NextResponse.json({ status: 'completed', caseId }, { status: 200 });
}
