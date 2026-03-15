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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security Operations Center</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time fraud detection and event triage</p>
        </div>
        <button 
          onClick={fetchCases} 
          className="flex items-center text-sm font-medium px-4 py-2 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 text-slate-700 transition"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <span className="text-sm font-medium text-slate-500">{m.label}</span>
            <span className={`text-3xl font-bold mt-2 ${m.color}`}>{m.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Table Area */}
        <div className="col-span-2 flex flex-col space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-800">Recent Investigations</h2>
            </div>
            <div className="overflow-x-auto">
              {cases.length === 0 && !loading ? (
                <div className="p-8 text-center text-slate-500">No cases found. Run a simulation to populate data.</div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Event Type</th>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Risk</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Action Taken</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr key={c.caseId} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-medium flex items-center space-x-3">
                          {getEventIcon(c.eventType)}
                          <span className="capitalize">{c.eventType.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-6 py-4">{getRiskBadge(c.classification)}</td>
                        <td className="px-6 py-4 font-mono text-slate-600">{c.riskScore}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
                            {c.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/case/${c.caseId}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            View details &rarr;
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

        {/* Demo Controller Sidebar */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
            <h2 className="font-semibold text-slate-800 flex items-center mb-1">
              <Play className="w-5 h-5 text-green-500 mr-2" />
              Scenario Simulator
            </h2>
            <p className="text-sm text-slate-500 mb-6 pb-4 border-b border-slate-100">Inject events into the planner graph to test triage rules.</p>
            
            <div className="space-y-4">
              <ScenarioButton 
                label="Safe Login" desc="Trusted IP, Office Wifi" 
                onClick={() => simulateScenario('safe_login')}
                loading={simulating === 'safe_login'}
              />
              <ScenarioButton 
                label="Malicious Login" desc="Russia VPN, Account Takeover" 
                onClick={() => simulateScenario('malicious_login')}
                loading={simulating === 'malicious_login'}
                variant="danger"
              />
              <ScenarioButton 
                label="Targeted Phishing" desc="Urgent text, Bad domain" 
                onClick={() => simulateScenario('phishing_email')}
                loading={simulating === 'phishing_email'}
                variant="warning"
              />
              <ScenarioButton 
                label="Suspicious Link" desc="bit.ly url resolving bad" 
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

function ScenarioButton({ label, desc, onClick, loading, variant = 'default' }: any) {
  const baseColors = variant === 'danger' 
    ? 'border-red-200 hover:border-red-300 hover:bg-red-50' 
    : variant === 'warning'
      ? 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'
      : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50';

  return (
    <button 
      onClick={onClick} 
      disabled={loading}
      className={`w-full text-left p-4 rounded-lg border ${baseColors} transition-all duration-200 group flex justify-between items-center`}
    >
      <div>
        <div className="font-medium text-slate-800">{label}</div>
        <div className="text-xs text-slate-500 mt-1">{desc}</div>
      </div>
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <span className="text-xl font-thin text-slate-300 group-hover:text-blue-500 transition-colors">&rarr;</span>
      )}
    </button>
  );
}
