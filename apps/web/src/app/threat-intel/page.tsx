'use client';

import { useState } from 'react';
import { Search, Globe, Shield, Activity, Database, AlertCircle, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { ThreatIntelResult } from '@sentry/shared';
import { apiFetch } from '@/lib/api';

export default function ThreatIntelPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'ip' | 'url' | 'file_hash'>('ip');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatIntelResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const isValidIpv4 = (value: string) => {
    const parts = value.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      if (!/^\d+$/.test(part)) return false;
      const num = Number(part);
      return num >= 0 && num <= 255;
    });
  };

  const isValidFileHash = (value: string) => /^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(value.trim());

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (type === 'ip') {
      if (!isValidIpv4(query)) {
        setErrorMessage('Please enter a valid IP address.');
        return;
      }
    }

    if (type === 'url') {
      try {
        const parsed = new URL(query.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setErrorMessage('Please enter a valid URL.');
          return;
        }
      } catch {
        setErrorMessage('Please enter a valid URL.');
        return;
      }
    }

    if (type === 'file_hash') {
      if (!isValidFileHash(query)) {
        setErrorMessage('Please enter a valid file hash.');
        return;
      }
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ result: ThreatIntelResult }>('/api/cases/threat-intel/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type }),
      });
      setResult(data.result);
    } catch (err) {
      console.error(err);
      setErrorMessage('Lookup failed. Please verify the indicator format and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="ui-title text-3xl">Threat Intelligence Center</h1>
        <p className="ui-subtitle mt-1">Cross-provider reputation search and infrastructure analysis</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Search Controller */}
        <div className="col-span-12 lg:col-span-4">
          <div className="ui-card-elevated p-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <h2 className="font-bold text-slate-800 mb-6 flex items-center">
              <Search className="w-5 h-5 mr-2 text-blue-600" />
              Indicator Search
            </h2>
            
            <form onSubmit={handleLookup} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indicator Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['ip', 'url', 'file_hash'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t as typeof type)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        type === t 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Indicator Value</label>
                <input 
                  type="text"
                  placeholder={type === 'ip' ? 'e.g. 1.1.1.1' : type === 'url' ? 'e.g. https://example.com' : 'Enter hash...'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="ui-input px-4"
                />
              </div>

              {errorMessage && (
                <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {errorMessage}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading || !query}
                className="ui-btn-primary w-full py-3 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search Intelligence'}
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-2xl p-5 border" style={{ background: 'rgba(68,136,245,0.07)', borderColor: 'rgba(68,136,245,0.2)' }}>
            <div className="flex items-start space-x-3">
              <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#4488f5' }} />
              <div className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-2)' }}>
                Sentry aggregates data from VirusTotal, IPInfo, and internal honeypots to provide confidence intervals on infrastructure reputation.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results View */}
        <div className="col-span-12 lg:col-span-8">
          {result ? (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className={`p-8 rounded-3xl border-2 shadow-sm flex items-center justify-between ${
                result.severity === 'MALICIOUS' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
              }`}>
                <div className="flex items-center space-x-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                    result.severity === 'MALICIOUS' ? 'bg-red-600 shadow-red-500/20' : 'bg-green-600 shadow-green-500/20'
                  }`}>
                    {result.severity === 'MALICIOUS' ? <AlertCircle className="w-8 h-8 text-white" /> : <CheckCircle2 className="w-8 h-8 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                      {result.severity} INDICATOR
                    </h3>
                    <p className="text-slate-500 font-medium">Reputation: {result.reputation} &bull; {result.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Last Updated</div>
                  <div className="font-mono text-sm font-bold text-slate-700">JUST NOW</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="ui-card p-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 flex items-center">
                    <Globe className="w-3 h-3 mr-1.5" /> Geographic Context
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Location</span>
                      <span className="font-bold text-slate-800">{result.details.geo || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">ASN / Provider</span>
                      <span className="font-bold text-slate-800">{result.details.asn || 'Digital Ocean, LLC'}</span>
                    </div>
                  </div>
                </div>
                <div className="ui-card p-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 flex items-center">
                    <Shield className="w-3 h-3 mr-1.5" /> Security Attributes
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">VPN / Proxy</span>
                      <span className={`font-bold ${result.details.vpn ? 'text-red-600' : 'text-green-600'}`}>{result.details.vpn ? 'DETECTED' : 'NOT DETECTED'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Tor Exit Node</span>
                      <span className="font-bold text-slate-800">{result.details.tor ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Malicious Detections</span>
                      <span className={`font-bold ${(result.details.maliciousDetections || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {result.details.maliciousDetections || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Suspicious Detections</span>
                      <span className="font-bold text-amber-600">{result.details.suspiciousDetections || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                  <Activity className="w-12 h-12" />
                </div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Analyst Summary</h4>
                <p className="text-sm leading-relaxed text-slate-200 font-medium italic">
                  &ldquo;{result.summary}&rdquo;
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-12 text-center opacity-60">
              <Database className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">Ready for Intelligence Lookup</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">Enter an indicator on the left to pull cross-vetted security information from the Sentry network.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
