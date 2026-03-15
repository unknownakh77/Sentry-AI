"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scenarios_1 = require("../data/scenarios");
const agent_1 = require("../agent");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Get list of available scenarios
router.get('/', (req, res) => {
    res.json({ scenarios: Object.keys(scenarios_1.scenarios) });
});
// Replay a specific scenario
router.post('/:name/replay', async (req, res) => {
    try {
        const event = (0, scenarios_1.getReplayEvent)(req.params.name);
        // Run the investigation synchronously for the demo
        const finalState = await (0, agent_1.runInvestigation)(event);
        res.json({
            success: true,
            message: `Scenario ${req.params.name} replayed successfully`,
            eventId: event.eventId,
            riskScore: finalState.risk_score,
            action: finalState.action
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get all cases
router.get('/cases', (req, res) => {
    try {
        const cases = (0, db_1.getAllCases)();
        res.json({ cases });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get specific case
router.get('/cases/:id', (req, res) => {
    try {
        const caseData = (0, db_1.getCase)(req.params.id);
        if (!caseData) {
            return res.status(404).json({ error: 'Case not found' });
        }
        res.json({ caseData });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
