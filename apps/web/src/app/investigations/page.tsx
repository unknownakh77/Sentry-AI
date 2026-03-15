'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronRight } from 'lucide-react';
import { CaseRecord } from '@sentry/shared';
import Link from 'next/link';
import { EventIcon, RiskBadge, formatActionLabel, formatCaseAge, formatEventTypeLabel } from '@/components/cases/presenters';
import { apiFetch } from '@/lib/api';

export default function InvestigationsPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'time_desc' | 'time_asc' | 'risk_desc' | 'risk_asc' | 'event_type'>('time_desc');
  const [showFilters, setShowFilters] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ cases?: CaseRecord[] }>('/api/cases');
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

  const sortedFilteredCases = [...cases]
    .filter((c) =>
      c.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.classification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.eventType.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === 'time_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === 'time_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOption === 'event_type') {
        return a.eventType.localeCompare(b.eventType);
      }
      const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = rank[a.classification] - rank[b.classification];
      return sortOption === 'risk_desc' ? -diff : diff;
    });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="ui-title text-3xl">Active Investigations</h1>
          <p className="ui-subtitle mt-1">Open SOC investigations requiring active analyst workflow</p>
        </div>
        <button 
          onClick={fetchCases} 
          className="ui-btn-secondary"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          Sync All Records
        </button>
      </div>

      {/* Filters Header */}
      <div className="ui-card p-4 mb-6 flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by Case ID, Classification, or Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ui-input pl-10"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters((previous) => !previous)}
            className="ui-btn-secondary text-sm font-medium text-slate-600"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
          {showFilters && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-3 space-y-3">
              <FilterGroup
                label="Risk level"
                value={sortOption}
                options={[
                  { value: 'risk_desc', label: 'High to Low' },
                  { value: 'risk_asc', label: 'Low to High' },
                ]}
                onChange={setSortOption}
              />
              <FilterGroup
                label="Event type"
                value={sortOption}
                options={[{ value: 'event_type', label: 'A to Z' }]}
                onChange={setSortOption}
              />
              <FilterGroup
                label="Time"
                value={sortOption}
                options={[
                  { value: 'time_desc', label: 'Most Recent' },
                  { value: 'time_asc', label: 'Oldest' },
                ]}
                onChange={setSortOption}
              />
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="ui-card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          {sortedFilteredCases.length === 0 && !loading ? (
            <div className="p-12 text-center text-slate-600 font-medium">No active investigations found matching your criteria.</div>
          ) : (
            <table className="ui-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-8 py-4">Investigation & Subject</th>
                  <th className="px-6 py-4">Triage Time</th>
                  <th className="px-6 py-4">Risk Context</th>
                  <th className="px-6 py-4">Response Execution</th>
                  <th className="px-6 py-4">Verdict</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedFilteredCases.map((c: any) => (
                  <tr key={c.caseId} className="transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-white transition-colors border border-transparent group-hover:border-blue-100">
                          <EventIcon type={c.eventType} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 font-mono text-xs mb-0.5">{c.caseId.split('-')[0]}...{c.caseId.split('-')[4]}</div>
                          <div className="text-xs text-slate-500 capitalize">{formatEventTypeLabel(c.eventType)} Event</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-600 font-medium">
                      {formatCaseAge(c.createdAt)}
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(c.createdAt).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col space-y-2">
                        <RiskBadge classification={c.classification} tone="muted" />
                        <span className="text-[10px] font-mono font-bold text-slate-400 ml-1">SCORE: {c.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col space-y-1">
                        <span className="inline-flex items-center text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider w-fit border border-blue-100">
                          {formatActionLabel(c.action)}
                        </span>
                        <div className="flex items-center text-[10px] text-slate-400">
                          <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.actionStatus === 'executed' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          {c.actionStatus.replace('_', ' ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <VerdictBadge status={c.verdictStatus || 'pending_review'} />
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link
                        href={`/case/${c.caseId}`}
                        className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-200"
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

const VERDICT_STYLES: Record<string, { label: string; cls: string }> = {
  pending_review: { label: 'Pending Review', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:      { label: 'Confirmed',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  overridden:     { label: 'Overridden',     cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  escalated:      { label: 'Escalated',      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

function VerdictBadge({ status }: { status: string }) {
  const v = VERDICT_STYLES[status] || VERDICT_STYLES.pending_review;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${v.cls}`}>
      {v.label}
    </span>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: 'time_desc' | 'time_asc' | 'risk_desc' | 'risk_asc' | 'event_type'; label: string }>;
  onChange: (value: 'time_desc' | 'time_asc' | 'risk_desc' | 'risk_asc' | 'event_type') => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              value === option.value ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100' : 'hover:bg-slate-50 text-slate-600 border border-transparent'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
