import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { 
  getDocument, 
  getDocumentPages, 
  getDocumentChunks, 
  saveComparison, 
  getComparisons,
  logAuditEvent 
} from '@/lib/db';
import { getAIProvider } from '@/lib/ai';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const list = getComparisons(user.id);
    return NextResponse.json({ success: true, comparisons: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const body = await req.json();
    const { docAId, docBId } = body;

    if (!docAId || !docBId) {
      return NextResponse.json({ success: false, error: 'Both docAId and docBId are required.' }, { status: 400 });
    }

    if (docAId === docBId) {
      return NextResponse.json({ success: false, error: 'Please select two different documents to compare.' }, { status: 400 });
    }

    const docA = getDocument(docAId);
    const docB = getDocument(docBId);

    if (!docA || !docB || !enforceDocumentOwnership(docA.userId, user.id) || !enforceDocumentOwnership(docB.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'One or both documents could not be found or access is denied.' }, { status: 404 });
    }

    const docAPages = getDocumentPages(docAId);
    const docAChunks = getDocumentChunks(docAId);
    const docBPages = getDocumentPages(docBId);
    const docBChunks = getDocumentChunks(docBId);

    const aiProvider = getAIProvider();
    const report = await aiProvider.compareDocuments(
      { id: docAId, title: docA.title, pages: docAPages, chunks: docAChunks },
      { id: docBId, title: docB.title, pages: docBPages, chunks: docBChunks },
      user.id
    );

    saveComparison(report);
    logAuditEvent(user.id, 'DOCUMENT_COMPARED', docAId, `Compared "${docA.title}" with "${docB.title}"`);

    return NextResponse.json({ success: true, comparison: report });
  } catch (err: any) {
    console.error('Comparison error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Comparison failed.' }, { status: 500 });
  }
}
