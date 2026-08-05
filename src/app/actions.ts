'use server';

/**
 * MedAgent-Alpha — Server Actions
 * Handles: new case intake, doctor verification (approve/edit/reject)
 */

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';

// ── Validation schemas ────────────────────────────────────────────────────────

const IntakeSchema = z.object({
  nama:              z.string().min(1, 'Nama wajib diisi').max(255),
  age_value:         z.coerce.number().int().min(1, 'Usia harus > 0'),
  age_unit:          z.enum(['Tahun', 'Bulan']),
  jenis_kelamin:     z.enum(['Laki-laki', 'Perempuan']),
  keluhan_utama:     z.string().min(3, 'Keluhan wajib diisi').max(2000),
  // Vital signs (all optional, validated by range)
  spo2:              z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  systolic:          z.coerce.number().min(0).max(300).optional().or(z.literal('')),
  diastolic:         z.coerce.number().min(0).max(200).optional().or(z.literal('')),
  heart_rate:        z.coerce.number().min(0).max(300).optional().or(z.literal('')),
  respiratory_rate:  z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  temperature:       z.coerce.number().min(20).max(45).optional().or(z.literal('')),
  gcs:               z.coerce.number().min(3).max(15).optional().or(z.literal('')),
  // Riwayat medis
  kondisi_kronis:    z.string().optional(),  // comma-separated
  alergi:            z.string().optional(),
  obat_dikonsumsi:   z.string().optional(),
});

export type IntakeFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// ── Helper: convert age to months ─────────────────────────────────────────────

function toAgeMonths(value: number, unit: 'Tahun' | 'Bulan'): number {
  return unit === 'Tahun' ? value * 12 : value;
}

function parseList(raw?: string): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Action: submit new patient intake ────────────────────────────────────────

export async function submitIntake(
  _prevState: IntakeFormState,
  formData: FormData
): Promise<IntakeFormState> {
  // Parse & validate
  const raw = Object.fromEntries(formData.entries());
  const result = IntakeSchema.safeParse(raw);

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const d = result.data;
  const ageMonths = toAgeMonths(d.age_value, d.age_unit);

  // Build nested objects
  const vitalSigns = {
    ...(d.spo2 !== '' && d.spo2 !== undefined            ? { spo2: Number(d.spo2) }                         : {}),
    ...(d.systolic !== '' && d.systolic !== undefined     ? { systolic: Number(d.systolic) }                 : {}),
    ...(d.diastolic !== '' && d.diastolic !== undefined   ? { diastolic: Number(d.diastolic) }               : {}),
    ...(d.heart_rate !== '' && d.heart_rate !== undefined ? { heart_rate: Number(d.heart_rate) }             : {}),
    ...(d.respiratory_rate !== '' && d.respiratory_rate !== undefined ? { respiratory_rate: Number(d.respiratory_rate) } : {}),
    ...(d.temperature !== '' && d.temperature !== undefined ? { temperature: Number(d.temperature) }         : {}),
    ...(d.gcs !== '' && d.gcs !== undefined               ? { gcs: Number(d.gcs) }                          : {}),
  };

  const riwayatMedis = {
    kondisi_kronis:  parseList(d.kondisi_kronis),
    alergi:          parseList(d.alergi),
    obat_dikonsumsi: parseList(d.obat_dikonsumsi),
  };

  const admin = getSupabaseAdmin();

  // Insert case (current_node starts at 'intake')
  const { data: newCase, error } = await admin
    .from('cases')
    .insert({
      nama:          d.nama,
      age_value:     d.age_value,
      age_unit:      d.age_unit,
      age_months:    ageMonths,
      jenis_kelamin: d.jenis_kelamin,
      keluhan_utama: d.keluhan_utama,
      vital_signs:   vitalSigns,
      riwayat_medis: riwayatMedis,
      current_node:  'intake',
    })
    .select('id')
    .single();

  if (error || !newCase) {
    return { message: `Gagal menyimpan data: ${error?.message ?? 'Unknown error'}` };
  }

  // Trigger async orchestrator via internal API (fire-and-forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  fetch(`${baseUrl}/api/process-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: newCase.id }),
  }).catch((e) => console.error('[Action] Failed to trigger orchestrator:', e));

  // Redirect to dashboard
  redirect('/dashboard');
}

// ── Action: doctor verification ───────────────────────────────────────────────

const VerifySchema = z.object({
  case_id:            z.string().uuid(),
  verification_status: z.enum(['approved', 'edited', 'rejected']),
  verification_note:   z.string().max(2000).optional(),
  verified_by:         z.string().max(255).optional(),
  // Editable SOAP fields (only used when status = 'edited')
  soap_subjective:     z.string().optional(),
  soap_objective:      z.string().optional(),
  soap_assessment:     z.string().optional(),
  soap_plan:           z.string().optional(),
});

export type VerifyFormState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function verifyCase(
  _prevState: VerifyFormState,
  formData: FormData
): Promise<VerifyFormState> {
  const raw = Object.fromEntries(formData.entries());
  const result = VerifySchema.safeParse(raw);

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const d = result.data;
  const admin = getSupabaseAdmin();

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    verification_status: d.verification_status,
    verification_note:   d.verification_note ?? null,
    verified_by:         d.verified_by ?? 'Dokter',
    verified_at:         new Date().toISOString(),
    current_node:        'completed',
  };

  // If edited, update SOAP too
  if (d.verification_status === 'edited') {
    const { data: existing } = await admin
      .from('cases')
      .select('soap_summary')
      .eq('id', d.case_id)
      .single();

    const currentSoap = (existing?.soap_summary as Record<string, string>) ?? {};
    updatePayload.soap_summary = {
      subjective: d.soap_subjective ?? currentSoap.subjective ?? '',
      objective:  d.soap_objective  ?? currentSoap.objective  ?? '',
      assessment: d.soap_assessment ?? currentSoap.assessment ?? '',
      plan:       d.soap_plan       ?? currentSoap.plan       ?? '',
    };
  }

  const { error } = await admin
    .from('cases')
    .update(updatePayload)
    .eq('id', d.case_id);

  if (error) {
    return { message: `Gagal menyimpan verifikasi: ${error.message}` };
  }

  revalidatePath(`/case/${d.case_id}`);
  revalidatePath('/dashboard');

  return { success: true, message: `Kasus berhasil di-${d.verification_status}.` };
}

// ── Action: fetch dashboard cases (server-side for initial render) ────────────

export async function getDashboardCases() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('cases')
    .select(
      'id, nama, age_value, age_unit, age_months, jenis_kelamin, keluhan_utama, vital_signs, waktu_masuk, current_node, esi_score, triage_warna, auto_scoring_eligible, confidence_level, override_triggered, triage_flags, verification_status, verified_by, verified_at, error_message'
    )
    .order('esi_score', { ascending: true, nullsFirst: false })
    .order('waktu_masuk', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[Action] getDashboardCases error:', error.message);
    return [];
  }
  return data ?? [];
}

// ── Action: fetch single case detail ─────────────────────────────────────────

export async function getCaseDetail(caseId: string) {
  const admin = getSupabaseAdmin();
  const [caseResult, traceResult] = await Promise.all([
    admin.from('cases').select('*').eq('id', caseId).single(),
    admin
      .from('case_trace')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
  ]);

  if (caseResult.error) return null;

  return {
    case: caseResult.data,
    trace: traceResult.data ?? [],
  };
}
