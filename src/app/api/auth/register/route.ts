import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createUser, getUserByEmail, logAuditEvent } from '@/lib/db';
import { 
  hashPassword, 
  createAuthenticatedSession, 
  SESSION_COOKIE_NAME, 
  getSessionCookieOptions 
} from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rateCheck = checkRateLimit(`register-${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name?.trim() || email.split('@')[0];

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'An account with this email address already exists.' }, { status: 409 });
    }

    const userId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const passwordHash = hashPassword(password);

    const newUser = createUser({
      id: userId,
      email,
      name,
      passwordHash,
      role: 'user'
    });

    // Create authenticated session
    const { sessionToken, expiresAt } = createAuthenticatedSession(newUser.id);
    logAuditEvent(newUser.id, 'USER_REGISTERED', undefined, `New account registered: ${email}`);

    const res = NextResponse.json({
      success: true,
      user: newUser,
      message: 'Account created successfully.'
    });

    // Set secure HTTP-only cookie
    const cookieOpts = getSessionCookieOptions();
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      ...cookieOpts
    });

    return res;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create account.' }, { status: 500 });
  }
}
