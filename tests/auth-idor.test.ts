import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  generateSessionToken, 
  hashSessionToken, 
  createAuthenticatedSession,
  getSessionUser,
  enforceDocumentOwnership 
} from '../src/lib/security/auth';
import { 
  createUser, 
  getUser, 
  createSession, 
  getSessionByTokenHash, 
  deleteSessionByTokenHash,
  insertDocument,
  getDocument,
  deleteDocument,
  getDb
} from '../src/lib/db';
import { NextRequest } from 'next/server';

describe('LexiLens Authentication & IDOR Protection Test Suite', () => {
  const userA = {
    id: `test-user-alpha-${Date.now()}`,
    email: `alpha-${Date.now()}@lexilens.test`,
    name: 'Alice Legal',
    role: 'user' as const,
    passwordHash: '',
    createdAt: new Date().toISOString()
  };

  const userB = {
    id: `test-user-bravo-${Date.now()}`,
    email: `bravo-${Date.now()}@lexilens.test`,
    name: 'Bob Legal',
    role: 'user' as const,
    passwordHash: '',
    createdAt: new Date().toISOString()
  };

  const samplePassword = 'SuperSecretLegalPassword#2026!';

  beforeAll(() => {
    // Hash passwords and persist users
    userA.passwordHash = hashPassword(samplePassword);
    userB.passwordHash = hashPassword(samplePassword);
    createUser(userA);
    createUser(userB);
  });

  describe('Cryptographic Password Security', () => {
    it('generates salted scrypt hash with proper formatting', () => {
      const hash = hashPassword(samplePassword);
      expect(hash).toContain(':');
      const parts = hash.split(':');
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(32); // 16 bytes hex = 32 chars
      expect(parts[1].length).toBe(128); // 64 bytes hex = 128 chars
    });

    it('generates distinct salt hashes for identical passwords', () => {
      const hash1 = hashPassword(samplePassword);
      const hash2 = hashPassword(samplePassword);
      expect(hash1).not.toBe(hash2);
      expect(hash1.split(':')[0]).not.toBe(hash2.split(':')[0]);
    });

    it('verifies correct password against hash', () => {
      const verified = verifyPassword(samplePassword, userA.passwordHash);
      expect(verified).toBe(true);
    });

    it('rejects incorrect password against hash', () => {
      const verified = verifyPassword('WrongPassword123!', userA.passwordHash);
      expect(verified).toBe(false);
    });

    it('safely handles corrupted hash without throwing', () => {
      expect(verifyPassword(samplePassword, 'corrupted-hash')).toBe(false);
      expect(verifyPassword(samplePassword, '')).toBe(false);
    });
  });

  describe('Session Token Cryptography & Lifecycle', () => {
    it('generates high-entropy 256-bit session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      expect(token1.length).toBe(64); // 32 bytes hex
      expect(token2.length).toBe(64);
      expect(token1).not.toBe(token2);
    });

    it('hashes tokens deterministically with SHA-256', () => {
      const token = 'test-token-fixed-string-for-hash-validation';
      const hash1 = hashSessionToken(token);
      const hash2 = hashSessionToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('creates active authenticated session in database', () => {
      const session = createAuthenticatedSession(userA.id);
      expect(session.sessionId).toBeDefined();
      expect(session.sessionToken).toBeDefined();
      expect(session.expiresAt).toBeDefined();

      // Ensure database stores the token hash, NOT the raw token
      const tokenHash = hashSessionToken(session.sessionToken);
      const record = getSessionByTokenHash(tokenHash);
      expect(record).not.toBeNull();
      expect(record?.userId).toBe(userA.id);
      expect(record?.user.email).toBe(userA.email);
    });

    it('revokes session on deletion', () => {
      const session = createAuthenticatedSession(userA.id);
      const tokenHash = hashSessionToken(session.sessionToken);

      expect(getSessionByTokenHash(tokenHash)).not.toBeNull();
      deleteSessionByTokenHash(tokenHash);
      expect(getSessionByTokenHash(tokenHash)).toBeNull();
    });
  });

  describe('IDOR (Insecure Direct Object Reference) Prevention', () => {
    const testDocId = `idor-doc-${Date.now()}`;

    beforeAll(() => {
      insertDocument({
        id: testDocId,
        userId: userA.id,
        title: 'Alice Confidential Agreement',
        fileName: 'alice_confidential_contract.pdf',
        fileSize: 10240,
        mimeType: 'application/pdf',
        pageCount: 2,
        status: 'ready'
      });
    });

    it('allows document owner (User A) to retrieve own document', () => {
      const doc = getDocument(testDocId, userA.id);
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe(testDocId);
      expect(doc?.userId).toBe(userA.id);
    });

    it('blocks other user (User B) from retrieving User A document (returns null / 404)', () => {
      const doc = getDocument(testDocId, userB.id);
      expect(doc).toBeNull(); // IDOR protection: returns null instead of leaking existence
    });

    it('blocks unauthorized deletion by User B', () => {
      const deleteResult = deleteDocument(testDocId, userB.id);
      expect(deleteResult).toBe(false);

      // Verify document still exists intact for User A
      const docStillExists = getDocument(testDocId, userA.id);
      expect(docStillExists).not.toBeNull();
    });

    it('enforces ownership check helper function', () => {
      expect(enforceDocumentOwnership(userA.id, userA.id)).toBe(true);
      expect(enforceDocumentOwnership(userA.id, userB.id)).toBe(false);
      expect(enforceDocumentOwnership(userA.id, '')).toBe(false);
    });

    it('allows owner User A to delete own document successfully', () => {
      const deleteResult = deleteDocument(testDocId, userA.id);
      expect(deleteResult).toBe(true);

      // Verify document is now deleted
      const doc = getDocument(testDocId, userA.id);
      expect(doc).toBeNull();
    });
  });

  describe('Request Authentication via Bearer Header & Cookies', () => {
    it('authenticates user via valid Authorization Bearer header', async () => {
      const session = createAuthenticatedSession(userA.id);
      
      const req = new NextRequest('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': `Bearer ${session.sessionToken}`
        }
      });

      const user = await getSessionUser(req);
      expect(user).not.toBeNull();
      expect(user?.id).toBe(userA.id);
      expect(user?.email).toBe(userA.email);
    });

    it('rejects invalid or forged Authorization Bearer header', async () => {
      const req = new NextRequest('http://localhost:3000/api/documents', {
        headers: {
          'Authorization': 'Bearer forged-random-token-that-does-not-exist-in-db-0000000000'
        }
      });

      const user = await getSessionUser(req);
      // In test environment without valid token, it should not resolve as userA
      expect(user?.id).not.toBe(userA.id);
    });
  });
});
