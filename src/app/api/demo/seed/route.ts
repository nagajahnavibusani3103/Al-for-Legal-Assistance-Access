import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/lib/security/auth';
import { 
  insertDocument, 
  savePagesAndChunks, 
  saveAnalysisResult, 
  saveSectionExplanations,
  saveAttentionAreas, 
  saveObligations, 
  saveChecklistItems, 
  saveComparison,
  logAuditEvent,
  updateDocumentStatus,
  getDocumentPages,
  getDocumentChunks,
  getDocument
} from '@/lib/db';
import { extractDocumentContent } from '@/lib/document-processing/extractor';
import { chunkDocumentPages } from '@/lib/document-processing/chunker';
import { getAIProvider } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const fixturesDir = path.resolve(process.cwd(), 'fixtures');

    const seedFiles = [
      {
        id: 'doc-demo-emp-v1',
        title: 'Executive Employment Agreement (v1.0)',
        fileName: 'employment_agreement_v1.txt',
        docType: 'employment_agreement' as const
      },
      {
        id: 'doc-demo-emp-v2',
        title: 'Executive Employment Agreement (v2.0 Revised)',
        fileName: 'employment_agreement_v2.txt',
        docType: 'employment_agreement' as const
      },
      {
        id: 'doc-demo-lease',
        title: 'Commercial Suite Lease Agreement',
        fileName: 'commercial_lease_agreement.txt',
        docType: 'lease_agreement' as const
      },
      {
        id: 'doc-demo-nda',
        title: 'Mutual Non-Disclosure Agreement (Security Test)',
        fileName: 'nda_sample.txt',
        docType: 'nda' as const
      }
    ];

    const aiProvider = getAIProvider();

    for (const item of seedFiles) {
      const filePath = path.join(fixturesDir, item.fileName);
      if (!fs.existsSync(filePath)) continue;

      const fileBuffer = fs.readFileSync(filePath);
      
      // Upsert document
      const existing = getDocument(item.id);
      const existingPages = existing ? getDocumentPages(item.id) : [];
      if (existing && existingPages.length > 0) {
        continue;
      }

      if (!existing) {
        insertDocument({
          id: item.id,
          userId: user.id,
          title: item.title,
          docType: item.docType,
          fileName: item.fileName,
          fileSize: fileBuffer.length,
          mimeType: 'text/plain',
          pageCount: 3,
          status: 'ready'
        });
      }

      // Extract & Chunk
      const extraction = await extractDocumentContent(fileBuffer, 'txt');
      const chunks = chunkDocumentPages(item.id, extraction.pages);

      savePagesAndChunks(
        item.id, 
        extraction.pages.map(p => ({
          id: `page-${item.id}-${p.pageNumber}`,
          pageNumber: p.pageNumber,
          content: p.content,
          tokenCount: p.content.split(/\s+/).length
        })),
        chunks
      );

      // AI Analysis
      const analysis = await aiProvider.analyzeDocument(
        item.id, 
        item.title, 
        extraction.pages.map(p => ({
          id: `page-${item.id}-${p.pageNumber}`,
          documentId: item.id,
          pageNumber: p.pageNumber,
          content: p.content,
          tokenCount: p.content.split(/\s+/).length
        })),
        chunks
      );

      saveAnalysisResult(item.id, analysis.overview, analysis.executiveSummary);
      saveSectionExplanations(item.id, analysis.sectionExplanations);
      saveAttentionAreas(item.id, analysis.attentionAreas);
      saveObligations(item.id, analysis.obligations);
      saveChecklistItems(item.id, analysis.checklistItems);
      updateDocumentStatus(item.id, 'ready', undefined, extraction.pageCount, item.docType);
    }

    // Generate comparison between v1 and v2
    const docAChunks = getDocumentChunks('doc-demo-emp-v1');
    const docAPages = getDocumentPages('doc-demo-emp-v1');
    const docBChunks = getDocumentChunks('doc-demo-emp-v2');
    const docBPages = getDocumentPages('doc-demo-emp-v2');

    if (docAPages.length > 0 && docBPages.length > 0) {
      const comparison = await aiProvider.compareDocuments(
        { id: 'doc-demo-emp-v1', title: 'Executive Employment Agreement (v1.0)', pages: docAPages, chunks: docAChunks },
        { id: 'doc-demo-emp-v2', title: 'Executive Employment Agreement (v2.0 Revised)', pages: docBPages, chunks: docBChunks },
        user.id
      );
      saveComparison(comparison);
    }

    logAuditEvent(user.id, 'SEED_DEMO_DATA', undefined, 'Seeded 4 realistic demo contracts');

    return NextResponse.json({ success: true, message: 'Synthetic demo legal contracts loaded successfully.' });
  } catch (err: any) {
    console.error('Demo seed error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
