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
    const doc = getDocument(params.id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });
    }

    // Ownership check
    if (!enforceDocumentOwnership(doc.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'Access denied: You do not own this document.' }, { status: 403 });
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
    const doc = getDocument(params.id);

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });
    }

    if (!enforceDocumentOwnership(doc.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'Access denied: You cannot delete another user\'s document.' }, { status: 403 });
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
