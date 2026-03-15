import { askBackboard } from './backboard';
import { NormalizedEvent } from '@sentry/shared';

export interface PlannerCheck {
  tool: string;
  reason: string;
}

export interface PlannerOutput {
  eventType: string;
  checks: PlannerCheck[];
  reasoning: string;
}

export interface CaseExplanation {
  whySuspicious: string;
  keyEvidence: string[];
  recommendedAction: string;
  nextSteps: string[];
  escalationAdvised: boolean;
  escalationReason?: string;
  analystSummary: string;
}

export interface AdaptiveRule {
  ruleType: 'allowlist' | 'threshold_adjustment' | 'flag_pattern' | 'monitor_only';
  description: string;
  condition: string;
  action: string;
  rationale: string;
}

export interface OverrideReflection {
  originalDecisionRationale: string;
  keySignals: string[];
  overrideAnalysis: string;
  patternObservation: string;
  proposedAdaptiveRule?: AdaptiveRule | null;
}

function stripMarkdown(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export async function planInvestigation(event: NormalizedEvent): Promise<PlannerOutput> {
  const prompt = `You are a SOC investigation planner. Given this security event, decide which tools to run.

Event Type: ${event.eventType}
Source IP: ${event.sourceIp || 'N/A'}
User: ${event.user || 'N/A'}
Artifacts: ${JSON.stringify(event.artifacts || {})}
Context: ${JSON.stringify(event.context || {})}

Available tools:
- ip_reputation: Check if source IP is malicious via VirusTotal
- vpn_detection: Detect VPN/proxy/Tor on the source IP
- geolocation: Resolve geographic location of source IP
- login_history: Analyze user's historical login patterns for anomalies
- domain_reputation: Check domain/URL reputation against threat feeds
- email_auth: Validate SPF/DKIM/DMARC records for sender domain
- content_intent: Analyze email/content for phishing signals
- file_hash_lookup: Lookup file hash in VirusTotal for malware detection
- behavior_analysis: Detect impossible travel, unusual hours, new locations

Respond ONLY with valid JSON, no markdown:
{
  "eventType": "${event.eventType}",
  "checks": [
    { "tool": "tool_name", "reason": "specific reason for this event" }
  ],
  "reasoning": "one sentence explaining the investigation approach"
}`;

  try {
    const response = await askBackboard(prompt, 'You are a SOC investigation planner. Respond ONLY with valid JSON, no markdown, no explanation.');
    const parsed = JSON.parse(stripMarkdown(response));
    if (!parsed.eventType || !Array.isArray(parsed.checks)) throw new Error('Invalid structure');
    return parsed as PlannerOutput;
  } catch (err) {
    console.warn('[AI] planInvestigation fallback:', err);
    return getFallbackPlan(event);
  }
}

function getFallbackPlan(event: NormalizedEvent): PlannerOutput {
  const plans: Record<string, PlannerOutput> = {
    login: {
      eventType: 'login',
      checks: [
        { tool: 'ip_reputation', reason: 'Source IP needs reputation verification against known threat feeds' },
        { tool: 'vpn_detection', reason: 'Sensitive sign-in should check for proxy/VPN/Tor usage' },
        { tool: 'geolocation', reason: 'Verify geographic origin of this authentication attempt' },
        { tool: 'login_history', reason: 'Compare against user baseline for impossible travel or unusual behavior' },
        { tool: 'behavior_analysis', reason: 'Detect off-hours access, new device, and repeated failures' },
      ],
      reasoning: 'Login events require full identity verification including IP reputation, location analysis, and behavioral baseline comparison.',
    },
    phishing_email: {
      eventType: 'phishing_email',
      checks: [
        { tool: 'domain_reputation', reason: 'Sender domain must be checked for known phishing/malware associations' },
        { tool: 'email_auth', reason: 'SPF/DKIM/DMARC validation to verify sender authenticity' },
        { tool: 'content_intent', reason: 'Analyze message content for credential harvesting and phishing patterns' },
      ],
      reasoning: 'Phishing emails require sender validation, domain reputation, and content analysis to classify threat intent.',
    },
    url_click: {
      eventType: 'url_click',
      checks: [
        { tool: 'domain_reputation', reason: 'Clicked URL domain must be verified against malicious URL feeds' },
        { tool: 'ip_reputation', reason: 'Resolve and check the IP behind the destination URL' },
      ],
      reasoning: 'URL clicks require destination domain and IP reputation checks to assess drive-by compromise risk.',
    },
    file_hash: {
      eventType: 'file_hash',
      checks: [
        { tool: 'file_hash_lookup', reason: 'Submit file hash to VirusTotal for malware family and detection rate analysis' },
      ],
      reasoning: 'File hash events require direct lookup against antivirus and malware intelligence databases.',
    },
  };
  return plans[event.eventType] || plans['login'];
}

export async function generateCaseExplanation(caseRecord: {
  eventType: string;
  riskScore: number;
  classification: string;
  action: string;
  evidenceList: string[];
  plannerOutput?: PlannerOutput;
}): Promise<CaseExplanation> {
  const prompt = `You are a senior SOC analyst explaining a security investigation to a Tier-1 analyst.

Case Details:
- Event Type: ${caseRecord.eventType}
- Risk Score: ${caseRecord.riskScore}/100
- Classification: ${caseRecord.classification}
- Automated Action: ${caseRecord.action}
- Evidence Detected: ${caseRecord.evidenceList.join('; ') || 'None'}
- Investigation Checks: ${caseRecord.plannerOutput?.checks?.map(c => c.tool).join(', ') || 'standard checks'}

Respond ONLY with valid JSON, no markdown:
{
  "whySuspicious": "2-3 sentence explanation of why this case is suspicious based on the specific evidence",
  "keyEvidence": ["most critical evidence item", "second most critical", "third most critical"],
  "recommendedAction": "specific concrete action the analyst should take right now",
  "nextSteps": ["concrete step 1", "concrete step 2", "concrete step 3"],
  "escalationAdvised": true or false,
  "escalationReason": "why escalation is needed (only include if escalationAdvised is true, otherwise omit)",
  "analystSummary": "one clear sentence summary for the analyst handoff note"
}

Base all reasoning strictly on the evidence provided. Do not hallucinate signals.`;

  try {
    const response = await askBackboard(prompt, 'You are a senior SOC analyst. Respond ONLY with valid JSON, no markdown.');
    const parsed = JSON.parse(stripMarkdown(response));
    if (!parsed.whySuspicious || !Array.isArray(parsed.keyEvidence)) throw new Error('Invalid structure');
    return parsed as CaseExplanation;
  } catch (err) {
    console.warn('[AI] generateCaseExplanation fallback:', err);
    const evidence = caseRecord.evidenceList.slice(0, 3);
    return {
      whySuspicious: `This ${caseRecord.eventType} event scored ${caseRecord.riskScore}/100 due to: ${evidence.slice(0, 2).join(' and ') || 'multiple risk indicators'}.`,
      keyEvidence: evidence.length > 0 ? evidence : ['Risk signals detected during investigation'],
      recommendedAction:
        caseRecord.action === 'block_session' ? 'Block the session immediately and require password reset' :
        caseRecord.action === 'require_mfa' ? 'Require MFA verification before allowing access' :
        caseRecord.action === 'quarantine_email' ? 'Quarantine the email and notify the recipient' :
        'Monitor the activity and escalate if behavior continues',
      nextSteps: [
        'Review the full evidence trace in Agent Evidence section',
        'Check for related cases from the same IP or user',
        'Document findings and close or escalate',
      ],
      escalationAdvised: caseRecord.classification === 'HIGH',
      escalationReason: caseRecord.classification === 'HIGH' ? 'HIGH classification requires Tier-2 analyst review' : undefined,
      analystSummary: `${caseRecord.classification} risk ${caseRecord.eventType} event (score ${caseRecord.riskScore}). Automated action: ${caseRecord.action}.`,
    };
  }
}

export async function answerCaseQuestion(
  caseRecord: any,
  question: string,
  chatHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const recentHistory = chatHistory
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Analyst' : 'Sentry AI'}: ${m.content}`)
    .join('\n');

  const plannerSection = caseRecord.plannerOutput?.checks
    ?.map((c: any) => `  - ${c.tool}: ${c.reason}`)
    .join('\n') || '  - Standard investigation performed';

  const evidenceSection = (caseRecord.evidenceList || [])
    .map((e: string) => `  - ${e}`)
    .join('\n') || '  - No evidence recorded';

  const explanationSection = caseRecord.aiExplanation
    ? `Why suspicious: ${caseRecord.aiExplanation.whySuspicious}
Key evidence: ${caseRecord.aiExplanation.keyEvidence?.join(', ')}
Escalation: ${caseRecord.aiExplanation.escalationAdvised ? 'Yes — ' + caseRecord.aiExplanation.escalationReason : 'Not required'}`
    : '  Not available';

  const prompt = `You are Sentry AI, a case-aware SOC investigation assistant. Answer the analyst's question using ONLY the case evidence provided below.

=== CASE CONTEXT ===
Case ID: ${caseRecord.caseId?.slice(0, 8) || 'N/A'}
Event Type: ${caseRecord.eventType}
Risk Score: ${caseRecord.riskScore}/100
Risk Level: ${caseRecord.classification}
Automated Action: ${caseRecord.action}

Evidence Detected:
${evidenceSection}

Investigation Plan:
${plannerSection}

AI Explanation:
${explanationSection}

${recentHistory ? `Recent Conversation:\n${recentHistory}` : ''}

=== ANALYST QUESTION ===
${question}

Respond concisely and directly in 2-4 sentences. Reference only evidence that exists above. If you lack enough information, say so clearly.`;

  try {
    return await askBackboard(prompt, 'You are Sentry AI. Be concise, grounded, analyst-friendly. Never hallucinate evidence.');
  } catch (err) {
    console.warn('[AI] answerCaseQuestion fallback:', err);
    return `Based on the case evidence: this ${caseRecord.eventType} scored ${caseRecord.riskScore}/100 (${caseRecord.classification}). ${(caseRecord.evidenceList || []).slice(0, 2).join(' and ')}. Automated action: ${caseRecord.action}.`;
  }
}

export async function reflectOnOverride(
  caseRecord: any,
  overrideAction: string,
  overrideReason: string,
  recentOverrides: Array<{ eventType: string; originalAction: string; overrideAction: string; reason: string; riskScore: number }>
): Promise<OverrideReflection> {
  const overrideHistory = recentOverrides.length > 0
    ? recentOverrides.map(o =>
        `  - ${o.eventType} (score ${o.riskScore}): ${o.originalAction} → overridden to "${o.overrideAction}". Reason: "${o.reason}"`
      ).join('\n')
    : '  - No recent overrides in history';

  const prompt = `You are Sentry AI reflecting on an analyst override of your automated decision.

=== ORIGINAL CASE ===
Event Type: ${caseRecord.eventType}
Risk Score: ${caseRecord.riskScore}/100
Classification: ${caseRecord.classification}
Original Action: ${caseRecord.action}
Evidence that drove my decision:
${(caseRecord.evidenceList || []).map((e: string) => `  - ${e}`).join('\n') || '  - None recorded'}

=== ANALYST OVERRIDE ===
Override Action: ${overrideAction}
Analyst Reason: "${overrideReason}"

=== RECENT OVERRIDE HISTORY ===
${overrideHistory}

Respond ONLY with valid JSON, no markdown:
{
  "originalDecisionRationale": "which specific signals drove the original automated decision",
  "keySignals": ["signal 1", "signal 2", "signal 3"],
  "overrideAnalysis": "analyze the analyst's reasoning and what gap it reveals in detection logic",
  "patternObservation": "note any patterns from override history that suggest systemic adjustment needed",
  "proposedAdaptiveRule": {
    "ruleType": "allowlist or threshold_adjustment or flag_pattern or monitor_only",
    "description": "short name for this rule",
    "condition": "specific condition in plain language",
    "action": "what should happen under this rule",
    "rationale": "why this rule would prevent similar unnecessary overrides"
  }
}

Only include proposedAdaptiveRule if the override reveals a clear pattern. Set it to null if it is a one-off override.`;

  try {
    const response = await askBackboard(prompt, 'You are Sentry AI reflecting on analyst feedback. Respond ONLY with valid JSON, no markdown.');
    const parsed = JSON.parse(stripMarkdown(response));
    if (!parsed.originalDecisionRationale || !Array.isArray(parsed.keySignals)) throw new Error('Invalid structure');
    return parsed as OverrideReflection;
  } catch (err) {
    console.warn('[AI] reflectOnOverride fallback:', err);
    return {
      originalDecisionRationale: `The original ${caseRecord.classification} classification was driven by: ${(caseRecord.evidenceList || []).slice(0, 3).join(', ') || 'multiple risk signals'}.`,
      keySignals: (caseRecord.evidenceList || []).slice(0, 3),
      overrideAnalysis: `The analyst overrode to "${overrideAction}" citing: "${overrideReason}". This may indicate contextual knowledge not captured in automated signals.`,
      patternObservation: recentOverrides.length >= 2
        ? `${recentOverrides.length} recent overrides detected. A pattern may be emerging that warrants rule adjustment.`
        : 'Insufficient override history to identify a systematic pattern.',
      proposedAdaptiveRule: recentOverrides.length >= 2 ? {
        ruleType: 'monitor_only',
        description: 'Reduce false positives for similar patterns',
        condition: `When similar ${caseRecord.eventType} events are overridden with comparable reasoning`,
        action: 'Apply contextual weight reduction and flag for analyst review instead of auto-blocking',
        rationale: 'Repeated overrides suggest current thresholds may be too aggressive for this pattern',
      } : null,
    };
  }
}
