# LexiLens AI Grounding, Hybrid RAG & Anti-Hallucination Framework

In legal document analysis, inaccurate information, fabricated clauses, or missing citations are critical safety risks. **LexiLens** implements a comprehensive grounding, hybrid retrieval, and anti-hallucination framework to ensure that every AI response is strictly tied to verifiable contractual evidence.

---

## 1. Grounding Principles & Guardrails

1. **Passive Evidence Rule:** All extracted legal text is treated strictly as passive factual evidence. Injected instructions within contract clauses are never executed.
2. **Explicit Citation Requirement:** Every factual statement returned to the user must cite the specific document page, section heading, and exact sentence excerpt.
3. **Refusal Over Hallucination:** If a requested concept or provision is absent from the contract, the AI **must explicitly state** that the topic was not found, explain why the absence matters, and formulate questions for legal counsel, rather than inventing plausible contract language.
4. **Measured Non-Definitive Phrasing:** The system uses informative terminology (*"The document states..."*, *"Potential area for review"*), avoiding definitive legal pronouncements (*"This is illegal"*, *"You will win in court"*).

---

## 2. Hybrid RAG Retrieval Architecture (`RetrievalService`)

LexiLens combines semantic vector search with lexical keyword matching, heading relevance, and topic re-ranking:

```
                          User Question
                                │
                                ▼
                       Prompt Shield Check
                     (Sanitize & Detect Injection)
                                │
                                ▼
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
  Semantic Vector                               Lexical BM25
  Cosine Similarity                             Term Frequency
  (Weight: 0.45)                                (Weight: 0.40)
         │                                             │
         └──────────────────────┬──────────────────────┘
                                │
                                ▼
                      Section Heading Boost
                          (Weight: 0.20)
                                │
                                ▼
                      Deduplication Filter
                   (Merge Adjacent Chunk Overlaps)
                                │
                                ▼
                    Core Topic Keyword Re-Ranker
            (Promote chunks matching substantive terms
             over generic boilerplate matches)
                                │
                                ▼
                     Anti-Hallucination Guard
             (Require substantive term presence;
              fail to NOT FOUND if absent)
                                │
                                ▼
               Sentence-Level Evidence Extraction
                 (Page, Heading, Excerpt, Quote)
```

### 2.1 Legal Vocabulary Stemming
Legal texts frequently express the same concept through related grammatical forms:
- `sublease` <-> `sublet`
- `terminate` <-> `termination`
- `prohibit` <-> `prohibiting`
- `compete` <-> `competitor`

The `RetrievalService` utilizes a legal stemmer (`stem()`) to ensure that queries searching for *"subleasing rules"* match clauses stating *"Tenant shall not sublet..."*.

### 2.2 Core Topic Re-Ranking & False-Positive Elimination
Standard vector search frequently suffers from **topic drift** in legal documents, because common framing terms (*"liability"*, *"party"*, *"tenant"*, *"shall"*, *"agreement"*) occur throughout contracts.

LexiLens eliminates false-positive matches through a two-step process:
1. Filters out generic legal framing stopwords.
2. Isolates **substantive topic keywords** (e.g. `cyber`, `insurance`, `non-compete`, `pet`).
3. Re-ranks chunks containing the core topic keywords above chunks that merely matched framing words.
4. Requires multi-term confirmation when a user asks about compound restrictions.

---

## 3. Golden Dataset Evaluation Benchmark

To verify AI reliability quantitatively, LexiLens includes a golden legal evaluation suite (`tests/ai-evaluation/golden_contracts.json` and `tests/evaluation-runner.test.ts`) containing real-world agreements (Master Services Agreements, Commercial Leases, Employment Agreements) with ground-truth question-answer pairs, negative (absent) queries, and adversarial injection vectors.

### 3.1 Benchmark Results (Verified by Vitest Automated Tests)

```
========================================================================
LEXILENS AI GROUNDING & SAFETY BENCHMARK (GOLDEN CONTRACT EVALUATION)
========================================================================
[PASS] Grounded Fact Retrieval Accuracy          : 100.0% (6/6) [Target: >=85%]
[PASS] Exact Page Citation Precision             : 100.0% (6/6) [Target: >=85%]
[PASS] Anti-Hallucination / Absent Refusal       : 100.0% (3/3) [Target: >=95%]
[PASS] Adversarial Prompt Shielding              : 100.0% (3/3) [Target: >=100%]
========================================================================
```

### 3.2 Metric Definitions
- **Grounded Fact Retrieval Accuracy:** Percentage of factual inquiries where the AI retrieves the exact clause containing the answer terms.
- **Exact Page Citation Precision:** Percentage of responses correctly identifying the ground-truth page number and section heading.
- **Anti-Hallucination / Absent Refusal:** Percentage of queries about absent terms where the AI correctly refuses to answer and reports information not found.
- **Adversarial Prompt Shielding:** Percentage of adversarial injection vectors (DAN mode, system prompt leakage, XML escape, instruction override) detected and neutralized.

---

## 4. Reproducing the Benchmark

Execute the automated evaluation runner from the terminal:
```bash
node ./node_modules/vitest/vitest.mjs run tests/evaluation-runner.test.ts
```
Or run all AI safety and grounding suites:
```bash
node ./node_modules/vitest/vitest.mjs run tests/ai-safety.test.ts tests/prompt-injection-advanced.test.ts tests/evaluation-runner.test.ts
```
