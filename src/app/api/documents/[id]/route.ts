import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { 
  getDocument, 
  getDocumentPages, 
  getDocumentChunks, 
  getAnalysisResult, 
  deleteDocument, 
  logAuditEvent 
} from '@/lib/db';

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

    // IDOR Protection: Return 404 if not found OR if not owned by caller
    if (!doc || !enforceDocumentOwnership(doc.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    const pages = getDocumentPages(params.id);
    const chunks = getDocumentChunks(params.id);
    const analysis = getAnalysisResult(params.id);

    return NextResponse.json({
      success: true,
      document: doc,
      pages,
      chunks,
      overview: analysis?.overview || null,
      executiveSummary: analysis?.summary || ''
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const doc = getDocument(params.id);

    // IDOR Protection: Return 404 if not found OR if not owned by caller
    if (!doc || !enforceDocumentOwnership(doc.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    const deleted = deleteDocument(params.id, user.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to delete document.' }, { status: 500 });
    }

    logAuditEvent(user.id, 'DOCUMENT_DELETED', params.id, `Deleted document: ${doc.title}`);

    return NextResponse.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
