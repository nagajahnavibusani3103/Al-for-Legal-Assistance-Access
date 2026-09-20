# LexiLens — AI Legal Document Companion

> **"Understand the fine print. Know what to ask next."**

🌐 **Live Deployment URL:** [https://patrick-controls-durham-backup.trycloudflare.com](https://patrick-controls-durham-backup.trycloudflare.com)  
⚡ **Instant Hackathon Access:** Click **"Sign In"** → **"1-Click Hackathon Demo Access"** to immediately test all features.

LexiLens is a production-quality, trustworthy legal document analysis, version comparison, and consultation preparation web application. Built for non-lawyers (tenants, employees, freelancers, founders, and small-business owners), it transforms dense legal legalese into actionable, evidence-linked insights—without ever presenting output as definitive legal advice.

---

## Key Features

1. **Plain-Language Explanation & Clause Breakdowns:**
   - Translates contracts into plain English: what each section means, who is affected, what action is required, and what to clarify.
   - Every explanation links directly back to the exact page number and section heading.

2. **Contract Version Comparison (Semantic Diffing):**
   - Side-by-side comparison of two agreements or drafts.
   - Pinpoints added, removed, and modified clauses, changed notice periods, shifted compensation figures, and added non-compete covenants.
   - Materiality severity indicators (`Material change detected`, `Review recommended`).

3. **Grounded Document Q&A ("Ask LexiLens"):**
   - Retrieval-Augmented Generation (RAG) over verified document chunks.
   - **Anti-Hallucination Guard:** If information is missing (e.g., asking about pet policies in a commercial lease), LexiLens explicitly reports: *"I couldn't find that information in the uploaded document."*
   - Interactive citation cards with "Jump to Source Page" navigation.

4. **Attention Areas & Traps:**
   - Surfaces automatic renewals, broad indemnification without liability caps, short notice cancellation windows, non-competes, and mandatory arbitration.
   - Framed objectively with "What the document says", "Why it matters", and "Potential questions to consider".

5. **Obligation Tracker:**
   - Structured table detailing: Party, Obligation, Deadline, Frequency, Condition, and Consequence.
   - Interactive checkbox tracking with instant SQL database persistence.

6. **Action Checklist:**
   - Categorized steps: Before Signing, After Signing, Important Dates, Questions to Clarify, and Items to Discuss with Lawyer.

7. **Lawyer Preparation Mode:**
   - Generates 5–10 high-value strategic consultation questions, key facts to gather, ambiguous provisions, and key dates to calendar.
   - One-click export to Markdown, Plain Text, or Clipboard.

8. **Multi-Format Document Ingestion & File Safety:**
   - Supports PDF, Word (.docx), and Text (.txt) files up to 15 MB.
   - Magic bytes file validation rejecting disguised executables (PE/MZ, ELF).
   - Prompt-injection defense quarantining document text in security boundary markers.

9. **Instant Demo / Hackathon Mode:**
   - Includes 4 realistic synthetic contracts (Employment v1 & v2, Commercial Lease, NDA with injection test) ready to explore in one click.

---

## Technology Stack

- **Frontend & App Framework:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React Icons.
- **Accessibility:** WCAG 2.2 AA compliant, skip-to-content navigation, semantic HTML, visible focus indicators, screen-reader live regions, and reduced motion support.
- **SQL Relational Database:** Node 24 native `node:sqlite` (`DatabaseSync`) with WAL mode, foreign keys, B-tree indexes, and cosine-similarity vector embeddings. (PostgreSQL compatible).
- **Document Extractors:** `pdf-parse` with custom page renderers, `mammoth` for DOCX, UTF-8 text normalizers.
- **AI Engine & Abstraction:**
  - `DeterministicGroundingEngine`: Integrated, zero-latency local legal reasoning engine and hybrid cosine RAG (runs offline, 100% testable out of the box).
  - `GoogleGeminiProvider`: Seamless Google Gemini 2.0 Flash / 1.5 Pro integration when `GEMINI_API_KEY` is provided.
- **Testing & Verification:** Vitest test suite with 100% pass rate across unit, SQL persistence, AI safety, and evaluation benchmarks.

---

## Quick Start & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node.js v24.19.0)
- npm or pnpm

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/lexilens.git
cd lexilens
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local web server port | `3000` |
| `DATABASE_URL` | SQL Database path or connection string | `file:./data/lexilens.sqlite` |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key | (Uses local engine if omitted) |
| `GEMINI_MODEL` | Gemini Model Identifier | `gemini-2.0-flash` |
| `MAX_FILE_SIZE_MB` | Maximum allowed document upload size | `15` |

### 3. Run Automated Tests
```bash
node ./node_modules/vitest/vitest.mjs run
```
*Expected output: All 16 unit, persistence, AI safety, and evaluation benchmark tests pass with 100% scores.*

### 4. Start Development Server
```bash
node ./node_modules/next/dist/bin/next dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 3-Minute Hackathon Demo Walkthrough

1. **Landing Page:** Navigate to `http://localhost:3000`. Click **"Explore Demo Contracts"** to automatically seed realistic synthetic contracts into your SQL database.
2. **Dashboard:** View the 4 pre-loaded agreements. Notice the status badges and quick action cards.
3. **Document Split-Pane Analysis:** Click into **"Executive Employment Agreement (v1.0)"**:
   - **Overview Tab:** Review parties, effective date, governing law, and executive summary.
   - **Explain Tab:** Browse section breakdowns. Click **"Page 2"** to watch the left viewer instantly jump to that page!
   - **Ask LexiLens Tab:** Ask *"What is the required notice period for termination?"* to see citation cards linked to Page 2, Section 3.1.
   - **Anti-Hallucination Demo:** Open the Commercial Lease and ask *"Does this lease allow dogs?"* LexiLens will explicitly report: *"I could not find information regarding pet policy in the uploaded document."*
   - **Obligations Tab:** Check off an obligation to see interactive state toggle and persist to SQL.
   - **Lawyer Prep Tab:** Review strategic questions and click **"Copy Complete Brief to Clipboard"**.
4. **Contract Diffing:** Navigate to `/compare` to compare Employment Agreement v1 vs v2. Notice the detected material change in termination notice (reduced from 30 days to 14 days) and the newly added non-compete covenant.

---

## Architecture & Project Structure

```
├── /fixtures                # Realistic synthetic legal contracts for testing & demos
├── /src
│   ├── /app                 # Next.js App Router pages & API routes
│   │   ├── /api
│   │   │   ├── /documents   # Document upload, detail, chat, obligations, checklist
│   │   │   ├── /compare     # Version comparison engine
│   │   │   ├── /demo/seed   # One-click synthetic contract seeding
│   │   │   └── /export      # Formatted Markdown/TXT report exports
│   │   ├── /dashboard       # Document dashboard & quick actions
│   │   ├── /documents/[id]  # Split-pane document viewer & 7-tab insight hub
│   │   ├── /compare         # Side-by-side contract diffing interface
│   │   ├── /privacy         # Plain-language data & privacy practices
│   │   └── /settings        # AI engine configuration & SQL database status
│   ├── /components          # Reusable accessible UI and layout components
│   ├── /lib
│   │   ├── /ai              # AI provider abstraction, Gemini, deterministic engine
│   │   ├── /db              # SQL schema, node:sqlite database client & repositories
│   │   ├── /document-processing # Validators, PDF/DOCX extractors, chunker, embeddings
│   │   └── /security        # Prompt-injection shield, rate-limiting, sanitization
│   └── /types               # Strict TypeScript definitions
├── /tests                   # Vitest unit, DB, AI safety, and evaluation benchmark tests
└── /docs                    # Architecture, security, testing, and grounding docs
```

---

## Legal Disclaimer

LexiLens provides AI-generated legal information, document navigation, and consultation preparation tools for informational and educational purposes. **LexiLens is not an attorney and does not provide legal advice, legal representation, or formal legal opinions.** Contractual interpretations and dispute strategies should always be confirmed with a qualified legal professional licensed in your jurisdiction.
