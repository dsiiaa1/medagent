/**
 * Supabase client utilities for MedAgent-Alpha
 * - supabase: client-side (anon key, safe to expose)
 * - supabaseAdmin: server-side only (service role key, never expose to browser)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

/** Browser / Server Component client (anon key) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Server-only admin client (service role key — bypasses RLS) */
export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Required for server-side operations.');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

// ── Type helpers aligned with schema.sql ────────────────────────────────────

export type TriageWarna = 'Merah' | 'Kuning' | 'Hijau' | 'Hitam';
export type VerificationStatus = 'pending' | 'approved' | 'edited' | 'rejected';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type OrchestratorNode =
  | 'intake'
  | 'retrieve_context'
  | 'urgency_scoring'
  | 'drug_interaction_check'
  | 'generate_soap'
  | 'await_doctor_verification'
  | 'completed'
  | 'error';

export interface VitalSigns {
  spo2?: number;
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  gcs?: number;
}

export interface RiwayatMedis {
  kondisi_kronis?: string[];
  alergi?: string[];
  obat_dikonsumsi?: string[];
}

export interface RagReference {
  title: string;
  content_snippet: string;
  source: string;
}

export interface DrugInteraction {
  drug_a: string;
  drug_b: string;
  severity: 'ringan' | 'sedang' | 'berat';
  description: string;
}

export interface SoapSummary {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface CaseRow {
  id: string;
  nama: string;
  age_value: number;
  age_unit: 'Tahun' | 'Bulan';
  age_months: number;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  keluhan_utama: string;
  vital_signs: VitalSigns;
  riwayat_medis: RiwayatMedis;
  waktu_masuk: string;
  current_node: OrchestratorNode;
  age_category: string | null;
  auto_scoring_eligible: boolean | null;
  esi_score: number | null;
  triage_warna: TriageWarna | null;
  override_triggered: boolean;
  confidence_level: ConfidenceLevel | null;
  triage_flags: string[];
  rag_references: RagReference[];
  patient_features: Record<string, unknown> | null;
  drug_interactions: DrugInteraction[];
  soap_summary: SoapSummary | null;
  verification_status: VerificationStatus;
  verification_note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  error_message: string | null;
  updated_at: string;
}

export interface CaseTraceRow {
  id: number;
  case_id: string;
  node_name: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  details: Record<string, unknown>;
  created_at: string;
}
