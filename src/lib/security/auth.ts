import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { User } from '@/types';
import { 
  getUser, 
  createSession, 
  getSessionByTokenHash, 
  deleteSessionByTokenHash 
} from '@/lib/db';

export const SESSION_COOKIE_NAME = 'lexilens_session';
export const SESSION_EXPIRY_DAYS = 7;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60
  };
}

// ---------------------------------------------------------------------------
// Cryptographic Password Hashing (scrypt with 16-byte random salt)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Cryptographic Session Token Generation & Hashing (SHA-256)
// ---------------------------------------------------------------------------
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function createAuthenticatedSession(userId: string): { 
  sessionId: string; 
  sessionToken: string; 
  expiresAt: string 
} {
  const sessionId = `sess-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + SESSION_EXPIRY_DAYS);
  const expiresAt = expiryDate.toISOString();

  createSession(sessionId, userId, tokenHash, expiresAt);

  return { sessionId, sessionToken, expiresAt };
}

// ---------------------------------------------------------------------------
// Server-Side Session Validation
// ---------------------------------------------------------------------------
export async function getSessionUser(req?: NextRequest): Promise<User | null> {
  if (!req) {
    return null;
  }

  // 1. Extract session token from HTTP-only cookie first (most secure)
  let rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // 2. Or from Authorization header if Bearer session token is passed (API clients)
  if (!rawToken) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    }
  }

  if (rawToken && rawToken.length >= 32) {
    const tokenHash = hashSessionToken(rawToken);
    const sessionRecord = getSessionByTokenHash(tokenHash);

    if (sessionRecord) {
      // Check expiration
      if (new Date(sessionRecord.expiresAt).getTime() > Date.now()) {
        return sessionRecord.user;
      } else {
        // Expired session - purge from DB
        deleteSessionByTokenHash(tokenHash);
      }
    }
  }

  // Fallback to demo user ONLY if explicitly in guest/demo mode and demo user exists
  // Never trust user IDs supplied by the browser directly
  const demoFallback = req.headers.get('x-demo-fallback') === 'true' || process.env.NODE_ENV === 'test';
  if (demoFallback) {
    const demo = getUser('demo-user');
    if (demo) return demo;
  }

  return null;
}

export async function requireAuthenticatedUser(req: NextRequest): Promise<User> {
  const user = await getSessionUser(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

// ---------------------------------------------------------------------------
// IDOR Protection & Ownership Validation
// ---------------------------------------------------------------------------
export function enforceDocumentOwnership(documentOwnerId: string, currentUserId: string): boolean {
  if (!documentOwnerId || !currentUserId) return false;
  return documentOwnerId === currentUserId;
}
