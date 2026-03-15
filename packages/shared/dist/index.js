"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseRecordSchema = exports.ActionResultSchema = exports.RiskClassificationSchema = exports.ToolCallSchema = exports.InvestigationPlanSchema = exports.RawEventSchema = exports.NormalizedEventSchema = exports.EventTypeSchema = void 0;
const zod_1 = require("zod");
exports.EventTypeSchema = zod_1.z.enum(['login', 'phishing_email', 'url_click', 'file_hash']);
exports.NormalizedEventSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    eventType: exports.EventTypeSchema,
    user: zod_1.z.string(),
    sourceIp: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    artifacts: zod_1.z.object({
        url: zod_1.z.string().nullable().optional(),
        domain: zod_1.z.string().nullable().optional(),
        sender: zod_1.z.string().nullable().optional(),
        subject: zod_1.z.string().nullable().optional(),
        fileHash: zod_1.z.string().nullable().optional(),
    }),
    context: zod_1.z.object({
        mfaUsed: zod_1.z.boolean().default(false),
        privilegedUser: zod_1.z.boolean().default(false),
        allowlistMatch: zod_1.z.boolean().default(false),
        sessionTag: zod_1.z.string().nullable().optional(),
    }),
});
// Can represent the raw incoming event before normalization
exports.RawEventSchema = zod_1.z.record(zod_1.z.any());
exports.InvestigationPlanSchema = zod_1.z.object({
    tools: zod_1.z.array(zod_1.z.string()),
    reasoning: zod_1.z.string(),
});
exports.ToolCallSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    tool: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'success', 'failure']),
    latencyMs: zod_1.z.number().optional(),
    summary: zod_1.z.string(),
    rawRef: zod_1.z.string().optional(), // Could be JSON strongified
    createdAt: zod_1.z.string().datetime(),
});
exports.RiskClassificationSchema = zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']);
exports.ActionResultSchema = zod_1.z.enum([
    'allow',
    'analyst_review',
    'block_session',
    'require_mfa',
    'quarantine_email',
    'block_url',
    'isolate_file'
]);
exports.CaseRecordSchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    eventId: zod_1.z.string(),
    eventType: exports.EventTypeSchema,
    riskScore: zod_1.z.number(),
    classification: exports.RiskClassificationSchema,
    action: exports.ActionResultSchema,
    actionStatus: zod_1.z.enum(['pending', 'executed', 'failed', 'rolled_back']),
    createdAt: zod_1.z.string().datetime(),
    evidenceList: zod_1.z.array(zod_1.z.string()).optional(), // Extracted for UI convenience
});
