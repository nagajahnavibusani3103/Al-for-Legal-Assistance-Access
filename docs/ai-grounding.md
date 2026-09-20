# LexiLens AI Grounding & Anti-Hallucination Architecture

Legal documents require absolute evidence traceability. A single fabricated clause or inaccurate deadline can lead to severe legal and financial repercussions. LexiLens implements an uncompromising grounding architecture to prevent hallucinations.

## 1. Grounding Pipeline

```
User Query
    │
    ▼
Query Normalization & Safety Inspection (prompt-shield.ts)
    │
    ▼
Hybrid Retrieval Engine
  ├── Cosine Similarity over 64-d Chunk Vectors
  ├── Lexical Token Frequency (BM25 style matching)
  └── Section Heading Proximity Boost
    │
    ▼
Top Relevant Evidence Chunks (Score Threshold >= 0.20)
    │
    ├─────────────────────────────┐
    │ If Top Score < 0.20         │ If Top Score >= 0.20
    ▼                             ▼
Anti-Hallucination Safe Fallback  Grounded Evidence Synthesis
"I couldn't find that information  Extracts verbatim sentence quote
 in the uploaded document."        Generates plain-language explanation
 isFoundInDocument: false          Verifies citation against page & chunk
 evidence: []                      needsProfessionalReview determination
```

## 2. Evidence Confidence Levels

Every generated citation displays a verified confidence tier:
- `DIRECTLY STATED`: The answer directly quotes or mirrors the language in the cited document section (keyword overlap >= 80%).
- `STRONGLY SUPPORTED`: The provision logically establishes the stated right or duty with high textual correspondence (overlap >= 40%).
- `POTENTIAL INTERPRETATION`: The topic relates to general contractual principles, accompanied by a recommendation to clarify with legal counsel.
- `NOT FOUND`: Explicitly communicated when the document is silent on the topic.

## 3. High-Stakes Risk Detection

When questions touch upon indemnity, liability caps, non-compete enforceability, or litigation, LexiLens surfaces a visible **"Review Recommended"** badge and provides tailored consultation questions for the user to discuss with an attorney.
