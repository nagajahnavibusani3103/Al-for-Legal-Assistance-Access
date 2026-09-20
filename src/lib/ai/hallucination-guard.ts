import { GroundedCitation, DocumentChunk } from '@/types';

export function verifyCitations(
  citations: GroundedCitation[],
  availableChunks: DocumentChunk[]
): GroundedCitation[] {
  const verified: GroundedCitation[] = [];

  for (const cit of citations) {
    // Find matching chunk or page
    const matchingChunks = availableChunks.filter(c => c.pageNumber === cit.pageNumber);
    if (matchingChunks.length === 0) {
      // Cited a page that doesn't exist! Skip or flag as ungrounded
      continue;
    }

    // Check textual overlap of excerpt
    const excerptLower = (cit.excerpt || '').toLowerCase();
    let bestScore = 0;
    let bestSection = cit.sectionHeading || matchingChunks[0].sectionHeading;

    for (const chunk of matchingChunks) {
      const chunkLower = chunk.content.toLowerCase();
      if (chunkLower.includes(excerptLower) && excerptLower.length > 15) {
        bestScore = 1.0;
        bestSection = chunk.sectionHeading;
        break;
      }

      // Keyword overlap
      const excerptWords = excerptLower.split(/\s+/).filter(w => w.length > 3);
      if (excerptWords.length > 0) {
        let matchCount = 0;
        for (const w of excerptWords) {
          if (chunkLower.includes(w)) matchCount++;
        }
        const score = matchCount / excerptWords.length;
        if (score > bestScore) {
          bestScore = score;
          bestSection = chunk.sectionHeading;
        }
      }
    }

    let confidence: GroundedCitation['confidence'] = 'POTENTIAL INTERPRETATION';
    if (bestScore >= 0.8) {
      confidence = 'DIRECTLY STATED';
    } else if (bestScore >= 0.4) {
      confidence = 'STRONGLY SUPPORTED';
    }

    verified.push({
      pageNumber: cit.pageNumber,
      sectionHeading: bestSection,
      chunkId: cit.chunkId,
      excerpt: cit.excerpt,
      confidence
    });
  }

  return verified;
}

export function detectAbsenceOfInformation(answerText: string): boolean {
  const notFoundPatterns = [
    /not\s+found\s+in\s+(this|the)\s+document/i,
    /couldn't\s+find/i,
    /could\s+not\s+find/i,
    /does\s+not\s+(mention|state|contain|specify|provide)/i,
    /no\s+(mention|provision|clause|reference)\s+found/i,
    /not\s+clearly\s+identified/i,
    /document\s+is\s+silent/i,
    /not\s+specified\s+in\s+the\s+agreement/i
  ];

  return notFoundPatterns.some(p => p.test(answerText));
}

export function determineIfReviewRequired(query: string, answerText: string): boolean {
  const highStakesKeywords = [
    'indemnif', 'liabilit', 'termination', 'non-compete', 'lawsuit', 'sue', 
    'arbitration', 'breach', 'damage', 'warrant', 'severability', 'ip assignment',
    'ownership', 'penalty', 'forfeit', 'governing law', 'jurisdiction'
  ];

  const textLower = (query + ' ' + answerText).toLowerCase();
  return highStakesKeywords.some(kw => textLower.includes(kw));
}
