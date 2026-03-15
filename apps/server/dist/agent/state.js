"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialState = void 0;
const InitialState = () => ({
    event: null, // Set dynamically
    plan: null,
    intent_score: null,
    intent_flags: [],
    impossible_travel: false,
    login_history_summary: null,
    geo_location: null,
    vpn_detected: null,
    ip_malicious: null,
    domain_malicious: null,
    spf_pass: null,
    evidence_list: [],
    risk_score: 0,
    risk_level: null,
    action: null,
    tool_calls: [],
});
exports.InitialState = InitialState;
// A reducer object if using LangGraph's StateGraph. 
// For simplicity we will just mutate state or use simple reducers in our graph definition.
