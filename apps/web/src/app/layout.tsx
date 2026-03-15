'use client';

import './globals.css';
import { Shield, LayoutDashboard, History, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Investigations', icon: History, href: '/investigations' },
    { label: 'Threat Intel', icon: Search, href: '/threat-intel' },
  ];

  return (
    <html lang="en">
      <body className="bg-slate-50 flex h-screen overflow-hidden font-sans">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 text-slate-400 flex flex-col border-r border-slate-800 shadow-2xl z-20">
          <div className="p-8 pb-10 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-white font-black tracking-tighter text-xl">SENTRY<span className="text-blue-500">AI</span></span>
              <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase -mt-1">SOC OS v2.0</div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                      : 'hover:bg-slate-800 hover:text-slate-200 text-slate-500 font-medium'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-slate-800 space-y-4">
            <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center space-x-3 border border-slate-700/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500" />
              <div className="flex-1 overflow-hidden">
                <div className="text-[10px] font-black text-white truncate">ANALYST_01</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">TIER 1 RESPONDER</div>
              </div>
            </div>
            <div className="px-4 py-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center border border-slate-800 rounded-xl">
              Hackathon Mode Active
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth relative">
           <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
           <div className="relative z-10">
             {children}
           </div>
        </main>
      </body>
    </html>
  );
}
