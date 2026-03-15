import { Router } from 'express';
import { closeCase, getActiveCases, getAllCases, getCase, getClosedCases, getRecentOverrides, getVerdictStats, saveChatMessage, submitVerdict, updateAdaptiveRule } from '../db';
import { answerCaseQuestion, reflectOnOverride } from '../services/ai';
import { lookupThreatIndicator } from '../services/threatIntel';
import { generateVoiceBrief } from '../services/voice';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all cases
router.get('/', (_req, res) => {
  try {
    const cases = getActiveCases();
    res.json({ cases });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent 5 cases for dashboard
router.get('/recent', (_req, res) => {
  try {
    const cases = getActiveCases().slice(0, 5);
    res.json({ cases });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Chatbot: Ask Sentry AI (case-aware)
router.post('/:id/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const caseId = req.params.id;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    saveChatMessage({ id: uuidv4(), caseId, role: 'user', content: message, createdAt: new Date().toISOString() });

    const chatHistory = (caseData.chatMessages || []) as Array<{ role: string; content: string }>;
    const aiResponse = await answerCaseQuestion(caseData, message, chatHistory);

    const assistantMsg = { id: uuidv4(), caseId, role: 'assistant', content: aiResponse, createdAt: new Date().toISOString() };
    saveChatMessage(assistantMsg);

    res.json({ message: assistantMsg });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verdict: Confirm / Override / Escalate
router.post('/:id/verdict', async (req, res) => {
  try {
    const caseId = req.params.id;
    const { verdictStatus, verdictAction, verdictReason } = req.body as {
      verdictStatus: 'confirmed' | 'overridden' | 'escalated';
      verdictAction?: string;
      verdictReason?: string;
    };

    if (!['confirmed', 'overridden', 'escalated'].includes(verdictStatus)) {
      return res.status(400).json({ error: 'verdictStatus must be confirmed, overridden, or escalated' });
    }

    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    let verdictReflection = null;

    if (verdictStatus === 'overridden' && verdictAction && verdictReason) {
      const recentOverrides = getRecentOverrides(10).map((c: any) => ({
        eventType: c.eventType,
        originalAction: c.action,
        overrideAction: c.verdictAction || '',
        reason: c.verdictReason || '',
        riskScore: c.riskScore,
      }));
      verdictReflection = await reflectOnOverride(caseData, verdictAction, verdictReason, recentOverrides);
    }

    submitVerdict(caseId, { verdictStatus, verdictAction, verdictReason, verdictReflection });

    const updated = getCase(caseId);
    res.json({ success: true, caseData: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Accept or reject an adaptive rule
router.post('/:id/adaptive-rule', (req, res) => {
  try {
    const { accepted, rule } = req.body as { accepted: boolean; rule?: any };
    const caseId = req.params.id;
    const caseData = getCase(caseId);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });
    updateAdaptiveRule(caseId, rule || caseData.adaptiveRule, accepted);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verdict stats for dashboard (agent accuracy)
router.get('/verdict-stats', (_req, res) => {
  try {
    res.json(getVerdictStats());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Threat Intel Lookup
router.post('/threat-intel/lookup', async (req, res) => {
  try {
    const { query, type } = req.body as { query?: string; type?: 'ip' | 'url' | 'file_hash' };
    if (!query || !type) {
      return res.status(400).json({ error: 'Both query and type are required.' });
    }

    const result = await lookupThreatIndicator(query, type);
    res.json({ result });
  } catch (error: any) {
    const message = String(error?.message || '');
    if (
      message === 'Indicator query is required' ||
      message === 'Please enter a valid IP address.' ||
      message === 'Please enter a valid URL.' ||
      message === 'Please enter a valid file hash.'
    ) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message || 'Threat intelligence lookup failed.' });
  }
});

router.get('/closed', (_req, res) => {
  try {
    const cases = getClosedCases();
    res.json({ cases });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/risk-trend', (_req, res) => {
  try {
    const cases = getAllCases() as any[];

    const now = new Date();
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);
    const startHour = new Date(endHour);
    startHour.setHours(startHour.getHours() - 23);

    const buckets = new Map<
      string,
      {
        timestamp: string;
        totalCases: number;
        lowCount: number;
        mediumCount: number;
        highCount: number;
        statusDistribution: { open: number; closed: number };
      }
    >();

    for (let i = 0; i < 24; i++) {
      const bucketDate = new Date(startHour);
      bucketDate.setHours(startHour.getHours() + i);
      const bucketTimestamp = bucketDate.toISOString().slice(0, 13) + ':00:00.000Z';
      buckets.set(bucketTimestamp, {
        timestamp: bucketTimestamp,
        totalCases: 0,
        lowCount: 0,
        mediumCount: 0,
        highCount: 0,
        statusDistribution: { open: 0, closed: 0 },
      });
    }

    for (const item of cases) {
      const caseTimestamp = item.createdAt;
      if (!caseTimestamp) continue;

      const eventTime = new Date(caseTimestamp);
      if (eventTime < startHour || eventTime > now) continue;

      const bucketDate = new Date(eventTime);
      bucketDate.setMinutes(0, 0, 0);
      const bucketTimestamp = bucketDate.toISOString().slice(0, 13) + ':00:00.000Z';
      const bucket = buckets.get(bucketTimestamp);
      if (!bucket) continue;

      const inferredSeverity =
        item.finalSeverity ||
        item.guidance?.investigationReport?.finalVerdict?.severity ||
        item.classification ||
        'Medium';
      const normalizedSeverity =
        inferredSeverity === 'LOW'
          ? 'Low'
          : inferredSeverity === 'MEDIUM'
          ? 'Medium'
          : inferredSeverity === 'HIGH'
          ? 'High'
          : inferredSeverity;
      const status = String(item.actionStatus).toLowerCase() === 'closed' ? 'closed' : 'open';

      bucket.totalCases += 1;
      if (normalizedSeverity === 'Low') {
        bucket.lowCount += 1;
      } else if (normalizedSeverity === 'Medium') {
        bucket.mediumCount += 1;
      } else {
        // Treat Critical as part of High trend for analyst visibility.
        bucket.highCount += 1;
      }
      bucket.statusDistribution[status] += 1;
    }

    const trend = Array.from(buckets.values()).map((bucket) => ({
      timestamp: bucket.timestamp,
      totalCases: bucket.totalCases,
      lowCount: bucket.lowCount,
      mediumCount: bucket.mediumCount,
      highCount: bucket.highCount,
      statusDistribution: bucket.statusDistribution,
    }));

    res.json({ trend });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific case with details
router.get('/:id', (req, res) => {
  try {
    const caseData = getCase(req.params.id);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json({ caseData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/close', (req, res) => {
  try {
    const caseData = getCase(req.params.id) as any;
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const report = caseData.guidance?.investigationReport;

    const { finalClassification, analystConfirmed } = req.body as {
      finalClassification?: 'False Positive' | 'Benign Activity' | 'Suspicious Activity' | 'Confirmed Security Incident';
      analystConfirmed?: boolean;
    };

    if (!finalClassification) {
      return res.status(400).json({ error: 'Final classification is required before closure.' });
    }
    if (!analystConfirmed) {
      return res.status(400).json({ error: 'Analyst confirmation is required before closure.' });
    }

    const severityFromFinalClassification: Record<typeof finalClassification, 'Low' | 'Medium' | 'High' | 'Critical'> = {
      'False Positive': 'Low',
      'Benign Activity': 'Low',
      'Suspicious Activity': 'Medium',
      'Confirmed Security Incident': 'High',
    };
    const severity = (report?.finalVerdict?.severity as 'Low' | 'Medium' | 'High' | 'Critical' | undefined) ||
      severityFromFinalClassification[finalClassification];

    closeCase(req.params.id, {
      finalClassification,
      finalSeverity: severity,
      analystConfirmed,
      closedAt: new Date().toISOString(),
    });

    const updatedCase = getCase(req.params.id);
    res.json({ success: true, caseData: updatedCase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/report', (req, res) => {
  try {
    const caseData = getCase(req.params.id) as any;
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (caseData.actionStatus !== 'closed') {
      return res.status(400).json({ error: 'Case report is available only after case closure.' });
    }

    const report = caseData.guidance?.investigationReport;
    if (!report) {
      return res.status(400).json({ error: 'No investigation report available for this case.' });
    }

    res.json({
      report: {
        caseId: caseData.caseId,
        closedAt: caseData.closedAt,
        analystConfirmed: !!caseData.analystConfirmed,
        finalClassification: caseData.finalClassification,
        finalSeverity: caseData.finalSeverity,
        alertSummary: report.alertSummary,
        riskClassification: report.riskClassification,
        mitreMapping: report.mitreMapping,
        threatIntelligence: report.threatIntelligence,
        behavioralAnalysis: report.behavioralAnalysis,
        recommendedSocActions: report.recommendedSocActions,
        finalVerdict: report.finalVerdict,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Attack Storyline for a case
router.get('/:id/storyline', (req, res) => {
  try {
    const caseData = getCase(req.params.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const allCases = getAllCases() as any[];
    const currentCase = caseData;

    const getIp = (c: any) => {
       if (c.eventType === 'login') return '198.51.100.10'; // Shared demo IP
       return '8.8.8.8';
    };

    const currentIp = getIp(currentCase);
    const currentUser = currentCase.user || 'bob.banking@corp.com'; // Default demo user

    const related = allCases.filter(c => 
      c.caseId !== req.params.id && 
      (c.user === currentUser || getIp(c) === currentIp)
    );

    const chain: any = {
      chainId: uuidv4(),
      subject: currentUser,
      links: [
        ...related.map(m => ({ 
          caseId: m.caseId, 
          eventType: m.eventType, 
          timestamp: m.createdAt, 
          riskScore: m.riskScore,
          classification: m.classification
        })),
        { 
          caseId: req.params.id, 
          eventType: currentCase.eventType, 
          timestamp: currentCase.createdAt, 
          riskScore: currentCase.riskScore,
          classification: currentCase.classification
        }
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
      correlationReason: related.length > 0 
        ? `Sentry AI correlated ${related.length + 1} events across User and IP indicators, detecting a potential fraud attack chain.`
        : `Baseline analysis complete. No prior related events detected for this identity within the current retention window.`,
      createdAt: new Date().toISOString()
    };

    res.json({ chain });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/brief', async (req, res) => {
  try {
    const caseData = getCase(req.params.id);
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    const text = `Case briefing for ${caseData.caseId.slice(0, 8)}. ` +
                 `This is a ${caseData.classification} risk ${caseData.eventType} event. ` +
                 `Our analysis detected ${caseData.evidenceList?.join(' and ')}. ` +
                 `Sentry AI recommends ${caseData.guidance?.summary}`;

    const audio = await generateVoiceBrief(text);
    if (!audio) return res.status(500).json({ error: 'Failed to generate audio' });

    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
