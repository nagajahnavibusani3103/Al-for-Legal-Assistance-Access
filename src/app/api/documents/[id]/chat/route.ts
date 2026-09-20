import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, enforceDocumentOwnership } from '@/lib/security/auth';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { 
  getDocument, 
  getDocumentChunks, 
  getOrCreateConversation, 
  saveMessage, 
  getMessages, 
  logAuditEvent 
} from '@/lib/db';
import { getAIProvider } from '@/lib/ai';

export async function POST(
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
      return NextResponse.json({ success: false, error: 'Access denied.' }, { status: 403 });
    }

    const rateCheck = checkRateLimit(`chat-${user.id}`);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Chat rate limit exceeded. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json({ success: false, error: 'Question cannot be empty.' }, { status: 400 });
    }

    const chunks = getDocumentChunks(params.id);
    const convId = getOrCreateConversation(params.id, user.id);

    // Save user message
    saveMessage(convId, 'user', question);

    // Fetch conversation history
    const history = getMessages(convId);

    // AI Q&A
    const aiProvider = getAIProvider();
    const answer = await aiProvider.answerQuestion(
      params.id,
      question,
      chunks,
      history.map(m => ({ role: m.role, content: m.content }))
    );

    // Save assistant message with citations
    saveMessage(
      convId, 
      'assistant', 
      answer.answer, 
      answer.evidence, 
      answer.needsProfessionalReview, 
      answer.isFoundInDocument
    );

    logAuditEvent(user.id, 'DOCUMENT_CHAT_QUERY', params.id, `Question: ${question.slice(0, 50)}...`);

    return NextResponse.json({
      success: true,
      answer: answer.answer,
      evidence: answer.evidence,
      whyItMatters: answer.whyItMatters,
      whatIsUnclear: answer.whatIsUnclear,
      questionsToAskLawyer: answer.questionsToAskLawyer,
      needsProfessionalReview: answer.needsProfessionalReview,
      isFoundInDocument: answer.isFoundInDocument,
      suggestedFollowUps: answer.suggestedFollowUps
    });
  } catch (err: any) {
    console.error('Document chat error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Chat query failed.' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    const doc = getDocument(params.id);

    if (!doc || !enforceDocumentOwnership(doc.userId, user.id)) {
      return NextResponse.json({ success: false, error: 'Document not found or access denied.' }, { status: 404 });
    }

    const convId = getOrCreateConversation(params.id, user.id);
    const messages = getMessages(convId);

    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
