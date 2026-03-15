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
    createdAt TEXT NOT NULL
  );

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

  CREATE TABLE IF NOT EXISTS scenario_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenarioName TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL
  );
`);

// --- Seed Initial Data for Demo ---
const seedAllowlists = db.prepare('INSERT OR IGNORE INTO allowlists (id, type, value, description) VALUES (?, ?, ?, ?)');
seedAllowlists.run(1, 'ip', '192.168.1.50', 'Trusted Office Network');
seedAllowlists.run(2, 'domain', 'c0rp-support.com', 'Fake Domain for Phishing Demo');

const seedLogins = db.prepare('INSERT OR IGNORE INTO login_history (id, user, sourceIp, geo, timestamp, result) VALUES (?, ?, ?, ?, ?, ?)');
const yesterday = new Date(Date.now() - 86400000).toISOString();
const hourAgo = new Date(Date.now() - 3600000).toISOString();
const CanadaGeo = 'Toronto, Ontario, CA';

seedLogins.run(1, 'bob.banking@corp.com', '198.51.100.10', CanadaGeo, yesterday, 'success');
seedLogins.run(2, 'bob.banking@corp.com', '198.51.100.10', CanadaGeo, hourAgo, 'success');

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

export function saveCase(c: { caseId: string, eventId: string, eventType: string, riskScore: number, classification: string, action: string, actionStatus: string, evidenceList?: string[], createdAt: string }) {
  const stmt = db.prepare('INSERT INTO cases (caseId, eventId, eventType, riskScore, classification, action, actionStatus, evidenceList, createdAt) VALUES (@caseId, @eventId, @eventType, @riskScore, @classification, @action, @actionStatus, @evidenceList, @createdAt)');
  stmt.run({
    ...c,
    evidenceList: c.evidenceList ? JSON.stringify(c.evidenceList) : null
  });
}

export function saveToolCall(t: { id: string, caseId: string, tool: string, status: string, latencyMs?: number, summary: string, rawRef?: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO tool_calls (id, caseId, tool, status, latencyMs, summary, rawRef, createdAt) VALUES (@id, @caseId, @tool, @status, @latencyMs, @summary, @rawRef, @createdAt)');
  stmt.run(t);
}

export function getCase(caseId: string) {
  const caseData = db.prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId);
  if (!caseData) return null;
  const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  return { ...caseData, toolCalls, auditLogs };
}

export function getAllCases() {
  return db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
}

export default db;
