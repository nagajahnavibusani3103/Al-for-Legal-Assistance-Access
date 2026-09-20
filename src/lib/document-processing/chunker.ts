import { ExtractedPage } from './extractor';
import { DocumentChunk } from '@/types';

export interface ProcessedChunk extends DocumentChunk {
  vector: number[];
}

// Generate normalized TF-IDF style semantic vector (64 dimensions)
export function generateLocalEmbedding(text: string): number[] {
  const dim = 64;
  const vector = new Array(dim).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);

  if (words.length === 0) return vector;

  for (const word of words) {
    // Hash word to dimension slot
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1;
  }

  // Normalize vector to unit length
  let sumSq = 0;
  for (let i = 0; i < dim; i++) {
    sumSq += vector[i] * vector[i];
  }
  const mag = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dim; i++) {
    vector[i] = Number((vector[i] / mag).toFixed(5));
  }

  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

const HEADING_REGEX = /^(?:(?:Section|Article|Clause)\s*(\d+(?:\.\d+)*)[:.]?|(?:[A-Z0-9]{1,3}\.)\s+|(?:\d+\.)\s+|([A-Z\s]{4,40}))\s*(.*)$/m;

export function chunkDocumentPages(documentId: string, pages: ExtractedPage[]): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageNum = page.pageNumber;
    const lines = page.content.split('\n');
    let currentHeading = `Page ${pageNum}`;
    let bufferWords: string[] = [];
    let overlapWords: string[] = [];

    const flushChunk = () => {
      if (bufferWords.length === 0) return;
      const content = bufferWords.join(' ').trim();
      const chunkId = `chk-${documentId}-p${pageNum}-${globalChunkIndex}`;
      
      chunks.push({
        id: chunkId,
        documentId,
        pageNumber: pageNum,
        sectionHeading: currentHeading,
        chunkIndex: globalChunkIndex,
        content,
        tokenCount: bufferWords.length,
        vector: generateLocalEmbedding(content)
      });

      globalChunkIndex++;
      // Save last 50 words for overlap
      overlapWords = bufferWords.slice(-50);
      bufferWords = [...overlapWords];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect heading
      if (trimmed.length < 80 && HEADING_REGEX.test(trimmed)) {
        if (bufferWords.length > 80) {
          flushChunk();
        }
        currentHeading = trimmed;
      }

      const words = trimmed.split(/\s+/).filter(Boolean);
      bufferWords.push(...words);

      // Max chunk size ~350 words
      if (bufferWords.length >= 350) {
        flushChunk();
      }
    }

    if (bufferWords.length > overlapWords.length) {
      flushChunk();
    }
  }

  // Edge case: if no chunks created, create one
  if (chunks.length === 0 && pages.length > 0) {
    const content = pages[0].content || 'Empty Document';
    chunks.push({
      id: `chk-${documentId}-p1-0`,
      documentId,
      pageNumber: 1,
      sectionHeading: 'General',
      chunkIndex: 0,
      content,
      tokenCount: content.split(/\s+/).length,
      vector: generateLocalEmbedding(content)
    });
  }

  return chunks;
}
