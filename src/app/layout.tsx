import type { Metadata } from 'next';
import './globals.css';
import { DisclaimerBanner } from '@/components/layout/DisclaimerBanner';

export const metadata: Metadata = {
  title: 'LexiLens — AI Legal Document Companion',
  description: 'Understand the fine print. Know what to ask next. AI-powered document analysis, comparison, and consultation preparation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased text-slate-900 bg-slate-50">
        {/* Skip to main content for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 font-medium"
        >
          Skip to main content
        </a>

        {/* Persistent Legal Disclaimer */}
        <DisclaimerBanner />

        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Global Live Region for Screen-Reader Announcements */}
        <div id="sr-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      </body>
    </html>
  );
}
