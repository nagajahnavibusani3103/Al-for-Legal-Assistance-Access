'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { 
  FileText, 
  GitCompare, 
  HelpCircle, 
  CheckSquare, 
  Briefcase, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Scale, 
  Search, 
  Lock,
  Loader2
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleLoadDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold mb-6 shadow-sm">
              <Scale className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span>Grounded Legal Document Companion</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-950 tracking-tight max-w-4xl mx-auto leading-[1.15]">
              Understand the fine print.{' '}
              <span className="text-blue-700 block sm:inline">Know what to ask next.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              AI-powered document analysis that helps you understand complex legal language, compare versions, identify attention areas, and prepare actionable questions for a legal professional.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span>Analyze a Document</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <button
                onClick={handleLoadDemo}
                disabled={isSeeding}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold rounded-lg text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 active:bg-slate-200 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading Demo Contracts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Explore Demo Contracts</span>
                  </>
                )}
              </button>
            </div>

            {/* Trust disclaimer badge below CTAs */}
            <p className="mt-4 text-xs text-slate-500 max-w-md mx-auto">
              Evidence-linked citations • Zero hallucination fallback • Private & isolated processing
            </p>

            {/* INTERACTIVE PREVIEW CARD */}
            <div className="mt-14 max-w-4xl mx-auto text-left bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400">LexiLens Grounded Evidence View</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DIRECTLY STATED (100% Citation Match)</span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                {/* Left: Original Contract Clause */}
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>SOURCE CLAUSE (Page 2, Section 3.1)</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">Original Text</span>
                  </div>
                  <blockquote className="text-sm font-serif text-slate-800 italic leading-relaxed">
                    "Either party may terminate this employment relationship at any time, with or without cause, upon providing fourteen (14) days advance written notice to the other party."
                  </blockquote>
                </div>

                {/* Right: LexiLens Plain Language & Analysis */}
                <div className="p-4 bg-blue-50/60 rounded-lg border border-blue-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        PLAIN EXPLANATION
                      </span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium text-[11px]">
                        Short Notice Window
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      This clause allows the company to end the employment on short notice of only 14 days without proving any misconduct.
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span>Question for Lawyer: "Is a 30-day notice period standard for this title?"</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FIVE CORE PILLARS */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 mb-2">
                Engineered for Clarity & Trust
              </h2>
              <p className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">
                Five tools to understand, compare, and act with confidence
              </p>
              <p className="mt-4 text-base text-slate-600">
                LexiLens connects every AI finding to exact document citations, eliminating guesswork and hallucinations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">1. Plain-Language Explanation</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Translates dense legalese into clear terms: what each clause means, who is affected, what action is required, and what to clarify.
                </p>
                <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <span>Traceable back to page & section</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                  <GitCompare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">2. Contract Version Diffing</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Compare two agreements side-by-side. Spot modified notice periods, added non-compete clauses, shifted liabilities, and altered payment schedules.
                </p>
                <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                  <span>Materiality-scored differences</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">3. Grounded Q&A Assistant</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Ask specific questions and receive evidence-grounded answers. If an answer isn't in the document, LexiLens explicitly tells you it is absent.
                </p>
                <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <span>Anti-hallucination verification</span>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">4. Attention Areas & Traps</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Surfaces automatic renewal traps, unlimited liability language, broad indemnity, short cancellation windows, and mandatory arbitration.
                </p>
                <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <span>Framed objectively, never advice</span>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">5. Obligation & Action Tracker</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Extracts every requirement into a structured table with party, deadline, frequency, condition, and consequence. Check off tasks interactively.
                </p>
                <div className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                  <span>Export to TXT, Markdown, or Print</span>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">6. Lawyer Consultation Prep</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Generates 5–10 high-value questions for legal counsel, key facts you need to gather, ambiguous provisions, and key dates to calendar.
                </p>
                <div className="text-xs font-semibold text-teal-700 flex items-center gap-1">
                  <span>Maximize attorney consultation value</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY & ETHICAL AI PROMISES */}
        <section className="py-16 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Built with Rigorous Legal AI Ethics
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-300">
                Designed to empower non-lawyers while maintaining strict compliance boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="text-blue-400 font-semibold text-sm mb-1">Strict Prompt Isolation</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Uploaded documents are treated as untrusted data. Malicious injection instructions inside contracts cannot alter system boundaries or leak prompts.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="text-emerald-400 font-semibold text-sm mb-1">No Hallucinated Citations</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Citations are verified against real page numbers and text chunks. When evidence is missing, the system explicitly reports that the topic is not found.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="text-amber-400 font-semibold text-sm mb-1">Clear Scope Boundaries</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Never declares contracts "definitely illegal" or claims "you will win." LexiLens presents factual document findings and prepares you for counsel.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
