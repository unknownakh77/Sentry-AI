import { z } from 'zod';
export declare const EventTypeSchema: z.ZodEnum<["login", "phishing_email", "url_click", "file_hash"]>;
export type EventType = z.infer<typeof EventTypeSchema>;
export declare const NormalizedEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodEnum<["login", "phishing_email", "url_click", "file_hash"]>;
    user: z.ZodString;
    sourceIp: z.ZodString;
    timestamp: z.ZodString;
    artifacts: z.ZodObject<{
        url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        domain: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        sender: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        subject: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        fileHash: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        url?: string | null | undefined;
        domain?: string | null | undefined;
        sender?: string | null | undefined;
        subject?: string | null | undefined;
        fileHash?: string | null | undefined;
    }, {
        url?: string | null | undefined;
        domain?: string | null | undefined;
        sender?: string | null | undefined;
        subject?: string | null | undefined;
        fileHash?: string | null | undefined;
    }>;
    context: z.ZodObject<{
        mfaUsed: z.ZodDefault<z.ZodBoolean>;
        privilegedUser: z.ZodDefault<z.ZodBoolean>;
        allowlistMatch: z.ZodDefault<z.ZodBoolean>;
        sessionTag: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        mfaUsed: boolean;
        privilegedUser: boolean;
        allowlistMatch: boolean;
        sessionTag?: string | null | undefined;
    }, {
        mfaUsed?: boolean | undefined;
        privilegedUser?: boolean | undefined;
        allowlistMatch?: boolean | undefined;
        sessionTag?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    eventType: "login" | "phishing_email" | "url_click" | "file_hash";
    user: string;
    sourceIp: string;
    timestamp: string;
    artifacts: {
        url?: string | null | undefined;
        domain?: string | null | undefined;
        sender?: string | null | undefined;
        subject?: string | null | undefined;
        fileHash?: string | null | undefined;
    };
    context: {
        mfaUsed: boolean;
        privilegedUser: boolean;
        allowlistMatch: boolean;
        sessionTag?: string | null | undefined;
    };
}, {
    eventId: string;
    eventType: "login" | "phishing_email" | "url_click" | "file_hash";
    user: string;
    sourceIp: string;
    timestamp: string;
    artifacts: {
        url?: string | null | undefined;
        domain?: string | null | undefined;
        sender?: string | null | undefined;
        subject?: string | null | undefined;
        fileHash?: string | null | undefined;
    };
    context: {
        mfaUsed?: boolean | undefined;
        privilegedUser?: boolean | undefined;
        allowlistMatch?: boolean | undefined;
        sessionTag?: string | null | undefined;
    };
}>;
export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;
export declare const RawEventSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
export type RawEvent = z.infer<typeof RawEventSchema>;
export declare const InvestigationPlanSchema: z.ZodObject<{
    tools: z.ZodArray<z.ZodString, "many">;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tools: string[];
    reasoning: string;
}, {
    tools: string[];
    reasoning: string;
}>;
export type InvestigationPlan = z.infer<typeof InvestigationPlanSchema>;
export declare const ToolCallSchema: z.ZodObject<{
    id: z.ZodString;
    caseId: z.ZodString;
    tool: z.ZodString;
    status: z.ZodEnum<["pending", "success", "failure"]>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    summary: z.ZodString;
    rawRef: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "success" | "failure";
    id: string;
    caseId: string;
    tool: string;
    summary: string;
    createdAt: string;
    latencyMs?: number | undefined;
    rawRef?: string | undefined;
}, {
    status: "pending" | "success" | "failure";
    id: string;
    caseId: string;
    tool: string;
    summary: string;
    createdAt: string;
    latencyMs?: number | undefined;
    rawRef?: string | undefined;
}>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export declare const RiskClassificationSchema: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
export type RiskClassification = z.infer<typeof RiskClassificationSchema>;
export declare const ActionResultSchema: z.ZodEnum<["allow", "analyst_review", "block_session", "require_mfa", "quarantine_email", "block_url", "isolate_file"]>;
export type ActionResult = z.infer<typeof ActionResultSchema>;
export declare const CaseRecordSchema: z.ZodObject<{
    caseId: z.ZodString;
    eventId: z.ZodString;
    eventType: z.ZodEnum<["login", "phishing_email", "url_click", "file_hash"]>;
    riskScore: z.ZodNumber;
    classification: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
    action: z.ZodEnum<["allow", "analyst_review", "block_session", "require_mfa", "quarantine_email", "block_url", "isolate_file"]>;
    actionStatus: z.ZodEnum<["pending", "executed", "failed", "rolled_back"]>;
    createdAt: z.ZodString;
    evidenceList: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    eventType: "login" | "phishing_email" | "url_click" | "file_hash";
    caseId: string;
    createdAt: string;
    riskScore: number;
    classification: "LOW" | "MEDIUM" | "HIGH";
    action: "allow" | "analyst_review" | "block_session" | "require_mfa" | "quarantine_email" | "block_url" | "isolate_file";
    actionStatus: "pending" | "executed" | "failed" | "rolled_back";
    evidenceList?: string[] | undefined;
}, {
    eventId: string;
    eventType: "login" | "phishing_email" | "url_click" | "file_hash";
    caseId: string;
    createdAt: string;
    riskScore: number;
    classification: "LOW" | "MEDIUM" | "HIGH";
    action: "allow" | "analyst_review" | "block_session" | "require_mfa" | "quarantine_email" | "block_url" | "isolate_file";
    actionStatus: "pending" | "executed" | "failed" | "rolled_back";
    evidenceList?: string[] | undefined;
}>;
export type CaseRecord = z.infer<typeof CaseRecordSchema>;
