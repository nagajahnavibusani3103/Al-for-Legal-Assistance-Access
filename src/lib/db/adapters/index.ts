import { 
  User, 
  DocumentRecord, 
  DocumentPage, 
  DocumentChunk, 
  DocumentMetadataOverview, 
  SectionExplanation, 
  AttentionArea, 
  Obligation, 
  ActionChecklistItem, 
  ComparisonReport 
} from '@/types';
import * as db from '../index';

export interface DatabaseAdapter {
  name: string;
  isReady(): boolean;

  // Users & Sessions
  getUser(userId: string): User | null;
  getUserByEmail(email: string): (User & { passwordHash?: string }) | null;
  createUser(user: { id: string; email: string; name: string; passwordHash: string; role?: 'user' | 'admin' | 'guest' }): User;
  createSession(sessionId: string, userId: string, tokenHash: string, expiresAt: string): void;
  getSessionByTokenHash(tokenHash: string): { id: string; userId: string; tokenHash: string; expiresAt: string; user: User } | null;
  deleteSessionByTokenHash(tokenHash: string): void;

  // Documents
  getDocuments(userId: string): DocumentRecord[];
  getDocument(id: string, userId?: string): DocumentRecord | null;
  insertDocument(doc: Partial<DocumentRecord> & { id: string; userId: string; title: string; fileName: string; fileSize: number; mimeType: string }): void;
  updateDocumentStatus(id: string, status: string, error?: string, pageCount?: number, docType?: string): void;
  deleteDocument(id: string, userId: string): boolean;

  // Pages & Chunks
  savePagesAndChunks(
    documentId: string, 
    pages: { id: string; pageNumber: number; content: string; tokenCount: number }[],
    chunks: { id: string; pageNumber: number; sectionHeading: string; chunkIndex: number; content: string; tokenCount: number; vector?: number[] }[]
  ): void;
  getDocumentPages(documentId: string): DocumentPage[];
  getDocumentChunks(documentId: string): DocumentChunk[];

  // Analysis & Explanations
  saveAnalysisResult(documentId: string, overview: DocumentMetadataOverview, summary: string): void;
  getAnalysisResult(documentId: string): { overview: DocumentMetadataOverview; summary: string } | null;
  saveSectionExplanations(documentId: string, explanations: SectionExplanation[]): void;
  getSectionExplanations(documentId: string): SectionExplanation[];

  // Attention & Obligations
  saveAttentionAreas(documentId: string, items: AttentionArea[]): void;
  getAttentionAreas(documentId: string): AttentionArea[];
  saveObligations(documentId: string, items: Obligation[]): void;
  getObligations(documentId: string): Obligation[];
  toggleObligation(id: string, isCompleted: boolean): boolean;

  // Checklist
  saveChecklistItems(documentId: string, items: ActionChecklistItem[]): void;
  getChecklistItems(documentId: string): ActionChecklistItem[];
  toggleChecklistItem(id: string, isCompleted: boolean): boolean;

  // Comparisons
  saveComparison(report: ComparisonReport): void;
  getComparison(id: string, userId: string): ComparisonReport | null;
  getComparisons(userId: string): ComparisonReport[];

  // Audit
  logAuditEvent(userId: string, action: string, documentId?: string, details?: string): void;
}

/**
 * SQLiteAdapter: Primary zero-dependency embedded relational SQL database adapter
 * powered by node:sqlite (DatabaseSync) with WAL mode, foreign keys, and cascading deletes.
 */
export class SQLiteAdapter implements DatabaseAdapter {
  name = 'SQLiteAdapter (node:sqlite WAL)';

  isReady(): boolean {
    return Boolean(db.getDb());
  }

  getUser(userId: string) { return db.getUser(userId); }
  getUserByEmail(email: string) { return db.getUserByEmail(email); }
  createUser(user: any) { return db.createUser(user); }
  createSession(sessionId: string, userId: string, tokenHash: string, expiresAt: string) {
    return db.createSession(sessionId, userId, tokenHash, expiresAt);
  }
  getSessionByTokenHash(tokenHash: string) { return db.getSessionByTokenHash(tokenHash); }
  deleteSessionByTokenHash(tokenHash: string) { return db.deleteSessionByTokenHash(tokenHash); }

  getDocuments(userId: string) { return db.getDocuments(userId); }
  getDocument(id: string, userId?: string) { return db.getDocument(id, userId); }
  insertDocument(doc: any) { return db.insertDocument(doc); }
  updateDocumentStatus(id: string, status: string, error?: string, pageCount?: number, docType?: string) {
    return db.updateDocumentStatus(id, status, error, pageCount, docType);
  }
  deleteDocument(id: string, userId: string) { return db.deleteDocument(id, userId); }

  savePagesAndChunks(documentId: string, pages: any[], chunks: any[]) {
    return db.savePagesAndChunks(documentId, pages, chunks);
  }
  getDocumentPages(documentId: string) { return db.getDocumentPages(documentId); }
  getDocumentChunks(documentId: string) { return db.getDocumentChunks(documentId); }

  saveAnalysisResult(documentId: string, overview: any, summary: string) {
    return db.saveAnalysisResult(documentId, overview, summary);
  }
  getAnalysisResult(documentId: string) { return db.getAnalysisResult(documentId); }
  saveSectionExplanations(documentId: string, explanations: any[]) {
    return db.saveSectionExplanations(documentId, explanations);
  }
  getSectionExplanations(documentId: string) { return db.getSectionExplanations(documentId); }

  saveAttentionAreas(documentId: string, items: any[]) { return db.saveAttentionAreas(documentId, items); }
  getAttentionAreas(documentId: string) { return db.getAttentionAreas(documentId); }
  saveObligations(documentId: string, items: any[]) { return db.saveObligations(documentId, items); }
  getObligations(documentId: string) { return db.getObligations(documentId); }
  toggleObligation(id: string, isCompleted: boolean) { return db.toggleObligation(id, isCompleted); }

  saveChecklistItems(documentId: string, items: any[]) { return db.saveChecklistItems(documentId, items); }
  getChecklistItems(documentId: string) { return db.getChecklistItems(documentId); }
  toggleChecklistItem(id: string, isCompleted: boolean) { return db.toggleChecklistItem(id, isCompleted); }

  saveComparison(report: ComparisonReport) { return db.saveComparison(report); }
  getComparison(id: string, userId: string) { return db.getComparison(id, userId); }
  getComparisons(userId: string) { return db.getComparisons(userId); }

  logAuditEvent(userId: string, action: string, documentId?: string, details?: string) {
    return db.logAuditEvent(userId, action, documentId, details);
  }
}

let activeAdapter: DatabaseAdapter | null = null;
export function getDatabaseAdapter(): DatabaseAdapter {
  if (!activeAdapter) {
    activeAdapter = new SQLiteAdapter();
  }
  return activeAdapter;
}
