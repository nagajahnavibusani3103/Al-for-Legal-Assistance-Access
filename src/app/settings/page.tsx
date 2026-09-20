'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { 
  Settings as SettingsIcon, 
  Key, 
  Cpu, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Info,
  ShieldCheck,
  Server
} from 'lucide-react';
import { AIProviderConfig } from '@/lib/config/ai';

export default function SettingsPage() {
  const [config, setConfig] = useState<AIProviderConfig | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [docCount, setDocCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Fetch secure server-side AI configuration
    fetch('/api/settings/ai-config')
      .then(r => r.json())
      .then(d => d.success && setConfig(d.config))
      .catch(() => {});

    // Fetch document stats
    fetch('/api/documents')
      .then(r => r.json())
      .then(d => d.success && setDocCount(d.documents.length))
      .catch(() => {});
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/settings/ai-test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Connection verified! ${data.message} (${data.latencyMs}ms latency)`);
      } else {
        setStatusMessage(`Status check: ${data.message}`);
      }
    } catch (e: any) {
      setStatusMessage(`Network error during check: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('This will reload fresh synthetic test contracts into your SQL database. Continue?')) {
      return;
    }
    setIsResetting(true);
    try {
      await fetch('/api/demo/seed', { method: 'POST' });
      const r = await fetch('/api/documents');
      const d = await r.json();
      if (d.success) setDocCount(d.documents.length);
      setStatusMessage('Demo contracts successfully re-seeded!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-semibold mb-3">
            <SettingsIcon className="w-3.5 h-3.5 text-slate-700" />
            <span>Configuration & Telemetry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Application Settings
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review server-side AI provider configuration, database telemetry, and security status.
          </p>
        </div>

        {statusMessage && (
          <div 
            role="status" 
            className="p-4 rounded-xl border bg-blue-50 border-blue-200 text-xs text-blue-900 font-medium flex items-center gap-2"
          >
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* AI Provider Section */}
          <section className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h2>AI Orchestration & Provider Status</h2>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                config?.connectionStatus === 'connected' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {config?.connectionStatus === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Gemini Cloud Active</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5 text-amber-600" />
                    <span>Offline Deterministic Engine Active</span>
                  </>
                )}
              </span>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              LexiLens maintains strict credential separation: API keys are securely managed via server environment 
              variables (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">.env.local</code>) and are never exposed to 
              browser JavaScript or stored in <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">localStorage</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Active Provider</span>
                <span className="text-slate-900 font-bold text-sm block capitalize">
                  {config?.provider === 'gemini' ? 'Google Gemini AI' : 'Local Deterministic Reasoning Engine'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {config?.isConfigured ? 'Connected via GEMINI_API_KEY' : 'Zero-dependency offline TF-IDF cosine RAG'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500 font-medium block">Active Model</span>
                <span className="text-slate-900 font-bold text-sm block">
                  {config?.model || 'Loading...'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Max tokens: {config?.maxContextTokens || 2048} | Top-K: {config?.topK || 3}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero client-side secrets exposure (Security Phase 5 compliant)</span>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Verify Provider Health</span>
              </button>
            </div>
          </section>

          {/* SQL Database Status */}
          <section className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Database className="w-5 h-5 text-emerald-600" />
              <h2>SQL Database & Persistent Storage</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Database Driver:</span>
                <span className="text-slate-900 font-bold text-sm">node:sqlite (Embedded SQL)</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">WAL Mode & Foreign Keys enabled</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Stored Documents:</span>
                <span className="text-slate-900 font-bold text-sm">{docCount} Documents</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">User-isolated filesystem paths</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Vector Space:</span>
                <span className="text-slate-900 font-bold text-sm">64-Dim Cosine Space</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Hybrid TF-IDF & Lexical Index</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Reload Synthetic Test Fixtures</span>
                <span className="text-[11px] text-slate-500">
                  Re-populates Employment v1/v2, Lease, and NDA contracts in your SQL database.
                </span>
              </div>
              <button
                onClick={handleResetDemo}
                disabled={isResetting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5"
              >
                {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Reset Demo Data</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
