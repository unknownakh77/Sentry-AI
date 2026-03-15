'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type CaseReport = {
  caseId: string;
  closedAt: string;
  analystConfirmed: boolean;
  finalClassification: string;
  finalSeverity: string;
  alertSummary: string;
  riskClassification: { category: string; justification: string };
  mitreMapping: { tactic: string; technique_name: string; technique_id: string; explanation: string };
  threatIntelligence: {
    ipAnalysis: { geolocation: string; asnIsp: string; vpnProxyTor: string };
    reputation: { provider: string; maliciousDetections: number; verdict: string };
  };
  behavioralAnalysis: {
    impossibleTravel: boolean;
    newLoginLocation: boolean;
    unusualDevice: boolean;
    repeatedLoginFailures: boolean;
    offHoursLogin: boolean;
    notes: string;
  };
  recommendedSocActions: string[];
  finalVerdict: { severity: string; confidence: string; finalTriageConclusion: string };
};

export default function CaseReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<CaseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadReport = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiFetch<{ report: CaseReport }>(`/api/cases/${id}/report`);
        if (!cancelled) {
          setReport(data.report);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load report.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex items-center justify-center h-screen">
        <RefreshCw className="animate-spin w-5 h-5 mr-2" />
        Loading case report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href={`/case/${id}`} className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest">
          <ArrowLeft className="w-3 h-3 mr-1.5" />
          Back to Case
        </Link>
        <p className="mt-6 text-red-600 font-medium">{error || 'Case report unavailable.'}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/case/${id}`} className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3 mr-1.5" />
            Back to Case
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-3 flex items-center">
            <FileText className="w-7 h-7 mr-3 text-blue-600" />
            Investigation Report
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Case {report.caseId.slice(0, 8)} • Closed {new Date(report.closedAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold text-slate-900">{report.finalSeverity} Severity</div>
          <div className="text-slate-500">{report.finalClassification}</div>
        </div>
      </div>

      <ReportSection title="Alert Summary">{report.alertSummary}</ReportSection>
      <ReportSection title="Risk Classification">
        <p><span className="font-semibold">Category:</span> {report.riskClassification.category}</p>
        <p className="mt-1 text-slate-600">{report.riskClassification.justification}</p>
      </ReportSection>
      <ReportSection title="MITRE ATT&CK Mapping">
        <p><span className="font-semibold">Tactic:</span> {report.mitreMapping.tactic}</p>
        <p><span className="font-semibold">Technique:</span> {report.mitreMapping.technique_name} ({report.mitreMapping.technique_id})</p>
        <p className="mt-1 text-slate-600">{report.mitreMapping.explanation}</p>
      </ReportSection>
      <ReportSection title="Threat Intelligence">
        <p><span className="font-semibold">Geolocation:</span> {report.threatIntelligence.ipAnalysis.geolocation}</p>
        <p><span className="font-semibold">ASN / ISP:</span> {report.threatIntelligence.ipAnalysis.asnIsp}</p>
        <p><span className="font-semibold">VPN/Proxy/TOR:</span> {report.threatIntelligence.ipAnalysis.vpnProxyTor}</p>
        <p><span className="font-semibold">Reputation:</span> {report.threatIntelligence.reputation.verdict} ({report.threatIntelligence.reputation.maliciousDetections} malicious detections)</p>
      </ReportSection>
      <ReportSection title="Behavioral Findings">
        <p>Impossible travel: {yesNo(report.behavioralAnalysis.impossibleTravel)}</p>
        <p>New login location: {yesNo(report.behavioralAnalysis.newLoginLocation)}</p>
        <p>Unusual device: {yesNo(report.behavioralAnalysis.unusualDevice)}</p>
        <p>Repeated login failures: {yesNo(report.behavioralAnalysis.repeatedLoginFailures)}</p>
        <p>Off-hours login: {yesNo(report.behavioralAnalysis.offHoursLogin)}</p>
        <p className="mt-1 text-slate-600">{report.behavioralAnalysis.notes}</p>
      </ReportSection>
      <ReportSection title="Recommended Actions">
        <ul className="list-disc pl-5">
          {report.recommendedSocActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </ReportSection>
      <ReportSection title="Final Verdict">
        <p><span className="font-semibold">Severity:</span> {report.finalVerdict.severity}</p>
        <p><span className="font-semibold">Confidence:</span> {report.finalVerdict.confidence}</p>
        <p className="mt-1 text-slate-600">{report.finalVerdict.finalTriageConclusion}</p>
      </ReportSection>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-3">{title}</h2>
      <div className="text-sm text-slate-700 space-y-1">{children}</div>
    </section>
  );
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}
