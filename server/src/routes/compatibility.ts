import { Router } from 'express';
import * as models from '../db/models';
import { computeAndRecordCompatibility } from '../services/compatibility';

const router = Router();

// GET /api/compatibility/:userAId/:userBId
// compute (and record) compatibility between two users
router.get('/:userAId/:userBId', (req, res) => {
  const { userAId, userBId } = req.params;

  const userA = models.getUser(userAId);
  const userB = models.getUser(userBId);
  if (!userA || !userB) {
    res.status(404).json({ error: 'One or both users not found' });
    return;
  }

  const result = computeAndRecordCompatibility(userAId, userBId);
  if (!result) {
    res.status(500).json({ error: 'Failed to compute compatibility' });
    return;
  }

  res.json(result);
});

// GET /api/compatibility/:userAId/:userBId/history
router.get('/:userAId/:userBId/history', (req, res) => {
  const { userAId, userBId } = req.params;
  const history = models.getCompatibilityHistory(userAId, userBId);
  res.json(history);
});

export default router;
