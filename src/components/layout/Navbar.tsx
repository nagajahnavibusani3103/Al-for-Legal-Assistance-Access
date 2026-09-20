'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scale, FileText, GitCompare, ShieldCheck, Settings, UploadCloud, Sparkles, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenUploadModal?: () => void;
}

export function Navbar({ onOpenUploadModal }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: FileText },
    { href: '/compare', label: 'Compare', icon: GitCompare },
    { href: '/privacy', label: 'Privacy & Data', icon: ShieldCheck },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link 
              href="/" 
              className="flex items-center gap-2.5 text-slate-900 font-semibold text-lg tracking-tight hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md p-1"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
                <Scale className="w-5 h-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="leading-none text-slate-950 font-bold">LexiLens</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-normal mt-0.5">AI Legal Companion</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {onOpenUploadModal && (
              <button
                onClick={onOpenUploadModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <UploadCloud className="w-4 h-4" aria-hidden="true" />
                <span>Upload Document</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-base font-medium rounded-md ${
                  isActive ? 'bg-slate-100 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 text-slate-500" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          {onOpenUploadModal && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenUploadModal();
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
