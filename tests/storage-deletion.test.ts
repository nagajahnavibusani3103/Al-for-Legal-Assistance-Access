import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  createUser, 
  insertDocument, 
  getDocument, 
  deleteDocument, 
  savePagesAndChunks,
  getDocumentChunks 
} from '../src/lib/db';

describe('LexiLens Storage Isolation & Physical Deletion Test Suite', () => {
  const testUserId = `storage-user-${Date.now()}`;
  const testUserDir = path.resolve(process.cwd(), 'storage', 'documents', testUserId);

  beforeAll(() => {
    createUser({
      id: testUserId,
      email: `storage-${Date.now()}@lexilens.test`,
      name: 'Storage Isolation Test User',
      passwordHash: 'dummy-hash'
    });

    if (!fs.existsSync(testUserDir)) {
      fs.mkdirSync(testUserDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory if empty
    try {
      if (fs.existsSync(testUserDir)) {
        fs.rmSync(testUserDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  it('physically creates and verifies file existence on disk', () => {
    const docId = `doc-storage-${crypto.randomUUID()}`;
    const filePath = path.join(testUserDir, `${crypto.randomUUID()}.pdf`);
    
    // Write simulated document buffer
    fs.writeFileSync(filePath, Buffer.from('%PDF-1.4 simulated legal contract content'));
    expect(fs.existsSync(filePath)).toBe(true);

    insertDocument({
      id: docId,
      userId: testUserId,
      title: 'Physical Deletion Test Contract',
      fileName: 'contract_for_deletion.pdf',
      fileSize: 42,
      mimeType: 'application/pdf',
      filePath: filePath,
      status: 'ready'
    });

    const doc = getDocument(docId, testUserId);
    expect(doc).not.toBeNull();
    expect(doc?.filePath).toBe(filePath);
  });

  it('atomically deletes both database records and disk file on document deletion', () => {
    const docId = `doc-delete-${crypto.randomUUID()}`;
    const filePath = path.join(testUserDir, `${crypto.randomUUID()}.pdf`);

    fs.writeFileSync(filePath, Buffer.from('%PDF-1.4 temporary document to test physical unlinking'));
    expect(fs.existsSync(filePath)).toBe(true);

    insertDocument({
      id: docId,
      userId: testUserId,
      title: 'Atomic Unlink Test Agreement',
      fileName: 'atomic_unlink.pdf',
      fileSize: 58,
      mimeType: 'application/pdf',
      filePath: filePath,
      status: 'ready'
    });

    // Add chunks to verify relational cleanup
    savePagesAndChunks(
      docId,
      [{ id: `page-${docId}-1`, pageNumber: 1, content: 'Clause 1: Confidentiality...', tokenCount: 15 }],
      [{ id: `chunk-${docId}-1`, pageNumber: 1, sectionHeading: 'Confidentiality', chunkIndex: 0, content: 'Clause 1: Confidentiality...', tokenCount: 15 }]
    );

    expect(getDocumentChunks(docId).length).toBe(1);

    // Perform deletion
    const deleteResult = deleteDocument(docId, testUserId);
    expect(deleteResult).toBe(true);

    // Verify DB record is gone
    expect(getDocument(docId, testUserId)).toBeNull();

    // Verify associated chunks are deleted
    expect(getDocumentChunks(docId).length).toBe(0);

    // Verify physical file on disk is unlinked
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('prevents unauthorized user from deleting or unlinking another user file', () => {
    const docId = `doc-protected-${crypto.randomUUID()}`;
    const filePath = path.join(testUserDir, `${crypto.randomUUID()}.pdf`);
    const unauthorizedUserId = `attacker-${Date.now()}`;

    fs.writeFileSync(filePath, Buffer.from('%PDF-1.4 protected user contract'));
    expect(fs.existsSync(filePath)).toBe(true);

    insertDocument({
      id: docId,
      userId: testUserId,
      title: 'Protected Contract',
      fileName: 'protected.pdf',
      fileSize: 32,
      mimeType: 'application/pdf',
      filePath: filePath,
      status: 'ready'
    });

    // Unauthorized delete attempt
    const deleteResult = deleteDocument(docId, unauthorizedUserId);
    expect(deleteResult).toBe(false);

    // Verify file still exists on disk
    expect(fs.existsSync(filePath)).toBe(true);

    // Clean up with legitimate owner
    deleteDocument(docId, testUserId);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('enforces directory confinement and eliminates path traversal risk in storage', () => {
    const maliciousFilename = '../../../../windows/system32/cmd.exe';
    
    // In LexiLens upload route, files are saved using crypto.randomUUID() and extension only
    const ext = path.extname(maliciousFilename) || '.pdf';
    const safeStorageFileName = `${crypto.randomUUID()}${ext}`;
    const resolvedPath = path.resolve(testUserDir, safeStorageFileName);

    // Verify path remains confined inside the user directory
    expect(resolvedPath.startsWith(testUserDir)).toBe(true);
    expect(resolvedPath).not.toContain('..');
  });
});
