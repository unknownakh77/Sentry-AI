import { StateGraph, END, START } from '@langchain/langgraph';
import { AgentState, InitialState } from './state';
import { getIpInfo, getVpnApi, getVirusTotalIp, getVirusTotalDomain } from '../services/enrichment';
import { getRecentLogins, saveCase, saveToolCall } from '../db';
import { planInvestigation, generateCaseExplanation } from '../services/ai';
import { v4 as uuidv4 } from 'uuid';
import { NormalizedEvent } from '@sentry/shared';

// Helper to record tool execution
function recordTool(state: AgentState, tool: string, summary: string, rawRef: any = null) {
  state.tool_calls.push({
    id: uuidv4(),
    caseId: state.event.eventId, // Using eventId as caseId for 1:1 mapping in MVP
    tool,
    status: 'success',
    latencyMs: Math.floor(Math.random() * 200) + 50, // mock latency
    summary,
    rawRef: rawRef ? JSON.stringify(rawRef) : undefined,
    createdAt: new Date().toISOString(),
  });
}

// Custom Channels for StateGraph in LangGraph JS
// We map the state interface directly. We'll use a simple reducer that just overwrites keys.
const graphStateChannels: any = {
  event: null,
  plan: null,
  plannerOutput: null,
  aiExplanation: null,
  intent_score: null,
  intent_flags: null,
  impossible_travel: null,
  new_login_location: null,
  unusual_device: null,
  repeated_login_failures: null,
  off_hours_login: null,
  login_history_summary: null,
  geo_location: null,
  vpn_detected: null,
  ip_malicious: null,
  ip_malicious_count: null,
  domain_malicious: null,
  domain_malicious_count: null,
  spf_pass: null,
  evidence_list: null,
  risk_score: null,
  risk_level: null,
  action: null,
  guidance: null,
  tool_calls: {
    value: (x: any, y: any) => y ? x.concat(y) : x,
    default: () => []
  }
};

// Node 1: Planner
const plannerNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const type = state.event.eventType;

  // Deterministic tool list for the downstream pipeline
  let plan = { tools: [] as string[], reasoning: '' };
  if (type === 'login') {
    plan = { tools: ['ip_intel', 'geo_intel', 'vpn_intel', 'login_history'], reasoning: 'Login attempt detected. Need to verify IP reputation, location identity, and recent history to rule out account takeover.' };
  } else if (type === 'phishing_email') {
    plan = { tools: ['domain_intel', 'intent_analysis', 'email_auth'], reasoning: 'Phishing email suspected. Analyzing sender domain, message intent, and SPF/DKIM records.' };
  } else if (type === 'url_click') {
    plan = { tools: ['domain_intel'], reasoning: 'URL clicked. Checking domain and URL reputation.' };
  }

  // AI-generated structured planner output (visible to analyst)
  const plannerOutput = await planInvestigation(state.event);

  recordTool(state, 'investigation_planner', `AI planner determined ${plannerOutput.checks.length} checks: ${plannerOutput.checks.map(c => c.tool).join(', ')}`);
  return { plan, plannerOutput, tool_calls: state.tool_calls };
};

// Node 3: Behavior
const behaviorNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  if (!state.plan?.tools.includes('login_history')) return {};
  
  const history = getRecentLogins(state.event.user) as any[];
  let impossible_travel = false;
  let new_login_location = false;
  let repeated_login_failures = false;
  let off_hours_login = false;
  let unusual_device = false;
  let login_history_summary = 'Insufficient prior history to baseline this user.';
  const currentGeo = state.geo_location
    ? `${state.geo_location.city}, ${state.geo_location.region}, ${state.geo_location.country}`
    : null;
  
  if (history.length > 0) {
    const lastGeo = history[0].geo;
    const failedAttempts = history.filter((entry) => entry.result !== 'success').length;
    repeated_login_failures = failedAttempts >= 3;

    if (state.geo_location && lastGeo && currentGeo && lastGeo !== currentGeo) {
      new_login_location = true;
      if (state.geo_location.country === 'RU' || state.geo_location.country === 'CN') {
        impossible_travel = true;
      }
    }

    const hour = new Date(state.event.timestamp).getHours();
    off_hours_login = hour < 6 || hour >= 22;
    unusual_device = !!state.event.context.sessionTag && state.event.context.sessionTag === 'unknown_mobile';
    login_history_summary = `Reviewed ${history.length} previous logins; failed attempts in baseline window: ${failedAttempts}.`;
  }

  recordTool(
    state,
    'behavior_analysis',
    `Analyzed ${history.length} recent logins. Impossible travel: ${impossible_travel}. New location: ${new_login_location}. Repeated failures: ${repeated_login_failures}.`
  );
  return { impossible_travel, new_login_location, repeated_login_failures, off_hours_login, unusual_device, login_history_summary };
};

// Node 4: Threat Intel
const threatIntelNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const updates: Partial<AgentState> = {};
  
  if (state.plan?.tools.includes('ip_intel') || state.plan?.tools.includes('geo_intel') || state.plan?.tools.includes('vpn_intel')) {
    const ip = state.event.sourceIp;
    
    if (state.plan.tools.includes('geo_intel')) {
      updates.geo_location = await getIpInfo(ip);
      recordTool(state, 'ipinfo', `Resolved location to ${updates.geo_location.city}, ${updates.geo_location.country}`, updates.geo_location);
    }
    
    if (state.plan.tools.includes('vpn_intel')) {
      const vpnRes = await getVpnApi(ip);
      updates.vpn_detected = !!(vpnRes?.security?.vpn || vpnRes?.security?.proxy || vpnRes?.security?.tor);
      recordTool(state, 'vpnapi', `VPN/Proxy detected: ${updates.vpn_detected}`, vpnRes);
    }
    
    if (state.plan.tools.includes('ip_intel')) {
      const vtIp = await getVirusTotalIp(ip);
      const stats = vtIp?.data?.attributes?.last_analysis_stats;
      const maliciousHits = Number(stats?.malicious || 0);
      updates.ip_malicious = maliciousHits > 0;
      updates.ip_malicious_count = maliciousHits;
      recordTool(state, 'virustotal_ip', `Malicious hits: ${maliciousHits}`, vtIp);
    }
  }

  if (state.plan?.tools.includes('domain_intel')) {
    const domain = state.event.artifacts.domain || (state.event.artifacts.url ? new URL(state.event.artifacts.url).hostname : null);
    if (domain) {
      const vtDomain = await getVirusTotalDomain(domain);
      const stats = vtDomain?.data?.attributes?.last_analysis_stats;
      const maliciousHits = Number(stats?.malicious || 0);
      updates.domain_malicious = maliciousHits > 0;
      updates.domain_malicious_count = maliciousHits;
      recordTool(state, 'virustotal_domain', `Malicious hits: ${maliciousHits}`, vtDomain);
    }
  }

  return updates;
};

// Node 5: Email Auth (Mock)
const authNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  if (!state.plan?.tools.includes('email_auth')) return {};
  // Mock failing SPF for phishing demo
  const spf_pass = false;
  recordTool(state, 'auth_check', `SPF check failed for sender ${state.event.artifacts.sender}`);
  return { spf_pass };
};

// Node 6/7/8: Scoring & Decision
const decisionNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  let score = 0;
  const evidence: string[] = [];
  
  if (state.ip_malicious || state.domain_malicious) {
    score += 40;
    evidence.push('Malicious IP or Domain detected in threat intelligence');
  }
  
  if (state.impossible_travel) {
    score += 30;
    evidence.push('Impossible travel time detected between logins');
  }
  
  if (state.vpn_detected) {
    score += 20;
    evidence.push('Session originates from known VPN/Tor exit node');
  }

  if (state.new_login_location) {
    score += 10;
    evidence.push('Login originated from a new geolocation for this user');
  }

  if (state.repeated_login_failures) {
    score += 15;
    evidence.push('User baseline includes repeated recent login failures');
  }

  if (state.off_hours_login) {
    score += 10;
    evidence.push('Sign-in occurred during off-hours');
  }
  
  if (state.spf_pass === false) {
    score += 15;
    evidence.push('Email failed SPF/DKIM authentication');
  }
  
  if (state.event.context.allowlistMatch) {
    score -= 25;
    evidence.push('Session matches known trusted allowlist');
  }

  let classification: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let action = 'allow';
  
  if (score >= 70) {
    classification = 'HIGH';
    action = state.event.context.privilegedUser ? 'analyst_review' : (state.event.eventType === 'login' ? 'block_session' : 'quarantine_email');
  } else if (score >= 30) {
    classification = 'MEDIUM';
    action = 'require_mfa';
  }

  recordTool(state, 'policy_engine', `Risk Score computed: ${score} (${classification}). Policy action: ${action}`);

  const nistCategory = score >= 75
    ? 'Confirmed Security Incident'
    : score >= 35
      ? 'Suspicious Activity'
      : score >= 5
        ? 'Benign Activity'
        : 'False Positive';

  const severity = score >= 85 ? 'Critical' : score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  const confidence = score >= 70 ? 'High' : score >= 35 ? 'Medium' : 'Low';

  const mitre = state.event.eventType === 'login'
    ? state.repeated_login_failures
      ? {
          tactic: 'Credential Access',
          technique_name: 'Brute Force',
          technique_id: 'T1110',
          explanation: 'Repeated authentication failures followed by access suggest credential-guessing activity.',
        }
      : {
          tactic: 'Defense Evasion',
          technique_name: 'Valid Accounts',
          technique_id: 'T1078',
          explanation: 'Sign-in activity using valid credentials from unusual infrastructure may indicate account misuse.',
        }
    : state.event.eventType === 'phishing_email'
      ? {
          tactic: 'Initial Access',
          technique_name: 'Phishing',
          technique_id: 'T1566',
          explanation: 'Alert pattern aligns with phishing delivery and credential harvesting behavior.',
        }
      : {
          tactic: 'Execution',
          technique_name: 'Drive-by Compromise',
          technique_id: 'T1189',
          explanation: 'URL interaction indicates potential browser-based compromise risk.',
        };

  const recommendedSocActions = (() => {
    if (nistCategory === 'False Positive') return ['close alert', 'monitor activity'];
    if (nistCategory === 'Benign Activity') return ['monitor activity', 'require MFA'];
    if (nistCategory === 'Suspicious Activity') return ['require MFA', 'force password reset', 'revoke sessions', 'escalate investigation'];
    return ['force password reset', 'revoke sessions', 'block IP', 'escalate investigation'];
  })();

  const geoLabel = state.geo_location
    ? `${state.geo_location.city || 'Unknown'}, ${state.geo_location.region || 'Unknown'}, ${state.geo_location.country || 'Unknown'}`
    : 'Unknown';
  const asnLabel = state.geo_location?.org || 'Unknown ASN/ISP';
  const vpnLabel = state.vpn_detected ? 'VPN/proxy/TOR signal detected' : 'No VPN/proxy/TOR signal detected';

  const alertSummary = `Alert for user ${state.event.user} from source IP ${state.event.sourceIp}. Device/session: ${state.event.artifacts.device || state.event.context.sessionTag || 'unknown'}, location: ${geoLabel}, timestamp: ${new Date(state.event.timestamp).toISOString()}, authentication method: ${state.event.context.authenticationMethod || (state.event.context.mfaUsed ? 'MFA-assisted login' : 'password-only login')}. Alert description: ${state.event.artifacts.alertDescription || state.event.eventType}. Additional logs: ${state.login_history_summary || state.event.artifacts.additionalLogs || 'No additional logs provided.'}`;
  const impactSummary = state.event.context.privilegedUser
    ? 'Privileged account context increases business impact if this session is malicious.'
    : 'Non-privileged account context lowers immediate blast radius but still warrants containment if compromise is likely.';

    // Generate AI guidance using real LLM
    const prompt = `Analyze this security event and provide a structured guidance.
    Event Type: ${state.event.eventType}
    Risk Score: ${score}
    Evidence: ${evidence.join(', ')}
    Classification: ${classification}
    
    Provide the response in JSON format with:
    {
      "summary": "one sentence summary of the threat",
      "containmentSteps": ["step 1", "step 2"],
      "escalationAdvice": "specific advice on who to notify"
    }`;

    let guidance;
    try {
      const llmResponse = await askBackboard(prompt, "You are a professional SOC Analyst assistant. Respond ONLY with valid JSON.");
      guidance = JSON.parse(llmResponse);
    } catch (err) {
      console.warn('Backboard failed, using fallback guidance');
      guidance = {
        summary: `Possible ${state.event.eventType} detected with ${classification} risk.`,
        containmentSteps: ['Monitor session', 'Flag account'],
        escalationAdvice: 'Standard observation.'
      };
    }

  guidance = {
    ...guidance,
    threatContext: `Mapped to ${mitre.technique_id} (${mitre.technique_name}) with NIST triage category ${nistCategory}.`,
    containmentSteps: guidance.containmentSteps || recommendedSocActions,
    investigationReport: {
      alertSummary,
      riskClassification: {
        category: nistCategory,
        justification: `Risk score ${score} with evidence: ${evidence.join('; ') || 'No high-confidence malicious evidence detected.'}`,
      },
      mitreMapping: mitre,
      threatIntelligence: {
        ipAnalysis: {
          geolocation: geoLabel,
          asnIsp: asnLabel,
          vpnProxyTor: vpnLabel,
        },
        reputation: {
          provider: 'VirusTotal',
          maliciousDetections: (state.ip_malicious_count || 0) + (state.domain_malicious_count || 0),
          verdict: state.ip_malicious || state.domain_malicious ? 'malicious' : 'clean',
        },
      },
      behavioralAnalysis: {
        impossibleTravel: state.impossible_travel,
        newLoginLocation: state.new_login_location,
        unusualDevice: state.unusual_device,
        repeatedLoginFailures: state.repeated_login_failures,
        offHoursLogin: state.off_hours_login,
        notes: state.login_history_summary || 'Behavioral baseline unavailable.',
      },
      impactAssessment: {
        likelihoodOfCompromise: severity === 'High' || severity === 'Critical' ? 'Likely' : severity === 'Medium' ? 'Possible' : 'Unlikely',
        privilegeRisk: state.event.context.privilegedUser ? 'Elevated' : 'Standard',
        lateralMovementRisk: severity === 'Critical' ? 'High' : severity === 'High' ? 'Medium' : 'Low',
        summary: impactSummary,
      },
      recommendedSocActions,
      finalVerdict: {
        severity,
        confidence,
        finalTriageConclusion: `${nistCategory}: ${guidance.summary}`,
      },
    },
  };

  // AI case explanation (grounded analyst guidance)
  const aiExplanation = await generateCaseExplanation({
    eventType: state.event.eventType,
    riskScore: score,
    classification,
    action,
    evidenceList: evidence,
    plannerOutput: state.plannerOutput || undefined,
  });

  return { risk_score: score, risk_level: classification, action, evidence_list: evidence, guidance, aiExplanation };
};

// Node 9: Persist
const persistNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  const caseId = state.event.eventId;
  
  saveCase({
    caseId,
    eventId: state.event.eventId,
    eventType: state.event.eventType,
    riskScore: state.risk_score,
    classification: state.risk_level!,
    action: state.action!,
    actionStatus: 'executed',
    evidenceList: state.evidence_list,
    guidance: state.guidance,
    plannerOutput: state.plannerOutput || undefined,
    aiExplanation: state.aiExplanation || undefined,
    createdAt: new Date().toISOString()
  });

  for (const tc of state.tool_calls) {
    saveToolCall({
      ...tc,
      caseId
    });
  }

  return {};
};

// Build the Graph
export const workflow = new StateGraph({ channels: graphStateChannels })
  .addNode('planner', plannerNode as any)
  .addNode('threat_intel', threatIntelNode as any)
  .addNode('behavior', behaviorNode as any)
  .addNode('auth', authNode as any)
  .addNode('decision', decisionNode as any)
  .addNode('persist', persistNode as any)
  
  // Edges
  .addEdge(START, 'planner')
  .addEdge('planner', 'threat_intel')
  .addEdge('threat_intel', 'behavior')
  .addEdge('behavior', 'auth')
  .addEdge('auth', 'decision')
  .addEdge('decision', 'persist')
  .addEdge('persist', END);

export const appWorkflow = workflow.compile();

export async function runInvestigation(event: NormalizedEvent) {
  const initialState = InitialState();
  initialState.event = event;
  
  const finalState = await appWorkflow.invoke(initialState as any);
  return finalState;
}
