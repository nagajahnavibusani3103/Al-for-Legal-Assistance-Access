// Core TypeScript Definitions for LexiLens Legal Document Companion

export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';

export type DocType = 
  | 'employment_agreement' 
  | 'nda' 
  | 'lease_agreement' 
  | 'service_agreement' 
  | 'terms_of_service' 
  | 'privacy_policy' 
  | 'general_contract' 
  | 'unknown';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'guest';
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  docType: DocType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath?: string;
  pageCount: number;
  status: DocumentStatus;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  content: string;
  tokenCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  sectionHeading: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  vector?: number[];
}

export interface EmbeddingRecord {
  id: string;
  chunkId: string;
  vector: number[];
  dimension: number;
}

export interface DocumentMetadataOverview {
  title: string;
  docType: DocType;
  parties: { name: string; role: string }[];
  effectiveDate: string | null;
  expirationDate: string | null;
  duration: string | null;
  renewalInfo: string | null;
  terminationInfo: string | null;
  governingLaw: string | null;
  keyFinancialTerms: string[];
  keyRestrictions: string[];
  mainObligationsSummary: string[];
  importantSections: { heading: string; pageNumber: number }[];
}

export interface SectionExplanation {
  id: string;
  sectionTitle: string;
  pageNumber: number;
  originalText: string;
  plainExplanation: string;
  whoIsAffected: string;
  actionRequired: string;
  whatToClarify: string;
  sourceRef: string;
}

export interface GroundedCitation {
  pageNumber: number;
  sectionHeading?: string;
  chunkId?: string;
  excerpt: string;
  confidence: 'DIRECTLY STATED' | 'STRONGLY SUPPORTED' | 'POTENTIAL INTERPRETATION' | 'NOT FOUND';
}

export interface ChatAnswerResponse {
  answer: string;
  evidence: GroundedCitation[];
  whyItMatters?: string;
  whatIsUnclear?: string;
  questionsToAskLawyer?: string[];
  needsProfessionalReview: boolean;
  isFoundInDocument: boolean;
  suggestedFollowUps?: string[];
}

export type AttentionSeverity = 'critical' | 'moderate' | 'informational';

export interface AttentionArea {
  id: string;
  documentId: string;
  category: 
    | 'Automatic Renewal'
    | 'Liability & Indemnification'
    | 'Termination Notice'
    | 'Intellectual Property'
    | 'Non-Compete / Restrictive Covenants'
    | 'Dispute Resolution & Jurisdiction'
    | 'Payment & Financial Penalties'
    | 'Ambiguity & Missing Information'
    | 'Other';
  severity: AttentionSeverity;
  title: string;
  whatItSays: string;
  whyItMatters: string;
  questionToConsider: string;
  sourcePage: number;
  sourceSection?: string;
  chunkId?: string;
}

export interface Obligation {
  id: string;
  documentId: string;
  party: string;
  obligation: string;
  deadline: string;
  frequency: string;
  condition: string;
  consequence: string;
  sourcePage: number;
  isCompleted: boolean;
}

export interface ActionChecklistItem {
  id: string;
  documentId: string;
  category: 
    | 'Before Signing' 
    | 'After Signing' 
    | 'Important Dates' 
    | 'Documents to Collect' 
    | 'Questions to Clarify' 
    | 'Items to Discuss with Lawyer';
  task: string;
  sourceRef?: string;
  isCompleted: boolean;
}

export type ChangeType = 'added' | 'removed' | 'modified';
export type ChangeCategory = 
  | 'Financial' 
  | 'Obligations' 
  | 'Termination' 
  | 'Liability' 
  | 'Confidentiality' 
  | 'Dates' 
  | 'Other';

export interface ComparisonDiffItem {
  id: string;
  changeType: ChangeType;
  category: ChangeCategory;
  severityLabel: 'Material change detected' | 'Potentially important change' | 'Review recommended' | 'Minor editorial change';
  originalText?: string;
  revisedText?: string;
  explanation: string;
  sourcePageA?: number;
  sourcePageB?: number;
  confidence: number;
}

export interface ComparisonReport {
  id: string;
  userId: string;
  docAId: string;
  docBId: string;
  docATitle: string;
  docBTitle: string;
  executiveSummary: string;
  totalChanges: number;
  changes: ComparisonDiffItem[];
  createdAt: string;
}

export interface LawyerPrepSummary {
  documentId: string;
  documentTitle: string;
  conciseSummary: string;
  consultationQuestions: string[];
  keyFactsToGather: string[];
  ambiguousProvisions: { provision: string; source: string; question: string }[];
  datesToRemember: { date: string; description: string }[];
  clausesWorthHighlighting: { clause: string; source: string; reason: string }[];
  missingInformation: string[];
}

export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  documentId?: string;
  details?: string;
  timestamp: string;
}
