import React from 'react';
import Link from 'next/link';
import { Scale, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8 text-sm text-slate-500" aria-label="Footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-slate-700" aria-hidden="true" />
            <span className="font-semibold text-slate-900">LexiLens</span>
            <span className="text-slate-400">|</span>
            <span>Understand the fine print. Know what to ask next.</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <Link href="/privacy" className="hover:text-slate-900 transition-colors">
              Privacy & Data
            </Link>
            <Link href="/settings" className="hover:text-slate-900 transition-colors">
              Settings
            </Link>
            <Link href="/compare" className="hover:text-slate-900 transition-colors">
              Contract Comparison
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-6 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} LexiLens Legal Tech. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Built for transparent, grounded legal document navigation.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
