export interface AIProviderConfig {
  provider: 'gemini' | 'deterministic';
  model: string;
  isConfigured: boolean;
  connectionStatus: 'connected' | 'offline_ready' | 'error';
  temperature: number;
  topK: number;
  maxContextTokens: number;
}

export function getAIProviderConfig(): AIProviderConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const hasKey = Boolean(apiKey && apiKey.trim().length > 0);

  return {
    provider: hasKey ? 'gemini' : 'deterministic',
    model: hasKey ? model : 'Deterministic Grounding Engine (TF-IDF Cosine RAG)',
    isConfigured: hasKey,
    connectionStatus: hasKey ? 'connected' : 'offline_ready',
    temperature: 0.2,
    topK: 3,
    maxContextTokens: 2048
  };
}

export async function testServerAIConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
}> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      success: true,
      message: 'Zero-dependency deterministic legal reasoning engine is active and ready (Offline Mode).',
      latencyMs: Date.now() - startTime
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return {
        success: true,
        message: `Successfully connected to Google Gemini (${model}).`,
        latencyMs
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.error?.message || `Google API returned status ${res.status}`,
        latencyMs
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to reach Gemini endpoint: ${err.message}`,
      latencyMs: Date.now() - startTime
    };
  }
}
