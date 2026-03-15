"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentLogins = getRecentLogins;
exports.getAllowlistMatch = getAllowlistMatch;
exports.getScenarioContext = getScenarioContext;
exports.writeAuditLog = writeAuditLog;
exports.saveCase = saveCase;
exports.saveToolCall = saveToolCall;
exports.getCase = getCase;
exports.getAllCases = getAllCases;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.resolve(__dirname, '../../sentry.db');
const db = new better_sqlite3_1.default(dbPath);
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
function getRecentLogins(user, limit = 5) {
    const stmt = db.prepare('SELECT * FROM login_history WHERE user = ? ORDER BY timestamp DESC LIMIT ?');
    return stmt.all(user, limit);
}
function getAllowlistMatch(type, value) {
    const stmt = db.prepare('SELECT 1 FROM allowlists WHERE type = ? AND value = ?');
    const result = stmt.get(type, value);
    return !!result;
}
function getScenarioContext(scenarioName, key) {
    const stmt = db.prepare('SELECT value FROM scenario_context WHERE scenarioName = ? AND key = ?');
    const result = stmt.get(scenarioName, key);
    return result ? result.value : null;
}
function writeAuditLog(log) {
    const stmt = db.prepare('INSERT INTO audit_logs (id, caseId, action, actor, status, reason, createdAt) VALUES (@id, @caseId, @action, @actor, @status, @reason, @createdAt)');
    stmt.run(log);
}
function saveCase(c) {
    const stmt = db.prepare('INSERT INTO cases (caseId, eventId, eventType, riskScore, classification, action, actionStatus, evidenceList, createdAt) VALUES (@caseId, @eventId, @eventType, @riskScore, @classification, @action, @actionStatus, @evidenceList, @createdAt)');
    stmt.run({
        ...c,
        evidenceList: c.evidenceList ? JSON.stringify(c.evidenceList) : null
    });
}
function saveToolCall(t) {
    const stmt = db.prepare('INSERT INTO tool_calls (id, caseId, tool, status, latencyMs, summary, rawRef, createdAt) VALUES (@id, @caseId, @tool, @status, @latencyMs, @summary, @rawRef, @createdAt)');
    stmt.run(t);
}
function getCase(caseId) {
    const caseData = db.prepare('SELECT * FROM cases WHERE caseId = ?').get(caseId);
    if (!caseData)
        return null;
    const toolCalls = db.prepare('SELECT * FROM tool_calls WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
    const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE caseId = ? ORDER BY createdAt ASC').all(caseId);
    return { ...caseData, toolCalls, auditLogs };
}
function getAllCases() {
    return db.prepare('SELECT * FROM cases ORDER BY createdAt DESC').all();
}
exports.default = db;
