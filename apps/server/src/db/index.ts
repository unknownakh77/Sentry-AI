import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../sentry.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    caseId TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    riskScore INTEGER NOT NULL,
    classification TEXT NOT NULL,
    action TEXT NOT NULL,
    actionStatus TEXT NOT NULL,
    evidenceList TEXT, -- JSON array
    guidance TEXT, -- JSON object
    createdAt TEXT NOT NULL
  );

  --- Migration for existing tables ---
  PRAGMA foreign_keys=OFF;
`);

try {
  db.exec("ALTER TABLE cases ADD COLUMN guidance TEXT;");
} catch (e) {
  // Column already exists, ignore
}

db.exec(`
  CREATE TABLE IF NOT EXISTS tool_calls (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL,
    tool TEXT NOT NULL,
    status TEXT NOT NULL,
    latencyMs INTEGER,
    summary TEXT NOT NULL,
    rawRef TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(caseId) REFERENCES cases(caseId)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    sourceIp TEXT NOT NULL,
    geo TEXT,
    timestamp TEXT NOT NULL,
    result TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS allowlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userEmail TEXT NOT NULL,
    otp TEXT,
    isMfaTrusted INTEGER DEFAULT 0,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(caseId) REFERENCES cases(caseId)
  );

  CREATE TABLE IF NOT EXISTS attack_chains (
    chainId TEXT PRIMARY KEY,
    subject TEXT NOT NULL, -- user or IP
    links TEXT NOT NULL, -- JSON array of AttackChainLink
    correlationReason TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

// --- Data Access Functions ---

export function getRecentLogins(user: string, limit = 5) {
  const stmt = db.prepare('SELECT * FROM login_history WHERE user = ? ORDER BY timestamp DESC LIMIT ?');
  return stmt.all(user, limit);
}

export function getAllowlistMatch(type: string, value: string): boolean {
  const stmt = db.prepare('SELECT 1 FROM allowlists WHERE type = ? AND value = ?');
  const result = stmt.get(type, value);
  return !!result;
}

export function getScenarioContext(scenarioName: string, key: string): string | null {
  const stmt = db.prepare('SELECT value FROM scenario_context WHERE scenarioName = ? AND key = ?');
  const result = stmt.get(scenarioName, key) as any;
  return result ? result.value : null;
}

export function writeAuditLog(log: { id: string, caseId: string, action: string, actor: string, status: string, reason: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO audit_logs (id, caseId, action, actor, status, reason, createdAt) VALUES (@id, @caseId, @action, @actor, @status, @reason, @createdAt)');
  stmt.run(log);
}

export function saveCase(c: { 
  caseId: string, 
  eventId: string, 
  eventType: string, 
  riskScore: number, 
  classification: string, 
  action: string, 
  actionStatus: string, 
  evidenceList?: string[], 
  guidance?: any,
  createdAt: string 
}) {
  const stmt = db.prepare('INSERT INTO cases (caseId, eventId, eventType, riskScore, classification, action, actionStatus, evidenceList, guidance, createdAt) VALUES (@caseId, @eventId, @eventType, @riskScore, @classification, @action, @actionStatus, @evidenceList, @guidance, @createdAt)');
  stmt.run({
    ...c,
    evidenceList: c.evidenceList ? JSON.stringify(c.evidenceList) : null,
    guidance: c.guidance ? JSON.stringify(c.guidance) : null
  });
}

export function saveToolCall(t: { id: string, caseId: string, tool: string, status: string, latencyMs?: number, summary: string, rawRef?: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO tool_calls (id, caseId, tool, status, latencyMs, summary, rawRef, createdAt) VALUES (@id, @caseId, @tool, @status, @latencyMs, @summary, @rawRef, @createdAt)');
  stmt.run(t);
}

export function getCase(caseId: string) {
  const caseData = db.prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId) as any;
  if (!caseData) return null;
  const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  const chatMessages = db.prepare('SELECT * FROM chat_messages WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  
  return { 
    ...caseData, 
    evidenceList: caseData.evidenceList ? JSON.parse(caseData.evidenceList) : [],
    guidance: caseData.guidance ? JSON.parse(caseData.guidance) : null,
    toolCalls, 
    auditLogs,
    chatMessages
  };
}

export function saveChatMessage(msg: { id: string, caseId: string, role: string, content: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO chat_messages (id, caseId, role, content, createdAt) VALUES (@id, @caseId, @role, @content, @createdAt)');
  stmt.run(msg);
}

export function saveAttackChain(chain: { chainId: string, subject: string, links: any[], correlationReason: string, createdAt: string }) {
  const stmt = db.prepare('INSERT OR REPLACE INTO attack_chains (chainId, subject, links, correlationReason, createdAt) VALUES (@chainId, @subject, @links, @correlationReason, @createdAt)');
  stmt.run({
    ...chain,
    links: JSON.stringify(chain.links)
  });
}

export function getAttackChain(subject: string) {
  const stmt = db.prepare('SELECT * FROM attack_chains WHERE subject = ?');
  const result = stmt.get(subject) as any;
  if (!result) return null;
  return {
    ...result,
    links: JSON.parse(result.links)
  };
}

export function createSession(session: { id: string, userEmail: string, otp: string, expiresAt: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO sessions (id, userEmail, otp, expiresAt, createdAt) VALUES (@id, @userEmail, @otp, @expiresAt, @createdAt)');
  stmt.run(session);
}

export function getSession(id: string) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
}

export function verifySession(id: string) {
  db.prepare('UPDATE sessions SET isMfaTrusted = 1 WHERE id = ?').run(id);
}

export function getCasesByUser(userEmail: string) {
  return db.prepare('SELECT * FROM cases WHERE eventId IN (SELECT eventId FROM (SELECT eventId, user FROM cases) WHERE user = ?) ORDER BY createdAt DESC').all(userEmail);
}


export function getAllCases() {
  return db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
}

export default db;
