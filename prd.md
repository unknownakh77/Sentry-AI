# Sentry AI: Step-by-Step Product Requirements & Implementation Guide
**Version:** 5.0 (Hackathon MVP, TD-oriented revision)
**Primary Track Fit:** TD Best AI Hack to Detect Financial Fraud

## Executive Summary
Sentry is an AI-powered security triage and fraud-prevention agent designed for a hackathon environment. Its purpose is to demonstrate that a compact AI agent can receive suspicious digital events, intelligently select investigation tools, analyze external threat intelligence and internal context, determine risk, and execute safe, reversible containment actions in near real-time.

---

## Phase 1: Product Definition & Constraints

### 1.1 Core Positioning & Framing
* **Focus:** Detect the signals that *precede* financial fraud.
* **Key Attack Vectors Covered:** Account takeover, phishing-driven compromise, suspicious sign-ins, and malicious infrastructure.
* **TD Framing:** Sentry catches the signals humans often miss at the early stage of fraud, blocking risky sessions or escalating with grounded evidence *before* fraudulent transactions occur.

### 1.2 Target Audience
* SOC Analysts, Fraud Analysts, Security Engineers, Hackathon Judges.

### 1.3 Design Principles & Constraints
* **Visible Agent Trajectory:** Show every step of the agent's thought process, tool calls, and scoring.
* **Small & Reliable:** Keep the MVP deterministic. Prioritize speed and reliability over feature depth.
* **Safe Actions Only:** Execute only safe, reversible containment actions (no deep destructive actions).
* **No Device Fingerprinting:** Rely on clearer signals like login history, session metadata, allowlists, and threat intelligence.
* **Explicit Environment:** Ground the agent's reasoning in a simulated enterprise environment using seeded history and structured schemas.

### 1.4 Goals & Non-Goals
**Goals:**
* Triage 4 event types in a unified framework: *login attempt, phishing email, URL click, file hash submission*.
* Provide concise analyst-facing explanations backed by concrete evidence.
* Support a polished live demo with scenario replay, cached fallbacks, and visual storytelling.

**Non-Goals:**
* Do not build a full SIEM, fraud platform, or identity provider integration.
* Do not train a custom ML fraud model.
* Do not allow irreversible actions or depend on device fingerprinting.

---

## Phase 2: System Architecture & Data Models

### 2.1 Technology Stack
* **Frontend:** Next.js + Tailwind CSS
* **Backend:** Node.js + TypeScript + Express
* **Orchestration:** LangGraph.js (for explicit stateful graphs)
* **Storage:** SQLite (Audit + Case store)
* **Caching:** Redis or in-memory cache
* **LLM + Memory:** Backboard.io
* **Threat Intel APIs:** VirusTotal, AbuseIPDB, IPinfo, vpnapi.io (Optional: Google Safe Browsing)

### 2.2 System Architecture Flow
1. **Event Ingestion API** → Normalizes incoming events.
2. **Investigation Planner (AI)** → Decides which tools are needed.
3. **Tool Selection & Execution** → Gathers evidence.
4. **Threat Reasoning (AI)** → Summarizes findings.
5. **Deterministic Risk Scoring & Policy Check** → Evaluates risk level.
6. **Automated Response / Analyst Route** → Executes safe containment.
7. **SOC Dashboard & Audit Trail** → Displays full results.

### 2.3 Data Models
**Normalized Event Schema:**
```json
{ 
  "eventId": "uuid", 
  "eventType": "login|phishing_email|url_click|file_hash", 
  "user": "string", 
  "sourceIp": "string", 
  "timestamp": "ISO-8601", 
  "artifacts": { "url": null, "domain": null, "sender": null, "subject": null, "fileHash": null }, 
  "context": { "mfaUsed": false, "privilegedUser": false, "allowlistMatch": false, "sessionTag": null } 
}
```

**SQLite Tables:**
* `cases`: caseId, eventId, eventType, riskScore, classification, action, actionStatus, createdAt
* `tool_calls`: id, caseId, tool, status, latencyMs, summary, rawRef, createdAt
* `audit_logs`: id, caseId, action, actor, status, reason, createdAt
* `login_history`: user, sourceIp, geo, timestamp, result
* `allowlists`: type, value, description
* `scenario_context`: scenarioName, key, value

---

## Phase 3: The AI Agent Workflow (LangGraph)

The core brain of Sentry is the Investigation Planner, built on LangGraph.js.

### 3.1 Node Sequence Pipeline
* **Node 0 (Ingestion):** Receive, validate, scale, and route event.
* **Node 1 (Planner):** Read event, output JSON tool plan (chooses which checks to run).
* **Node 2 (Intent Analysis):** LLM scores phishing/messages for urgency, secrecy, financial pressure.
* **Node 3 (Behavior Analysis):** Checks login history, impossible travel, and allowlists.
* **Node 4 (Threat Intel):** Calls external APIs (VirusTotal, IPinfo, vpnapi.io).
* **Node 5 (Email Auth):** Checks SPF/DKIM/DMARC (if applicable).
* **Node 6 (Threat Reasoning):** LLM creates a concise, grounded evidence summary.
* **Node 7 (Risk Scoring):** Deterministic weighted model.
* **Node 8 (Action Decision):** Policy engine selects containment action.
* **Node 9 (Persist):** Writes case to SQLite and UI.

### 3.2 Deterministic Risk Scoring Weights
* **+40:** Malicious IP (VirusTotal / AbuseIPDB).
* **+30:** Impossible travel limits.
* **+20:** VPN/proxy/Tor detected (vpnapi.io).
* **+20:** High LLM intent score (>0.70) for urgency/financial pressure.
* **+15:** SPF/DKIM/DMARC failure.
* **+10 to +20:** Unknown or suspicious session context.
* **-25:** Known office IP or allowlist match.

**Thresholds:** LOW (0-29), MEDIUM (30-69), HIGH (70+).

---

## Phase 4: Step-by-Step Build & Execution Plan

Follow this exact sequence to build the MVP efficiently, completing one step before moving to the next.

### Step 1: Project Skeleton & Shared Types
* Initialize monorepo (`apps/web` for Next.js, `apps/server` for Node/Express).
* Define shared TypeScript interfaces: `RawEvent`, `NormalizedEvent`, `InvestigationPlan`, `CaseRecord`, `ToolCall`, `ActionResult`.
* Do not implement authentication yet.

### Step 2: Schemas & Seed Scenarios
* Write Zod schemas for event validation.
* Seed four mock scenarios: `safe_login`, `malicious_login`, `phishing_email`, `url_click`.
* Build a `/api/scenarios/:name/replay` endpoint that returns a normalized event.

### Step 3: Server-side Enrichment Clients
* Build wrapper functions for VirusTotal, AbuseIPDB, IPinfo, vpnapi.io.
* Implement strict timeouts, latency measurement, and fixture fallbacks (mock data for failures).
* Implement simple TTL caching. Ensure no API calls occur directly from the frontend.

### Step 4: Context Store
* Setup SQLite database with tables: `cases`, `tool_calls`, `audit_logs`, `login_history`, `allowlists`, `scenario_context`.
* Write lightweight access functions (e.g., `getRecentLogins`, `writeAuditLog`).

### Step 5: LangGraph Planner & Workflow
* Build the agent graph with nodes 0 to 9.
* Ensure the output of Node 1 (Planner) is structured JSON.
* Ensure the final output is a completed, persistent `CaseRecord`.

### Step 6: Action Engine
* Implement reversible simulated actions: `allow`, `block_session`, `require_mfa`, `quarantine_email`, `block_url`.
* Every action must write to `audit_logs`.
* Implement a rollback function (`/api/actions/:caseId/rollback`).

### Step 7: SOC Dashboard (Frontend Phase A)
* Build the main dashboard using a Next.js side-nav layout (Deep blue nav, light content area).
* Add top summary metric cards.
* Add an incoming alerts data table.
* Build scenario simulator trigger buttons on the UI.

### Step 8: Investigation Detail View (Frontend Phase B)
* Create the detailed view for a selected case.
* Show the full explicit agent pipeline (Planner output -> Tool Calls -> Evidence -> Score -> Decision).
* Embed rollback buttons and audit logs.

### Step 9: Polish & Resilience
* Add loading spinners, provider failure banners, and demo-mode toggles.
* Sanitize LLM text before rendering.
* Rehearse the presentation flow to ensure speed (<3s on cached runs).

---

## Phase 5: Testing & Demo Scenarios
Your live demo should prove the value of Sentry in less than a minute.

**Demo Flow:**
1. **The Baseline:** Run **Safe Login** (Known user, trusted IP) → Results in LOW risk, Allowlet matched.
2. **The Catch (Core Demo):** Run **Malicious Login** (Banking user, Russia IP, VPN active, recent login from Canada) → Planner selects geolocation tools → Graph detects VPN & impossible travel → HIGH risk → Blocks session + requires MFA. *Narrative: This blocked the session before the fraudster could drain funds.*
3. **The Precursor:** Run **Phishing Email** (Typosquatted sender, urgent payment link, SPF fail) → LLM flags urgency, graph detects bad domain → Quarantines email *before* credential theft occurs.

**Success Metrics:**
* End-to-end latency < 3s (cached).
* Every high-risk case shows at least 2 concrete evidence items.
* Demo survives external API outages utilizing fallback fixtures.
