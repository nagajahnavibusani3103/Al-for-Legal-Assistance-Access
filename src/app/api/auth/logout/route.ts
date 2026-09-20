import { NextRequest, NextResponse } from 'next/server';
import { 
  SESSION_COOKIE_NAME, 
  getSessionCookieOptions, 
  hashSessionToken 
} from '@/lib/security/auth';
import { deleteSessionByTokenHash, logAuditEvent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      deleteSessionByTokenHash(tokenHash);
    }

    const res = NextResponse.json({
      success: true,
      message: 'Logged out successfully.'
    });

    // Clear session cookie
    const cookieOpts = getSessionCookieOptions();
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      ...cookieOpts,
      maxAge: 0
    });

    return res;
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ success: false, error: 'Logout failed.' }, { status: 500 });
  }
}
