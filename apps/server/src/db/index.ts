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

  CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    sourceIp TEXT NOT NULL,
    geo TEXT,
    timestamp TEXT NOT NULL,
    result TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY(caseId) REFERENCES cases(caseId)
  );

`);

// --- Data Access Functions ---

export function getRecentLogins(user: string, limit = 5) {
  const stmt = db.prepare('SELECT * FROM login_history WHERE user = ? ORDER BY timestamp DESC LIMIT ?');
  return stmt.all(user, limit);
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
  // Retries can re-run persist for the same logical tool call; ignore duplicate ids.
  const stmt = db.prepare('INSERT OR IGNORE INTO tool_calls (id, caseId, tool, status, latencyMs, summary, rawRef, createdAt) VALUES (@id, @caseId, @tool, @status, @latencyMs, @summary, @rawRef, @createdAt)');
  stmt.run(t);
}

export function getCase(caseId: string) {
  const caseData = db.prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId) as any;
  if (!caseData) return null;
  const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  const chatMessages = db.prepare('SELECT * FROM chat_messages WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  
  return { 
    ...caseData, 
    evidenceList: caseData.evidenceList ? JSON.parse(caseData.evidenceList) : [],
    guidance: caseData.guidance ? JSON.parse(caseData.guidance) : null,
    toolCalls, 
    chatMessages
  };
}

export function saveChatMessage(msg: { id: string, caseId: string, role: string, content: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO chat_messages (id, caseId, role, content, createdAt) VALUES (@id, @caseId, @role, @content, @createdAt)');
  stmt.run(msg);
}

export function getAllCases() {
  return db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
}

export default db;
