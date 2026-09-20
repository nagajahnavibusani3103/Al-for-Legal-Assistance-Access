import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { getDocument, getObligations, toggleObligation } from '@/lib/db';

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

    const obligations = getObligations(params.id);
    return NextResponse.json({ success: true, obligations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await req.json();
    const { obligationId, isCompleted } = body;

    if (!obligationId) {
      return NextResponse.json({ success: false, error: 'Obligation ID is required.' }, { status: 400 });
    }

    toggleObligation(obligationId, Boolean(isCompleted));
    return NextResponse.json({ success: true, isCompleted: Boolean(isCompleted) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
