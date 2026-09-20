import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { getDocument, getAttentionAreas } from '@/lib/db';

export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const doc = getDocument(params.id);

    if (!doc || !enforceDocumentOwnership(doc.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    const items = getAttentionAreas(params.id);
    return NextResponse.json({ success: true, attentionAreas: items });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
