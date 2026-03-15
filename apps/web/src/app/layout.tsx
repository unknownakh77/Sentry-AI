'use client';

import './globals.css';
import { useEffect, useState } from 'react';
import { LayoutDashboard, History, Search, FileCheck, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const SIDEBAR_PREF_KEY = 'sentry_ui_sidebar_collapsed';
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Investigations', icon: History, href: '/investigations' },
    { label: 'Closed Cases', icon: FileCheck, href: '/closed-cases' },
    { label: 'Threat Intel', icon: Search, href: '/threat-intel' },
  ];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_PREF_KEY);
      if (stored === 'true') setSidebarCollapsed(true);
    } catch {
      // Ignore storage access issues and keep default UI state.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PREF_KEY, String(sidebarCollapsed));
    } catch {
      // Ignore storage write issues.
    }
  }, [sidebarCollapsed]);

  const isLanding = pathname === '/landing' || pathname === '/core-functionalities';

  return (
    <html lang="en">
      <body className={`font-sans antialiased ${isLanding ? 'min-h-screen' : 'flex h-screen overflow-hidden'}`}>
        {/* Sidebar — hidden on landing page */}
        {!isLanding && <aside
          className={`bg-[#0a1221] text-slate-400 flex flex-col border-r border-slate-800/70 shadow-2xl z-20 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className={`px-4 border-b border-slate-800/60 transition-[padding] duration-400 ${sidebarCollapsed ? 'py-3' : 'py-5'}`}>
            <div className="relative flex items-center">
              <div
                className={`pr-10 overflow-hidden transition-all duration-300 ${
                  sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[220px] opacity-100'
                }`}
              >
                <SentryLogo />
              </div>
              <button
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="absolute right-0 h-8 w-8 rounded-lg border border-slate-700/70 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-300"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4 mx-auto" /> : <ChevronLeft className="w-4 h-4 mx-auto" />}
              </button>
            </div>
          </div>

          <nav
            className={`flex-1 ${
              sidebarCollapsed
                ? 'px-2.5 py-4 flex flex-col items-center justify-center gap-2.5'
                : 'px-4 py-5 space-y-1.5'
            }`}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-xl transition-all duration-300 group ${
                    sidebarCollapsed
                      ? 'justify-center h-12 w-12'
                      : 'space-x-3 px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25 font-bold'
                      : 'hover:bg-slate-800/70 hover:text-slate-200 text-slate-400 font-medium'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-200'}`} />
                  <span
                    className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${
                      sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className={`p-4 border-t border-slate-800/70 ${sidebarCollapsed ? 'px-2.5 pt-3' : 'px-4'} space-y-2`}>
            {/* Back to landing */}
            <Link
              href="/landing"
              className={`flex items-center rounded-xl transition-all duration-300 group text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 ${
                sidebarCollapsed ? 'justify-center h-10 w-10 mx-auto' : 'space-x-3 px-4 py-2.5'
              }`}
              title="Home"
            >
              <Home className="w-[16px] h-[16px] shrink-0 group-hover:text-slate-200" />
              <span
                className={`text-xs font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${
                  sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                }`}
              >
                Home
              </span>
            </Link>

            <div
              className={`bg-slate-800/45 rounded-xl border border-slate-700/50 transition-all duration-300 ${
                sidebarCollapsed ? 'h-12 w-12 mx-auto flex items-center justify-center' : 'p-4 flex items-center space-x-3'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 shrink-0" />
              <div
                className={`flex-1 overflow-hidden transition-all duration-300 ${
                  sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                }`}
              >
                <div className="text-[10px] font-black text-white truncate">ANALYST_01</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">TIER 1 RESPONDER</div>
              </div>
            </div>
          </div>
        </aside>}

        {/* Main Content */}
        {isLanding ? (
          <>{children}</>
        ) : (
          <main className="flex-1 overflow-y-auto scroll-smooth relative">
            <div className="absolute top-0 left-0 w-full h-[300px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(68,136,245,0.05), transparent)' }} />
            <div key={pathname} className="relative z-10 page-transition">
              {children}
            </div>
          </main>
        )}
      </body>
    </html>
  );
}

function SentryLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 128 128" className="h-10 w-10 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="shieldBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3ba2ff" />
            <stop offset="100%" stopColor="#1673de" />
          </linearGradient>
        </defs>
        <path d="M64 8L22 18v38c0 29 16 52 42 64 26-12 42-35 42-64V18L64 8z" fill="#040227" />
        <path d="M64 8v112c26-12 42-35 42-64V18L64 8z" fill="url(#shieldBlue)" />
        <path d="M64 21v86" stroke="#06062a" strokeWidth="6" />
        <ellipse cx="64" cy="64" rx="30" ry="16" fill="none" stroke="#20a0ff" strokeWidth="5" />
        <circle cx="64" cy="64" r="8" fill="#0b3d9d" />
        <circle cx="64" cy="64" r="3.2" fill="#27b2ff" />
        <circle cx="70" cy="58" r="2.8" fill="#ecfbff" />
        <path d="M43 45c7-8 35-8 42 0" fill="none" stroke="#1f95ff" strokeWidth="4" />
        <path d="M43 83c7 8 35 8 42 0" fill="none" stroke="#1f95ff" strokeWidth="4" />
      </svg>
      <div className="overflow-hidden">
        <div className="text-white font-extrabold text-[28px] leading-none tracking-tight whitespace-nowrap">Sentry <span style={{ color: '#4488f5' }}>AI</span></div>
      </div>
    </div>
  );
}
