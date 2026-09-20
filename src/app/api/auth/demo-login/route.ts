import { NextRequest, NextResponse } from 'next/server';
import { getUser, logAuditEvent } from '@/lib/db';
import { 
  createAuthenticatedSession, 
  SESSION_COOKIE_NAME, 
  getSessionCookieOptions 
} from '@/lib/security/auth';

export async function POST(req: NextRequest) {
  try {
    const demoUser = getUser('demo-user');
    if (!demoUser) {
      return NextResponse.json({ success: false, error: 'Demo user account not available.' }, { status: 500 });
    }

    const { sessionToken } = createAuthenticatedSession(demoUser.id);
    logAuditEvent(demoUser.id, 'DEMO_LOGIN', undefined, 'Judge / Demo User session initiated');

    const res = NextResponse.json({
      success: true,
      user: demoUser,
      message: 'Logged in as Demo User.'
    });

    const cookieOpts = getSessionCookieOptions();
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      ...cookieOpts
    });

    return res;
  } catch (err: any) {
    console.error('Demo login error:', err);
    return NextResponse.json({ success: false, error: 'Failed to initiate demo session.' }, { status: 500 });
  }
}
