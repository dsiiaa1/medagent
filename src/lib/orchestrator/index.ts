/**
 * MedAgent-Alpha — Custom State Machine Orchestrator
 *
 * Implements §4.2 of PRD v1.4.
 * State machine nodes (in order):
 *   intake → retrieve_context → urgency_scoring → drug_interaction_check (parallel)
 *           → generate_soap → await_doctor_verification
 *
 * Each node transition is logged to `case_trace` table for UI transparency.
 * Errors cause graceful degradation with `confidence: low` flag, not a crash.
 */

import { getSupabaseAdmin } from '@/lib/supabase';
import { retrieveContext, extractPatientFeatures } from '@/lib/rag/retrieval';
import { evaluateTriage, computeConfidence, PatientFeatures } from '@/lib/triage/engine';
import { checkDrugInteractions } from '@/lib/pharma/drug-interactions';
import { generateSOAP } from '@/lib/soap/generator';
import { generateClarificationQuestions } from '@/lib/agent/clarification';
import { selfCritiqueSOAP } from '@/lib/agent/critique';
import type { CaseRow, OrchestratorNode, ClarificationData, CritiqueFeedback } from '@/lib/supabase';

// ── Trace logger ─────────────────────────────────────────────────────────────

async function logTrace(
  caseId: string,
  nodeName: string,
  status: 'started' | 'completed' | 'failed' | 'skipped',
  details: Record<string, unknown> = {}
) {
  try {
    const admin = getSupabaseAdmin();
    await admin.from('case_trace').insert({ case_id: caseId, node_name: nodeName, status, details });
  } catch (err) {
    // Trace logging must never break the main flow
    console.error('[Trace] Failed to log:', err);
  }
}

async function setNode(caseId: string, node: OrchestratorNode) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('cases').update({ current_node: node }).eq('id', caseId);
  if (error) throw new Error(`Failed to set node: ${error.message}`);
}

// ── Node implementations ─────────────────────────────────────────────────────

async function nodeRetrieveContext(caseRow: CaseRow): Promise<{ ragRefs: CaseRow['rag_references'] }> {
  await logTrace(caseRow.id, 'retrieve_context', 'started');

  const query = `${caseRow.keluhan_utama} ${
    (caseRow.riwayat_medis?.kondisi_kronis ?? []).join(' ')
  }`;

  const ragRefs = await retrieveContext(query, 4);

  await logTrace(caseRow.id, 'retrieve_context', 'completed', {
    query_preview: query.slice(0, 120),
    results_count: ragRefs.length,
    sources: ragRefs.map((r) => r.source),
  });

  return { ragRefs };
}

async function nodeUrgencyScoring(
  caseRow: CaseRow,
  ragRefs: CaseRow['rag_references']
): Promise<{
  triageData: Pick<
    CaseRow,
    | 'age_category'
    | 'auto_scoring_eligible'
    | 'esi_score'
    | 'triage_warna'
    | 'override_triggered'
    | 'confidence_level'
    | 'triage_flags'
    | 'patient_features'
  >;
}> {
  await logTrace(caseRow.id, 'urgency_scoring', 'started');

  // ── FAST-PATH (SHORT-CIRCUIT) ──
  // Sanitize vital signs: remove 0-values that mean "not entered" (form default).
  // This prevents false-positive ESI-1 triggers from empty numeric form fields.
  const sanitizeVitals = (v: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(v).filter(([, val]) => val !== 0 && val !== undefined && val !== null));

  const sanitizedVitals = sanitizeVitals(caseRow.vital_signs as Record<string, unknown>);

  // Pre-evaluate based on sanitized vital signs. If clearly critical (ESI-1), skip LLM extraction.
  const preCheckResult = evaluateTriage(caseRow.age_months, sanitizedVitals);
  if (preCheckResult.esi_score === 1 || preCheckResult.override_triggered) {
    await logTrace(caseRow.id, 'urgency_scoring', 'completed', {
      fast_path: true,
      reasoning: preCheckResult.reasoning,
      sanitized_vitals: sanitizedVitals,
    });

    return {
      triageData: {
        age_category: preCheckResult.age_category,
        auto_scoring_eligible: preCheckResult.auto_scoring_eligible,
        esi_score: preCheckResult.esi_score,
        triage_warna: preCheckResult.triage_warna,
        override_triggered: preCheckResult.override_triggered,
        confidence_level: preCheckResult.confidence,
        triage_flags: preCheckResult.flags,
        patient_features: sanitizedVitals,
      }
    };
  }

  // Step a: LLM structured extraction (features come from vitals + keluhan)
  const { features, extraction_successful } = await extractPatientFeatures(
    caseRow.keluhan_utama,
    caseRow.vital_signs
  );

  await logTrace(caseRow.id, 'urgency_scoring', 'started', {
    step: 'a_extraction',
    extraction_successful,
    features_count: Object.keys(features).filter((k) => features[k as keyof typeof features] !== undefined).length,
  });

  // Steps a.5, b, c, d: deterministic rule engine
  const result = evaluateTriage(caseRow.age_months, features);

  const triageData = {
    age_category: result.age_category,
    auto_scoring_eligible: result.auto_scoring_eligible,
    esi_score: result.esi_score,
    triage_warna: result.triage_warna,
    override_triggered: result.override_triggered,
    confidence_level: result.confidence,
    triage_flags: result.flags,
    patient_features: features as Record<string, unknown>,
  };

  await logTrace(caseRow.id, 'urgency_scoring', 'completed', {
    esi_score: result.esi_score,
    triage_warna: result.triage_warna,
    override_triggered: result.override_triggered,
    confidence: result.confidence,
    auto_scoring_eligible: result.auto_scoring_eligible,
    reasoning_steps: result.reasoning.length,
    reasoning_preview: result.reasoning.slice(0, 3),
  });

  return { triageData };
}

async function nodeDrugInteractionCheck(
  caseRow: CaseRow
): Promise<{ drugInteractions: CaseRow['drug_interactions'] }> {
  await logTrace(caseRow.id, 'drug_interaction_check', 'started');

  const obat = caseRow.riwayat_medis?.obat_dikonsumsi ?? [];
  const result = await checkDrugInteractions(obat, {
    keluhan: caseRow.keluhan_utama,
    vitals: caseRow.vital_signs
  });

  await logTrace(caseRow.id, 'drug_interaction_check', 'completed', {
    checked_drugs: result.checked_drugs,
    interactions_found: result.interactions.length,
    has_critical: result.has_critical,
  });

  return { drugInteractions: result.interactions };
}

async function nodeGenerateSOAP(
  caseRow: CaseRow,
  triageResult: ReturnType<typeof evaluateTriage>,
  drugInteractions: CaseRow['drug_interactions'],
  ragRefs: CaseRow['rag_references']
): Promise<{ soapSummary: CaseRow['soap_summary'] }> {
  await logTrace(caseRow.id, 'generate_soap', 'started');

  const soap = await generateSOAP({
    nama: caseRow.nama,
    keluhanUtama: caseRow.keluhan_utama,
    vitalSigns: caseRow.vital_signs,
    ageMonths: caseRow.age_months,
    triageResult,
    riwayatMedis: caseRow.riwayat_medis ?? {},
    drugInteractions,
    ragReferences: ragRefs,
  });

  await logTrace(caseRow.id, 'generate_soap', 'completed', {
    soap_subjective_length: soap.subjective.length,
    soap_plan_length: soap.plan.length,
  });

  return { soapSummary: soap };
}

// ── Main orchestrator run ────────────────────────────────────────────────────

export async function runOrchestrator(caseId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Load case current state
    const { data: caseRow, error: loadErr } = await admin
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (loadErr || !caseRow) {
      console.error('[Orchestrator] Cannot load case:', loadErr?.message);
      return;
    }

    const typedCase = caseRow as CaseRow;
    const currentNode = typedCase.current_node;

    try {
      if (currentNode === 'intake' || currentNode === 'retrieve_context') {
        // Node 1: retrieve_context
        await setNode(caseId, 'retrieve_context');
        const { ragRefs } = await nodeRetrieveContext(typedCase);
        const { error: updErr } = await admin.from('cases').update({ rag_references: ragRefs, current_node: 'urgency_scoring' }).eq('id', caseId);
        if (updErr) throw new Error(`DB Update Error (retrieve_context): ${updErr.message}`);
      } 
      else if (currentNode === 'urgency_scoring') {
        // Node 2 & 3: urgency_scoring & drug_interaction_check
        const [scoringResult, drugResult] = await Promise.all([
          nodeUrgencyScoring(typedCase, typedCase.rag_references ?? []),
          nodeDrugInteractionCheck(typedCase),
        ]);

        const updateData: any = {
          ...scoringResult.triageData,
          drug_interactions: drugResult.drugInteractions,
        };

        // Clarification Loop Check: trigger if ANY missing fields are found (strict mode / rewel)
        const features = scoringResult.triageData.patient_features as PatientFeatures;
        const { missingFields: vitalMissing } = computeConfidence(features || {});
        const missingFields = [...vitalMissing];
        
        if (!typedCase.riwayat_medis?.kondisi_kronis || typedCase.riwayat_medis.kondisi_kronis.length === 0) {
          missingFields.push('kondisi_kronis');
        }
        if (!typedCase.riwayat_medis?.alergi || typedCase.riwayat_medis.alergi.length === 0) {
          missingFields.push('alergi');
        }
        if (!typedCase.riwayat_medis?.obat_dikonsumsi || typedCase.riwayat_medis.obat_dikonsumsi.length === 0) {
          missingFields.push('obat_dikonsumsi');
        }
        
        if (missingFields.length > 0) {
          await logTrace(caseId, 'clarify_with_nurse', 'started', { missingFields });
          const questions = await generateClarificationQuestions(typedCase.keluhan_utama, missingFields);
          const clarificationData: ClarificationData = { questions, missingFields, resolved: false };
          
          updateData.current_node = 'clarify_with_nurse';
          updateData.clarification_data = clarificationData;
          const { error: updErr } = await admin.from('cases').update(updateData).eq('id', caseId);
          if (updErr) throw new Error(`DB Update Error (clarify_with_nurse): ${updErr.message}`);
          
          await logTrace(caseId, 'clarify_with_nurse', 'completed', { questions_asked: questions.length });
          return; // Stop and wait for user input
        }

        updateData.current_node = 'generate_soap';
        const { error: updErr } = await admin.from('cases').update(updateData).eq('id', caseId);
        if (updErr) throw new Error(`DB Update Error (urgency_scoring): ${updErr.message}`);
      }
      else if (currentNode === 'clarify_with_nurse') {
        // Wait for external action to change this node back to urgency_scoring
        return;
      }
      else if (currentNode === 'generate_soap') {
        // Re-construct triage result for SOAP
        const triageResultForSOAP: ReturnType<typeof evaluateTriage> = {
          age_category: (typedCase.age_category as any) ?? 'Dewasa',
          auto_scoring_eligible: typedCase.auto_scoring_eligible ?? true,
          esi_score: typedCase.esi_score ?? null,
          triage_warna: typedCase.triage_warna ?? null,
          override_triggered: typedCase.override_triggered ?? false,
          confidence: (typedCase.confidence_level as any) ?? 'low',
          flags: typedCase.triage_flags ?? [],
          reasoning: [],
        };

        const { soapSummary } = await nodeGenerateSOAP(
          typedCase,
          triageResultForSOAP,
          typedCase.drug_interactions ?? [],
          typedCase.rag_references ?? []
        );

        const { error: updErr } = await admin.from('cases').update({
          soap_summary: soapSummary,
          current_node: 'self_critique',
        }).eq('id', caseId);
        if (updErr) throw new Error(`DB Update Error (generate_soap): ${updErr.message}`);
      }
      else if (currentNode === 'self_critique') {
        await logTrace(caseId, 'self_critique', 'started');
        
        const triageResultForCritique: ReturnType<typeof evaluateTriage> = {
          age_category: (typedCase.age_category as any) ?? 'Dewasa',
          auto_scoring_eligible: typedCase.auto_scoring_eligible ?? true,
          esi_score: typedCase.esi_score ?? null,
          triage_warna: typedCase.triage_warna ?? null,
          override_triggered: typedCase.override_triggered ?? false,
          confidence: (typedCase.confidence_level as any) ?? 'low',
          flags: typedCase.triage_flags ?? [],
          reasoning: [],
        };

        let currentIteration = 1;
        if (typedCase.critique_feedback) {
          currentIteration = typedCase.critique_feedback.iteration + 1;
        }

        const critiqueResult = await selfCritiqueSOAP(typedCase, typedCase.soap_summary!, triageResultForCritique);
        
        const feedback: CritiqueFeedback = {
          passed: critiqueResult.passed,
          issues: critiqueResult.issues,
          iteration: currentIteration
        };

        await logTrace(caseId, 'self_critique', 'completed', { passed: feedback.passed, issues: feedback.issues });

        if (!critiqueResult.passed && currentIteration < 2) {
          // Loop back to generate soap
          const { error: updErr } = await admin.from('cases').update({
            critique_feedback: feedback,
            current_node: 'generate_soap'
          }).eq('id', caseId);
          if (updErr) throw new Error(`DB Update Error (self_critique loop): ${updErr.message}`);
        } else {
          // Proceed to human verification
          const { error: updErr } = await admin.from('cases').update({
            critique_feedback: feedback,
            current_node: 'await_doctor_verification'
          }).eq('id', caseId);
          if (updErr) throw new Error(`DB Update Error (await_doctor_verification): ${updErr.message}`);
          
          await logTrace(caseId, 'await_doctor_verification', 'started', {
            message: 'Menunggu verifikasi dokter',
          });
        }
      }
      else if (currentNode === 'await_doctor_verification' || currentNode === 'completed' || currentNode === 'error') {
        // End of the line
        return;
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Orchestrator] Fatal error for case', caseId, ':', message);

      await logTrace(caseId, 'error', 'failed', { error: message });
      await admin.from('cases').update({
        current_node: 'error',
        error_message: message,
        confidence_level: 'low',
      }).eq('id', caseId);
      return;
    }
  }
}
