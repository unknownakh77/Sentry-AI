"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appWorkflow = exports.workflow = void 0;
exports.runInvestigation = runInvestigation;
const langgraph_1 = require("@langchain/langgraph");
const state_1 = require("./state");
const enrichment_1 = require("../services/enrichment");
const db_1 = require("../db");
const uuid_1 = require("uuid");
// Helper to record tool execution
function recordTool(state, tool, summary, rawRef = null) {
    state.tool_calls.push({
        id: (0, uuid_1.v4)(),
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
const graphStateChannels = {
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
    tool_calls: {
        value: (x, y) => y ? x.concat(y) : x,
        default: () => []
    }
};
// Node 1: Planner
const plannerNode = async (state) => {
    const type = state.event.eventType;
    let plan = { tools: [], reasoning: '' };
    if (type === 'login') {
        plan = { tools: ['ip_intel', 'geo_intel', 'vpn_intel', 'login_history'], reasoning: 'Login attempt detected. Need to verify IP reputation, location identity, and recent history to rule out account takeover.' };
    }
    else if (type === 'phishing_email') {
        plan = { tools: ['domain_intel', 'intent_analysis', 'email_auth'], reasoning: 'Phishing email suspected. Analyzing sender domain, message intent, and SPF/DKIM records.' };
    }
    else if (type === 'url_click') {
        plan = { tools: ['domain_intel'], reasoning: 'URL clicked. Checking domain and URL reputation.' };
    }
    recordTool(state, 'investigation_planner', `Determined tool plan: ${plan.tools.join(', ')}`);
    return { plan, tool_calls: state.tool_calls }; // Note: state mutation used for simplicity above, but returning here.
};
// Node 3: Behavior
const behaviorNode = async (state) => {
    if (!state.plan?.tools.includes('login_history'))
        return {};
    const history = (0, db_1.getRecentLogins)(state.event.user);
    let impossible_travel = false;
    if (history.length > 0 && state.geo_location) {
        // Naive impossible travel check for demo: If last was CA and current is RU, flag it
        const lastGeo = history[0].geo;
        if (lastGeo && lastGeo !== (`${state.geo_location.city}, ${state.geo_location.region}, ${state.geo_location.country}`)) {
            // Just blindly flag for demo if they differ, or hardcode the RU case
            if (state.geo_location.country === 'RU')
                impossible_travel = true;
        }
    }
    recordTool(state, 'behavior_analysis', `Analyzed ${history.length} recent logins. Impossible travel: ${impossible_travel}`);
    return { impossible_travel };
};
// Node 4: Threat Intel
const threatIntelNode = async (state) => {
    const updates = {};
    if (state.plan?.tools.includes('ip_intel') || state.plan?.tools.includes('geo_intel') || state.plan?.tools.includes('vpn_intel')) {
        const ip = state.event.sourceIp;
        if (state.plan.tools.includes('geo_intel')) {
            updates.geo_location = await (0, enrichment_1.getIpInfo)(ip);
            recordTool(state, 'ipinfo', `Resolved location to ${updates.geo_location.city}, ${updates.geo_location.country}`, updates.geo_location);
        }
        if (state.plan.tools.includes('vpn_intel')) {
            const vpnRes = await (0, enrichment_1.getVpnApi)(ip);
            updates.vpn_detected = vpnRes.security.vpn || vpnRes.security.proxy || vpnRes.security.tor;
            recordTool(state, 'vpnapi', `VPN/Proxy detected: ${updates.vpn_detected}`, vpnRes);
        }
        if (state.plan.tools.includes('ip_intel')) {
            const vtIp = await (0, enrichment_1.getVirusTotalIp)(ip);
            const stats = vtIp.data.attributes.last_analysis_stats;
            updates.ip_malicious = stats.malicious > 0;
            recordTool(state, 'virustotal_ip', `Malicious hits: ${stats.malicious}`, vtIp);
        }
    }
    if (state.plan?.tools.includes('domain_intel')) {
        const domain = state.event.artifacts.domain || (state.event.artifacts.url ? new URL(state.event.artifacts.url).hostname : null);
        if (domain) {
            const vtDomain = await (0, enrichment_1.getVirusTotalDomain)(domain);
            const stats = vtDomain.data.attributes.last_analysis_stats;
            updates.domain_malicious = stats.malicious > 0;
            recordTool(state, 'virustotal_domain', `Malicious hits: ${stats.malicious}`, vtDomain);
        }
    }
    return updates;
};
// Node 5: Email Auth (Mock)
const authNode = async (state) => {
    if (!state.plan?.tools.includes('email_auth'))
        return {};
    // Mock failing SPF for phishing demo
    const spf_pass = false;
    recordTool(state, 'auth_check', `SPF check failed for sender ${state.event.artifacts.sender}`);
    return { spf_pass };
};
// Node 6/7/8: Scoring & Decision
const decisionNode = async (state) => {
    let score = 0;
    const evidence = [];
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
    let classification = 'LOW';
    let action = 'allow';
    if (score >= 70) {
        classification = 'HIGH';
        action = state.event.context.privilegedUser ? 'analyst_review' : (state.event.eventType === 'login' ? 'block_session' : 'quarantine_email');
    }
    else if (score >= 30) {
        classification = 'MEDIUM';
        action = 'require_mfa';
    }
    recordTool(state, 'policy_engine', `Risk Score computed: ${score} (${classification}). Policy action: ${action}`);
    return { risk_score: score, risk_level: classification, action, evidence_list: evidence };
};
// Node 9: Persist
const persistNode = async (state) => {
    const caseId = state.event.eventId;
    (0, db_1.saveCase)({
        caseId,
        eventId: state.event.eventId,
        eventType: state.event.eventType,
        riskScore: state.risk_score,
        classification: state.risk_level,
        action: state.action,
        actionStatus: 'executed',
        evidenceList: state.evidence_list,
        createdAt: new Date().toISOString()
    });
    for (const tc of state.tool_calls) {
        (0, db_1.saveToolCall)({
            ...tc,
            caseId
        });
    }
    return {};
};
// Build the Graph
exports.workflow = new langgraph_1.StateGraph({ channels: graphStateChannels })
    .addNode('planner', plannerNode)
    .addNode('threat_intel', threatIntelNode)
    .addNode('behavior', behaviorNode)
    .addNode('auth', authNode)
    .addNode('decision', decisionNode)
    .addNode('persist', persistNode)
    // Edges
    .addEdge(langgraph_1.START, 'planner')
    .addEdge('planner', 'threat_intel')
    .addEdge('threat_intel', 'behavior')
    .addEdge('behavior', 'auth')
    .addEdge('auth', 'decision')
    .addEdge('decision', 'persist')
    .addEdge('persist', langgraph_1.END);
exports.appWorkflow = exports.workflow.compile();
async function runInvestigation(event) {
    const initialState = (0, state_1.InitialState)();
    initialState.event = event;
    const finalState = await exports.appWorkflow.invoke(initialState);
    return finalState;
}
