import { 
  DocumentMetadataOverview, 
  SectionExplanation, 
  AttentionArea, 
  Obligation, 
  ActionChecklistItem, 
  ChatAnswerResponse, 
  ComparisonReport, 
  LawyerPrepSummary,
  DocumentChunk,
  DocumentPage
} from '@/types';

export interface FullDocumentAnalysis {
  overview: DocumentMetadataOverview;
  executiveSummary: string;
  sectionExplanations: SectionExplanation[];
  attentionAreas: AttentionArea[];
  obligations: Obligation[];
  checklistItems: ActionChecklistItem[];
  lawyerPrep: LawyerPrepSummary;
}

export interface AIProvider {
  name: string;
  analyzeDocument(
    documentId: string, 
    title: string, 
    pages: DocumentPage[], 
    chunks: DocumentChunk[]
  ): Promise<FullDocumentAnalysis>;

  answerQuestion(
    documentId: string,
    question: string,
    chunks: DocumentChunk[],
    conversationHistory?: { role: string; content: string }[]
  ): Promise<ChatAnswerResponse>;

  compareDocuments(
    docA: { id: string; title: string; pages: DocumentPage[]; chunks: DocumentChunk[] },
    docB: { id: string; title: string; pages: DocumentPage[]; chunks: DocumentChunk[] },
    userId: string
  ): Promise<ComparisonReport>;
}
