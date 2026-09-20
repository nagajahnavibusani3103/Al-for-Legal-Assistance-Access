import React from 'react';
import { AlertCircle } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <aside 
      aria-label="Legal Disclaimer" 
      className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs py-1.5 px-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            <strong>Legal Information Notice:</strong> LexiLens provides AI-assisted document analysis for educational and preparation purposes. It does not provide legal advice or replace a qualified attorney.
          </span>
        </div>
        <span className="hidden md:inline text-slate-400 text-[11px]">
          Always verify critical terms with legal counsel
        </span>
      </div>
    </aside>
  );
}
