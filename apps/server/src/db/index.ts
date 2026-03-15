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
    finalClassification TEXT,
    finalSeverity TEXT,
    analystConfirmed INTEGER DEFAULT 0,
    closedAt TEXT,
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
try {
  db.exec("ALTER TABLE cases ADD COLUMN finalClassification TEXT;");
} catch (e) {
  // Column already exists, ignore
}
try {
  db.exec("ALTER TABLE cases ADD COLUMN finalSeverity TEXT;");
} catch (e) {
  // Column already exists, ignore
}
try {
  db.exec("ALTER TABLE cases ADD COLUMN analystConfirmed INTEGER DEFAULT 0;");
} catch (e) {
  // Column already exists, ignore
}
try {
  db.exec("ALTER TABLE cases ADD COLUMN closedAt TEXT;");
} catch (e) {
  // Column already exists, ignore
}
try {
  db.exec("ALTER TABLE cases ADD COLUMN plannerOutput TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN aiExplanation TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN verdictStatus TEXT DEFAULT 'pending_review';");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN verdictAction TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN verdictReason TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN verdictReflection TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN adaptiveRule TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE cases ADD COLUMN adaptiveRuleAccepted INTEGER DEFAULT 0;");
} catch (e) {}

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
  plannerOutput?: any,
  aiExplanation?: any,
  finalClassification?: string | null,
  finalSeverity?: string | null,
  analystConfirmed?: boolean,
  closedAt?: string | null,
  createdAt: string
}) {
  const stmt = db.prepare(
    'INSERT INTO cases (caseId, eventId, eventType, riskScore, classification, action, actionStatus, evidenceList, guidance, plannerOutput, aiExplanation, finalClassification, finalSeverity, analystConfirmed, closedAt, createdAt, verdictStatus) VALUES (@caseId, @eventId, @eventType, @riskScore, @classification, @action, @actionStatus, @evidenceList, @guidance, @plannerOutput, @aiExplanation, @finalClassification, @finalSeverity, @analystConfirmed, @closedAt, @createdAt, @verdictStatus)'
  );
  stmt.run({
    ...c,
    evidenceList: c.evidenceList ? JSON.stringify(c.evidenceList) : null,
    guidance: c.guidance ? JSON.stringify(c.guidance) : null,
    plannerOutput: c.plannerOutput ? JSON.stringify(c.plannerOutput) : null,
    aiExplanation: c.aiExplanation ? JSON.stringify(c.aiExplanation) : null,
    finalClassification: c.finalClassification || null,
    finalSeverity: c.finalSeverity || null,
    analystConfirmed: c.analystConfirmed ? 1 : 0,
    closedAt: c.closedAt || null,
    verdictStatus: 'pending_review',
  });
}

export function saveToolCall(t: { id: string, caseId: string, tool: string, status: string, latencyMs?: number, summary: string, rawRef?: string, createdAt: string }) {
  // Retries can re-run persist for the same logical tool call; ignore duplicate ids.
  const stmt = db.prepare('INSERT OR IGNORE INTO tool_calls (id, caseId, tool, status, latencyMs, summary, rawRef, createdAt) VALUES (@id, @caseId, @tool, @status, @latencyMs, @summary, @rawRef, @createdAt)');
  stmt.run(t);
}

function parseCase(caseData: any) {
  return {
    ...caseData,
    evidenceList: caseData.evidenceList ? JSON.parse(caseData.evidenceList) : [],
    guidance: caseData.guidance ? JSON.parse(caseData.guidance) : null,
    plannerOutput: caseData.plannerOutput ? JSON.parse(caseData.plannerOutput) : null,
    aiExplanation: caseData.aiExplanation ? JSON.parse(caseData.aiExplanation) : null,
    verdictReflection: caseData.verdictReflection ? JSON.parse(caseData.verdictReflection) : null,
    adaptiveRule: caseData.adaptiveRule ? JSON.parse(caseData.adaptiveRule) : null,
    analystConfirmed: !!caseData.analystConfirmed,
    adaptiveRuleAccepted: !!caseData.adaptiveRuleAccepted,
    verdictStatus: caseData.verdictStatus || 'pending_review',
  };
}

export function getCase(caseId: string) {
  const caseData = db.prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId) as any;
  if (!caseData) return null;
  const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  const chatMessages = db.prepare('SELECT * FROM chat_messages WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
  return { ...parseCase(caseData), toolCalls, chatMessages };
}

export function saveChatMessage(msg: { id: string, caseId: string, role: string, content: string, createdAt: string }) {
  const stmt = db.prepare('INSERT INTO chat_messages (id, caseId, role, content, createdAt) VALUES (@id, @caseId, @role, @content, @createdAt)');
  stmt.run(msg);
}

export function getAllCases() {
  const rows = db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all() as any[];
  return rows.map(parseCase);
}

export function getActiveCases() {
  const rows = db
    .prepare("SELECT * FROM cases WHERE actionStatus != 'closed' ORDER BY createdAt DESC")
    .all() as any[];
  return rows.map(parseCase);
}

export function getClosedCases() {
  const rows = db
    .prepare("SELECT * FROM cases WHERE actionStatus = 'closed' ORDER BY closedAt DESC, createdAt DESC")
    .all() as any[];
  return rows.map(parseCase);
}

export function getRecentOverrides(limit = 10) {
  const rows = db
    .prepare("SELECT * FROM cases WHERE verdictStatus = 'overridden' ORDER BY closedAt DESC, createdAt DESC LIMIT ?")
    .all(limit) as any[];
  return rows.map(parseCase);
}

export function submitVerdict(caseId: string, verdict: {
  verdictStatus: 'confirmed' | 'overridden' | 'escalated';
  verdictAction?: string;
  verdictReason?: string;
  verdictReflection?: any;
}) {
  const stmt = db.prepare(`
    UPDATE cases
    SET verdictStatus = @verdictStatus,
        verdictAction = @verdictAction,
        verdictReason = @verdictReason,
        verdictReflection = @verdictReflection
    WHERE caseId = @caseId
  `);
  stmt.run({
    caseId,
    verdictStatus: verdict.verdictStatus,
    verdictAction: verdict.verdictAction || null,
    verdictReason: verdict.verdictReason || null,
    verdictReflection: verdict.verdictReflection ? JSON.stringify(verdict.verdictReflection) : null,
  });
}

export function updateAdaptiveRule(caseId: string, rule: any, accepted: boolean) {
  const stmt = db.prepare(`
    UPDATE cases SET adaptiveRule = @adaptiveRule, adaptiveRuleAccepted = @accepted WHERE caseId = @caseId
  `);
  stmt.run({ caseId, adaptiveRule: rule ? JSON.stringify(rule) : null, accepted: accepted ? 1 : 0 });
}

export function getVerdictStats() {
  const rows = db.prepare("SELECT verdictStatus FROM cases WHERE verdictStatus IS NOT NULL").all() as any[];
  const stats = { confirmed: 0, overridden: 0, escalated: 0, pending_review: 0 };
  for (const row of rows) {
    const s = row.verdictStatus as string;
    if (s in stats) stats[s as keyof typeof stats]++;
  }
  const total = stats.confirmed + stats.overridden + stats.escalated;
  const accuracy = total > 0 ? Math.round((stats.confirmed / total) * 100) : null;
  return { ...stats, total, accuracy };
}

export function closeCase(caseId: string, closure: {
  finalClassification: 'False Positive' | 'Benign Activity' | 'Suspicious Activity' | 'Confirmed Security Incident';
  finalSeverity: 'Low' | 'Medium' | 'High' | 'Critical';
  analystConfirmed: boolean;
  closedAt: string;
}) {
  const stmt = db.prepare(`
    UPDATE cases
    SET actionStatus = 'closed',
        finalClassification = @finalClassification,
        finalSeverity = @finalSeverity,
        analystConfirmed = @analystConfirmed,
        closedAt = @closedAt
    WHERE caseId = @caseId
  `);
  return stmt.run({
    caseId,
    finalClassification: closure.finalClassification,
    finalSeverity: closure.finalSeverity,
    analystConfirmed: closure.analystConfirmed ? 1 : 0,
    closedAt: closure.closedAt,
  });
}

export default db;
