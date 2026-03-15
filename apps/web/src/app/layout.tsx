import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Shield, LayoutDashboard, Search, Settings, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Sentry AI Platform',
  description: 'AI-powered security triage and fraud-prevention agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
        
        {/* Deep Blue Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0">
          <div>
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
              <Shield className="w-8 h-8 text-blue-500 mr-3" />
              <span className="text-xl font-bold tracking-tight">Sentry AI</span>
            </div>
            <nav className="p-4 space-y-1">
              <Link href="/" className="flex items-center px-3 py-2 text-sm font-medium bg-slate-800 text-white rounded-md">
                <LayoutDashboard className="w-5 h-5 mr-3 text-slate-400" />
                Dashboard
              </Link>
              <Link href="#" className="flex items-center px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-colors">
                <Search className="w-5 h-5 mr-3 text-slate-400" />
                Investigations
              </Link>
              <Link href="#" className="flex items-center px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-colors">
                <AlertTriangle className="w-5 h-5 mr-3 text-slate-400" />
                Threat Intel
              </Link>
            </nav>
          </div>
          <div className="p-4 border-t border-slate-800">
            <Link href="#" className="flex items-center px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-colors">
              <Settings className="w-5 h-5 mr-3 text-slate-400" />
              Settings
            </Link>
            <div className="mt-4 px-3 flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold mr-3">
                JD
              </div>
              <div className="text-sm">
                <p className="font-medium text-white">SOC Analyst</p>
                <p className="text-xs text-slate-400">Online</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
