import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { getDocument, getChecklistItems, toggleChecklistItem } from '@/lib/db';

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

    const items = getChecklistItems(params.id);
    return NextResponse.json({ success: true, checklist: items });
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
    const { itemId, isCompleted } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, error: 'Item ID is required.' }, { status: 400 });
    }

    toggleChecklistItem(itemId, Boolean(isCompleted));
    return NextResponse.json({ success: true, isCompleted: Boolean(isCompleted) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
