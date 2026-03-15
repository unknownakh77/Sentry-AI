'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Fingerprint, Mail, Link as LinkIcon, FileCheck, RefreshCw, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CaseRecord } from '@sentry/shared';
import Link from 'next/link';

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/cases/recent');
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    // Auto-sync every 30 seconds for autonomous demo
    const interval = setInterval(fetchCases, 30000);
    return () => clearInterval(interval);
  }, []);

  const simulateScenario = async (scenario: string) => {
    try {
      setSimulating(scenario);
      await fetch(`http://localhost:3001/api/scenarios/${scenario}/replay`, { method: 'POST' });
      await fetchCases();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(null);
    }
  };

  const highRiskCount = cases.filter(c => c.classification === 'HIGH').length;
  const metrics = [
    { label: 'Total Events', value: cases.length, color: 'text-slate-900' },
    { label: 'High Risk', value: highRiskCount, color: 'text-red-600' },
    { label: 'Auto-Contained', value: cases.filter(c => c.actionStatus === 'executed' && c.action !== 'allow').length, color: 'text-blue-600' },
    { label: 'Safe Allowed', value: cases.filter(c => c.action === 'allow').length, color: 'text-green-600' },
  ];

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
      case 'HIGH': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">HIGH</span>;
      case 'MEDIUM': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'LOW': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">LOW</span>;
      default: return null;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-[0.3em] mb-2">
            <div className="w-8 h-1 bg-blue-600 rounded-full" />
            <span>Mission Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">SOC Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time fraud surveillance and autonomous triage hub</p>
        </div>
        <div className="flex items-center space-x-3">
           <Link href="/investigations" className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest mr-4">
             Archive &rarr;
           </Link>
          <button 
            onClick={fetchCases} 
            className="flex items-center text-sm font-bold px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-700 transition-all hover:border-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            Sync Hub
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-blue-600 transition-colors" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
            <span className={`text-4xl font-black mt-3 tracking-tighter ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Table Area */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-black text-slate-900 uppercase tracking-widest text-xs">Priority Investigations</h2>
              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded uppercase">TOP 5 ACTIVE</span>
            </div>
            <div className="overflow-x-auto">
              {cases.length === 0 && !loading ? (
                <div className="p-16 text-center text-slate-400 font-medium">No active investigations. Run a scenario to begin triage.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-slate-100 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
                    <tr>
                      <th className="px-8 py-4">Security Event</th>
                      <th className="px-8 py-4">Triage Time</th>
                      <th className="px-8 py-4 text-center">Risk Level</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {cases.map((c) => (
                      <tr 
                        key={c.caseId} 
                        onClick={() => window.location.href = `/case/${c.caseId}`}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-white transition-colors border border-transparent group-hover:border-blue-100">
                              {getEventIcon(c.eventType)}
                            </div>
                            <div>
                               <div className="font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors capitalize">{c.eventType.replace('_', ' ')}</div>
                               <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">ID: {c.caseId.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-slate-500 font-semibold text-xs whitespace-nowrap">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex flex-col items-center">
                            {getRiskBadge(c.classification)}
                            <span className="text-[9px] font-mono font-black text-slate-300 mt-1">SCORE {c.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            <span className="inline-flex items-center text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                              {c.action.replace('_', ' ')}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Demo Controller Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Play className="w-20 h-20 text-blue-500" />
            </div>
            <h2 className="font-black text-blue-400 uppercase tracking-[0.2em] text-xs mb-2">
              Scenario Simulator
            </h2>
            <p className="text-xs text-slate-500 mb-8 font-medium">Inject synthetic high-fidelity audit events</p>
            
            <div className="space-y-4 relative z-10">
              <ScenarioButton 
                label="Safe Login" desc="Standard office session" 
                onClick={() => simulateScenario('safe_login')}
                loading={simulating === 'safe_login'}
              />
              <ScenarioButton 
                label="Malicious Login" desc="VPN based ATO attempt" 
                onClick={() => simulateScenario('malicious_login')}
                loading={simulating === 'malicious_login'}
                variant="danger"
              />
              <ScenarioButton 
                label="Targeted Phishing" desc="Email auth failure" 
                onClick={() => simulateScenario('phishing_email')}
                loading={simulating === 'phishing_email'}
                variant="warning"
              />
              <ScenarioButton 
                label="Suspicious Link" desc="Redirect to bad domain" 
                onClick={() => simulateScenario('url_click')}
                loading={simulating === 'url_click'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: any) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ScenarioButton({ label, desc, onClick, loading, variant = 'default' }: any) {
  const baseColors = variant === 'danger' 
    ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-red-400' 
    : variant === 'warning'
      ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 text-amber-400'
      : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 text-blue-400';

  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      className={`w-full text-left p-4 rounded-2xl border ${baseColors} transition-all duration-300 group flex justify-between items-center shadow-lg shadow-black/10`}
    >
      <div>
        <div className="font-black text-xs uppercase tracking-widest">{label}</div>
        <div className="text-[10px] opacity-60 mt-1 font-bold">{desc}</div>
      </div>
      {loading ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        <Play className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      )}
    </button>
  );
}
