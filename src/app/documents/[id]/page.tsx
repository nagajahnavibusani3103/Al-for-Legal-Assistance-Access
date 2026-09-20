'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { 
  DocumentRecord, 
  DocumentPage, 
  DocumentMetadataOverview, 
  SectionExplanation, 
  AttentionArea, 
  Obligation, 
  ActionChecklistItem, 
  LawyerPrepSummary,
  ChatAnswerResponse,
  GroundedCitation
} from '@/types';
import { 
  FileText, 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  CheckSquare, 
  Briefcase, 
  ArrowLeft, 
  Download, 
  ChevronRight, 
  ExternalLink, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Clock, 
  Info,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react';

type TabType = 'overview' | 'explain' | 'ask' | 'attention' | 'obligations' | 'checklist' | 'lawyer-prep';

function DocumentAnalysisContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = params.id as string;

  // Active Tab
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Document Data States
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [overview, setOverview] = useState<DocumentMetadataOverview | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  
  // Specific Tab Data States
  const [sections, setSections] = useState<SectionExplanation[]>([]);
  const [attentionAreas, setAttentionAreas] = useState<AttentionArea[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [checklist, setChecklist] = useState<ActionChecklistItem[]>([]);
  const [lawyerPrep, setLawyerPrep] = useState<LawyerPrepSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Q&A Chat Input
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState(false);

  // Load Primary Document
  useEffect(() => {
    async function loadDoc() {
      try {
        const res = await fetch(`/api/documents/${docId}`);
        const data = await res.json();
        if (data.success) {
          setDoc(data.document);
          setPages(data.pages);
          setOverview(data.overview);
          setExecutiveSummary(data.executiveSummary);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDoc();
  }, [docId]);

  // Load Sub-Tab Data lazily or upon tab selection
  useEffect(() => {
    if (!docId) return;

    if (activeTab === 'explain' && sections.length === 0) {
      fetch(`/api/documents/${docId}/sections`)
        .then(r => r.json())
        .then(d => d.success && setSections(d.sections));
    } else if (activeTab === 'attention' && attentionAreas.length === 0) {
      fetch(`/api/documents/${docId}/attention-areas`)
        .then(r => r.json())
        .then(d => d.success && setAttentionAreas(d.attentionAreas));
    } else if (activeTab === 'obligations' && obligations.length === 0) {
      fetch(`/api/documents/${docId}/obligations`)
        .then(r => r.json())
        .then(d => d.success && setObligations(d.obligations));
    } else if (activeTab === 'checklist' && checklist.length === 0) {
      fetch(`/api/documents/${docId}/checklist`)
        .then(r => r.json())
        .then(d => d.success && setChecklist(d.checklist));
    } else if (activeTab === 'lawyer-prep' && !lawyerPrep) {
      fetch(`/api/documents/${docId}/lawyer-prep`)
        .then(r => r.json())
        .then(d => d.success && setLawyerPrep(d.lawyerPrep));
    } else if (activeTab === 'ask' && chatMessages.length === 0) {
      fetch(`/api/documents/${docId}/chat`)
        .then(r => r.json())
        .then(d => d.success && setChatMessages(d.messages));
    }
  }, [activeTab, docId, sections.length, attentionAreas.length, obligations.length, checklist.length, lawyerPrep, chatMessages.length]);

  // Chat Submit
  const handleSendQuestion = async (queryText?: string) => {
    const question = queryText || chatInput;
    if (!question.trim() || isAsking) return;

    const userMsg = { role: 'user', content: question };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAsking(true);

    try {
      const res = await fetch(`/api/documents/${docId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          evidence: data.evidence,
          whyItMatters: data.whyItMatters,
          whatIsUnclear: data.whatIsUnclear,
          questionsToAskLawyer: data.questionsToAskLawyer,
          needsProfessionalReview: data.needsProfessionalReview,
          isFoundInDocument: data.isFoundInDocument,
          suggestedFollowUps: data.suggestedFollowUps
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  // Toggle Obligation Completion
  const handleToggleObligation = async (id: string, current: boolean) => {
    const updated = !current;
    setObligations(prev => prev.map(o => o.id === id ? { ...o, isCompleted: updated } : o));
    await fetch(`/api/documents/${docId}/obligations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ obligationId: id, isCompleted: updated })
    });
  };

  // Toggle Checklist Completion
  const handleToggleChecklist = async (id: string, current: boolean) => {
    const updated = !current;
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, isCompleted: updated } : c));
    await fetch(`/api/documents/${docId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: id, isCompleted: updated })
    });
  };

  // Jump to Source Page & Highlight
  const handleJumpToSource = (pageNumber: number, excerpt?: string) => {
    setSelectedPageNum(pageNumber);
    if (excerpt) {
      setHighlightedText(excerpt.trim());
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedText(null), 5000);
    }
  };

  // Export Document Analysis
  const handleExport = async (format: 'markdown' | 'txt') => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, format })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc?.title || 'LexiLens'}-Analysis.${format === 'markdown' ? 'md' : 'txt'}`;
      a.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-semibold">Loading document analysis...</p>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Document Not Found</h2>
          <p className="text-sm text-slate-600 mt-1 mb-6">The requested document does not exist or you do not have permission to view it.</p>
          <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = pages.find(p => p.pageNumber === selectedPageNum) || pages[0];

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <Navbar />

      {/* Top Document Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-950 truncate max-w-md sm:max-w-xl">
                {doc.title}
              </h1>
              <span className="text-[11px] font-semibold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {doc.docType.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>{doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}</span>
              <span>•</span>
              <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/compare?docA=${doc.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <span>Compare This</span>
          </Link>
          <div className="relative group">
            <button
              onClick={() => handleExport('markdown')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* SPLIT-PANE CONTAINER */}
      <main id="main-content" className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT PANE: DOCUMENT PREVIEW & PAGE SELECTOR */}
        <section 
          aria-label="Document Viewer" 
          className="w-full lg:w-1/2 border-r border-slate-200 bg-white flex flex-col h-[500px] lg:h-[calc(100vh-125px)] overflow-hidden"
        >
          {/* Page Selector Tabs */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <span className="text-slate-500 font-semibold mr-1 shrink-0">Pages:</span>
              {pages.map((p) => (
                <button
                  key={p.pageNumber}
                  onClick={() => setSelectedPageNum(p.pageNumber)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    p.pageNumber === selectedPageNum
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Page {p.pageNumber}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-mono shrink-0 ml-2">
              Viewing Page {selectedPageNum} of {pages.length}
            </span>
          </div>

          {/* Page Text Viewer */}
          <div className="flex-1 p-6 overflow-y-auto font-serif text-sm leading-relaxed text-slate-800 select-text">
            {currentPage ? (
              <div className="max-w-2xl mx-auto space-y-4 whitespace-pre-wrap">
                {currentPage.content.split('\n\n').map((paragraph, pIdx) => {
                  const isHighlighted = highlightedText && paragraph.toLowerCase().includes(highlightedText.toLowerCase().slice(0, 30));
                  return (
                    <p 
                      key={pIdx}
                      className={`p-1.5 rounded transition-colors ${
                        isHighlighted 
                          ? 'bg-amber-100 ring-2 ring-amber-400 text-slate-950 font-medium' 
                          : ''
                      }`}
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Page text unavailable.</div>
            )}
          </div>
        </section>

        {/* RIGHT PANE: AI INSIGHTS & TABS */}
        <section 
          aria-label="AI Document Insights" 
          className="w-full lg:w-1/2 bg-slate-50 flex flex-col h-[600px] lg:h-[calc(100vh-125px)] overflow-hidden"
        >
          {/* Tabs Navigation Bar */}
          <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-1 overflow-x-auto shrink-0">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'explain', label: 'Explain', icon: Sparkles },
              { id: 'ask', label: 'Ask LexiLens', icon: HelpCircle },
              { id: 'attention', label: 'Attention Areas', icon: AlertTriangle },
              { id: 'obligations', label: 'Obligations', icon: Clock },
              { id: 'checklist', label: 'Checklist', icon: CheckSquare },
              { id: 'lawyer-prep', label: 'Lawyer Prep', icon: Briefcase },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Executive Summary Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Executive Summary
                  </h3>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {executiveSummary || 'Summary is being generated...'}
                  </p>
                </div>

                {/* Key Parties & Terms Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Parties */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Identified Parties
                    </h4>
                    {overview?.parties && overview.parties.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-slate-800">
                        {overview.parties.map((party, idx) => (
                          <li key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded">
                            <span className="font-semibold">{party.name}</span>
                            <span className="text-slate-500">({party.role})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">Not clearly identified in this document.</p>
                    )}
                  </div>

                  {/* Governing Law & Dates */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Key Dates & Jurisdiction
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 block">Effective Date:</span>
                        <span className="font-medium text-slate-900">{overview?.effectiveDate || 'Not clearly identified.'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Governing Law:</span>
                        <span className="font-medium text-slate-900">{overview?.governingLaw || 'Not clearly identified.'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Renewal & Termination Terms */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Duration & Termination Terms
                  </h4>
                  <div className="text-xs space-y-3">
                    <div>
                      <strong className="text-slate-900 block mb-1">Renewal Terms:</strong>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                        {overview?.renewalInfo || 'Not clearly identified in this document.'}
                      </p>
                    </div>
                    <div>
                      <strong className="text-slate-900 block mb-1">Termination Conditions:</strong>
                      <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                        {overview?.terminationInfo || 'Not clearly identified in this document.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Financial Terms */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Key Financial Terms Mentioned
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {overview?.keyFinancialTerms && overview.keyFinancialTerms.length > 0 ? (
                      overview.keyFinancialTerms.map((term, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          {term}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Not clearly identified in this document.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EXPLAIN DOCUMENT */}
            {activeTab === 'explain' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Section-by-section breakdown translating dense clauses into practical language.
                  </p>
                  <span className="text-xs text-slate-500">{sections.length} sections analyzed</span>
                </div>

                {sections.map((sec) => (
                  <div key={sec.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{sec.sectionTitle}</h4>
                      <button
                        onClick={() => handleJumpToSource(sec.pageNumber, sec.originalText)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        <span>Page {sec.pageNumber}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Plain language explanation */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-800 leading-relaxed">
                      <strong className="text-slate-900 block mb-1">What this means in plain language:</strong>
                      {sec.plainExplanation}
                    </div>

                    {/* Operational impacts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-blue-50/50 rounded border border-blue-100">
                        <span className="text-blue-900 font-semibold block">Action Required:</span>
                        <span className="text-slate-700">{sec.actionRequired}</span>
                      </div>
                      <div className="p-2.5 bg-amber-50/50 rounded border border-amber-100">
                        <span className="text-amber-900 font-semibold block">What to Clarify:</span>
                        <span className="text-slate-700">{sec.whatToClarify}</span>
                      </div>
                    </div>

                    {/* Expand original clause */}
                    <details className="text-xs text-slate-500 pt-1">
                      <summary className="cursor-pointer hover:text-slate-800 font-medium select-none">
                        View original clause excerpt
                      </summary>
                      <blockquote className="mt-2 p-3 bg-slate-100 rounded text-slate-700 font-serif italic text-xs leading-relaxed">
                        "{sec.originalText}"
                      </blockquote>
                    </details>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: ASK LEXILENS (GROUNDED Q&A) */}
            {activeTab === 'ask' && (
              <div className="flex flex-col h-full space-y-4">
                {/* Chat Stream View */}
                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {/* Assistant Intro Message */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Ask LexiLens about this document</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Ask any question regarding clauses, termination, notice periods, or compensation. 
                      Every answer is backed strictly by document evidence. If a term is missing, LexiLens will explicitly tell you.
                    </p>
                    <div className="pt-2">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Suggested Questions:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'What is the required notice period for termination?',
                          'Is there an automatic renewal clause?',
                          'What are my main obligations?',
                          'Does this document contain a pet policy?'
                        ].map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handleSendQuestion(prompt)}
                            disabled={isAsking}
                            className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-full transition-colors border border-slate-200"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div 
                        className={`max-w-[90%] rounded-xl p-4 text-xs leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white shadow-sm font-medium' 
                            : 'bg-white text-slate-900 border border-slate-200 shadow-sm space-y-3'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p>{msg.content}</p>
                        ) : (
                          <>
                            {/* Verification badge */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              {msg.isFoundInDocument ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  DIRECTLY STATED IN DOCUMENT
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  NOT FOUND IN DOCUMENT
                                </span>
                              )}

                              {msg.needsProfessionalReview && (
                                <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  Review Recommended
                                </span>
                              )}
                            </div>

                            {/* Answer Text */}
                            <div className="whitespace-pre-wrap text-slate-800 font-sans">
                              {msg.content}
                            </div>

                            {/* Evidence Cards */}
                            {msg.evidence && msg.evidence.length > 0 && (
                              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 space-y-1.5">
                                <div className="font-semibold text-blue-950 text-[11px]">Supporting Evidence:</div>
                                {msg.evidence.map((cit: GroundedCitation, cIdx: number) => (
                                  <div key={cIdx} className="text-[11px] text-slate-700">
                                    <div className="flex items-center justify-between">
                                      <button
                                        onClick={() => handleJumpToSource(cit.pageNumber, cit.excerpt)}
                                        className="font-semibold text-blue-700 hover:underline flex items-center gap-1"
                                      >
                                        <span>Page {cit.pageNumber} — {cit.sectionHeading || 'Clause'}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                      <span className="text-[10px] text-slate-500 font-mono">{cit.confidence}</span>
                                    </div>
                                    <blockquote className="mt-1 font-serif italic text-slate-600 bg-white/80 p-1.5 rounded border border-blue-100">
                                      "{cit.excerpt}"
                                    </blockquote>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Why It Matters */}
                            {msg.whyItMatters && (
                              <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                                <strong className="text-slate-800">Why it matters: </strong>
                                {msg.whyItMatters}
                              </div>
                            )}

                            {/* Questions to ask lawyer */}
                            {msg.questionsToAskLawyer && msg.questionsToAskLawyer.length > 0 && (
                              <div className="text-[11px] text-slate-700">
                                <strong className="text-slate-800 block mb-1">Suggested Question to Ask Counsel:</strong>
                                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                                  {msg.questionsToAskLawyer.map((q: string, qIdx: number) => (
                                    <li key={qIdx}>{q}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {isAsking && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 p-3 bg-white rounded-xl border border-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Retrieving evidence and checking groundedness...</span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuestion();
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-slate-200"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this agreement..."
                    disabled={isAsking}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isAsking}
                    className="p-2.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                    aria-label="Send question"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: ATTENTION AREAS */}
            {activeTab === 'attention' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Important clauses that may affect liabilities, rights, or commitments.
                  </p>
                  <span className="text-xs font-semibold text-slate-500">{attentionAreas.length} items flagged</span>
                </div>

                {attentionAreas.map((area) => {
                  const isCritical = area.severity === 'critical';
                  return (
                    <div 
                      key={area.id}
                      className={`p-5 rounded-xl border bg-white shadow-sm space-y-3 ${
                        isCritical ? 'border-rose-200' : 'border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {area.severity}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">{area.category}</span>
                        </div>
                        <button
                          onClick={() => handleJumpToSource(area.sourcePage, area.whatItSays)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                        >
                          <span>Page {area.sourcePage}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{area.title}</h4>

                      <div className="text-xs space-y-2">
                        <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
                          <strong className="text-slate-900 block mb-0.5">What the document says:</strong>
                          <p className="text-slate-700">{area.whatItSays}</p>
                        </div>

                        <div className="p-2.5 bg-blue-50/50 rounded border border-blue-100">
                          <strong className="text-blue-950 block mb-0.5">Why a reader may want to understand this:</strong>
                          <p className="text-slate-700">{area.whyItMatters}</p>
                        </div>

                        <div className="p-2.5 bg-amber-50/50 rounded border border-amber-100">
                          <strong className="text-amber-950 block mb-0.5">Potential question to consider:</strong>
                          <p className="text-slate-800 italic">"{area.questionToConsider}"</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 5: OBLIGATIONS TRACKER */}
            {activeTab === 'obligations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Track requirements, deadlines, and consequences. Check off items as completed.
                  </p>
                  <span className="text-xs font-semibold text-slate-500">{obligations.length} obligations</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50 font-bold text-slate-600">
                      <tr>
                        <th className="p-3 w-10">Done</th>
                        <th className="p-3">Party & Duty</th>
                        <th className="p-3">Deadline</th>
                        <th className="p-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {obligations.map((obl) => (
                        <tr key={obl.id} className={obl.isCompleted ? 'bg-slate-50/60 opacity-70' : 'hover:bg-slate-50/50'}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={obl.isCompleted}
                              onChange={() => handleToggleObligation(obl.id, obl.isCompleted)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 space-y-1">
                            <span className="font-semibold text-slate-900 block">{obl.party}</span>
                            <span className={`text-slate-700 leading-relaxed block ${obl.isCompleted ? 'line-through text-slate-400' : ''}`}>
                              {obl.obligation}
                            </span>
                            {obl.consequence && (
                              <span className="text-[11px] text-rose-700 block">
                                Consequence: {obl.consequence}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap">
                            <span className="font-medium text-slate-800">{obl.deadline}</span>
                            <span className="text-[11px] text-slate-400 block">{obl.frequency}</span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <button
                              onClick={() => handleJumpToSource(obl.sourcePage, obl.obligation)}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <span>Page {obl.sourcePage}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: ACTION CHECKLIST */}
            {activeTab === 'checklist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Step-by-step checklist organized into critical signing phases.
                  </p>
                  <span className="text-xs font-semibold text-slate-500">
                    {checklist.filter(c => c.isCompleted).length} / {checklist.length} completed
                  </span>
                </div>

                <div className="space-y-3">
                  {checklist.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-3.5 bg-white rounded-xl border transition-colors flex items-start gap-3 shadow-sm ${
                        item.isCompleted ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggleChecklist(item.id, item.isCompleted)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                          {item.sourceRef && (
                            <span className="text-[11px] text-slate-400 font-medium">{item.sourceRef}</span>
                          )}
                        </div>
                        <p className={`mt-1.5 text-slate-800 leading-relaxed ${item.isCompleted ? 'line-through text-slate-400' : 'font-medium'}`}>
                          {item.task}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: LAWYER PREPARATION */}
            {activeTab === 'lawyer-prep' && (
              <div className="space-y-5">
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-teal-950">
                    <Briefcase className="w-4 h-4 text-teal-700" />
                    <span>Legal Consultation Brief</span>
                  </div>
                  <p className="text-teal-900 leading-relaxed">
                    This brief organizes key questions, ambiguous clauses, and facts to gather so you maximize the value and efficiency of a conversation with an attorney.
                  </p>
                </div>

                {/* 5-10 Questions for Counsel */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Strategic Questions to Ask a Lawyer
                  </h4>
                  <ol className="list-decimal pl-4 space-y-2 text-xs text-slate-800">
                    {lawyerPrep?.consultationQuestions.map((q, i) => (
                      <li key={i} className="leading-relaxed font-medium">
                        "{q}"
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Key Facts to Gather */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Facts & Records to Gather Before Consultation
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                    {lawyerPrep?.keyFactsToGather.map((f, i) => (
                      <li key={i} className="leading-relaxed">{f}</li>
                    ))}
                  </ul>
                </div>

                {/* Ambiguous Provisions */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ambiguous Provisions Worth Highlighting
                  </h4>
                  <div className="space-y-2 text-xs">
                    {lawyerPrep?.ambiguousProvisions.map((item, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded border border-slate-100">
                        <span className="font-bold text-slate-900 block">{item.provision} ({item.source})</span>
                        <span className="text-slate-600 block mt-0.5">Question: "{item.question}"</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy to Clipboard */}
                <button
                  onClick={() => {
                    const text = `LEXILENS LAWYER PREPARATION BRIEF\nDocument: ${doc.title}\n\nQUESTIONS FOR LAWYER:\n${lawyerPrep?.consultationQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}\n\nKEY FACTS TO GATHER:\n${lawyerPrep?.keyFactsToGather.map(f => `- ${f}`).join('\n')}`;
                    navigator.clipboard.writeText(text);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Brief to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Complete Brief to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </section>

      </main>
    </div>
  );
}

export default function DocumentAnalysisPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading document analysis...</div>}>
      <DocumentAnalysisContent />
    </React.Suspense>
  );
}
