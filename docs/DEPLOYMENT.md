# LexiLens Deployment & Operations Guide

LexiLens is designed for flexible deployment, supporting both **zero-external-dependency local mode** for hackathons and air-gapped environments, and scalable cloud deployment.

---

## 1. System Requirements

- **Runtime:** Node.js 18.x, 20.x, or 24.x
- **Package Manager:** npm (v9+)
- **Operating System:** Cross-platform (Windows, macOS, Linux)
- **Local Storage:** Minimum 200MB free disk space for SQLite database (`data/`) and user document storage (`storage/documents/`).

---

## 2. Zero-Dependency Mode (Out-of-the-Box)

LexiLens is fully functional immediately after cloning without needing third-party API keys or external services:
- **Database:** Uses native `node:sqlite` (Node 24) with automated schema migration.
- **AI Engine:** Automatically falls back to the embedded `DeterministicGroundingProvider`, executing hybrid RAG, citation extraction, obligations tracking, and lawyer prep generation locally.
- **Authentication:** Salted `scrypt` hashing and session cookies operate entirely in-memory and in SQLite.

---

## 3. Environment Variables Configuration

Create a `.env.local` file in the project root to configure optional settings:

```ini
# Optional: Google Gemini API Key for LLM augmentation
# If omitted, LexiLens operates seamlessly in local deterministic mode
GEMINI_API_KEY=your_gemini_api_key_here

# Application Port (Default: 3000)
PORT=3000

# Node Environment
NODE_ENV=production

# Database Path override (Optional, defaults to ./data/lexilens.sqlite)
DATABASE_PATH=./data/lexilens.sqlite
```

---

## 4. Local Development & Production Run

### 4.1 Development Mode
```bash
npm install
npm run dev
```
Navigate to `http://localhost:3000`.

### 4.2 Production Build & Execution
```bash
# Build the Next.js production bundle
npm run build

# Start the production server
npm start
```

### 4.3 Automated Verification
Run the automated test suite and linter before deployment:
```bash
# Run 47 unit, security, and benchmark tests
npm test

# Run ESLint validation
npm run lint
```

---

## 5. Persistent Directories & Backups

For persistent containerized deployments (Docker, Kubernetes, VM):
1. **`data/`**: Mount as a persistent volume to preserve SQLite database files (`lexilens.sqlite`, WAL journal).
2. **`storage/documents/`**: Mount as a persistent volume to retain uploaded user documents.

---

## 6. Health Check & Diagnostics

- **AI Diagnostics:** `GET /api/settings/ai-config`
  Returns active provider status (`deterministic` or `gemini`), model identification, and roundtrip latency without leaking API keys.
- **Application Liveness:** `GET /api/documents`
  Returns HTTP 200/401 indicating API gateway and database responsiveness.
