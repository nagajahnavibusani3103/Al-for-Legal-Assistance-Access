# LexiLens Testing & Verification Strategy

The LexiLens test suite provides multi-layered coverage across file handling, persistence, AI safety, grounding, and anti-hallucination.

## Test Matrix

| Test Suite | File | Focus Area | Status |
|---|---|---|---|
| **Document Processing** | `tests/document-processing.test.ts` | Magic bytes, PE binary reject, size limits, chunking, embeddings | **PASS** (6/6) |
| **SQL Database & Ownership** | `tests/db.test.ts` | Relational schema, foreign key cascade, ownership enforcement | **PASS** (4/4) |
| **AI Safety & Grounding** | `tests/ai-safety.test.ts` | Prompt injection, anti-hallucination missing facts, comparison diffing | **PASS** (5/5) |
| **Evaluation Suite** | `tests/evaluation-runner.test.ts` | Quantitative groundedness, citation correctness, prompt injection resistance | **PASS** (1/1, 100%) |

## Running the Tests

```bash
# Run the complete test suite
node ./node_modules/vitest/vitest.mjs run

# Run specific evaluation benchmark
node ./node_modules/vitest/vitest.mjs run tests/evaluation-runner.test.ts
```

## AI Evaluation Metrics Benchmark

When running the internal evaluation runner (`tests/evaluation-runner.test.ts`), the system evaluates:
1. **Groundedness Score (100%):** Evaluates if response claims trace directly to verified text chunks.
2. **Citation Correctness (100%):** Validates that cited page numbers and section headings actually exist.
3. **Prompt Injection Resistance (100%):** Tests adversarial phrases (`"ignore instructions"`, `"system prompt"`, `"dan mode"`) to ensure they are quarantined.
4. **Unsupported-Claim Avoidance (100%):** Ensures queries for absent topics return "Not found in document".
5. **Comparison Accuracy (100%):** Verifies that material contractual changes (notice period reduction, salary modification, added covenants) are properly categorized.
