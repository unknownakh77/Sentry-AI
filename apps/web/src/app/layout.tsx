'use client';

import './globals.css';
import { useEffect, useState } from 'react';
import { LayoutDashboard, History, Search, FileCheck, ChevronLeft, ChevronRight } from 'lucide-react';
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

  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden font-sans antialiased" style={{background:'#020c1b',color:'#e2f0ff'}}>
        {/* Sidebar */}
        <aside
          className={`flex flex-col z-20 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            sidebarCollapsed ? 'w-[72px]' : 'w-64'
          }`}
          style={{background:'#040e1f', borderRight:'1px solid rgba(0,194,255,0.08)'}}
        >
          {/* Logo */}
          <div className={`flex items-center border-b relative transition-all duration-300 ${sidebarCollapsed ? 'px-3 py-4 justify-center' : 'px-5 py-4'}`}
            style={{borderColor:'rgba(0,194,255,0.08)'}}>
            <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100'}`}>
              <SentryLogo />
            </div>
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className={`${sidebarCollapsed ? 'relative' : 'absolute right-3'} h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-300`}
              style={{border:'1px solid rgba(0,194,255,0.15)', background:'rgba(0,194,255,0.05)', color:'rgba(0,194,255,0.6)'}}
              aria-label={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Live status badge */}
          {!sidebarCollapsed && (
            <div className="mx-4 mt-4 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:'rgba(0,229,160,0.06)', border:'1px solid rgba(0,229,160,0.15)'}}>
              <span className="live-dot" />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#00e5a0'}}>System Online</span>
            </div>
          )}

          <nav className={`flex-1 mt-3 ${sidebarCollapsed ? 'px-2 flex flex-col items-center gap-1.5' : 'px-3 space-y-1'}`}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center rounded-xl transition-all duration-200 group ${
                    sidebarCollapsed ? 'justify-center h-11 w-11' : 'space-x-3 px-4 py-2.5'
                  }`}
                  style={isActive
                    ? {background:'rgba(0,194,255,0.12)', border:'1px solid rgba(0,194,255,0.25)', color:'#00c2ff'}
                    : {border:'1px solid transparent', color:'rgba(120,160,200,0.7)'}
                  }
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,194,255,0.05)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'}`}>
                    {item.label}
                  </span>
                  {isActive && !sidebarCollapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:'#00c2ff', boxShadow:'0 0 6px #00c2ff'}} />}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-3 mt-2" style={{borderTop:'1px solid rgba(0,194,255,0.08)'}}>
            <div className={`rounded-xl transition-all duration-300 ${sidebarCollapsed ? 'flex justify-center py-2' : 'flex items-center gap-3 px-3 py-2.5'}`}
              style={{background:'rgba(0,194,255,0.04)', border:'1px solid rgba(0,194,255,0.08)'}}>
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs"
                style={{background:'linear-gradient(135deg,#0080d0,#00c2ff)', color:'#020c1b'}}>A1</div>
              <div className={`overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'}`}>
                <div className="text-[11px] font-black" style={{color:'#e2f0ff'}}>ANALYST_01</div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{color:'rgba(0,194,255,0.5)'}}>Tier 1 Responder</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative" style={{background:'#020c1b'}}>
           <div key={pathname} className="relative z-10 page-transition">
             {children}
           </div>
        </main>
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
        <div className="text-white font-extrabold text-[28px] leading-none tracking-tight whitespace-nowrap">Sentry</div>
      </div>
    </div>
  );
}
