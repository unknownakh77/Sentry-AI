import { Router } from 'express';
import { runInvestigation } from '../agent';
import { ScenarioName, SimulatorService } from '../services/simulator';

const router = Router();

router.post('/:name/replay', async (req, res) => {
  try {
    const event = SimulatorService.generateEvent(req.params.name as ScenarioName);
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
