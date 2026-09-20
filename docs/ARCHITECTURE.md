# LexiLens Technical Architecture & System Design

**LexiLens** is an enterprise-grade AI legal document companion and preparation platform built for non-lawyers. The application is designed to ingest complex, unstructured legal agreements, decompose them into searchable and semantic clauses, and provide verifiable, grounded AI assistance without ever presenting definitive legal advice.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Presentation                           │
│  Next.js 14 App Router (React 18, Tailwind CSS, Lucide Icons, WCAG AA) │
│  - Document Workspace & Reader with Page-Level Deep Linking             │
│  - Real-time Hybrid RAG Legal Assistant with Verified Excerpts          │
│  - Red-Flag Attention Areas, Obligations Tracker, & Lawyer Prep Checklist│
│  - Version-to-Version Contract Diff Engine (Materiality Analysis)       │
└───────────────────▲──────────────────────────────────┬──────────────────┘
                    │ REST / Session Cookies           │
                    ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Security & Authentication Gateway                  │
│  - Cryptographic Session Authentication (HTTP-only SameSite Cookies)    │
│  - Salted scrypt Password Hashing & SHA-256 Session Token Hashing       │
│  - Strict IDOR Access Control (Multi-Tenant Isolation)                  │
│  - Rate Limiting & Security Headers (CSP, X-Frame-Options, HSTS)        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Document Ingestion Pipeline                        │
│  1. Binary Magic Bytes Validation (%PDF-, PK.., UTF-8 / PE-reject)       │
│  2. Isolated Physical Storage: storage/documents/{userId}/{uuid}.{ext}  │
│  3. Page-Preserving Text Extractor (pdf-parse / mammoth / plain text)   │
│  4. Clause & Section Boundary Detector (Regex Legal Patterns)           │
│  5. Overlapping Sliding Window Chunker (350 words, 50-word overlap)    │
│  6. 64-Dimensional Semantic Embedding Generation                       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Hybrid RAG & AI Grounding Subsystem                   │
│  ├── RetrievalService (Semantic Cosine + BM25 Lexical + Heading Boost)  │
│  ├── Legal Vocabulary Stemmer & Core Topic Re-Ranker                    │
│  ├── PromptShield (XML Boundary Isolation & 9 Adversarial Threat Vectors│
│  ├── Anti-Hallucination Guard (Strict Negative Query Refusal)           │
│  └── Dual-Engine Provider: Deterministic Grounding & Google Gemini      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Relational Persistence Layer                        │
│  ├── DatabaseAdapter Interface (Unified Query Abstraction)              │
│  ├── SQLiteAdapter (node:sqlite DatabaseSync with WAL & Busy Timeout)   │
│  └── PostgreSQLAdapter (Ready for enterprise cloud deployment)          │
│                                                                         │
│  Entities: users, sessions, documents, document_pages, document_chunks,  │
│            embeddings, attention_areas, obligations, checklist_items,   │
│            conversations, messages, comparisons, audit_events           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems & Components

### 2.1 Document Ingestion & Storage Isolation
- **Magic Bytes Validation (`src/lib/document-processing/validator.ts`):** File headers are inspected for authentic binary signatures (`%PDF-`, `PK\x03\x04`, valid UTF-8). Executables (PE/MZ, ELF) and script payloads are rejected prior to disk write.
- **Path Traversal Defense & Isolation:** Files are written to isolated directories per user: `storage/documents/${userId}/${crypto.randomUUID()}${ext}`. The user-provided filename is stored solely as a database metadata string and is never used in filesystem paths.
- **Physical Unlinking on Deletion (`deleteDocument`):** When a user deletes a document, the system transactionally removes the SQLite records (cascading across foreign keys) and unlinks the physical file from the disk (`fs.unlinkSync`).

### 2.2 Hybrid RAG Retrieval Engine (`src/lib/retrieval/index.ts`)
The `RetrievalService` executes a multi-stage hybrid retrieval strategy:
1. **Semantic Vector Similarity:** Computes cosine similarity against 64-dimensional chunk embeddings (`weight: 0.45`).
2. **Lexical BM25 Scoring:** Evaluates term-frequency lexical matching augmented by a specialized legal vocabulary stemmer (`weight: 0.40`).
3. **Section Heading Boost:** Grants an additional relevance boost (`weight: 0.20`) when query terms appear in contract clause headings (e.g. *Termination*, *Governing Law*).
4. **Core Topic Re-Ranking:** Identifies non-framing substantive keywords, re-ranking candidate chunks that contain true topic concepts above those matching generic boilerplate.
5. **Anti-Hallucination Guard:** Requires substantive keyword matches; returns explicit "NOT FOUND" status when queries address topics not present in the contract.
6. **Sentence-Level Citation Extraction:** Isolates the exact sentence containing the primary evidence, formatting verified page numbers and clause headings for the UI.

### 2.3 AI Safety & Grounding (`src/lib/ai/`)
- **Dual-Engine Architecture:**
  - `DeterministicGroundingProvider`: An offline legal analysis engine capable of running in zero-external-dependency environments with zero latency, zero cloud costs, and predictable citations.
  - `GoogleGeminiProvider`: Connects to Google's Gemini models via server-side API keys (`GEMINI_API_KEY`) when configured, utilizing structured JSON output schemas.
- **Prompt Shield (`src/lib/ai/prompt-shield.ts`):** Enforces XML boundary fences (`<untrusted_document_evidence>`), strips artificial closing tags, removes control characters, and blocks 9 adversarial prompt injection vectors (role hijacking, direct instruction overrides, hidden payloads, and data exfiltration instructions).

### 2.4 Persistence Layer & Database Adapter (`src/lib/db/`)
- Abstracted through the `DatabaseAdapter` interface (`src/lib/db/adapters/index.ts`) ensuring decoupling between application business logic and underlying storage engine.
- Default `SQLiteAdapter` utilizes Node 24 native `node:sqlite` (`DatabaseSync`) configured with:
  - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging for high read concurrency)
  - `PRAGMA busy_timeout = 5000;` (Contention backoff prevention)
  - `PRAGMA foreign_keys = ON;` (Referential integrity and cascade deletion)
- B-Tree indexes on `idx_documents_user_id`, `idx_chunks_document_id`, `idx_sessions_token_hash`, and `idx_sessions_user_id`.

---

## 3. Data Flow

1. **Upload & Ingestion:** Client posts document -> Route validates session and magic bytes -> Generates UUID storage path -> Parses pages and chunks -> Generates embeddings -> Saves relational records.
2. **Analysis Generation:** Ingestion triggers automated analysis (Executive Summary, Attention Areas, Obligations, Lawyer Prep Checklist) stored in relational tables.
3. **Grounded Inquiries:** Client asks question -> Session verified -> Query sanitized by Prompt Shield -> Hybrid RAG retrieves top chunks -> Sentence evidence extracted -> Grounded answer synthesized with exact page citations and legal disclaimer.
4. **Document Comparison:** Client submits two document IDs -> System verifies ownership of both -> Clause-by-clause diff algorithm identifies additions, deletions, and modifications -> Materiality score assigned -> Audit event logged.
