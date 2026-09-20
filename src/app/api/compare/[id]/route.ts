import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/security/auth';
import { getComparison } from '@/lib/db';

export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    const report = getComparison(params.id, user.id);

    if (!report) {
      return NextResponse.json({ success: false, error: 'Comparison report not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comparison: report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
