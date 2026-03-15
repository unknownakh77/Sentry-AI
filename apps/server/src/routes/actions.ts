import { Router } from 'express';
import db, { getCase, writeAuditLog } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/:caseId/rollback', (req, res) => {
  const caseId = req.params.caseId;
  const caseData = getCase(caseId) as any;
  
  if (!caseData) {
    return res.status(404).json({ success: false, error: 'Case not found' });
  }

  if (caseData.actionStatus !== 'executed') {
    return res.status(400).json({ success: false, error: 'Action is not in executed state' });
  }

  // Perform mock rollback
  const updateStmt = db.prepare('UPDATE cases SET actionStatus = ? WHERE caseId = ?');
  updateStmt.run('rolled_back', caseId);

  writeAuditLog({
    id: uuidv4(),
    caseId,
    action: caseData.action,
    actor: 'system_admin',
    status: 'rolled_back',
    reason: 'Manual rollback initiated from dashboard',
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, message: `Action ${caseData.action} for case ${caseId} rolled back successfully` });
});

export default router;
