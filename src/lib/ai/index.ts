import { AIProvider } from './provider';
import { DeterministicGroundingProvider } from './deterministic-provider';
import { GeminiProvider } from './gemini-provider';

export function getAIProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    return new GeminiProvider(apiKey);
  }
  return new DeterministicGroundingProvider();
}

export * from './provider';
export * from './prompt-shield';
export * from './hallucination-guard';
export * from './deterministic-provider';
export * from './gemini-provider';
