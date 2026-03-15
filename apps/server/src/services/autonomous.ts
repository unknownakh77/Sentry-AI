import { SCENARIO_NAMES, SimulatorService } from './simulator';
import { runInvestigation } from '../agent';

export class AutonomousService {
  private static interval: NodeJS.Timeout | null = null;

  static start(intervalMs = 45000) { // Every 45 seconds
    if (this.interval) return;

    console.log('[AUTONOMOUS] Starting background event generator...');
    this.interval = setInterval(async () => {
      try {
        const randomScenario = SCENARIO_NAMES[Math.floor(Math.random() * SCENARIO_NAMES.length)];
        
        console.log(`[AUTONOMOUS] Triggering scenario: ${randomScenario}`);
        const event = SimulatorService.generateEvent(randomScenario);
        await runInvestigation(event);
        console.log(`[AUTONOMOUS] Investigation complete for ${event.eventId}`);
      } catch (error) {
        console.error('[AUTONOMOUS] Error in background cycle:', error);
      }
    }, intervalMs);
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
