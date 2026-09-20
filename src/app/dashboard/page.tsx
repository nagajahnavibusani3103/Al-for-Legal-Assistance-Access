'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { UploadModal } from '@/components/document/UploadModal';
import { DocumentRecord } from '@/types';
import { 
  FileText, 
  UploadCloud, 
  GitCompare, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Scale
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await fetch('/api/demo/seed', { method: 'POST' });
      await fetchDocuments();
    } catch (err) {
      console.error('Seed demo error:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(docs => docs.filter(d => d.id !== id));
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar onOpenUploadModal={() => setUploadModalOpen(true)} />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Legal Document Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Select an uploaded document to review plain-language explanations, spot attention areas, or prepare for counsel.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading Demo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Load Demo Contracts</span>
                </>
              )}
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* QUICK ACTIONS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Upload Contract</div>
            <div className="text-xs text-slate-500 mt-0.5">PDF, DOCX, or TXT</div>
          </button>

          <Link
            href="/compare"
            className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <GitCompare className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Compare Versions</div>
            <div className="text-xs text-slate-500 mt-0.5">Side-by-side contract diff</div>
          </Link>

          <Link
            href={documents[0] ? `/documents/${documents[0].id}?tab=ask` : '#'}
            onClick={(e) => {
              if (!documents[0]) {
                e.preventDefault();
                setUploadModalOpen(true);
              }
            }}
            className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-emerald-300 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Ask Grounded Q&A</div>
            <div className="text-xs text-slate-500 mt-0.5">Instant citation-backed answers</div>
          </Link>

          <Link
            href={documents[0] ? `/documents/${documents[0].id}?tab=lawyer-prep` : '#'}
            onClick={(e) => {
              if (!documents[0]) {
                e.preventDefault();
                setUploadModalOpen(true);
              }
            }}
            className="p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-teal-300 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Scale className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900">Prepare for Lawyer</div>
            <div className="text-xs text-slate-500 mt-0.5">Consultation strategy brief</div>
          </Link>
        </div>

        {/* DOCUMENT LIST SECTION */}
        <section aria-label="Your Documents" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Your Documents ({documents.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Stored in secure SQL database
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No documents uploaded yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-6 text-center leading-relaxed">
                Upload a contract to view plain explanations and obligations, or click below to load pre-packaged synthetic test contracts.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Upload Your First Document
                </button>
                <button
                  onClick={handleSeedDemo}
                  disabled={seeding}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Load Demo Contracts
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {documents.map((doc) => {
                const isConfirmingDelete = deleteConfirmId === doc.id;
                return (
                  <div 
                    key={doc.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <Link 
                          href={`/documents/${doc.id}`}
                          className="text-sm font-bold text-slate-900 hover:text-blue-600 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                        >
                          <span>{doc.title}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                            {doc.docType.replace(/_/g, ' ')}
                          </span>
                          <span>•</span>
                          <span>{doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}</span>
                          <span>•</span>
                          <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1"
                      >
                        <span>Open Analysis</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${doc.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Upload Modal */}
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        onSuccess={() => {
          fetchDocuments();
          setUploadModalOpen(false);
        }}
      />
    </div>
  );
}
