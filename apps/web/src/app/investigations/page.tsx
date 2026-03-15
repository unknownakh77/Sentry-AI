'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, Fingerprint, Mail, Link as LinkIcon, FileCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CaseRecord } from '@sentry/shared';
import Link from 'next/link';

export default function InvestigationsPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/cases');
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases);
      }
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = cases.filter(c => 
    c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.classification.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.eventType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return <Fingerprint className="w-5 h-5 text-blue-500" />;
      case 'phishing_email': return <Mail className="w-5 h-5 text-purple-500" />;
      case 'url_click': return <LinkIcon className="w-5 h-5 text-amber-500" />;
      case 'file_hash': return <FileCheck className="w-5 h-5 text-slate-500" />;
      default: return <ShieldAlert className="w-5 h-5 text-slate-500" />;
    }
  };

  const getRiskBadge = (classification: string) => {
    switch (classification) {
      case 'HIGH': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100/50 text-red-700 border border-red-200">HIGH</span>;
      case 'MEDIUM': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/50 text-amber-700 border border-amber-200">MEDIUM</span>;
      case 'LOW': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100/50 text-green-700 border border-green-200">LOW</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Investigation Archive</h1>
          <p className="text-slate-500 mt-1">Full historical audit of all security triage events</p>
        </div>
        <button 
          onClick={fetchCases} 
          className="flex items-center text-sm font-medium px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          Sync All Records
        </button>
      </div>

      {/* Filters Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by Case ID, Classification, or Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
        <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center hover:bg-slate-50">
          <Filter className="w-4 h-4 mr-2" /> Filter
        </button>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredCases.length === 0 && !loading ? (
            <div className="p-12 text-center text-slate-500 font-medium">No investigation records found matching your criteria.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-8 py-4">Investigation & Subject</th>
                  <th className="px-6 py-4">Triage Time</th>
                  <th className="px-6 py-4">Risk Context</th>
                  <th className="px-6 py-4">Response Execution</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCases.map((c) => (
                  <tr key={c.caseId} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-white transition-colors">
                          {getEventIcon(c.eventType)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 font-mono text-xs mb-0.5">{c.caseId.split('-')[0]}...{c.caseId.split('-')[4]}</div>
                          <div className="text-xs text-slate-500 capitalize">{c.eventType.replace('_', ' ')} Event</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-600 font-medium">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(c.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col space-y-2">
                        {getRiskBadge(c.classification)}
                        <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">SCORE: {c.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col space-y-1">
                        <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit">
                          {c.action.replace('_', ' ')}
                        </span>
                        <div className="flex items-center text-[10px] text-slate-400">
                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.actionStatus === 'executed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          {c.actionStatus.replace('_', ' ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link 
                        href={`/case/${c.caseId}`} 
                        className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
