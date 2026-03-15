'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Headphones, MessageSquare, RefreshCw, Send,
  AlertTriangle, Brain, Shield, ListChecks, RotateCcw, TrendingUp, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import { CaseRecord, ChatMessage, ToolCall } from '@sentry/shared';
import { apiFetch, apiUrl } from '@/lib/api';
import { formatActionLabel, formatCaseAge, formatEventTypeLabel } from '@/components/cases/presenters';

type PlannerCheck = { tool: string; reason: string };
type PlannerOutput = { eventType: string; checks: PlannerCheck[]; reasoning: string };
type CaseExplanation = {
  whySuspicious: string;
  keyEvidence: string[];
  recommendedAction: string;
  nextSteps: string[];
  escalationAdvised: boolean;
  escalationReason?: string;
  analystSummary: string;
};
type AdaptiveRule = {
  ruleType: string;
  description: string;
  condition: string;
  action: string;
  rationale: string;
};
type OverrideReflection = {
  originalDecisionRationale: string;
  keySignals: string[];
  overrideAnalysis: string;
  patternObservation: string;
  proposedAdaptiveRule?: AdaptiveRule | null;
};

type InvestigationReport = {
  alertSummary: string;
  riskClassification: { category: string; justification: string };
  mitreMapping: { tactic: string; technique_name: string; technique_id: string; explanation: string };
  threatIntelligence: { ipAnalysis: { geolocation: string; asnIsp: string; vpnProxyTor: string }; reputation: { provider: string; maliciousDetections: number; verdict: string } };
  behavioralAnalysis: { impossibleTravel: boolean; newLoginLocation: boolean; unusualDevice: boolean; repeatedLoginFailures: boolean; offHoursLogin: boolean; notes: string };
  impactAssessment: { likelihoodOfCompromise: string; privilegeRisk: string; lateralMovementRisk: string; summary: string };
  recommendedSocActions: string[];
  finalVerdict: { severity: string; confidence: string; finalTriageConclusion: string };
};

type CaseDetail = CaseRecord & {
  toolCalls: ToolCall[];
  chatMessages?: ChatMessage[];
  plannerOutput?: PlannerOutput;
  aiExplanation?: CaseExplanation;
  verdictStatus?: string;
  verdictAction?: string;
  verdictReason?: string;
  verdictReflection?: OverrideReflection;
  adaptiveRule?: AdaptiveRule;
  adaptiveRuleAccepted?: boolean;
  guidance?: { summary?: string; escalationAdvice?: string; investigationReport?: InvestigationReport };
};

type VerdictStatus = 'confirmed' | 'overridden' | 'escalated';
type FinalClassification = 'False Positive' | 'Benign Activity' | 'Suspicious Activity' | 'Confirmed Security Incident';

const VERDICT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending_review: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  confirmed:      { label: 'Confirmed by Analyst', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  overridden:     { label: 'Overridden by Analyst', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  escalated:      { label: 'Escalated', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

const SUGGESTED_QUESTIONS = [
  'Why was this blocked?',
  'What made this high risk?',
  'Which evidence mattered most?',
  'What should I do next?',
  'Is escalation needed?',
];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Chat
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Verdict
  const [verdictSubmitting, setVerdictSubmitting] = useState(false);
  const [overrideAction, setOverrideAction] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  // Case closure (legacy, kept for compatibility)
  const [closing, setClosing] = useState(false);
  const [closureError, setClosureError] = useState('');
  const [finalClassification, setFinalClassification] = useState<FinalClassification | ''>('');
  const [analystConfirmed, setAnalystConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<{ caseData?: CaseDetail }>(`/api/cases/${id}`);
        if (!cancelled && data.caseData) {
          setCaseData(data.caseData);
          setChatHistory(data.caseData.chatMessages || []);
          const aiCategory = data.caseData.guidance?.investigationReport?.riskClassification?.category as FinalClassification | undefined;
          if (aiCategory) setFinalClassification(aiCategory);
        }
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory]);

  const handlePlayBrief = async () => {
    try {
      setBriefingLoading(true);
      const response = await fetch(apiUrl(`/api/cases/${id}/brief`), { method: 'POST' });
      if (!response.ok) throw new Error('Voice brief failed.');
      const blob = await response.blob();
      new Audio(URL.createObjectURL(blob)).play();
    } catch (err) { console.error(err); }
    finally { setBriefingLoading(false); }
  };

  const handleSendMessage = async (event: React.FormEvent, prefill?: string) => {
    event.preventDefault();
    const outgoing = prefill ?? chatMessage;
    if (!outgoing.trim() || chatLoading) return;

    const pendingMsg: ChatMessage = { id: `local-${Date.now()}`, caseId: id, role: 'user', content: outgoing, createdAt: new Date().toISOString() };
    setChatHistory(prev => [...prev, pendingMsg]);
    setChatLoading(true);
    setChatMessage('');

    try {
      const response = await fetch(apiUrl(`/api/cases/${id}/chat`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: outgoing }),
      });
      const data = await response.json();
      if (data.message) setChatHistory(prev => [...prev, data.message as ChatMessage]);
    } catch (err) { console.error(err); }
    finally { setChatLoading(false); }
  };

  const handleVerdict = async (status: VerdictStatus) => {
    if (status === 'overridden' && (!overrideAction || !overrideReason.trim())) return;
    try {
      setVerdictSubmitting(true);
      const response = await fetch(apiUrl(`/api/cases/${id}/verdict`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verdictStatus: status, verdictAction: overrideAction || undefined, verdictReason: overrideReason || undefined }),
      });
      const data = await response.json();
      if (data.caseData) setCaseData(data.caseData as CaseDetail);
      setShowOverrideForm(false);
    } catch (err) { console.error(err); }
    finally { setVerdictSubmitting(false); }
  };

  const handleAdaptiveRule = async (accepted: boolean) => {
    try {
      await fetch(apiUrl(`/api/cases/${id}/adaptive-rule`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accepted }),
      });
      setCaseData(prev => prev ? { ...prev, adaptiveRuleAccepted: accepted } : prev);
    } catch (err) { console.error(err); }
  };

  const handleCloseCase = async () => {
    try {
      setClosing(true); setClosureError('');
      const response = await fetch(apiUrl(`/api/cases/${id}/close`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalClassification, analystConfirmed }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to close case.');
      if (payload.caseData) setCaseData(payload.caseData as CaseDetail);
    } catch (err) { setClosureError(err instanceof Error ? err.message : 'Unable to close case.'); }
    finally { setClosing(false); }
  };

  if (loading) return (
    <div className="p-8 text-slate-500 flex items-center justify-center h-screen">
      <RefreshCw className="animate-spin w-5 h-5 mr-2" /> Loading investigation...
    </div>
  );
  if (!caseData) return <div className="p-8 text-red-500">Case not found.</div>;

  const report = caseData.guidance?.investigationReport;
  const severity = report?.finalVerdict.severity || 'Medium';
  const verdict = report?.riskClassification.category || 'Suspicious Activity';
  const isClosed = String(caseData.actionStatus) === 'closed';
  const verdictInfo = VERDICT_LABELS[caseData.verdictStatus || 'pending_review'] || VERDICT_LABELS.pending_review;
  const hasVerdict = caseData.verdictStatus && caseData.verdictStatus !== 'pending_review';

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/investigations" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3 mr-1.5" /> Investigation Archive
          </Link>
          <h1 className="ui-title text-3xl mt-3">SOC Tier-2 Investigation</h1>
          <p className="text-slate-500 text-sm mt-1">
            Case {caseData.caseId.slice(0, 8)} | {formatEventTypeLabel(caseData.eventType)} | {formatCaseAge(caseData.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isClosed && (
            <Link href={`/case/${id}/report`} className="flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm">
              <CheckCircle2 className="w-4 h-4 mr-2" /> View Report
            </Link>
          )}
          <button onClick={handlePlayBrief} disabled={briefingLoading}
            className="flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 shadow-sm">
            {briefingLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Headphones className="w-4 h-4 mr-2" />}
            AI Brief
          </button>
        </div>
      </div>

      {/* Verdict Status Badge */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold shadow-sm ${verdictInfo.bg} ${verdictInfo.color}`}>
        <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Verdict Status: {verdictInfo.label}</span>
        {caseData.verdictStatus === 'overridden' && caseData.verdictAction && (
          <span className="text-xs font-normal opacity-80">Override: {formatActionLabel(caseData.verdictAction)} — &quot;{caseData.verdictReason}&quot;</span>
        )}
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Severity" value={severity} />
        <SummaryCard label="Risk Score" value={`${caseData.riskScore}/100`} />
        <SummaryCard label="Automated Action" value={formatActionLabel(caseData.action)} />
      </section>

      {/* ── AI INVESTIGATION PLANNER ── */}
      {caseData.plannerOutput && (
        <ExpandableSection title="AI Investigation Plan" icon={<ListChecks className="w-4 h-4" />} defaultOpen>
          <p className="text-sm text-slate-600 mb-3 italic">{caseData.plannerOutput.reasoning}</p>
          <div className="space-y-2">
            {caseData.plannerOutput.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <span className="text-xs font-black text-blue-700 uppercase tracking-wider">{check.tool.replace(/_/g, ' ')}</span>
                  <p className="text-xs text-slate-600 mt-0.5">{check.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </ExpandableSection>
      )}

      {/* ── AI CASE EXPLANATION ── */}
      {caseData.aiExplanation && (
        <ExpandableSection title="AI Analyst Explanation" icon={<Brain className="w-4 h-4" />} defaultOpen>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Why Suspicious</p>
              <p className="text-sm text-slate-700">{caseData.aiExplanation.whySuspicious}</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Key Evidence</p>
              <ul className="space-y-1">
                {caseData.aiExplanation.keyEvidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-500 mt-0.5">▸</span> {e}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-xl px-4 py-4"
              style={{ background: 'rgba(68,136,245,0.08)', borderLeft: '3px solid #4488f5' }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#4488f5' }}>
                Recommended Action
              </p>
              <p className="text-sm font-bold leading-snug" style={{ color: 'var(--text-1)' }}>
                {caseData.aiExplanation.recommendedAction}
              </p>
            </div>
            {caseData.aiExplanation.escalationAdvised && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-red-700 uppercase tracking-wider">Escalation Advised</p>
                  <p className="text-sm text-red-700 mt-0.5">{caseData.aiExplanation.escalationReason}</p>
                </div>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-1">Analyst Handoff Summary</p>
              <p className="text-sm text-blue-900">{caseData.aiExplanation.analystSummary}</p>
            </div>
          </div>
        </ExpandableSection>
      )}

      {/* ── VERDICT PANEL ── */}
      {!hasVerdict && (
        <section className="ui-card-elevated p-5 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Analyst Verdict
          </h2>
          <p className="text-sm text-slate-600">Review the AI recommendation and submit your verdict. Your decision trains the agent.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleVerdict('confirmed')} disabled={verdictSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 shadow-sm">
              {verdictSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm AI Decision
            </button>
            <button onClick={() => setShowOverrideForm(true)} disabled={verdictSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-50 shadow-sm">
              <RotateCcw className="w-4 h-4" /> Override
            </button>
            <button onClick={() => handleVerdict('escalated')} disabled={verdictSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 shadow-sm">
              <TrendingUp className="w-4 h-4" /> Escalate
            </button>
          </div>
          {showOverrideForm && (
            <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black text-orange-700 uppercase tracking-wider">Override Details</p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Replacement Action</label>
                <select value={overrideAction} onChange={e => setOverrideAction(e.target.value)}
                  className="mt-1 ui-input">
                  <option value="">Select action...</option>
                  <option value="allow">Allow</option>
                  <option value="monitor">Monitor Only</option>
                  <option value="require_mfa">Require MFA</option>
                  <option value="block_session">Block Session</option>
                  <option value="quarantine_email">Quarantine Email</option>
                  <option value="escalate">Escalate to Tier-3</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Reason for Override</label>
                <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                  rows={2} placeholder="Explain why the AI decision was incorrect..."
                  className="mt-1 ui-input resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleVerdict('overridden')} disabled={!overrideAction || !overrideReason.trim() || verdictSubmitting}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 shadow-sm">
                  {verdictSubmitting ? 'Submitting...' : 'Submit Override'}
                </button>
                <button onClick={() => setShowOverrideForm(false)} className="px-4 py-2 rounded-xl font-bold text-sm bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── REFLECTION PANEL (shown after override) ── */}
      {caseData.verdictStatus === 'overridden' && caseData.verdictReflection && (
        <ExpandableSection title="AI Override Reflection" icon={<Brain className="w-4 h-4 text-orange-500" />} defaultOpen>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Original Decision Rationale</p>
              <p className="text-sm text-slate-700">{caseData.verdictReflection.originalDecisionRationale}</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Key Signals That Drove My Decision</p>
              <div className="flex flex-wrap gap-2">
                {caseData.verdictReflection.keySignals.map((s, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 text-xs px-3 py-1 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Override Analysis</p>
              <p className="text-sm text-slate-700">{caseData.verdictReflection.overrideAnalysis}</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Pattern Observation</p>
              <p className="text-sm text-slate-600 italic">{caseData.verdictReflection.patternObservation}</p>
            </div>
            {caseData.verdictReflection.proposedAdaptiveRule && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" /> Proposed Adaptive Rule
                </p>
                <p className="text-sm font-semibold text-amber-900">{caseData.verdictReflection.proposedAdaptiveRule.description}</p>
                <p className="text-xs text-amber-800"><span className="font-bold">Condition:</span> {caseData.verdictReflection.proposedAdaptiveRule.condition}</p>
                <p className="text-xs text-amber-800"><span className="font-bold">Action:</span> {caseData.verdictReflection.proposedAdaptiveRule.action}</p>
                <p className="text-xs text-amber-700 italic">{caseData.verdictReflection.proposedAdaptiveRule.rationale}</p>
                {!caseData.adaptiveRuleAccepted && caseData.adaptiveRule === null ? (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleAdaptiveRule(true)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-500">
                      Accept Rule
                    </button>
                    <button onClick={() => handleAdaptiveRule(false)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-50">
                      Reject
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-emerald-700 mt-1">
                    {caseData.adaptiveRuleAccepted ? '✓ Rule accepted and stored' : '✗ Rule rejected'}
                  </p>
                )}
              </div>
            )}
          </div>
        </ExpandableSection>
      )}

      {/* Investigation Report Sections */}
      <ExpandableSection title="Risk Classification (NIST SP 800-61)" defaultOpen>
        <p className="text-sm text-slate-700"><span className="font-semibold">Category:</span> {report?.riskClassification.category || verdict}</p>
        <p className="text-sm text-slate-600 mt-2">{report?.riskClassification.justification || 'No justification recorded.'}</p>
      </ExpandableSection>

      <ExpandableSection title="MITRE ATT&CK Mapping">
        <p className="text-sm text-slate-700"><span className="font-semibold">Tactic:</span> {report?.mitreMapping.tactic || 'N/A'}</p>
        <p className="text-sm text-slate-700 mt-1">
          <span className="font-semibold">Technique:</span> {report?.mitreMapping.technique_name} ({report?.mitreMapping.technique_id})
        </p>
        <p className="text-sm text-slate-600 mt-2">{report?.mitreMapping.explanation}</p>
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
          <li>Unusual device: {asYesNo(report?.behavioralAnalysis.unusualDevice)}</li>
          <li>Repeated login failures: {asYesNo(report?.behavioralAnalysis.repeatedLoginFailures)}</li>
          <li>Off-hours login: {asYesNo(report?.behavioralAnalysis.offHoursLogin)}</li>
        </ul>
        <p className="text-sm text-slate-600 mt-2">{report?.behavioralAnalysis.notes || 'No behavioral notes recorded.'}</p>
      </ExpandableSection>

      <ExpandableSection title="Recommended SOC Actions">
        <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
          {(report?.recommendedSocActions || [formatActionLabel(caseData.action)]).map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ExpandableSection>

      <ExpandableSection title="Agent Evidence Trace">
        <div className="space-y-3">
          {caseData.toolCalls.map(tc => (
            <div key={tc.id} className="border border-slate-200 rounded-xl p-3">
              <p className="text-sm font-semibold text-slate-800">{tc.tool.replace(/_/g, ' ')}</p>
              <p className="text-sm text-slate-600 mt-1">{tc.summary}</p>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* ── ASK SENTRY AI CHATBOT ── */}
      <section className="ui-card-elevated p-5">
        <h2 className="font-bold text-slate-900 flex items-center mb-1">
          <MessageSquare className="w-4 h-4 mr-2" /> Ask Sentry AI
        </h2>
        <p className="text-xs text-slate-500 mb-3">Ask anything about this case. Sentry AI uses only evidence from this investigation.</p>
        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q} onClick={e => handleSendMessage(e as any, q)}
              className="text-xs px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold">
              {q}
            </button>
          ))}
        </div>
        <div ref={chatScrollRef} className="max-h-64 overflow-y-auto space-y-3 mb-3">
          {chatHistory.length === 0 && <p className="text-sm text-slate-400">No chat yet for this case.</p>}
          {chatHistory.map(msg => (
            <div key={`${msg.id}-${msg.createdAt}`} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block rounded-xl px-3 py-2 text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="text-left">
              <div className="inline-block rounded-xl px-3 py-2 bg-slate-100">
                <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input value={chatMessage} onChange={e => setChatMessage(e.target.value)}
            className="ui-input flex-1"
            placeholder="Ask about evidence, risk, or next steps..." />
          <button type="submit" disabled={!chatMessage.trim() || chatLoading}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-500 shadow-sm">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </section>

      {/* Case Closure */}
      {!isClosed && (
        <section className="ui-card-elevated p-5 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Close Case</h2>
          <p className="text-sm text-slate-600">Select final SOC classification and confirm analyst review before closure.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Classification</label>
              <select value={finalClassification} onChange={e => setFinalClassification(e.target.value as FinalClassification)}
                className="mt-1 ui-input">
                <option value="">Select classification</option>
                <option value="False Positive">False Positive</option>
                <option value="Benign Activity">Benign Activity</option>
                <option value="Suspicious Activity">Suspicious Activity</option>
                <option value="Confirmed Security Incident">Confirmed Security Incident</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center text-sm text-slate-700">
                <input type="checkbox" checked={analystConfirmed} onChange={e => setAnalystConfirmed(e.target.checked)} className="mr-2" />
                I confirm this as analyst-reviewed.
              </label>
            </div>
          </div>
          {closureError && <p className="text-sm text-red-600">{closureError}</p>}
          <button onClick={handleCloseCase} disabled={closing || !finalClassification || !analystConfirmed}
            className="flex items-center px-4 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 shadow-sm">
            {closing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Close Case
          </button>
        </section>
      )}

      {isClosed && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          Case closed on {caseData.closedAt ? new Date(caseData.closedAt).toLocaleString() : 'unknown time'} — classification:{' '}
          <span className="font-semibold">{caseData.finalClassification || verdict}</span>.
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-card-elevated p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</p>
      <p className="text-lg font-extrabold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function ExpandableSection({ title, children, defaultOpen = false, icon }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ui-card-elevated overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-slate-100">
        <span className="font-bold text-slate-900 flex items-center gap-2">{icon}{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pt-4 pb-5">{children}</div>}
    </div>
  );
}

function asYesNo(value: boolean | undefined) { return value ? 'Yes' : 'No'; }
