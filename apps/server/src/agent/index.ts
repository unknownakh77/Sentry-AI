import { StateGraph, END, START } from '@langchain/langgraph';
import { AgentState, InitialState } from './state';
import { getIpInfo, getVpnApi, getVirusTotalIp, getVirusTotalDomain } from '../services/enrichment';
import { getRecentLogins, getAllowlistMatch, saveCase, saveToolCall } from '../db';
import { askBackboard } from '../services/backboard';
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
  intent_score: null,
  intent_flags: null,
  impossible_travel: null,
  login_history_summary: null,
  geo_location: null,
  vpn_detected: null,
  ip_malicious: null,
  domain_malicious: null,
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
  let plan = { tools: [] as string[], reasoning: '' };
  
  if (type === 'login') {
    plan = { tools: ['ip_intel', 'geo_intel', 'vpn_intel', 'login_history'], reasoning: 'Login attempt detected. Need to verify IP reputation, location identity, and recent history to rule out account takeover.' };
  } else if (type === 'phishing_email') {
    plan = { tools: ['domain_intel', 'intent_analysis', 'email_auth'], reasoning: 'Phishing email suspected. Analyzing sender domain, message intent, and SPF/DKIM records.' };
  } else if (type === 'url_click') {
    plan = { tools: ['domain_intel'], reasoning: 'URL clicked. Checking domain and URL reputation.' };
  }
  
  recordTool(state, 'investigation_planner', `Determined tool plan: ${plan.tools.join(', ')}`);
  return { plan, tool_calls: state.tool_calls }; // Note: state mutation used for simplicity above, but returning here.
};

// Node 3: Behavior
const behaviorNode = async (state: AgentState): Promise<Partial<AgentState>> => {
  if (!state.plan?.tools.includes('login_history')) return {};
  
  const history = getRecentLogins(state.event.user) as any[];
  let impossible_travel = false;
  
  if (history.length > 0 && state.geo_location) {
    // Naive impossible travel check for demo: If last was CA and current is RU, flag it
    const lastGeo = history[0].geo;
    if (lastGeo && lastGeo !== (`${state.geo_location.city}, ${state.geo_location.region}, ${state.geo_location.country}`)) {
       // Just blindly flag for demo if they differ, or hardcode the RU case
       if (state.geo_location.country === 'RU') impossible_travel = true;
    }
  }

  recordTool(state, 'behavior_analysis', `Analyzed ${history.length} recent logins. Impossible travel: ${impossible_travel}`);
  return { impossible_travel };
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
      updates.vpn_detected = vpnRes.security.vpn || vpnRes.security.proxy || vpnRes.security.tor;
      recordTool(state, 'vpnapi', `VPN/Proxy detected: ${updates.vpn_detected}`, vpnRes);
    }
    
    if (state.plan.tools.includes('ip_intel')) {
      const vtIp = await getVirusTotalIp(ip);
      const stats = vtIp.data.attributes.last_analysis_stats;
      updates.ip_malicious = stats.malicious > 0;
      recordTool(state, 'virustotal_ip', `Malicious hits: ${stats.malicious}`, vtIp);
    }
  }

  if (state.plan?.tools.includes('domain_intel')) {
    const domain = state.event.artifacts.domain || (state.event.artifacts.url ? new URL(state.event.artifacts.url).hostname : null);
    if (domain) {
      const vtDomain = await getVirusTotalDomain(domain);
      const stats = vtDomain.data.attributes.last_analysis_stats;
      updates.domain_malicious = stats.malicious > 0;
      recordTool(state, 'virustotal_domain', `Malicious hits: ${stats.malicious}`, vtDomain);
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

  return { risk_score: score, risk_level: classification, action, evidence_list: evidence, guidance };
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
