import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
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
  ComparisonReport, 
  ComparisonDiffItem,
  AuditEvent 
} from '@/types';

// Ensure data directory exists
const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'lexilens.sqlite');

let databaseInstance: any = null;

export function getDb(): any {
  if (!databaseInstance) {
    databaseInstance = new DatabaseSync(DB_PATH);
    databaseInstance.exec('PRAGMA journal_mode = WAL;');
    databaseInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(databaseInstance);
  }
  return databaseInstance;
}

function initSchema(db: any) {
  const schemaPath = path.resolve(process.cwd(), 'src/lib/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Seed default guest user if missing
  const checkUser = db.prepare('SELECT id FROM users WHERE id = ?').get('demo-user');
  if (!checkUser) {
    db.prepare(`
      INSERT INTO users (id, email, name, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run('demo-user', 'demo@lexilens.ai', 'LexiLens Demo User', 'user');
  }
}

// ----------------------------------------------------
// User Queries
// ----------------------------------------------------
export function getUser(userId: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT id, email, name, role, created_at as createdAt FROM users WHERE id = ?').get(userId) as any;
  return row || null;
}

// ----------------------------------------------------
// Document Queries
// ----------------------------------------------------
export function getDocuments(userId: string): DocumentRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, user_id as userId, title, doc_type as docType, file_name as fileName,
           file_size as fileSize, mime_type as mimeType, file_path as filePath,
           page_count as pageCount, status, processing_error as processingError,
           created_at as createdAt, updated_at as updatedAt
    FROM documents
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as any[];
  return rows;
}

export function getDocument(id: string, userId?: string): DocumentRecord | null {
  const db = getDb();
  let query = `
    SELECT id, user_id as userId, title, doc_type as docType, file_name as fileName,
           file_size as fileSize, mime_type as mimeType, file_path as filePath,
           page_count as pageCount, status, processing_error as processingError,
           created_at as createdAt, updated_at as updatedAt
    FROM documents
    WHERE id = ?
  `;
  const params: any[] = [id];
  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  const row = db.prepare(query).get(...params) as any;
  return row || null;
}

export function insertDocument(doc: Partial<DocumentRecord> & { id: string; userId: string; title: string; fileName: string; fileSize: number; mimeType: string }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO documents (id, user_id, title, doc_type, file_name, file_size, mime_type, file_path, page_count, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    doc.id,
    doc.userId,
    doc.title,
    doc.docType || 'unknown',
    doc.fileName,
    doc.fileSize,
    doc.mimeType,
    doc.filePath || null,
    doc.pageCount || 1,
    doc.status || 'pending'
  );
}

export function updateDocumentStatus(id: string, status: string, error?: string, pageCount?: number, docType?: string) {
  const db = getDb();
  let sql = 'UPDATE documents SET status = ?, processing_error = ?, updated_at = datetime(\'now\')';
  const params: any[] = [status, error || null];

  if (pageCount !== undefined) {
    sql += ', page_count = ?';
    params.push(pageCount);
  }
  if (docType !== undefined) {
    sql += ', doc_type = ?';
    params.push(docType);
  }

  sql += ' WHERE id = ?';
  params.push(id);
  db.prepare(sql).run(...params);
}

export function deleteDocument(id: string, userId: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(id, userId);
  return (res as any).changes > 0;
}

// ----------------------------------------------------
// Document Pages & Chunks
// ----------------------------------------------------
export function savePagesAndChunks(
  documentId: string, 
  pages: { id: string; pageNumber: number; content: string; tokenCount: number }[],
  chunks: { id: string; pageNumber: number; sectionHeading: string; chunkIndex: number; content: string; tokenCount: number; vector?: number[] }[]
) {
  const db = getDb();

  // Clean up any existing pages and chunks for this document to ensure idempotency
  try {
    db.prepare('DELETE FROM embeddings WHERE chunk_id IN (SELECT id FROM document_chunks WHERE document_id = ?)').run(documentId);
    db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(documentId);
    db.prepare('DELETE FROM document_pages WHERE document_id = ?').run(documentId);
  } catch (e) {
    // Ignore cleanup errors if tables are empty
  }

  const insertPage = db.prepare(`
    INSERT OR REPLACE INTO document_pages (id, document_id, page_number, content, token_count)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertChunk = db.prepare(`
    INSERT OR REPLACE INTO document_chunks (id, document_id, page_number, section_heading, chunk_index, content, token_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEmbedding = db.prepare(`
    INSERT OR REPLACE INTO embeddings (id, chunk_id, vector_json, dimension, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  for (const p of pages) {
    insertPage.run(p.id, documentId, p.pageNumber, p.content, p.tokenCount);
  }

  for (const c of chunks) {
    insertChunk.run(c.id, documentId, c.pageNumber, c.sectionHeading, c.chunkIndex, c.content, c.tokenCount);
    if (c.vector && c.vector.length > 0) {
      insertEmbedding.run(`emb-${c.id}`, c.id, JSON.stringify(c.vector), c.vector.length);
    }
  }
}

export function getDocumentPages(documentId: string): DocumentPage[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, document_id as documentId, page_number as pageNumber, content, token_count as tokenCount
    FROM document_pages
    WHERE document_id = ?
    ORDER BY page_number ASC
  `).all(documentId) as any[];
}

export function getDocumentChunks(documentId: string): DocumentChunk[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, document_id as documentId, page_number as pageNumber,
           section_heading as sectionHeading, chunk_index as chunkIndex,
           content, token_count as tokenCount
    FROM document_chunks
    WHERE document_id = ?
    ORDER BY chunk_index ASC
  `).all(documentId) as any[];
}

// ----------------------------------------------------
// Analysis & Overview
// ----------------------------------------------------
export function saveAnalysisResult(documentId: string, overview: DocumentMetadataOverview, summary: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO analysis_results (
      id, document_id, executive_summary, parties_json, effective_date, expiration_date,
      duration, renewal_info, termination_info, governing_law, financial_terms_json,
      key_restrictions_json, main_obligations_json, important_sections_json, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'))
    ON CONFLICT(document_id) DO UPDATE SET
      executive_summary = excluded.executive_summary,
      parties_json = excluded.parties_json,
      effective_date = excluded.effective_date,
      expiration_date = excluded.expiration_date,
      duration = excluded.duration,
      renewal_info = excluded.renewal_info,
      termination_info = excluded.termination_info,
      governing_law = excluded.governing_law,
      financial_terms_json = excluded.financial_terms_json,
      key_restrictions_json = excluded.key_restrictions_json,
      main_obligations_json = excluded.main_obligations_json,
      important_sections_json = excluded.important_sections_json,
      status = 'completed'
  `).run(
    `ar-${documentId}`,
    documentId,
    summary,
    JSON.stringify(overview.parties),
    overview.effectiveDate,
    overview.expirationDate,
    overview.duration,
    overview.renewalInfo,
    overview.terminationInfo,
    overview.governingLaw,
    JSON.stringify(overview.keyFinancialTerms),
    JSON.stringify(overview.keyRestrictions),
    JSON.stringify(overview.mainObligationsSummary),
    JSON.stringify(overview.importantSections)
  );
}

export function getAnalysisResult(documentId: string): { overview: DocumentMetadataOverview; summary: string } | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM analysis_results WHERE document_id = ?').get(documentId) as any;
  if (!row) return null;

  return {
    summary: row.executive_summary || '',
    overview: {
      title: '',
      docType: 'general_contract',
      parties: row.parties_json ? JSON.parse(row.parties_json) : [],
      effectiveDate: row.effective_date,
      expirationDate: row.expiration_date,
      duration: row.duration,
      renewalInfo: row.renewal_info,
      terminationInfo: row.termination_info,
      governingLaw: row.governing_law,
      keyFinancialTerms: row.financial_terms_json ? JSON.parse(row.financial_terms_json) : [],
      keyRestrictions: row.key_restrictions_json ? JSON.parse(row.key_restrictions_json) : [],
      mainObligationsSummary: row.main_obligations_json ? JSON.parse(row.main_obligations_json) : [],
      importantSections: row.important_sections_json ? JSON.parse(row.important_sections_json) : [],
    }
  };
}

// ----------------------------------------------------
// Section Explanations
// ----------------------------------------------------
export function saveSectionExplanations(documentId: string, explanations: SectionExplanation[]) {
  const db = getDb();
  db.prepare('DELETE FROM section_explanations WHERE document_id = ?').run(documentId);
  const insert = db.prepare(`
    INSERT INTO section_explanations (
      id, document_id, section_title, page_number, original_text, plain_explanation,
      who_is_affected, action_required, what_to_clarify, source_ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const exp of explanations) {
    insert.run(
      exp.id,
      documentId,
      exp.sectionTitle,
      exp.pageNumber,
      exp.originalText,
      exp.plainExplanation,
      exp.whoIsAffected,
      exp.actionRequired,
      exp.whatToClarify,
      exp.sourceRef
    );
  }
}

export function getSectionExplanations(documentId: string): SectionExplanation[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, section_title as sectionTitle, page_number as pageNumber,
           original_text as originalText, plain_explanation as plainExplanation,
           who_is_affected as whoIsAffected, action_required as actionRequired,
           what_to_clarify as whatToClarify, source_ref as sourceRef
    FROM section_explanations
    WHERE document_id = ?
    ORDER BY page_number ASC
  `).all(documentId) as any[];
}

// ----------------------------------------------------
// Attention Areas
// ----------------------------------------------------
export function saveAttentionAreas(documentId: string, items: AttentionArea[]) {
  const db = getDb();
  db.prepare('DELETE FROM attention_areas WHERE document_id = ?').run(documentId);
  const insert = db.prepare(`
    INSERT INTO attention_areas (
      id, document_id, category, severity, title, what_it_says,
      why_it_matters, question_to_consider, source_page, source_section, chunk_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const a of items) {
    insert.run(
      a.id,
      documentId,
      a.category,
      a.severity,
      a.title,
      a.whatItSays,
      a.whyItMatters,
      a.questionToConsider,
      a.sourcePage,
      a.sourceSection || null,
      a.chunkId || null
    );
  }
}

export function getAttentionAreas(documentId: string): AttentionArea[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, document_id as documentId, category, severity, title,
           what_it_says as whatItSays, why_it_matters as whyItMatters,
           question_to_consider as questionToConsider, source_page as sourcePage,
           source_section as sourceSection, chunk_id as chunkId
    FROM attention_areas
    WHERE document_id = ?
    ORDER BY source_page ASC
  `).all(documentId) as any[];
}

// ----------------------------------------------------
// Obligations
// ----------------------------------------------------
export function saveObligations(documentId: string, items: Obligation[]) {
  const db = getDb();
  db.prepare('DELETE FROM obligations WHERE document_id = ?').run(documentId);
  const insert = db.prepare(`
    INSERT INTO obligations (
      id, document_id, party, obligation, deadline, frequency, condition, consequence, source_page, is_completed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const o of items) {
    insert.run(
      o.id,
      documentId,
      o.party,
      o.obligation,
      o.deadline,
      o.frequency,
      o.condition,
      o.consequence,
      o.sourcePage,
      o.isCompleted ? 1 : 0
    );
  }
}

export function getObligations(documentId: string): Obligation[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, document_id as documentId, party, obligation, deadline, frequency,
           condition, consequence, source_page as sourcePage, is_completed as isCompleted
    FROM obligations
    WHERE document_id = ?
    ORDER BY source_page ASC
  `).all(documentId) as any[];
  return rows.map(r => ({ ...r, isCompleted: Boolean(r.isCompleted) }));
}

export function toggleObligation(id: string, isCompleted: boolean) {
  const db = getDb();
  db.prepare('UPDATE obligations SET is_completed = ? WHERE id = ?').run(isCompleted ? 1 : 0, id);
}

// ----------------------------------------------------
// Action Checklist Items
// ----------------------------------------------------
export function saveChecklistItems(documentId: string, items: ActionChecklistItem[]) {
  const db = getDb();
  db.prepare('DELETE FROM checklist_items WHERE document_id = ?').run(documentId);
  const insert = db.prepare(`
    INSERT INTO checklist_items (id, document_id, category, task, source_ref, is_completed)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insert.run(item.id, documentId, item.category, item.task, item.sourceRef || null, item.isCompleted ? 1 : 0);
  }
}

export function getChecklistItems(documentId: string): ActionChecklistItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, document_id as documentId, category, task, source_ref as sourceRef, is_completed as isCompleted
    FROM checklist_items
    WHERE document_id = ?
  `).all(documentId) as any[];
  return rows.map(r => ({ ...r, isCompleted: Boolean(r.isCompleted) }));
}

export function toggleChecklistItem(id: string, isCompleted: boolean) {
  const db = getDb();
  db.prepare('UPDATE checklist_items SET is_completed = ? WHERE id = ?').run(isCompleted ? 1 : 0, id);
}

// ----------------------------------------------------
// Comparisons
// ----------------------------------------------------
export function saveComparison(report: ComparisonReport) {
  const db = getDb();
  db.prepare(`
    INSERT INTO comparisons (id, user_id, doc_a_id, doc_b_id, executive_summary, total_changes, changes_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    report.id,
    report.userId,
    report.docAId,
    report.docBId,
    report.executiveSummary,
    report.totalChanges,
    JSON.stringify(report.changes)
  );
}

export function getComparison(id: string, userId: string): ComparisonReport | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT c.id, c.user_id as userId, c.doc_a_id as docAId, c.doc_b_id as docBId,
           c.executive_summary as executiveSummary, c.total_changes as totalChanges,
           c.changes_json as changesJson, c.created_at as createdAt,
           da.title as docATitle, db2.title as docBTitle
    FROM comparisons c
    JOIN documents da ON c.doc_a_id = da.id
    JOIN documents db2 ON c.doc_b_id = db2.id
    WHERE c.id = ? AND c.user_id = ?
  `).get(id, userId) as any;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    docAId: row.docAId,
    docBId: row.docBId,
    docATitle: row.docATitle,
    docBTitle: row.docBTitle,
    executiveSummary: row.executiveSummary,
    totalChanges: row.totalChanges,
    changes: JSON.parse(row.changesJson),
    createdAt: row.createdAt
  };
}

export function getComparisons(userId: string): ComparisonReport[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.id, c.user_id as userId, c.doc_a_id as docAId, c.doc_b_id as docBId,
           c.executive_summary as executiveSummary, c.total_changes as totalChanges,
           c.changes_json as changesJson, c.created_at as createdAt,
           da.title as docATitle, db2.title as docBTitle
    FROM comparisons c
    JOIN documents da ON c.doc_a_id = da.id
    JOIN documents db2 ON c.doc_b_id = db2.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId) as any[];

  return rows.map(r => ({
    id: r.id,
    userId: r.userId,
    docAId: r.docAId,
    docBId: r.docBId,
    docATitle: r.docATitle,
    docBTitle: r.docBTitle,
    executiveSummary: r.executiveSummary,
    totalChanges: r.totalChanges,
    changes: JSON.parse(r.changesJson),
    createdAt: r.createdAt
  }));
}

// ----------------------------------------------------
// Conversations & Messages
// ----------------------------------------------------
export function getOrCreateConversation(documentId: string, userId: string): string {
  const db = getDb();
  const existing = db.prepare(`
    SELECT id FROM conversations WHERE document_id = ? AND user_id = ?
  `).get(documentId, userId) as any;

  if (existing) return existing.id;

  const convId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(`
    INSERT INTO conversations (id, document_id, user_id, title, created_at)
    VALUES (?, ?, ?, 'Chat about document', datetime('now'))
  `).run(convId, documentId, userId);

  return convId;
}

export function saveMessage(conversationId: string, role: string, content: string, citations?: any[], needsReview: boolean = false, isFound: boolean = true) {
  const db = getDb();
  const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, citations_json, needs_review, is_found, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    msgId,
    conversationId,
    role,
    content,
    citations ? JSON.stringify(citations) : null,
    needsReview ? 1 : 0,
    isFound ? 1 : 0
  );
  return msgId;
}

export function getMessages(conversationId: string): any[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, conversation_id as conversationId, role, content,
           citations_json as citationsJson, needs_review as needsReview,
           is_found as isFound, created_at as createdAt
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversationId) as any[];

  return rows.map(r => ({
    id: r.id,
    conversationId: r.conversationId,
    role: r.role,
    content: r.content,
    citations: r.citationsJson ? JSON.parse(r.citationsJson) : [],
    needsReview: Boolean(r.needsReview),
    isFound: Boolean(r.isFound),
    createdAt: r.createdAt
  }));
}

// ----------------------------------------------------
// Audit Logging
// ----------------------------------------------------
export function logAuditEvent(userId: string, action: string, documentId?: string, details?: string) {
  const db = getDb();
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(`
    INSERT INTO audit_events (id, user_id, action, document_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, userId, action, documentId || null, details || null);
}

export function getAuditEvents(userId: string): AuditEvent[] {
  const db = getDb();
  return db.prepare(`
    SELECT id, user_id as userId, action, document_id as documentId, details, timestamp
    FROM audit_events
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT 50
  `).all(userId) as any[];
}
