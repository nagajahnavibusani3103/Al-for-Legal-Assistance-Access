// LexiLens End-to-End Production API Verification Script
// Tests all core API endpoints against a live Next.js server

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runVerification() {
  console.log('========================================================================');
  console.log(`LEXILENS E2E PRODUCTION API VERIFICATION (${BASE_URL})`);
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check AI Configuration endpoint (no auth needed or returns safe config)
    const configRes = await fetch(`${BASE_URL}/api/settings/ai-config`);
    assert(configRes.status === 200, 'GET /api/settings/ai-config returns 200 OK');
    const configData = await configRes.json();
    assert(configData.success === true, 'ai-config reports success: true');
    assert(configData.config && configData.config.provider, `AI provider configured: ${configData.config?.provider}`);
    assert(!configData.config?.apiKey, 'API keys are strictly hidden from client response');

    // 2. Demo Login to obtain real session cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert(loginRes.status === 200, 'POST /api/auth/demo-login returns 200 OK');
    const cookieHeader = loginRes.headers.get('set-cookie') || '';
    assert(cookieHeader.includes('lexilens_session='), 'Sets HTTP-only lexilens_session cookie');
    const sessionCookie = cookieHeader.split(';')[0];

    const authHeaders = {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    };

    // 3. Current User verification
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
    assert(meRes.status === 200, 'GET /api/auth/me returns 200 OK');
    const meData = await meRes.json();
    assert(meData.user && meData.user.id === 'demo-user', 'Authenticated as demo-user');

    // 4. Seed demo documents
    const seedRes = await fetch(`${BASE_URL}/api/demo/seed`, {
      method: 'POST',
      headers: authHeaders
    });
    assert(seedRes.status === 200, 'POST /api/demo/seed returns 200 OK');
    const seedData = await seedRes.json();
    assert(seedData.success === true, 'Seeded synthetic demo legal contracts successfully');

    // 5. List Documents
    const docsRes = await fetch(`${BASE_URL}/api/documents`, { headers: authHeaders });
    assert(docsRes.status === 200, 'GET /api/documents returns 200 OK');
    const docsData = await docsRes.json();
    assert(Array.isArray(docsData.documents) && docsData.documents.length > 0, `Retrieved ${docsData.documents?.length} documents`);

    const targetDoc = docsData.documents[0];
    const docId = targetDoc.id;

    // 6. Get Document Detail
    const docDetailRes = await fetch(`${BASE_URL}/api/documents/${docId}`, { headers: authHeaders });
    assert(docDetailRes.status === 200, `GET /api/documents/${docId} returns 200 OK`);
    const docDetail = await docDetailRes.json();
    assert(docDetail.document && docDetail.document.id === docId, 'Document details retrieved successfully');

    // 7. Grounded Chat Query
    const chatRes = await fetch(`${BASE_URL}/api/documents/${docId}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: 'What are the main termination notice requirements?' })
    });
    assert(chatRes.status === 200, 'POST /api/documents/[id]/chat returns 200 OK');
    const chatData = await chatRes.json();
    assert(chatData.answer && chatData.answer.length > 0, 'Grounded answer received');
    assert(Array.isArray(chatData.evidence) && chatData.evidence.length > 0, 'Response includes verified evidence citations');
    assert(chatData.evidence[0].pageNumber > 0, `Cites Page ${chatData.evidence[0]?.pageNumber}`);

    // 8. Anti-Hallucination Query (absent concept)
    const absentChatRes = await fetch(`${BASE_URL}/api/documents/${docId}/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: 'What is the pet policy for golden retrievers?' })
    });
    assert(absentChatRes.status === 200, 'Anti-hallucination query returns 200 OK');
    const absentData = await absentChatRes.json();
    assert(absentData.isFoundInDocument === false, 'Refuses absent topic (isFoundInDocument: false)');
    assert(absentData.answer.toLowerCase().includes('could not find'), 'Answer explicitly reports information not found');

    // 9. Obligations
    const obligationsRes = await fetch(`${BASE_URL}/api/documents/${docId}/obligations`, { headers: authHeaders });
    assert(obligationsRes.status === 200, 'GET /api/documents/[id]/obligations returns 200 OK');
    const obligationsData = await obligationsRes.json();
    assert(Array.isArray(obligationsData.obligations), `Retrieved ${obligationsData.obligations?.length} obligations`);

    // 10. Lawyer Prep Context
    const prepRes = await fetch(`${BASE_URL}/api/documents/${docId}/lawyer-prep`, { headers: authHeaders });
    assert(prepRes.status === 200, 'GET /api/documents/[id]/lawyer-prep returns 200 OK');
    const prepData = await prepRes.json();
    assert(prepData.lawyerPrep && Array.isArray(prepData.lawyerPrep.consultationQuestions), `Retrieved ${prepData.lawyerPrep?.consultationQuestions?.length} lawyer consultation questions`);

    // 11. Document Comparison
    if (docsData.documents.length >= 2) {
      const compRes = await fetch(`${BASE_URL}/api/compare`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          docAId: docsData.documents[0].id,
          docBId: docsData.documents[1].id
        })
      });
      assert(compRes.status === 200, 'POST /api/compare returns 200 OK');
      const compData = await compRes.json();
      assert(compData.comparison && Array.isArray(compData.comparison.changes), `Comparison computed ${compData.comparison?.totalChanges} diffs`);
    }

    // 12. Unauthenticated Request Rejection (Security check)
    const unauthRes = await fetch(`${BASE_URL}/api/documents`, {
      headers: { 'Content-Type': 'application/json' }
    });
    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401 Unauthorized');

    console.log('========================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected verification error:', err);
    process.exit(1);
  }
}

runVerification();
