'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Scale, 
  FileText, 
  GitCompare, 
  ShieldCheck, 
  Settings, 
  UploadCloud, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  Menu, 
  X,
  Shield
} from 'lucide-react';
import { User } from '@/types';
import { AuthModal } from '@/components/auth/AuthModal';

interface NavbarProps {
  onOpenUploadModal?: () => void;
}

export function Navbar({ onOpenUploadModal }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check authenticated session
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) {
          setUser(d.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: FileText },
    { href: '/compare', label: 'Compare', icon: GitCompare },
    { href: '/privacy', label: 'Privacy & Data', icon: ShieldCheck },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
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

            {/* User Session & CTAs */}
            <div className="hidden sm:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3 pl-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 leading-tight">{user.name}</span>
                      <span className="text-[10px] text-slate-500">{user.email}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs flex items-center gap-1"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline font-medium">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}

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
          <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-md ${
                    isActive ? 'bg-slate-100 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 text-slate-500" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {user ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">{user.name}</span>
                    <span className="text-[11px] text-slate-500 block">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-800 bg-slate-100 rounded-lg"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}

              {onOpenUploadModal && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenUploadModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UploadCloud className="w-5 h-5" />
                  <span>Upload Document</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
        }}
      />
    </>
  );
}
