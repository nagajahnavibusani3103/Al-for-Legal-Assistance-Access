import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getSessionUser } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { validateDocumentFile } from '@/lib/document-processing/validator';
import { extractDocumentContent } from '@/lib/document-processing/extractor';
import { chunkDocumentPages } from '@/lib/document-processing/chunker';
import { getAIProvider } from '@/lib/ai';
import { 
  getDocuments, 
  insertDocument, 
  savePagesAndChunks, 
  saveAnalysisResult, 
  saveSectionExplanations,
  saveAttentionAreas, 
  saveObligations, 
  saveChecklistItems, 
  updateDocumentStatus,
  logAuditEvent 
} from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const docs = getDocuments(user.id);
    return NextResponse.json({ success: true, documents: docs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    // Rate limiting
    const rateCheck = checkRateLimit(`upload-${user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many upload requests. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const titleOverride = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No document file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file
    const validation = validateDocumentFile(file.name, buffer, file.type);
    if (!validation.isValid || !validation.detectedType) {
      return NextResponse.json({ 
        success: false, 
        error: validation.error || 'Invalid file format or security check failed.' 
      }, { status: 400 });
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const safeTitle = titleOverride?.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]/g, ' ');

    // Store file safely
    const storageDir = path.resolve(process.cwd(), 'storage/documents');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const safeDiskFileName = `${docId}-${validation.sanitizedFileName}`;
    const storageFilePath = path.join(storageDir, safeDiskFileName);
    fs.writeFileSync(storageFilePath, buffer);

    // Insert document record in SQL database
    insertDocument({
      id: docId,
      userId: user.id,
      title: safeTitle,
      docType: 'unknown',
      fileName: validation.sanitizedFileName || file.name,
      fileSize: buffer.length,
      mimeType: file.type || 'application/octet-stream',
      filePath: storageFilePath,
      pageCount: 1,
      status: 'processing'
    });

    // Extract text content
    const extraction = await extractDocumentContent(buffer, validation.detectedType);
    const chunks = chunkDocumentPages(docId, extraction.pages);

    // Save pages and chunks in SQL DB
    savePagesAndChunks(
      docId,
      extraction.pages.map(p => ({
        id: `page-${docId}-${p.pageNumber}`,
        pageNumber: p.pageNumber,
        content: p.content,
        tokenCount: p.content.split(/\s+/).length
      })),
      chunks
    );

    // Run AI analysis
    const aiProvider = getAIProvider();
    const analysis = await aiProvider.analyzeDocument(
      docId,
      safeTitle,
      extraction.pages.map(p => ({
        id: `page-${docId}-${p.pageNumber}`,
        documentId: docId,
        pageNumber: p.pageNumber,
        content: p.content,
        tokenCount: p.content.split(/\s+/).length
      })),
      chunks
    );

    saveAnalysisResult(docId, analysis.overview, analysis.executiveSummary);
    saveSectionExplanations(docId, analysis.sectionExplanations);
    saveAttentionAreas(docId, analysis.attentionAreas);
    saveObligations(docId, analysis.obligations);
    saveChecklistItems(docId, analysis.checklistItems);

    updateDocumentStatus(docId, 'ready', undefined, extraction.pageCount, analysis.overview.docType);
    logAuditEvent(user.id, 'DOCUMENT_UPLOADED', docId, `Uploaded ${file.name} (${extraction.pageCount} pages)`);

    return NextResponse.json({
      success: true,
      documentId: docId,
      title: safeTitle,
      pageCount: extraction.pageCount,
      docType: analysis.overview.docType,
      isScanned: extraction.isScanned,
      warnings: extraction.warnings
    });
  } catch (err: any) {
    console.error('Document upload error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to process document.' }, { status: 500 });
  }
}
