# LexiLens Automated Testing & Quality Assurance Guide

LexiLens maintains a comprehensive automated testing suite designed to ensure absolute reliability across document ingestion, database persistence, cryptographic authentication, access control (IDOR), prompt injection defense, and quantitative AI grounding.

---

## 1. Test Suite Summary

- **Total Test Files:** 7
- **Total Automated Tests:** 47
- **Execution Time:** ~2.3 seconds
- **Pass Rate:** 100% (47/47 passing)

```
Test Files  7 passed (7)
     Tests  47 passed (47)
  Duration  ~2.30s
```

---

## 2. Test Suites Breakdown

| Test Suite | File | Tests | Focus Area |
| :--- | :--- | :---: | :--- |
| **Authentication & IDOR** | `tests/auth-idor.test.ts` | 16 | Salted `scrypt` hashing, SHA-256 session token hashing, session lifecycle, cross-tenant 404 access denial (IDOR), and Bearer/Cookie headers. |
| **Storage & Deletion** | `tests/storage-deletion.test.ts` | 4 | Physical file creation, atomic database and filesystem unlinking on delete (`fs.unlinkSync`), unauthorized deletion prevention, and path traversal containment. |
| **Adversarial Prompt Defense** | `tests/prompt-injection-advanced.test.ts` | 11 | 9 adversarial prompt injection vectors (role hijacking, DAN mode, XML tag breakouts, exfiltration URLs, system prompt leakage, null-byte evasion). |
| **Golden AI Evaluation** | `tests/evaluation-runner.test.ts` | 1 | Full quantitative benchmark against golden contracts (MSA, Lease) measuring Groundedness, Citation Precision, Anti-Hallucination, and Prompt Shielding. |
| **AI Safety & Grounding** | `tests/ai-safety.test.ts` | 5 | Grounded Q&A, citation extraction, absent-information refusal, and contract version diffing (materiality scoring). |
| **Document Processing Pipeline** | `tests/document-processing.test.ts` | 6 | Magic bytes validation (%PDF-, PK.., UTF-8 / PE-reject), page-preserving text extraction, clause boundary detection, sliding window chunking, and embedding generation. |
| **Relational Database** | `tests/db.test.ts` | 4 | Document insertion and retrieval, row-level ownership checks, obligations toggle state, and cascade deletion. |

---

## 3. Running the Automated Tests

### 3.1 Run All Tests
```bash
node ./node_modules/vitest/vitest.mjs run
```

### 3.2 Run Individual Suites
- **Authentication & Security:**
  ```bash
  node ./node_modules/vitest/vitest.mjs run tests/auth-idor.test.ts tests/storage-deletion.test.ts tests/prompt-injection-advanced.test.ts
  ```

- **AI Evaluation Benchmark:**
  ```bash
  node ./node_modules/vitest/vitest.mjs run tests/evaluation-runner.test.ts
  ```

- **Document Processing & Database:**
  ```bash
  node ./node_modules/vitest/vitest.mjs run tests/document-processing.test.ts tests/db.test.ts
  ```

---

## 4. Code Quality & Linting Verification

LexiLens enforces strict linting rules via ESLint extending `next/core-web-vitals`:
```bash
node ./node_modules/eslint/bin/eslint.js src/ --ext .ts,.tsx
```
**Status:** 0 errors, 0 warnings across all TypeScript and React components.
