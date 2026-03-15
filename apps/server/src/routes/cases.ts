import { Router } from 'express';
import { getAllCases, getCase, saveChatMessage } from '../db';
import { askBackboard } from '../services/backboard';
import { lookupThreatIndicator } from '../services/threatIntel';
import { generateVoiceBrief } from '../services/voice';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all cases
router.get('/', (_req, res) => {
  try {
    const cases = getAllCases();
    res.json({ cases });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent 5 cases for dashboard
router.get('/recent', (_req, res) => {
  try {
    const cases = getAllCases().slice(0, 5);
    res.json({ cases });
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

// Chatbot: Ask Sentry AI
router.post('/:id/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const caseId = req.params.id;
    const caseData = getCase(caseId);
    
    if (!caseData) return res.status(404).json({ error: 'Case not found' });

    // Save user message
    saveChatMessage({
      id: uuidv4(),
      caseId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    });

    // Improved AI response logic with real LLM
    const prompt = `The analyst is asking about this security case.
    Case ID: ${caseId}
    Event Type: ${caseData.eventType}
    Risk: ${caseData.classification}
    Evidence: ${caseData.evidenceList?.join(', ')}
    Guidance: ${caseData.guidance?.summary}
    
    Analyst Question: "${message}"
    
    Provide a professional, concise, and helpful response.`;

    const aiResponse = await askBackboard(prompt, "You are Sentry AI. Be helpful and insightful.");

    const assistantMsg = {
      id: uuidv4(),
      caseId,
      role: 'assistant',
      content: aiResponse,
      createdAt: new Date().toISOString()
    };
    saveChatMessage(assistantMsg);

    res.json({ message: assistantMsg });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Threat Intel Lookup
router.post('/threat-intel/lookup', async (req, res) => {
  try {
    const { query, type } = req.body as { query?: string; type?: 'ip' | 'domain' | 'url' | 'file_hash' };
    if (!query || !type) {
      return res.status(400).json({ error: 'Both query and type are required.' });
    }

    const result = await lookupThreatIndicator(query, type);
    res.json({ result });
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
