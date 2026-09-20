import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getDb, 
  insertDocument, 
  getDocument, 
  getDocuments, 
  deleteDocument,
  saveObligations,
  getObligations,
  toggleObligation,
  saveChecklistItems,
  getChecklistItems,
  toggleChecklistItem
} from '@/lib/db';
import { enforceDocumentOwnership } from '@/lib/security/auth';

describe('SQL Database & Persistence Layer', () => {
  const testUserId = 'test-user-alpha';
  const testDocId = `test-doc-${Date.now()}`;

  beforeEach(() => {
    // Ensure DB is initialized and test user exists
    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, name, role, created_at)
      VALUES (?, ?, ?, 'user', datetime('now'))
    `).run(testUserId, `${testUserId}@example.com`, 'Test User Alpha');
  });

  it('inserts and retrieves a legal document record', () => {
    insertDocument({
      id: testDocId,
      userId: testUserId,
      title: 'Unit Test Agreement',
      docType: 'general_contract',
      fileName: 'unit_test.txt',
      fileSize: 1024,
      mimeType: 'text/plain',
      pageCount: 2,
      status: 'ready'
    });

    const retrieved = getDocument(testDocId);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(testDocId);
    expect(retrieved?.title).toBe('Unit Test Agreement');
  });

  it('enforces row-level document ownership checks', () => {
    const isOwner = enforceDocumentOwnership(testUserId, testUserId);
    const isImposter = enforceDocumentOwnership(testUserId, 'hacker-user');

    expect(isOwner).toBe(true);
    expect(isImposter).toBe(false);
  });

  it('saves and toggles obligations completion state', () => {
    const obligationId = `obl-${Date.now()}`;
    saveObligations(testDocId, [
      {
        id: obligationId,
        documentId: testDocId,
        party: 'Employee',
        obligation: 'Submit weekly timesheets',
        deadline: 'Every Friday',
        frequency: 'Weekly',
        condition: 'Active employment',
        consequence: 'Delayed payroll processing',
        sourcePage: 1,
        isCompleted: false
      }
    ]);

    let list = getObligations(testDocId);
    expect(list.length).toBe(1);
    expect(list[0].isCompleted).toBe(false);

    toggleObligation(obligationId, true);
    list = getObligations(testDocId);
    expect(list[0].isCompleted).toBe(true);
  });

  it('deletes document and cascades cleanup', () => {
    const deleted = deleteDocument(testDocId, testUserId);
    expect(deleted).toBe(true);

    const docAfter = getDocument(testDocId);
    expect(docAfter).toBeNull();
  });
});
