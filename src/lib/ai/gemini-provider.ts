import { 
  AIProvider, 
  FullDocumentAnalysis 
} from './provider';
import { 
  DocumentPage, 
  DocumentChunk, 
  ChatAnswerResponse, 
  ComparisonReport, 
  GroundedCitation 
} from '@/types';
import { DeterministicGroundingProvider } from './deterministic-provider';
import { LEGAL_SYSTEM_PROMPT, wrapDocumentContentForPrompt } from './prompt-shield';
import { verifyCitations, detectAbsenceOfInformation, determineIfReviewRequired } from './hallucination-guard';

export class GeminiProvider implements AIProvider {
  name = 'GoogleGemini';
  private apiKey: string;
  private model: string;
  private fallbackProvider: DeterministicGroundingProvider;

  constructor(apiKey?: string, model: string = 'gemini-2.0-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.fallbackProvider = new DeterministicGroundingProvider();
  }

  async analyzeDocument(
    documentId: string,
    title: string,
    pages: DocumentPage[],
    chunks: DocumentChunk[]
  ): Promise<FullDocumentAnalysis> {
    if (!this.apiKey) {
      return this.fallbackProvider.analyzeDocument(documentId, title, pages, chunks);
    }

    try {
      const promptEvidence = pages.map(p => 
        wrapDocumentContentForPrompt(p.content, p.pageNumber)
      ).join('\n\n');

      const userPrompt = `
Analyze the legal document "${title}".
Extract structured overview, executive summary, section explanations, attention areas, obligations, and checklist.
Return STRICT JSON adhering to this schema:
{
  "overview": {
    "title": "${title}",
    "docType": "employment_agreement" | "nda" | "lease_agreement" | "service_agreement" | "terms_of_service" | "privacy_policy" | "general_contract",
    "parties": [{"name": "string", "role": "string"}],
    "effectiveDate": "string or 'Not clearly identified in this document.'",
    "expirationDate": "string",
    "duration": "string",
    "renewalInfo": "string",
    "terminationInfo": "string",
    "governingLaw": "string",
    "keyFinancialTerms": ["string"],
    "keyRestrictions": ["string"],
    "mainObligationsSummary": ["string"],
    "importantSections": [{"heading": "string", "pageNumber": 1}]
  },
  "executiveSummary": "string",
  "attentionAreas": [
    {
      "category": "Automatic Renewal" | "Liability & Indemnification" | "Termination Notice" | "Intellectual Property" | "Non-Compete / Restrictive Covenants" | "Dispute Resolution & Jurisdiction" | "Payment & Financial Penalties" | "Ambiguity & Missing Information" | "Other",
      "severity": "critical" | "moderate" | "informational",
      "title": "string",
      "whatItSays": "string",
      "whyItMatters": "string",
      "questionToConsider": "string",
      "sourcePage": 1,
      "sourceSection": "string"
    }
  ],
  "obligations": [
    {
      "party": "string",
      "obligation": "string",
      "deadline": "string",
      "frequency": "string",
      "condition": "string",
      "consequence": "string",
      "sourcePage": 1
    }
  ]
}
Evidence:
${promptEvidence}
`;

      const response = await this.callGemini(userPrompt, true);
      const parsed = JSON.parse(response);

      // Enhance with fallback defaults for anything omitted
      const fallback = await this.fallbackProvider.analyzeDocument(documentId, title, pages, chunks);

      return {
        overview: parsed.overview || fallback.overview,
        executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
        sectionExplanations: fallback.sectionExplanations,
        attentionAreas: (parsed.attentionAreas || []).map((a: any, idx: number) => ({
          id: `att-gemini-${documentId}-${idx}`,
          documentId,
          ...a
        })).concat(fallback.attentionAreas.slice(parsed.attentionAreas ? parsed.attentionAreas.length : 0)),
        obligations: (parsed.obligations || []).map((o: any, idx: number) => ({
          id: `obl-gemini-${documentId}-${idx}`,
          documentId,
          isCompleted: false,
          ...o
        })).concat(fallback.obligations.slice(parsed.obligations ? parsed.obligations.length : 0)),
        checklistItems: fallback.checklistItems,
        lawyerPrep: fallback.lawyerPrep
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic grounding engine:', err);
      return this.fallbackProvider.analyzeDocument(documentId, title, pages, chunks);
    }
  }

  async answerQuestion(
    documentId: string,
    question: string,
    chunks: DocumentChunk[],
    conversationHistory?: { role: string; content: string }[]
  ): Promise<ChatAnswerResponse> {
    if (!this.apiKey) {
      return this.fallbackProvider.answerQuestion(documentId, question, chunks, conversationHistory);
    }

    try {
      // Find top chunks for RAG context
      const topEvidence = chunks.slice(0, 5).map(c => 
        wrapDocumentContentForPrompt(c.content, c.pageNumber, c.id)
      ).join('\n\n');

      const userPrompt = `
USER QUESTION: "${question}"

DOCUMENT EVIDENCE:
${topEvidence}

Instructions:
Answer grounded strictly on the evidence above. If the document does not contain information to answer this question, state explicitly:
"I couldn't find that information in the uploaded document."
Provide citations with pageNumber, sectionHeading, and excerpt.
Return JSON:
{
  "answer": "string",
  "evidence": [{"pageNumber": 1, "sectionHeading": "string", "excerpt": "string", "confidence": "DIRECTLY STATED"}],
  "whyItMatters": "string",
  "whatIsUnclear": "string",
  "questionsToAskLawyer": ["string"]
}
`;

      const raw = await this.callGemini(userPrompt, true);
      const parsed = JSON.parse(raw);

      const isAbsent = detectAbsenceOfInformation(parsed.answer);
      const verifiedCitations = verifyCitations(parsed.evidence || [], chunks);
      const needsReview = determineIfReviewRequired(question, parsed.answer);

      return {
        answer: parsed.answer,
        evidence: verifiedCitations,
        whyItMatters: parsed.whyItMatters || 'Understanding contractual rights and obligations protects all parties.',
        whatIsUnclear: parsed.whatIsUnclear || 'Check whether additional local statutes or addenda modify this section.',
        questionsToAskLawyer: parsed.questionsToAskLawyer || [
          'How is this clause interpreted in our state jurisdiction?',
          'Should we negotiate an explicit limitation or exception?'
        ],
        needsProfessionalReview: needsReview,
        isFoundInDocument: !isAbsent,
        suggestedFollowUps: [
          'What are my main obligations under this document?',
          'What is the notice period for cancellation?',
          'How are dispute resolution expenses handled?'
        ]
      };
    } catch (err) {
      console.warn('Gemini chat error, falling back to deterministic engine:', err);
      return this.fallbackProvider.answerQuestion(documentId, question, chunks, conversationHistory);
    }
  }

  async compareDocuments(
    docA: { id: string; title: string; pages: DocumentPage[]; chunks: DocumentChunk[] },
    docB: { id: string; title: string; pages: DocumentPage[]; chunks: DocumentChunk[] },
    userId: string
  ): Promise<ComparisonReport> {
    // Both providers produce consistent high-fidelity comparison
    return this.fallbackProvider.compareDocuments(docA, docB, userId);
  }

  private async callGemini(prompt: string, jsonMode: boolean = false): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: LEGAL_SYSTEM_PROMPT }]
      },
      generationConfig: {
        temperature: 0.2,
        topK: 30,
        topP: 0.8
      }
    };

    if (jsonMode) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
