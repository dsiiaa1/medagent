import { callDiagnosticLLM } from '@/lib/llm';

export async function generateClarificationQuestions(
  keluhanUtama: string,
  missingFields: string[]
): Promise<string[]> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return [`Pasien mengeluh ${keluhanUtama}. Mohon lengkapi data vital berikut jika memungkinkan: ${missingFields.join(', ')}.`];
  }

  const prompt = `
Anda adalah Medical Triage Agent.
Sistem kekurangan data vital sign berikut untuk melakukan scoring otomatis: ${missingFields.join(', ')}.
Keluhan utama pasien: "${keluhanUtama}".

Tugas Anda adalah merumuskan 1 atau 2 pertanyaan singkat, sopan, dan profesional kepada perawat triase untuk meminta data tersebut.
Pertimbangkan keluhan utama; jika keluhannya gawat, tunjukkan urgensi.

Keluarkan respon dalam format JSON array of strings:
{
  "questions": ["pertanyaan 1", "pertanyaan 2"]
}
  `.trim();

  try {
    const response = await callDiagnosticLLM(
      [{ role: 'system', content: prompt }],
      { response_format: { type: 'json_object' } }
    );
    const parsed = JSON.parse(response);
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch (error) {
    console.error('Failed to generate clarification questions:', error);
    return [`Mohon lengkapi data berikut: ${missingFields.join(', ')}`];
  }
}
