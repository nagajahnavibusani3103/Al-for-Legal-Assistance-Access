import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, logAuditEvent } from '@/lib/db';
import { 
  verifyPassword, 
  createAuthenticatedSession, 
  SESSION_COOKIE_NAME, 
  getSessionCookieOptions 
} from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const rateCheck = checkRateLimit(`login-${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const userRecord = getUserByEmail(email);
    if (!userRecord || !userRecord.passwordHash) {
      // Return generic error to prevent user enumeration attacks
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValid = verifyPassword(password, userRecord.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    // Create authenticated session
    const { sessionToken } = createAuthenticatedSession(userRecord.id);
    logAuditEvent(userRecord.id, 'USER_LOGIN', undefined, `Successful login: ${email}`);

    const res = NextResponse.json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        createdAt: userRecord.createdAt
      },
      message: 'Login successful.'
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
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Authentication failed.' }, { status: 500 });
  }
}
