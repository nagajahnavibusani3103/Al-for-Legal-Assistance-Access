# LexiLens — Comprehensive Project Audit (Phase 0)
**Date:** September 20, 2026  
**Auditor:** Principal Software Engineer, Security Architect & AI Systems Lead  
**Scope:** Full repository codebase, architecture, dependencies, security, data layer, AI orchestration, accessibility, and tests.

---

## Executive Summary

LexiLens has a strong foundation: an end-to-end working Next.js 14 application with real document parsing (PDF, DOCX, TXT), an embedded relational SQLite database with foreign keys and cascade deletes, a dual-provider AI layer (Google Gemini 2.0 + an offline deterministic reasoning engine with TF-IDF cosine RAG), an evaluation runner benchmark suite, and 16 passing Vitest unit tests.

However, a rigorous production and security audit reveals critical gaps:
1. **Authentication & Identity (CRITICAL):** The application relies on trusting an arbitrary `Bearer <userId>` header or unauthenticated `lexilens_user_id` cookie, falling back to a hardcoded `demo-user`. There are no real user passwords, password hashes, or tamper-proof HTTP-only signed/hashed session tokens.
2. **Physical Storage & Deletion (HIGH):** Uploaded files are stored on disk with original filenames appended to a timestamp/random string in a shared folder rather than isolated user-specific paths. Document deletion in the API cascades across SQL tables, but leaves the physical file orphaned on the disk.
3. **AI Credential Exposure (HIGH):** The settings page (`src/app/settings/page.tsx`) stores Google Gemini API keys directly in the browser's `localStorage` and issues client-side calls to `generativelanguage.googleapis.com` containing the raw key in query parameters.
4. **CI/CD Linter Failure (HIGH):** GitHub Actions CI runs `eslint`, but no `.eslintrc.json` or ESLint configuration file exists in the repository, causing `npm run lint` and CI lint steps to fail with exit code 1.
5. **Synchronous Upload Processing (MEDIUM):** Uploading and analyzing a document happens synchronously inside a single HTTP request (`POST /api/documents`), creating timeout risks on larger files. An asynchronous processing state machine (`UPLOADED` -> `VALIDATING` -> `EXTRACTING` -> `CHUNKING` -> `EMBEDDING` -> `ANALYZING` -> `READY` / `FAILED`) is needed.
6. **RAG Configurability & BM25 Hybrid Retrieval (MEDIUM):** While lexical + cosine scoring exists in the deterministic provider, retrieval parameters (`topK`, `similarityThreshold`, `maxContextTokens`, `rerankEnabled`) are hardcoded without a centralized configuration or dedicated retrieval service.

---

## 1. Existing Architecture Overview

```
Frontend (Next.js 14 App Router, React 18, Tailwind CSS)
   │
   ├── Pages: /, /dashboard, /documents/[id], /compare, /settings, /privacy
   └── Components: Navbar, Footer, DisclaimerBanner, UploadModal
         │
         ▼  (HTTP REST Endpoints via route handlers)
API Route Handlers (/api/documents, /api/compare, /api/demo/seed, etc.)
   │
   ├── Security Layer (auth.ts [insecure identity], rate-limiter.ts, sanitizer.ts)
   ├── Ingestion Pipeline (validator.ts [magic bytes], extractor.ts [PDF/DOCX/TXT], chunker.ts)
   ├── AI Provider Layer (AIProvider interface, GeminiProvider, DeterministicGroundingProvider)
   │     └── Safety: prompt-shield.ts, hallucination-guard.ts
   └── Persistence Layer (node:sqlite, schema.sql, db/index.ts)
```

---

## 2. Findings by Category & Issue Priority

### Category 1: Security & Identity

| Priority | ID | Issue Title | Description | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL** | `SEC-01` | **Insecure Identity & Token Spoofing** | `getSessionUser` accepts arbitrary `Bearer <token>` and `lexilens_user_id` cookies without cryptographic validation, allowing any attacker to impersonate any user. | Implement real session authentication with hashed passwords (`scrypt`/`bcrypt`), cryptographically random session tokens stored in a `sessions` table, and secure, HTTP-only, SameSite cookies. |
| **CRITICAL** | `SEC-02` | **IDOR Vulnerability Potential** | Because user identity is spoofable, IDOR checks in `enforceDocumentOwnership` fail if an attacker simply passes the victim's user ID. | Bind session verification strictly to the server-side session token stored in an HTTP-only cookie. Return `404 Not Found` (or `403 Forbidden`) without revealing document existence. |
| **HIGH** | `SEC-03` | **Client-Side API Key Storage** | `src/app/settings/page.tsx` stores Gemini API keys in browser `localStorage` and exposes them in client-side network queries to Google. | Store provider API keys exclusively on the server (via `.env.local` or encrypted server configuration). Settings UI should only show provider status, connection health, and model name. |
| **HIGH** | `SEC-04` | **Storage Isolation & Predictable Disk Paths** | Uploaded documents are stored at `storage/documents/${docId}-${sanitizedFileName}` without user folder isolation or completely randomized file IDs. | Store files in `storage/documents/${userId}/${randomUUID}.${ext}` and never use user-controlled strings as disk paths. |
| **MEDIUM** | `SEC-05` | **Security Headers Incomplete** | While basic CSP exists, missing `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`. | Configure full defense-in-depth HTTP response headers in `next.config.mjs` and middleware. |

---

### Category 2: Persistence & Data Lifecycle

| Priority | ID | Issue Title | Description | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **HIGH** | `DAT-01` | **Physical Document File Retention Leak** | `DELETE /api/documents/:id` deletes SQL records via cascade, but does not delete the physical file on disk from `storage/documents`. | Implement transactional deletion that removes physical disk assets alongside database records, plus an orphan-file cleanup utility. |
| **MEDIUM** | `DAT-02` | **Database Adapter Abstraction** | The system hardcodes direct calls to `node:sqlite`. While performant and zero-dependency, there is no abstract `DatabaseAdapter` interface separating SQLite from potential PostgreSQL implementations. | Introduce a clean database interface (`DatabaseAdapter`) with `SQLiteAdapter` as the primary embedded engine, accurately documenting its status. |
| **MEDIUM** | `DAT-03` | **Missing Database Migration Framework** | Schema initialization runs raw `schema.sql` via `exec()`. There are no versioned migrations or rollback capabilities. | Add migration tracking table (`_migrations`) to run schema evolution steps deterministically. |

---

### Category 3: AI, Grounding & Retrieval (RAG)

| Priority | ID | Issue Title | Description | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **HIGH** | `AI-01` | **Hardcoded Retrieval Parameters** | Top-K, thresholds, and weights are hardcoded in `deterministic-provider.ts` rather than unified in a dedicated retrieval service. | Create a modular `RetrievalService` with configurable parameters: `topK`, `similarityThreshold`, `maxContextTokens`, and `rerankEnabled`. |
| **MEDIUM** | `AI-02` | **Schema Validation for AI Outputs** | While JSON mode is requested from Gemini, structured output is parsed with raw `JSON.parse` without runtime schema validation (Zod or formal JSON Schema validation). | Add runtime schema validation for `AttentionArea`, `Obligation`, `ChecklistItem`, `ComparisonReport`, and `GroundedCitation`. |
| **MEDIUM** | `AI-03` | **Synchronous Processing Bottleneck** | `POST /api/documents` parses, chunks, embeds, and runs AI analysis synchronously, risking HTTP 504 Gateway Timeouts on documents with many pages. | Implement an asynchronous processing pipeline with state machine (`UPLOADED`, `EXTRACTING`, `CHUNKING`, `EMBEDDING`, `ANALYZING`, `READY`, `FAILED`) and live polling/streaming progress. |
| **LOW** | `AI-04` | **Prompt Injection Coverage** | Current test suite checks 3 basic injection phrases. Need extended tests covering nested injections, legal clause embeddings, system prompt exposure attempts, and metadata tampering. | Implement comprehensive prompt injection test suite with 9 distinct adversarial attack vectors. |

---

### Category 4: Frontend, UX & Accessibility

| Priority | ID | Issue Title | Description | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **HIGH** | `UI-01` | **Missing User Auth UI & Session Management** | The UI currently has no Login, Register, or Logout modals/pages; it operates exclusively in guest/demo mode. | Build clean, professional Login/Register forms with session persistence, user badges in Navbar, and a Logout action. |
| **MEDIUM** | `UI-02` | **Accessibility: Live Regions & Focus Traps** | Modal dialogs (`UploadModal.tsx`) lack keyboard focus traps and `Escape` key listeners. Processing states lack `aria-live="polite"` regions. | Add focus trap, `Escape` key dismiss, `aria-live` status indicators, and skip navigation links. |
| **MEDIUM** | `UI-03` | **Mobile Viewport Optimization** | Comparison view table and split-pane viewer have minor overflow issues on small mobile screens (< 375px). | Refactor split pane into tabs on mobile viewports (< 768px) and provide horizontal scroll containers with visual indicators. |
| **LOW** | `UI-04` | **Optimistic UI & Loading Feedback** | Toggling obligations or checklist items shows minor flicker without optimistic UI state updates. | Implement optimistic client-side state updates for instant feedback on toggles. |

---

### Category 5: Tooling, Testing & CI/CD

| Priority | ID | Issue Title | Description | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- |
| **HIGH** | `QA-01` | **Missing ESLint Configuration File** | `npm run lint` fails because no `.eslintrc.json` or equivalent configuration exists in the root directory. | Create `.eslintrc.json` extending `next/core-web-vitals` with strict rules, and verify `npm run lint` passes with 0 errors. |
| **MEDIUM** | `QA-02` | **No End-to-End Browser Tests (Playwright)** | Tests currently cover unit and integration testing via Vitest, but lack automated headless browser E2E flows testing actual DOM interactions. | Add Playwright test configurations and automated E2E scripts covering the 3-minute demo flow. |
| **MEDIUM** | `QA-03` | **AI Evaluation Benchmark Golden Dataset** | Golden dataset currently resides in code fixtures rather than structured JSON/YAML evaluation test cases with ground-truth expected assertions. | Establish a dedicated `tests/ai-evaluation/` framework with golden contract fixtures and automated scoring. |

---

## 3. Prioritized Implementation Roadmap

### Phase 1: Architecture & Linting Fixes
- Create `.eslintrc.json` to resolve `QA-01` immediately.
- Refactor folder hierarchy to establish clean separation of concerns:
  - `src/services/` (DocumentService, AuthService, StorageService, RetrievalService)
  - `src/lib/config/` (Environment validation)

### Phase 2: Complete Authentication & IDOR Protection
- Create `users` and `sessions` tables in SQLite with `scrypt`/`bcrypt` password hashing and secure token generation.
- Implement `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- Issue HTTP-only, Secure, SameSite cookies.
- Refactor all document, comparison, chat, and export API routes to enforce authenticated session ownership.
- Write authorization and IDOR penetration tests.

### Phase 3 & 4: Secure Document Storage & Physical Deletion
- Store uploaded files at `storage/documents/${userId}/${uuid}.${ext}`.
- Update `DELETE /api/documents/:id` to transactionally delete both the SQL records and the physical file.
- Add orphan-file cleanup utility and test both database and filesystem removal.

### Phase 5: AI Credential Management & Server-Side Provider
- Remove client-side API key inputs and `localStorage` storage from `settings/page.tsx`.
- Centralize server-side provider configuration in `src/lib/config/ai.ts`.
- Expose `/api/settings/ai-status` returning only connection health, active model, and provider status without exposing secrets.

### Phase 6 & 7: Modular RAG & Retrieval Engine
- Build `RetrievalService` with hybrid lexical (BM25/TF-IDF) + semantic vector scoring.
- Make retrieval parameters (`topK`, `similarityThreshold`, `maxContextTokens`, `rerankEnabled`) configurable.
- Implement database abstraction layer (`DatabaseAdapter` with `SQLiteAdapter`).

### Phase 8 - 11: AI Safety, Grounding & Prompt Injection Defenses
- Expand adversarial prompt injection test suite to 9 attack vectors.
- Implement runtime Zod schema validation on structured AI outputs.
- Enforce strict citation validation ensuring chunk IDs, page numbers, and quoted excerpts exist in source text.

### Phase 12 - 20: UX Polish, Accessibility & Async Processing
- Add Auth Modal / Pages (Sign In / Sign Up) and user status badge.
- Add skip navigation links, keyboard focus traps, `aria-live` announcements, and WCAG 2.2 AA contrast compliance.
- Implement document processing state machine with progress indicator.

### Phase 21 - 50: Testing, Documentation & Final Scorecard
- Run Vitest (unit, integration, security, evaluation).
- Run Playwright / E2E verification.
- Author documentation: `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/AI_GROUNDING.md`, `docs/TESTING.md`, `docs/ACCESSIBILITY.md`, `docs/FINAL_SCORECARD.md`, `docs/DEMO_SCRIPT.md`.
