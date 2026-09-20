'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { DocumentRecord, ComparisonReport, ComparisonDiffItem, ChangeCategory } from '@/types';
import { 
  GitCompare, 
  ArrowRight, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Loader2,
  FileText,
  ChevronDown
} from 'lucide-react';

function CompareContent() {
  const searchParams = useSearchParams();
  const initialDocA = searchParams.get('docA') || '';
  const initialDocB = searchParams.get('docB') || '';

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docAId, setDocAId] = useState<string>(initialDocA);
  const [docBId, setDocBId] = useState<string>(initialDocB);
  
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);

  // Load user documents
  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await fetch('/api/documents');
        const data = await res.json();
        if (data.success && data.documents) {
          setDocuments(data.documents);
          // If no doc selected, pick first two if available
          if (!docAId && data.documents.length >= 1) {
            setDocAId(data.documents[0].id);
          }
          if (!docBId && data.documents.length >= 2) {
            setDocBId(data.documents[1].id);
          }
        }
      } catch (err) {
        console.error('Failed to load documents for comparison:', err);
      }
    }
    loadDocs();
  }, [docAId, docBId]);

  // If docA and docB are already provided in search params or initial load, auto-fetch comparison
  useEffect(() => {
    if (docAId && docBId && docAId !== docBId && !comparisonReport) {
      handleRunComparison();
    }
  }, [docAId, docBId]);

  const handleRunComparison = async () => {
    if (!docAId || !docBId) {
      setError('Please select both documents to compare.');
      return;
    }
    if (docAId === docBId) {
      setError('Please choose two distinct contracts or contract versions.');
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docAId, docBId })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to compare documents.');
      }
      setComparisonReport(data.comparison);
    } catch (err: any) {
      setError(err.message || 'Comparison error.');
    } finally {
      setIsComparing(false);
    }
  };

  const categories: (ChangeCategory | 'All')[] = [
    'All', 'Financial', 'Obligations', 'Termination', 'Liability', 'Confidentiality', 'Dates', 'Other'
  ];

  const filteredChanges = comparisonReport?.changes.filter(c => {
    if (selectedCategory === 'All') return true;
    return c.category === selectedCategory;
  }) || [];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold mb-3">
            <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Semantic Contract Diffing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Compare Legal Documents & Versions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Detect added clauses, modified notice periods, altered compensation, shifted liability caps, and changed covenants.
          </p>
        </div>

        {/* DOCUMENT SELECTOR BAR */}
        <section aria-label="Comparison Selectors" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Document A */}
            <div>
              <label htmlFor="select-doc-a" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Baseline Document (Document A)
              </label>
              <select
                id="select-doc-a"
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Select baseline document...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.docType})
                  </option>
                ))}
              </select>
            </div>

            {/* Document B */}
            <div>
              <label htmlFor="select-doc-b" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Revised Document (Document B)
              </label>
              <select
                id="select-doc-b"
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Select revised document...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.docType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleRunComparison}
              disabled={isComparing || !docAId || !docBId || docAId === docBId}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              {isComparing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Material Diffs...</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4" />
                  <span>Compare Documents</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* COMPARISON RESULTS */}
        {comparisonReport && (
          <section aria-label="Comparison Results" className="space-y-6">
            {/* Executive Summary Card */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Comparison Summary
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    {comparisonReport.totalChanges} Differences Detected
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(comparisonReport.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {comparisonReport.executiveSummary}
              </p>
            </div>

            {/* CATEGORY FILTERS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="font-semibold text-slate-500 mr-2 shrink-0">Filter By:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* DIFF CARDS LIST */}
            <div className="space-y-4">
              {filteredChanges.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  No differences found in the "{selectedCategory}" category.
                </div>
              ) : (
                filteredChanges.map((change) => {
                  const isMaterial = change.severityLabel === 'Material change detected';
                  return (
                    <div 
                      key={change.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      {/* Diff Item Header */}
                      <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded ${
                              isMaterial ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {change.severityLabel}
                          </span>
                          <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {change.category}
                          </span>
                          <span className="text-xs font-medium text-slate-500 capitalize">
                            Type: {change.changeType}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          Confidence: {(change.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Side-by-Side Content */}
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
                        {/* Document A clause */}
                        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Document A (Baseline)
                          </span>
                          <p className="text-xs font-serif text-slate-800 italic leading-relaxed">
                            {change.originalText || '(Clause not present in Document A)'}
                          </p>
                        </div>

                        {/* Document B clause */}
                        <div className="p-4 bg-blue-50/40 rounded-lg border border-blue-200 space-y-1">
                          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                            Document B (Revised)
                          </span>
                          <p className="text-xs font-serif text-slate-900 italic leading-relaxed">
                            {change.revisedText || '(Clause removed in Document B)'}
                          </p>
                        </div>
                      </div>

                      {/* Explanation Footer */}
                      <div className="px-6 py-3 bg-white border-t border-slate-100 text-xs text-slate-700">
                        <strong className="text-slate-900">Why this matters: </strong>
                        <span>{change.explanation}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function ComparePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading comparison...</div>}>
      <CompareContent />
    </React.Suspense>
  );
}
