import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck, Database, Trash2, EyeOff, Lock, AlertCircle } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Data Transparency & Privacy Model</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Privacy & Data Practices
          </h1>
          <p className="text-base text-slate-600 mt-2 leading-relaxed">
            Legal documents are sensitive. This page explains exactly what data LexiLens stores, why it is processed, how it is secured, and how you retain full control.
          </p>
        </div>

        {/* Honest Architecture Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-amber-950">Transparent Security Standard:</strong>
            <p className="leading-relaxed">
              We do not make misleading claims such as "100% unhackable" or "zero data ever touched." 
              LexiLens stores document text in your designated SQL database to power chunking, comparison, and retrieval. 
              Do not upload confidential state secrets or documents you are legally prohibited from possessing.
            </p>
          </div>
        </div>

        {/* Key Areas Grid */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Database className="w-5 h-5 text-blue-600" />
              <h2>1. What Data Is Stored & Why</h2>
            </div>
            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <li>
                <strong>Document Files & Text:</strong> Uploaded PDF, DOCX, and TXT files are normalized into text chunks and stored in the local SQL database to allow you to inspect pages, search clauses, and view side-by-side diffs.
              </li>
              <li>
                <strong>Embeddings & Vectors:</strong> Text chunks are indexed with 64-dimensional semantic vectors to enable instant, citation-grounded RAG search without having to re-read the entire document on every query.
              </li>
              <li>
                <strong>Audit Events:</strong> We log basic administrative timestamps (e.g. document uploaded, compared, deleted) for accountability, with all sensitive text bodies redacted from system logs.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <EyeOff className="w-5 h-5 text-emerald-600" />
              <h2>2. How AI Processing Is Used</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              LexiLens uses a dual-engine architecture:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <li>
                <strong>Offline Deterministic Engine:</strong> By default, analysis and grounded RAG run locally via our deterministic reasoning algorithms. No text leaves your machine or private server.
              </li>
              <li>
                <strong>Google Gemini Cloud API (Optional):</strong> If you configure a <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code>, specific query prompts and isolated document excerpts are transmitted securely via TLS to Google Gemini for enhanced language synthesis. Google Cloud terms state API inputs are not used to train public models.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <h2>3. How to Delete Your Documents</h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              You maintain complete ownership. Clicking the <strong>Delete</strong> icon on any document on your dashboard immediately triggers a cascading database deletion:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <li>Removes the document record and version history</li>
              <li>Purges all extracted page texts and chunk records</li>
              <li>Deletes all associated vector embeddings and cached analysis results</li>
              <li>Deletes chat conversations and citations</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Lock className="w-5 h-5 text-slate-800" />
              <h2>4. Security Safeguards</h2>
            </div>
            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-2 leading-relaxed">
              <li>
                <strong>Prompt Injection Defense:</strong> Document content is strictly quarantined inside security boundaries. Contracts containing malicious instructions cannot alter system rules or leak application secrets.
              </li>
              <li>
                <strong>Magic Bytes File Verification:</strong> Files are validated for magic byte signatures to block malicious disguised executables or dangerous scripts.
              </li>
              <li>
                <strong>Row-Level Ownership Validation:</strong> All endpoints enforce server-side user ownership checks so users cannot read or delete another user's documents.
              </li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
