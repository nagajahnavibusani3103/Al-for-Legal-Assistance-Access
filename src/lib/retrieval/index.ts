import { DocumentChunk, GroundedCitation } from '@/types';
import { cosineSimilarity, generateLocalEmbedding } from '@/lib/document-processing/chunker';

export interface RetrievalConfig {
  topK: number;
  similarityThreshold: number;
  maxContextTokens: number;
  rerankEnabled: boolean;
  semanticWeight: number;
  lexicalWeight: number;
  headingBoost: number;
}

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  topK: 3,
  similarityThreshold: 0.20,
  maxContextTokens: 2048,
  rerankEnabled: true,
  semanticWeight: 0.45,
  lexicalWeight: 0.40,
  headingBoost: 0.20
};

export interface ScoredRetrievalResult {
  chunk: DocumentChunk;
  totalScore: number;
  semanticScore: number;
  lexicalScore: number;
  headingScore: number;
  bestSentence: string;
}

export interface RetrievalResponse {
  isFound: boolean;
  results: ScoredRetrievalResult[];
  citations: GroundedCitation[];
  contextTokensUsed: number;
}

// Common generic question and legal contract terms to disregard when evaluating topic presence
const GENERIC_LEGAL_STOPWORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'how', 'why', 'does', 'this', 'that', 
  'have', 'there', 'with', 'about', 'document', 'agreement', 'contract', 'lease',
  'clause', 'section', 'provision', 'policy', 'terms', 'under', 'are', 'is', 'for', 
  'the', 'and', 'party', 'parties', 'herein', 'set', 'forth', 'any', 'all', 'our', 
  'your', 'their', 'from', 'into', 'such', 'than', 'them', 'shall', 'will', 'may',
  'can', 'could', 'would', 'should', 'must', 'each', 'other', 'both', 'between',
  'provider', 'client', 'customer', 'tenant', 'landlord', 'premises', 'employee',
  'employer', 'company', 'property', 'require', 'required', 'permitted', 'amount'
]);

export class RetrievalService {
  private config: RetrievalConfig;

  constructor(config: Partial<RetrievalConfig> = {}) {
    this.config = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  }

  /**
   * Tokenizes and extracts meaningful terms from query or chunk text
   */
  public tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Lightweight legal vocabulary stemmer
   */
  public stem(word: string): string {
    let w = word.toLowerCase().trim();
    if (w.startsWith('subleas') || w.startsWith('sublet')) return 'sublet';
    if (w.startsWith('terminat')) return 'terminat';
    if (w.startsWith('prohibit')) return 'prohibit';
    if (w.startsWith('compet')) return 'compet';
    if (w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.endsWith('tion')) w = w.slice(0, -4);
    else if (w.endsWith('ment')) w = w.slice(0, -4);
    else if (w.endsWith('ies')) w = w.slice(0, -3) + 'y';
    else if (w.endsWith('es')) w = w.slice(0, -2);
    else if (w.endsWith('ed')) w = w.slice(0, -2);
    else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    return w;
  }

  /**
   * Calculates lexical matching score (BM25 term-frequency style with stemming)
   */
  public calculateLexicalScore(queryTokens: string[], text: string): number {
    if (queryTokens.length === 0) return 0;
    const lowerText = text.toLowerCase();
    const textTokens = this.tokenize(lowerText);
    const textStems = new Set(textTokens.map(t => this.stem(t)));

    let matches = 0;
    for (const token of queryTokens) {
      const stem = this.stem(token);
      if (lowerText.includes(token) || textStems.has(stem)) {
        matches++;
      }
    }
    return matches / queryTokens.length;
  }

  /**
   * Hybrid RAG Retrieval: semantic cosine + BM25 lexical + heading boost with deduplication
   */
  public retrieve(query: string, chunks: DocumentChunk[]): RetrievalResponse {
    if (!chunks || chunks.length === 0) {
      return { isFound: false, results: [], citations: [], contextTokensUsed: 0 };
    }

    const queryTokens = this.tokenize(query);
    const queryVector = generateLocalEmbedding(query);

    // 1. Score every candidate chunk
    const scored: ScoredRetrievalResult[] = chunks.map(chunk => {
      // Semantic vector score
      const chunkVector = chunk.vector && chunk.vector.length > 0 
        ? chunk.vector 
        : generateLocalEmbedding(chunk.content);
      const semanticScore = cosineSimilarity(queryVector, chunkVector);

      // Lexical BM25 score
      const lexicalScore = this.calculateLexicalScore(queryTokens, chunk.content);

      // Section heading boost
      let headingScore = 0;
      if (chunk.sectionHeading) {
        const headingTokens = this.tokenize(chunk.sectionHeading);
        const headingMatches = queryTokens.filter(t => headingTokens.includes(t)).length;
        if (headingMatches > 0) {
          headingScore = this.config.headingBoost * (headingMatches / Math.max(1, headingTokens.length));
        }
      }

      // Hybrid combination
      const totalScore = (semanticScore * this.config.semanticWeight) + 
                         (lexicalScore * this.config.lexicalWeight) + 
                         headingScore;

      // Find best sentence inside chunk
      const sentences = chunk.content.split(/(?<=[.?!])\s+/);
      let bestSentence = sentences[0] || chunk.content;
      let maxHits = -1;
      for (const s of sentences) {
        const sLower = s.toLowerCase();
        const hits = queryTokens.filter(t => {
          const stem = this.stem(t);
          return sLower.includes(t) || (stem.length >= 4 && sLower.includes(stem));
        }).length;
        if (hits > maxHits) {
          maxHits = hits;
          bestSentence = s;
        }
      }

      return {
        chunk,
        totalScore,
        semanticScore,
        lexicalScore,
        headingScore,
        bestSentence: bestSentence.trim()
      };
    });

    // 2. Sort descending by score
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // 3. Deduplicate overlapping adjacent chunks
    const deduplicated: ScoredRetrievalResult[] = [];
    const seenIndices = new Set<number>();

    for (const item of scored) {
      if (item.totalScore < this.config.similarityThreshold) continue;
      // Skip if immediate previous index was already selected and shares page
      const prevIdx = item.chunk.chunkIndex - 1;
      const nextIdx = item.chunk.chunkIndex + 1;
      if (seenIndices.has(prevIdx) && item.chunk.pageNumber === deduplicated[deduplicated.length - 1]?.chunk.pageNumber) {
        // Allow only if score is significantly high
        if (item.totalScore < 0.4) continue;
      }

      seenIndices.add(item.chunk.chunkIndex);
      deduplicated.push(item);

      if (deduplicated.length >= this.config.topK) break;
    }

    // 4. Anti-Hallucination Guard & Re-ranking by Core Topic Presence
    const coreQueryWords = queryTokens.filter(t => !GENERIC_LEGAL_STOPWORDS.has(t));

    // Score candidates based on actual core topic keyword presence
    for (const item of deduplicated) {
      const content = item.chunk.content.toLowerCase();
      let matches = 0;
      for (const w of coreQueryWords) {
        const stem = this.stem(w);
        if (content.includes(w) || (stem.length >= 4 && content.includes(stem))) {
          matches++;
        }
      }
      (item as any).coreMatches = matches;
    }

    // Re-rank so chunks with actual core topic keyword matches come first
    if (coreQueryWords.length > 0) {
      deduplicated.sort((a, b) => ((b as any).coreMatches || 0) - ((a as any).coreMatches || 0));
    }

    const primaryCandidate = deduplicated[0];
    const topCoreMatches = (primaryCandidate as any)?.coreMatches || 0;

    const requiredMatches = coreQueryWords.length >= 3 ? Math.min(2, coreQueryWords.length) : (coreQueryWords.length > 0 ? 1 : 0);
    const hasCoreMatch = coreQueryWords.length === 0 || topCoreMatches >= requiredMatches;

    if (deduplicated.length === 0 || primaryCandidate.totalScore < this.config.similarityThreshold || !hasCoreMatch) {
      return {
        isFound: false,
        results: [],
        citations: [],
        contextTokensUsed: 0
      };
    }

    // 5. Context budget enforcement
    let tokensAccumulated = 0;
    const finalResults: ScoredRetrievalResult[] = [];
    for (const item of deduplicated) {
      if (tokensAccumulated + item.chunk.tokenCount > this.config.maxContextTokens) {
        break;
      }
      tokensAccumulated += item.chunk.tokenCount;
      finalResults.push(item);
    }

    // 6. Format verified citations
    const citations: GroundedCitation[] = finalResults.map(r => ({
      pageNumber: r.chunk.pageNumber,
      sectionHeading: r.chunk.sectionHeading,
      chunkId: r.chunk.id,
      excerpt: r.bestSentence,
      confidence: r.totalScore > 0.45 ? 'DIRECTLY STATED' : 'STRONGLY SUPPORTED'
    }));

    return {
      isFound: true,
      results: finalResults,
      citations,
      contextTokensUsed: tokensAccumulated
    };
  }
}

let defaultRetrievalService: RetrievalService | null = null;
export function getRetrievalService(): RetrievalService {
  if (!defaultRetrievalService) {
    defaultRetrievalService = new RetrievalService();
  }
  return defaultRetrievalService;
}
