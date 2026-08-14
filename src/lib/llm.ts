/**
 * LLM Gateway for MedAgent-Alpha
 *
 * Routing strategy (Updated for pure Gemini):
 *   - Diagnostic & Pharma agents: gemini-1.5-flash
 *   - Embeddings: text-embedding-004
 * All routed natively via Google AI Studio's native REST API.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

// ── Core fetch wrapper ───────────────────────────────────────────────────────

async function callGeminiNative(
  model: string,
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  // Extract system prompt if present
  let systemInstruction;
  const systemMsg = messages.find(m => m.role === 'system');
  if (systemMsg) {
    systemInstruction = {
      parts: [{ text: systemMsg.content }]
    };
  }

  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const body: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.max_tokens ?? 1024,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  if (options.response_format?.type === 'json_object') {
    body.generationConfig.responseMimeType = 'application/json';
  }

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  
  // Implement Auto-Retry for 429 Rate Limit (Free Tier)
  let res;
  let attempts = 0;
  let maxAttempts = 5;
  while (attempts < maxAttempts) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      attempts++;
      console.warn(`[LLM] API Error (${res.status}). Retrying in 30 seconds... (Attempt ${attempts}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const errText = await (res ? res.text() : Promise.resolve('No response'));
    throw new Error(`Gemini Native API error [${res?.status}]: ${errText}`);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof content !== 'string') {
    throw new Error('Unexpected Gemini response shape: ' + JSON.stringify(data));
  }
  return content.trim();
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function callDiagnosticLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const model = process.env.LLM_DIAGNOSTIC ?? 'gemini-1.5-flash';
  return await callGeminiNative(model, messages, options);
}

export async function callPharmaLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const model = process.env.LLM_PHARMA ?? 'gemini-1.5-flash';
  return await callGeminiNative(model, messages, options);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  
  const embeddingModel = process.env.LLM_EMBEDDING ?? 'text-embedding-004';

  const url = `${GEMINI_BASE}/${embeddingModel}:embedContent?key=${apiKey}`;
  
  // Implement Auto-Retry for 429 Rate Limit (Free Tier)
  let res;
  let attempts = 0;
  let maxAttempts = 5;
  while (attempts < maxAttempts) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${embeddingModel}`,
        content: { parts: [{ text }] }
      }),
    });

    if (res.status === 429 || res.status === 503) {
      attempts++;
      console.warn(`[LLM Embedding] API Error (${res.status}). Retrying in 30 seconds... (Attempt ${attempts}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const errText = await (res ? res.text() : Promise.resolve('No response'));
    throw new Error(`Gemini Embedding API error [${res?.status}]: ${errText}`);
  }

  const data = await res.json();
  const embedding = data?.embedding?.values;
  if (!Array.isArray(embedding)) {
    throw new Error('Unexpected embedding response: ' + JSON.stringify(data));
  }
  return embedding as number[];
}

export function parseLLMJson<T = Record<string, unknown>>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
