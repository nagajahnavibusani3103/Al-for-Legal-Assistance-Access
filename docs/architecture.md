# LexiLens Technical Architecture & System Design

LexiLens is built as an enterprise-grade legal document analysis and preparation platform. The application is designed to ingest complex, unstructured legal agreements, decompose them into searchable and semantic clauses, and provide verifiable, grounded AI assistance without ever presenting definitive legal advice.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Presentation                           │
│  Next.js 14 App Router (React 18, Tailwind CSS, Lucide Icons, WCAG AA) │
└───────────────────▲──────────────────────────────────┬──────────────────┘
                    │ REST / Streaming JSON            │
                    ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Gateway Routes                            │
│  /api/documents        /api/compare        /api/demo/seed               │
│  /api/documents/[id]/chat                  /api/export                  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Document Ingestion Pipeline                        │
│  1. File Validation (Magic Bytes: %PDF-, PK.., UTF-8 / PE-reject)       │
│  2. Text Extractor (pdf-parse with page renderer / mammoth / TXT)       │
│  3. Heading & Section Detector (Regex-based clause identification)      │
│  4. Overlapping Sliding Window Chunker (350 words, 50-word overlap)    │
│  5. 64-Dimensional Local Embedding Generator                           │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI & Grounding Engine                            │
│  ├── AIProvider Interface (Pluggable multi-model abstraction)           │
│  ├── DeterministicGroundingEngine (Zero-dependency offline legal brain) │
│  ├── GoogleGeminiProvider (Gemini 2.0 Flash / 1.5 Pro integration)      │
│  ├── PromptInjectionShield (XML encapsulation & instruction quarantine) │
│  └── HallucinationGuard (Citation verification & NOT FOUND detector)   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SQL Relational Database                          │
│  Engine: SQLite (node:sqlite) or PostgreSQL via DATABASE_URL            │
│  Tables: users, documents, document_versions, document_pages,           │
│          document_chunks, embeddings, analysis_results,                 │
│          section_explanations, attention_areas, obligations,            │
│          checklist_items, conversations, messages, comparisons,         │
│          audit_events                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Subsystems

### 1. Document Ingestion & Normalization
- **Magic Bytes Validation:** Uploaded files are inspected for true binary signatures (`%PDF-`, `PK\x03\x04`, plain UTF-8 text). Disguised Windows PE/MZ executables or ELF binaries are rejected immediately before reaching disk.
- **Page-Preserving Extraction:** PDF parsing implements custom page callbacks (`pagerender`) ensuring that page boundaries match the original document layout.
- **Section Segmentation:** Text is parsed to detect headers such as `Section 3. Term and Termination`, `Article 4`, `Clause 1.2`. Chunks preserve page numbers, section headers, and unique chunk IDs (`chk-{docId}-p{pageNum}-{index}`).

### 2. Dual-Engine AI Architecture
- **Provider Abstraction:** The `AIProvider` interface decouples the application from any single vendor.
- **Deterministic Legal Grounding Engine:** Runs locally with zero latency, zero external API costs, and complete offline capability. Implements hybrid retrieval (Cosine Similarity + Lexical BM25 term frequency) over chunk vectors, extracts direct quotes, and scores confidence.
- **Google Gemini Provider:** Automatically activates when `GEMINI_API_KEY` is present. Uses structured JSON output schemas and system prompt guardrails.

### 3. Safety & Hallucination Guardrails
- **Prompt Injection Defense:** Contracts containing prompt overrides (e.g. `"Ignore all previous instructions..."`) are quarantined in `<untrusted_document_evidence>` XML containers. System meta-prompts instruct the model to treat all evidence as passive data.
- **Anti-Hallucination Fallback:** If a user asks about a term not in the document (e.g. pet policies in an office lease), the model returns `"I couldn't find that information in the uploaded document"` with `isFoundInDocument: false`, rather than fabricating terms.
- **Citation Verification:** Cited pages and quotes are checked against actual database chunks before returning to the UI.

### 4. SQL Relational Database
- Managed by `node:sqlite` (Node 24 built-in `DatabaseSync`).
- Complete schema migration on startup.
- Foreign key cascading deletes ensure that when a document is deleted, all pages, chunks, embeddings, attention areas, obligations, checklists, and chat messages are permanently wiped.
- B-Tree indexes on `user_id`, `document_id`, `chunk_index`, and `conversation_id`.
