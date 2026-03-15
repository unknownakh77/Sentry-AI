'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Headphones, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { CaseRecord, ChatMessage, ToolCall } from '@sentry/shared';
import { apiFetch, apiUrl } from '@/lib/api';
import { formatActionLabel, formatCaseAge, formatEventTypeLabel } from '@/components/cases/presenters';

type InvestigationReport = {
  alertSummary: string;
  riskClassification: {
    category: 'False Positive' | 'Benign Activity' | 'Suspicious Activity' | 'Confirmed Security Incident';
    justification: string;
  };
  mitreMapping: {
    tactic: string;
    technique_name: string;
    technique_id: string;
    explanation: string;
  };
  threatIntelligence: {
    ipAnalysis: {
      geolocation: string;
      asnIsp: string;
      vpnProxyTor: string;
    };
    reputation: {
      provider: string;
      maliciousDetections: number;
      verdict: string;
    };
  };
  behavioralAnalysis: {
    impossibleTravel: boolean;
    newLoginLocation: boolean;
    unusualDevice: boolean;
    repeatedLoginFailures: boolean;
    offHoursLogin: boolean;
    notes: string;
  };
  impactAssessment: {
    likelihoodOfCompromise: string;
    privilegeRisk: string;
    lateralMovementRisk: string;
    summary: string;
  };
  recommendedSocActions: string[];
  finalVerdict: {
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    confidence: string;
    finalTriageConclusion: string;
  };
};

type CaseDetail = CaseRecord & {
  toolCalls: ToolCall[];
  chatMessages?: ChatMessage[];
  guidance?: {
    summary?: string;
    escalationAdvice?: string;
    investigationReport?: InvestigationReport;
  };
};

type FinalClassification = 'False Positive' | 'Benign Activity' | 'Suspicious Activity' | 'Confirmed Security Incident';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [finalClassification, setFinalClassification] = useState<FinalClassification | ''>('');
  const [analystConfirmed, setAnalystConfirmed] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<{ caseData?: CaseDetail }>(`/api/cases/${id}`);
        if (!cancelled && data.caseData) {
          setCaseData(data.caseData);
          setChatHistory(data.caseData.chatMessages || []);
          const aiCategory = data.caseData.guidance?.investigationReport?.riskClassification?.category;
          if (aiCategory) {
            setFinalClassification(aiCategory);
          }
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
  }, [id]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handlePlayBrief = async () => {
    try {
      setBriefingLoading(true);
      const response = await fetch(apiUrl(`/api/cases/${id}/brief`), { method: 'POST' });
      if (!response.ok) throw new Error('Voice brief failed.');
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      new Audio(audioUrl).play();
    } catch (error) {
      console.error(error);
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const pendingUserMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      caseId: id,
      role: 'user',
      content: chatMessage,
      createdAt: new Date().toISOString(),
    };

    setChatHistory((previous) => [...previous, pendingUserMessage]);
    setChatLoading(true);
    const outgoing = chatMessage;
    setChatMessage('');

    try {
      const response = await fetch(apiUrl(`/api/cases/${id}/chat`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: outgoing }),
      });
      const data = await response.json();
      if (data.message) {
        setChatHistory((previous) => [...previous, data.message as ChatMessage]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex items-center justify-center h-screen">
        <RefreshCw className="animate-spin w-5 h-5 mr-2" />
        Loading investigation report...
      </div>
    );
  }

  if (!caseData) return <div className="p-8 text-red-500">Case not found.</div>;

  const report = caseData.guidance?.investigationReport;
  const severity = report?.finalVerdict.severity || 'Medium';
  const verdict = report?.riskClassification.category || 'Suspicious Activity';
  const recommendedAction = report?.recommendedSocActions?.[0] || caseData.action;
  const isClosed = String(caseData.actionStatus) === 'closed';
  const closeDisabled = closing || !finalClassification || !analystConfirmed;

  const handleCloseCase = async () => {
    try {
      setClosing(true);
      setClosureError('');
      const response = await fetch(apiUrl(`/api/cases/${id}/close`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalClassification,
          analystConfirmed,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to close case.');
      if (payload.caseData) setCaseData(payload.caseData as CaseDetail);
    } catch (error) {
      setClosureError(error instanceof Error ? error.message : 'Unable to close case.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/investigations" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3 mr-1.5" />
            Investigation Archive
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-3">SOC Tier-2 Investigation</h1>
          <p className="text-slate-500 text-sm mt-1">
            Case {caseData.caseId.slice(0, 8)} | {formatEventTypeLabel(caseData.eventType)} | {formatCaseAge(caseData.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isClosed ? (
            <Link href={`/case/${id}/report`} className="flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              View Report
            </Link>
          ) : (
            <button
              onClick={handleCloseCase}
              disabled={closeDisabled}
              className="flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              title="Close case with analyst-confirmed final classification"
            >
              {closing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Close Case
            </button>
          )}
          <button
            onClick={handlePlayBrief}
            disabled={briefingLoading}
            className="flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {briefingLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Headphones className="w-4 h-4 mr-2" />}
            AI Brief
          </button>
        </div>
      </div>

      {!isClosed && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Case Closure</h2>
          <p className="text-sm text-slate-600">
            Select final SOC triage classification and confirm analyst review before closure. AI verdicts are recommendations only.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Classification</label>
              <select
                value={finalClassification}
                onChange={(event) => setFinalClassification(event.target.value as FinalClassification)}
                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Select classification</option>
                <option value="False Positive">False Positive</option>
                <option value="Benign Activity">Benign Activity</option>
                <option value="Suspicious Activity">Suspicious Activity</option>
                <option value="Confirmed Security Incident">Confirmed Security Incident</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={analystConfirmed}
                  onChange={(event) => setAnalystConfirmed(event.target.checked)}
                  className="mr-2"
                />
                I confirm this final classification as analyst-reviewed.
              </label>
            </div>
          </div>
        </section>
      )}

      {closureError && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {closureError}
        </div>
      )}

      {isClosed && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          Case closed on {caseData.closedAt ? new Date(caseData.closedAt).toLocaleString() : 'unknown time'} with final classification{' '}
          <span className="font-semibold">{caseData.finalClassification || verdict}</span> and severity{' '}
          <span className="font-semibold">{caseData.finalSeverity || severity}</span>.
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Severity" value={severity} />
        <SummaryCard label="Verdict" value={verdict} />
        <SummaryCard label="Recommended Action" value={formatActionLabel(recommendedAction)} />
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-bold text-slate-900">Quick Summary</h2>
        <p className="text-sm text-slate-600 mt-2">
          {report?.alertSummary || caseData.guidance?.summary || 'Investigation summary unavailable for this case.'}
        </p>
      </section>

      <ExpandableSection title="Risk Classification (NIST SP 800-61)" defaultOpen>
        <p className="text-sm text-slate-700"><span className="font-semibold">Category:</span> {report?.riskClassification.category || 'N/A'}</p>
        <p className="text-sm text-slate-600 mt-2">{report?.riskClassification.justification || 'No justification recorded.'}</p>
      </ExpandableSection>

      <ExpandableSection title="MITRE ATT&CK Mapping">
        <p className="text-sm text-slate-700"><span className="font-semibold">Tactic:</span> {report?.mitreMapping.tactic || 'N/A'}</p>
        <p className="text-sm text-slate-700 mt-1">
          <span className="font-semibold">Technique:</span> {report?.mitreMapping.technique_name || 'N/A'} ({report?.mitreMapping.technique_id || 'N/A'})
        </p>
        <p className="text-sm text-slate-600 mt-2">{report?.mitreMapping.explanation || 'No MITRE explanation recorded.'}</p>
      </ExpandableSection>

      <ExpandableSection title="Threat Intelligence">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="font-semibold text-slate-800">IP Analysis</div>
            <div className="mt-2 text-slate-600">Geolocation: {report?.threatIntelligence.ipAnalysis.geolocation || 'N/A'}</div>
            <div className="text-slate-600">ASN / ISP: {report?.threatIntelligence.ipAnalysis.asnIsp || 'N/A'}</div>
            <div className="text-slate-600">VPN/Proxy/TOR: {report?.threatIntelligence.ipAnalysis.vpnProxyTor || 'N/A'}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="font-semibold text-slate-800">Reputation</div>
            <div className="mt-2 text-slate-600">Provider: {report?.threatIntelligence.reputation.provider || 'N/A'}</div>
            <div className="text-slate-600">Malicious Detections: {report?.threatIntelligence.reputation.maliciousDetections ?? 0}</div>
            <div className="text-slate-600">Verdict: {report?.threatIntelligence.reputation.verdict || 'N/A'}</div>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Behavioral Analysis">
        <ul className="text-sm text-slate-700 space-y-1">
          <li>Impossible travel: {asYesNo(report?.behavioralAnalysis.impossibleTravel)}</li>
          <li>New login location: {asYesNo(report?.behavioralAnalysis.newLoginLocation)}</li>
          <li>Unusual device/user agent: {asYesNo(report?.behavioralAnalysis.unusualDevice)}</li>
          <li>Repeated login failures: {asYesNo(report?.behavioralAnalysis.repeatedLoginFailures)}</li>
          <li>Off-hours login: {asYesNo(report?.behavioralAnalysis.offHoursLogin)}</li>
        </ul>
        <p className="text-sm text-slate-600 mt-2">{report?.behavioralAnalysis.notes || 'No behavioral notes recorded.'}</p>
      </ExpandableSection>

      <ExpandableSection title="Impact Assessment">
        <p className="text-sm text-slate-700">Likelihood of compromise: {report?.impactAssessment.likelihoodOfCompromise || 'N/A'}</p>
        <p className="text-sm text-slate-700 mt-1">Privilege risk: {report?.impactAssessment.privilegeRisk || 'N/A'}</p>
        <p className="text-sm text-slate-700 mt-1">Potential lateral movement: {report?.impactAssessment.lateralMovementRisk || 'N/A'}</p>
        <p className="text-sm text-slate-600 mt-2">{report?.impactAssessment.summary || 'No impact summary recorded.'}</p>
      </ExpandableSection>

      <ExpandableSection title="Recommended SOC Actions">
        <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
          {(report?.recommendedSocActions || [formatActionLabel(caseData.action)]).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ExpandableSection>

      <ExpandableSection title="Agent Evidence Trace">
        <div className="space-y-3">
          {caseData.toolCalls.map((toolCall) => (
            <div key={toolCall.id} className="border border-slate-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-slate-800">{toolCall.tool.replace(/_/g, ' ')}</p>
              <p className="text-sm text-slate-600 mt-1">{toolCall.summary}</p>
            </div>
          ))}
        </div>
      </ExpandableSection>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-bold text-slate-900 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          Ask Sentry AI
        </h2>
        <div ref={chatScrollRef} className="mt-4 max-h-64 overflow-y-auto space-y-3">
          {chatHistory.length === 0 && <p className="text-sm text-slate-500">No chat yet for this case.</p>}
          {chatHistory.map((message) => (
            <div key={`${message.id}-${message.createdAt}`} className={message.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block rounded-xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {message.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <input
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm"
            placeholder="Ask for deeper triage guidance..."
          />
          <button type="submit" disabled={!chatMessage.trim() || chatLoading} className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">
            {chatLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function ExpandableSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="bg-white border border-slate-200 rounded-2xl p-5 group">
      <summary className="cursor-pointer font-bold text-slate-900 list-none">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function asYesNo(value: boolean | undefined) {
  return value ? 'Yes' : 'No';
}
