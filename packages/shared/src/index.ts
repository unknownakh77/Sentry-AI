import { z } from 'zod';

export const EventTypeSchema = z.enum(['login', 'phishing_email', 'url_click', 'file_hash']);
export type EventType = z.infer<typeof EventTypeSchema>;

export const NormalizedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: EventTypeSchema,
  user: z.string(),
  sourceIp: z.string(),
  timestamp: z.string().datetime(),
  artifacts: z.object({
    url: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    sender: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    fileHash: z.string().nullable().optional(),
  }),
  context: z.object({
    mfaUsed: z.boolean().default(false),
    privilegedUser: z.boolean().default(false),
    allowlistMatch: z.boolean().default(false),
    sessionTag: z.string().nullable().optional(),
  }),
});

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

// Can represent the raw incoming event before normalization
export const RawEventSchema = z.record(z.any());
export type RawEvent = z.infer<typeof RawEventSchema>;

export const InvestigationPlanSchema = z.object({
  tools: z.array(z.string()),
  reasoning: z.string(),
});
export type InvestigationPlan = z.infer<typeof InvestigationPlanSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  tool: z.string(),
  status: z.enum(['pending', 'success', 'failure']),
  latencyMs: z.number().optional(),
  summary: z.string(),
  rawRef: z.string().optional(), // Could be JSON strongified
  createdAt: z.string().datetime(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const RiskClassificationSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type RiskClassification = z.infer<typeof RiskClassificationSchema>;

export const ActionResultSchema = z.enum([
  'allow', 
  'analyst_review', 
  'block_session', 
  'require_mfa', 
  'quarantine_email', 
  'block_url', 
  'isolate_file'
]);
export type ActionResult = z.infer<typeof ActionResultSchema>;

export const CaseRecordSchema = z.object({
  caseId: z.string(),
  eventId: z.string(),
  eventType: EventTypeSchema,
  riskScore: z.number(),
  classification: RiskClassificationSchema,
  action: ActionResultSchema,
  actionStatus: z.enum(['pending', 'executed', 'failed', 'rolled_back']),
  createdAt: z.string().datetime(),
  evidenceList: z.array(z.string()).optional(), 
  guidance: z.object({
    summary: z.string(),
    threatContext: z.string(),
    containmentSteps: z.array(z.string()),
    escalationAdvice: z.string(),
  }).optional(),
});
export type CaseRecord = z.infer<typeof CaseRecordSchema>;

export const AttackChainLinkSchema = z.object({
  caseId: z.string(),
  eventType: EventTypeSchema,
  timestamp: z.string().datetime(),
  riskScore: z.number(),
});
export type AttackChainLink = z.infer<typeof AttackChainLinkSchema>;

export const AttackChainSchema = z.object({
  chainId: z.string(),
  subject: z.string(), // user or IP
  links: z.array(AttackChainLinkSchema),
  correlationReason: z.string(),
});
export type AttackChain = z.infer<typeof AttackChainSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ThreatIntelResultSchema = z.object({
  query: z.string(),
  type: z.enum(['ip', 'domain', 'url', 'file_hash']),
  reputation: z.string(),
  provider: z.string(),
  severity: z.enum(['CLEAN', 'SUSPICIOUS', 'MALICIOUS']),
  details: z.record(z.any()),
  summary: z.string(),
});
export type ThreatIntelResult = z.infer<typeof ThreatIntelResultSchema>;

export const AuthStatusSchema = z.object({
  isAuthenticated: z.boolean(),
  userEmail: z.string().optional(),
  isMfaTrusted: z.boolean().default(false),
});
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
