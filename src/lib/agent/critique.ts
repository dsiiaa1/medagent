import { callDiagnosticLLM } from '@/lib/llm';
import { CaseRow } from '@/lib/supabase';
import { evaluateTriage } from '@/lib/triage/engine';

export async function selfCritiqueSOAP(
  caseRow: CaseRow,
  soap: { subjective: string; objective: string; assessment: string; plan: string; conclusion?: string },
  triageResult: ReturnType<typeof evaluateTriage>
): Promise<{ passed: boolean; issues: string[] }> {
  // Mock response for DEMO_MODE logic
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return { passed: true, issues: [] };
  }

  const prompt = `
Anda adalah Medical Review Agent.
Tugas Anda adalah mengevaluasi catatan SOAP yang dihasilkan oleh sistem AI sebelum diserahkan ke dokter sungguhan.

Konteks Pasien:
- Keluhan Utama: ${caseRow.keluhan_utama}
- Skor Triage: ESI ${triageResult.esi_score || 'N/A'} (Warna: ${triageResult.triage_warna || 'N/A'})

Catatan SOAP yang dihasilkan:
- Subjective: ${soap.subjective}
- Objective: ${soap.objective}
- Assessment: ${soap.assessment}
- Plan: ${soap.plan}

Instruksi Evaluasi:
1. Apakah "Plan" cukup agresif/sesuai untuk skor ESI ini? (Contoh: ESI 1 harus ada tindakan life-saving segera, tidak boleh hanya observasi).
2. Apakah ada kontradiksi fatal antara Subjective/Objective dengan Assessment?

Keluarkan respon dalam format JSON:
{
  "passed": boolean,
  "issues": ["daftar masalah spesifik jika passed = false, atau array kosong jika passed = true"]
}
  `.trim();

  try {
    const response = await callDiagnosticLLM(
      [{ role: 'system', content: prompt }],
      { response_format: { type: 'json_object' } }
    );
    const parsed = JSON.parse(response);
    return {
      passed: Boolean(parsed.passed),
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch (error) {
    console.error('Self-critique failed, falling back to pass:', error);
    return { passed: true, issues: [] };
  }
}
