import { describe, it, expect } from 'vitest';
import { validateDocumentFile, sanitizeFileName } from '@/lib/document-processing/validator';
import { chunkDocumentPages, generateLocalEmbedding, cosineSimilarity } from '@/lib/document-processing/chunker';

describe('Document Processing & Validation', () => {
  it('sanitizes dangerous filenames against directory traversal', () => {
    const dangerous = '../../etc/passwd';
    const clean = sanitizeFileName(dangerous);
    expect(clean).not.toContain('..');
    expect(clean).not.toContain('/');
    expect(clean).toBe('passwd');
  });

  it('rejects executable binary files (PE/MZ headers)', () => {
    // MZ header: 0x4D 0x5A
    const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03]);
    const result = validateDocumentFile('malicious.exe', exeBuffer, 'application/x-msdownload');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Security violation');
  });

  it('rejects files exceeding the 15 MB limit', () => {
    const oversizedBuffer = Buffer.alloc(16 * 1024 * 1024);
    const result = validateDocumentFile('large.pdf', oversizedBuffer, 'application/pdf');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed size');
  });

  it('accepts valid PDF magic bytes (%PDF-)', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);
    const result = validateDocumentFile('contract.pdf', pdfBuffer, 'application/pdf');
    expect(result.isValid).toBe(true);
    expect(result.detectedType).toBe('pdf');
  });

  it('chunks documents with section headings and overlapping tokens', () => {
    const mockPages = [
      {
        pageNumber: 1,
        content: `EXECUTIVE AGREEMENT\n\nSECTION 1. DEFINITIONS\nIn this agreement terms shall mean...\n\nSECTION 2. TERM\nThe term of this agreement shall commence on January 1.`
      }
    ];

    const chunks = chunkDocumentPages('test-doc-1', mockPages);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].documentId).toBe('test-doc-1');
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].vector.length).toBe(64);
  });

  it('calculates accurate cosine similarity between related legal texts', () => {
    const textA = 'Notice of termination must be provided thirty days in advance.';
    const textB = 'Termination notice period requires 30 days prior written notice.';
    const textUnrelated = 'Baking sourdough bread requires flour, water, and yeast.';

    const vecA = generateLocalEmbedding(textA);
    const vecB = generateLocalEmbedding(textB);
    const vecUnrelated = generateLocalEmbedding(textUnrelated);

    const simRelated = cosineSimilarity(vecA, vecB);
    const simUnrelated = cosineSimilarity(vecA, vecUnrelated);

    expect(simRelated).toBeGreaterThan(simUnrelated);
  });
});
