import { Router } from 'express';
import { scenarios } from '../data/scenarios';
import { runInvestigation } from '../agent';
import { SimulatorService } from '../services/simulator';

const router = Router();

// Get list of available scenarios
router.get('/', (req, res) => {
  res.json({ scenarios: Object.keys(scenarios) });
});

// Replay a specific scenario
router.post('/:name/replay', async (req, res) => {
  try {
    const event = SimulatorService.generateEvent(req.params.name);
    
    // Run the investigation synchronously for the demo
    const finalState = await runInvestigation(event) as any;
    
    res.json({
      success: true,
      message: `Scenario ${req.params.name} replayed with randomized event`,
      eventId: event.eventId,
      riskScore: finalState.risk_score,
      classification: finalState.risk_level,
      action: finalState.action
    });
  } catch (error: any) {
    console.error(`[SCENARIO ERROR] ${req.params.name}:`, error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

export default router;
