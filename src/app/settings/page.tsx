'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { 
  Settings as SettingsIcon, 
  Key, 
  Cpu, 
  Database, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [docCount, setDocCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Load local settings
    const storedKey = localStorage.getItem('lexilens_gemini_key') || '';
    const storedModel = localStorage.getItem('lexilens_gemini_model') || 'gemini-2.0-flash';
    setApiKey(storedKey);
    setModel(storedModel);

    // Fetch document stats
    fetch('/api/documents')
      .then(r => r.json())
      .then(d => d.success && setDocCount(d.documents.length))
      .catch(() => {});
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('lexilens_gemini_key', apiKey.trim());
    localStorage.setItem('lexilens_gemini_model', model);
    setStatusMessage('Settings saved locally. Future analyses will use this configuration.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setStatusMessage('Please enter an API key to test.');
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey.trim()}`);
      if (res.ok) {
        setStatusMessage('Connection successful! Google Gemini is active and ready.');
      } else {
        const err = await res.json();
        setStatusMessage(`Connection failed: ${err.error?.message || 'Invalid API key'}`);
      }
    } catch (e: any) {
      setStatusMessage(`Network error: ${e.message}`);
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
      setTimeout(() => setStatusMessage(null), 3000);
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
            <span>Configuration & Engines</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            Application Settings
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure AI provider credentials, review local SQL database metrics, or reload synthetic test contracts.
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
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h2>AI Engine & Gemini API Configuration</h2>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              LexiLens includes an integrated, zero-dependency legal reasoning engine with cosine similarity RAG. 
              To enable live multimodal Google Gemini 1.5/2.0 models, enter your Gemini API key below.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label htmlFor="gemini-key" className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="gemini-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gemini-model" className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Model
                </label>
                <select
                  id="gemini-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest, High Quality)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  Save Settings
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiKey}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Test Connection</span>
                </button>
              </div>
            </div>
          </section>

          {/* SQL Database Status */}
          <section className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Database className="w-5 h-5 text-emerald-600" />
              <h2>SQL Database & Storage Status</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Database Driver:</span>
                <span className="text-slate-900 font-bold text-sm">node:sqlite (Embedded SQL)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Stored Documents:</span>
                <span className="text-slate-900 font-bold text-sm">{docCount} Documents</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Vector Index:</span>
                <span className="text-slate-900 font-bold text-sm">Cosine TF-IDF Space</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
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
