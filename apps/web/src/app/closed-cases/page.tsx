'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { CaseRecord } from '@sentry/shared';
import { apiFetch } from '@/lib/api';
import { formatCaseAge, formatEventTypeLabel } from '@/components/cases/presenters';

type ClosedCase = CaseRecord & {
  closedAt?: string;
  finalClassification?: string;
  finalSeverity?: string;
  analystConfirmed?: boolean;
  guidance?: {
    investigationReport?: {
      alertSummary?: string;
      finalVerdict?: { finalTriageConclusion?: string };
    };
  };
};

export default function ClosedCasesPage() {
  const [cases, setCases] = useState<ClosedCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<{ cases?: ClosedCase[] }>('/api/cases/closed');
        if (!cancelled) {
          setCases(data.cases || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="ui-title text-3xl">Closed Cases Documentation</h1>
          <p className="ui-subtitle mt-1">Official SOC investigation archive with final triage documentation.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="ui-btn-secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-slate-500 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading closed investigations...
        </div>
      ) : cases.length === 0 ? (
        <div className="ui-card p-10 text-center text-slate-600">
          No closed cases documented yet.
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((item) => (
            <article key={item.caseId} className="ui-card-elevated p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Case {item.caseId.slice(0, 8)}</p>
                  <h2 className="text-lg font-bold text-slate-900">
                    {formatEventTypeLabel(item.eventType)} | {item.finalClassification || item.classification}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Closed {item.closedAt ? new Date(item.closedAt).toLocaleString() : formatCaseAge(item.createdAt)} | Severity {item.finalSeverity || item.guidance?.investigationReport?.finalVerdict?.finalTriageConclusion || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Closed
                  </span>
                  <Link
                    href={`/case/${item.caseId}/report`}
                    className="ui-btn-primary px-3 py-2 text-sm"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Open Report
                  </Link>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                {item.guidance?.investigationReport?.alertSummary || 'No summary available.'}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
