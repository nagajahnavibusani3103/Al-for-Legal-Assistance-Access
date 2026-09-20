import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { getDocument, getAnalysisResult, getAttentionAreas, getObligations } from '@/lib/db';

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

    const analysis = getAnalysisResult(params.id);
    const attentionAreas = getAttentionAreas(params.id);
    const obligations = getObligations(params.id);

    const prep = {
      documentId: params.id,
      documentTitle: doc.title,
      conciseSummary: analysis?.summary || `Executive brief for ${doc.title}.`,
      consultationQuestions: [
        'Are there one-sided indemnification or liability clauses that expose us to excessive financial risk?',
        'Does the termination notice and process adequately protect our operational transition period?',
        'Does any non-compete, non-solicitation, or restrictive covenant satisfy local statutory enforceability standards?',
        'Are there any missing standard warranties, cure periods, or force majeure protections that should be added?',
        'How does the governing law and arbitration clause affect our procedural rights and costs in a dispute?'
      ],
      keyFactsToGather: [
        'Full legal corporate names, jurisdictions of incorporation, and authorized signatory titles',
        'Detailed documentation of all past verbal promises, emails, or representations not in this draft',
        'Specific figures for compensation, retainers, security deposits, and milestone deadlines',
        'Copies of related or prior agreements (NDAs, master service agreements, offer letters)'
      ],
      ambiguousProvisions: attentionAreas.slice(0, 3).map(att => ({
        provision: att.title,
        source: `Page ${att.sourcePage}, ${att.sourceSection || 'General'}`,
        question: att.questionToConsider
      })),
      datesToRemember: [
        { date: analysis?.overview.effectiveDate || 'Upon execution', description: 'Effective Commencement Date' },
        { date: '60 Days Prior to Expiration', description: 'Advance Written Non-Renewal Cutoff Deadline' }
      ],
      clausesWorthHighlighting: attentionAreas.map(att => ({
        clause: att.title,
        source: `Page ${att.sourcePage}`,
        reason: att.whyItMatters
      })),
      missingInformation: [
        'Explicit dispute escalation process (e.g. mandatory executive mediation prior to binding arbitration)',
        'Clear distinction between curable breaches (with a 30-day cure window) versus immediate non-curable defaults'
      ]
    };

    return NextResponse.json({ success: true, lawyerPrep: prep });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
