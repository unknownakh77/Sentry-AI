import { NormalizedEvent, ToolCall } from '@sentry/shared';

// Define the Graph State
export interface AgentState {
  // Input
  event: NormalizedEvent;
  
  // Output from Node 1 (Planner)
  plan: {
    tools: string[];
    reasoning: string;
  } | null;

  // Node 2 (Intent)
  intent_score: number | null;
  intent_flags: string[];

  // Node 3 (Behavior)
  impossible_travel: boolean;
  new_login_location: boolean;
  unusual_device: boolean;
  repeated_login_failures: boolean;
  off_hours_login: boolean;
  login_history_summary: string | null;

  // Node 4 (Threat Intel)
  geo_location: any | null;
  vpn_detected: boolean | null;
  ip_malicious: boolean | null;
  ip_malicious_count: number;
  domain_malicious: boolean | null;
  domain_malicious_count: number;

  // Node 5 (Auth logic)
  spf_pass: boolean | null;

  // Node 6 (Reasoning)
  evidence_list: string[];

  // Node 7 & 8 (Score & Decision)
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  action: string | null;
  guidance?: {
    summary: string;
    threatContext: string;
    containmentSteps: string[];
    escalationAdvice: string;
  };
  tool_calls: ToolCall[];
}

export const InitialState = (): AgentState => ({
  event: null as any, // Set dynamically
  plan: null,
  intent_score: null,
  intent_flags: [],
  impossible_travel: false,
  new_login_location: false,
  unusual_device: false,
  repeated_login_failures: false,
  off_hours_login: false,
  login_history_summary: null,
  geo_location: null,
  vpn_detected: null,
  ip_malicious: null,
  ip_malicious_count: 0,
  domain_malicious: null,
  domain_malicious_count: 0,
  spf_pass: null,
  evidence_list: [],
  risk_score: 0,
  risk_level: null,
  action: null,
  tool_calls: [],
});

// A reducer object if using LangGraph's StateGraph. 
// For simplicity we will just mutate state or use simple reducers in our graph definition.
