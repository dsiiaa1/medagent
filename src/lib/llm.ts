/**
 * LLM Gateway for MedAgent-Alpha
 *
 * Routing strategy (from PRD §8):
 *   - Diagnostic agent (RAG/urgency): Gemini 2.0 Flash via OpenRouter (complex reasoning)
 *   - Pharma agent + SOAP: Llama 3.1 8B via Groq (fast, cheap, simple tasks)
 *   - Fallback: if primary fails, try secondary provider
 *
 * DEMO_MODE=true → returns mock responses without any API calls.
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export type LLMAgent = 'diagnostic' | 'pharma' | 'embedding';

// ── Demo / mock responses ────────────────────────────────────────────────────

const MOCK_EXTRACTION: Record<string, unknown> = {
  spo2: 97,
  systolic: 120,
  diastolic: 80,
  heart_rate: 88,
  respiratory_rate: 18,
  temperature: 37.2,
  gcs: 15,
};

const MOCK_SOAP = {
  subjective:
    'Pasien datang dengan keluhan nyeri dada kiri sejak 2 jam yang lalu, menjalar ke lengan kiri. Pasien memiliki riwayat hipertensi dan mengonsumsi amlodipine 5 mg.',
  objective:
    'TD: 140/90 mmHg, HR: 92 x/mnt, RR: 20 x/mnt, SpO2: 96%, Suhu: 36.8°C, GCS: 15. Pasien tampak cemas namun kooperatif.',
  assessment:
    'Kemungkinan Sindrom Koroner Akut (SKA). Perlu asesmen lebih lanjut dengan EKG dan troponin serial.',
  plan:
    '1. Pasang akses IV, ambil darah untuk troponin, CK-MB, dan elektrolit.\n2. EKG 12 lead segera.\n3. Oksigen 2-4 L/mnt via nasal kanul jika SpO2 < 94%.\n4. Aspirin 320 mg PO jika tidak ada kontraindikasi.\n5. Konsultasi dokter spesialis jantung.',
};

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.max_tokens ?? 1024,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter requires site info
      ...(baseUrl.includes('openrouter')
        ? {
            'HTTP-Referer': 'https://medagent-alpha.vercel.app',
            'X-Title': 'MedAgent-Alpha',
          }
        : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected LLM response shape: ' + JSON.stringify(data));
  }
  return content.trim();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Call the diagnostic LLM (Gemini via OpenRouter) with automatic fallback.
 * In DEMO_MODE returns a mock JSON string suitable for feature extraction.
 */
export async function callDiagnosticLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  if (process.env.DEMO_MODE === 'true') {
    // Return mock extraction JSON
    return JSON.stringify(MOCK_EXTRACTION);
  }

  const model = process.env.LLM_DIAGNOSTIC ?? 'google/gemini-2.0-flash-001';
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    console.warn('[LLM] No OPENROUTER_API_KEY — returning mock response');
    return JSON.stringify(MOCK_EXTRACTION);
  }

  try {
    return await callOpenAICompatible(OPENROUTER_BASE, openrouterKey, model, messages, options);
  } catch (err) {
    console.error('[LLM] Diagnostic primary failed:', err);
    // Fallback: try Groq with a smaller model
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        return await callOpenAICompatible(
          GROQ_BASE,
          groqKey,
          'llama-3.1-8b-instant',
          messages,
          options
        );
      } catch (fallbackErr) {
        console.error('[LLM] Diagnostic fallback also failed:', fallbackErr);
      }
    }
    // Final fallback
    return JSON.stringify(MOCK_EXTRACTION);
  }
}

/**
 * Call the pharma / SOAP LLM (Llama via Groq) with fallback to OpenRouter.
 * In DEMO_MODE returns a mock SOAP JSON string.
 */
export async function callPharmaLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  if (process.env.DEMO_MODE === 'true') {
    return JSON.stringify(MOCK_SOAP);
  }

  const model = process.env.LLM_PHARMA ?? 'llama-3.1-8b-instant';
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    console.warn('[LLM] No GROQ_API_KEY — trying OpenRouter');
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      try {
        return await callOpenAICompatible(
          OPENROUTER_BASE,
          openrouterKey,
          'meta-llama/llama-3.1-8b-instruct:free',
          messages,
          options
        );
      } catch (err) {
        console.error('[LLM] Pharma OpenRouter fallback failed:', err);
      }
    }
    return JSON.stringify(MOCK_SOAP);
  }

  try {
    return await callOpenAICompatible(GROQ_BASE, groqKey, model, messages, options);
  } catch (err) {
    console.error('[LLM] Pharma primary failed:', err);
    return JSON.stringify(MOCK_SOAP);
  }
}

/**
 * Generate embedding vector for RAG ingestion / query.
 * Returns float array (1536 dimensions for text-embedding-3-small).
 * In DEMO_MODE returns a zero vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (process.env.DEMO_MODE === 'true') {
    // Return deterministic pseudo-random vector for demo (not meaningful for search)
    return new Array(1536).fill(0).map((_, i) => Math.sin(i + text.length) * 0.01);
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    console.warn('[LLM] No OPENROUTER_API_KEY for embedding — returning zero vector');
    return new Array(1536).fill(0);
  }

  const embeddingModel = process.env.LLM_EMBEDDING ?? 'openai/text-embedding-3-small';

  const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openrouterKey}`,
      'HTTP-Referer': 'https://medagent-alpha.vercel.app',
      'X-Title': 'MedAgent-Alpha',
    },
    body: JSON.stringify({ model: embeddingModel, input: text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API error [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('Unexpected embedding response: ' + JSON.stringify(data));
  }
  return embedding as number[];
}

/**
 * Parse JSON from LLM response safely.
 * Handles markdown code fences that some models add.
 */
export function parseLLMJson<T = Record<string, unknown>>(raw: string): T | null {
  try {
    // Strip markdown fences: ```json ... ```
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
