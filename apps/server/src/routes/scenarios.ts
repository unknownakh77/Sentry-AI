import { Router } from 'express';
import { getReplayEvent, scenarios } from '../data/scenarios';
import { runInvestigation } from '../agent';
import { getAllCases, getCase } from '../db';

const router = Router();

// Get list of available scenarios
router.get('/', (req, res) => {
  res.json({ scenarios: Object.keys(scenarios) });
});

// Replay a specific scenario
router.post('/:name/replay', async (req, res) => {
  try {
    const event = getReplayEvent(req.params.name);
    
    // Run the investigation synchronously for the demo
    const finalState = await runInvestigation(event) as any;
    
    res.json({
      success: true,
      message: `Scenario ${req.params.name} replayed successfully`,
      eventId: event.eventId,
      riskScore: finalState.risk_score,
      action: finalState.action
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all cases
router.get('/cases', (req, res) => {
  try {
    const cases = getAllCases();
    res.json({ cases });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific case
router.get('/cases/:id', (req, res) => {
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

export default router;
